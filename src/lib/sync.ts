/**
 * GitHub sync — automatic multi-device sync of the backup snapshot.
 *
 * The snapshot (`manabi.manabi`, see `exportBackup`) lives in a private GitHub
 * repository and is read and written through the **Contents API**, which —
 * unlike git-over-HTTP — accepts browser requests with a token. So there is
 * still no server of ours. One sync round is:
 *
 *   pull → merge into local (`db/merge.ts`, never deletes) → push if local ≠ remote
 *
 * "≠" is decided by a content fingerprint (`fingerprint`), so a round where
 * nothing changed makes no commit. The file's blob sha is an optimistic lock:
 * if someone else pushed in between, GitHub answers 409/422 and the round is
 * retried once from the pull.
 *
 * With `syncMarkdown`, items and passages are also kept as Markdown under
 * content/<lang>/ (content-md.ts): hand edits made on GitHub are applied right
 * after the pull (so they ride along in the snapshot push), and the files are
 * rewritten afterwards whenever the content changed.
 */

import { get, writable } from 'svelte/store';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { fromBase64, toBase64 } from '$lib/base64';
import { emptySummary, fingerprint, type MergeSummary } from '$lib/db/merge';
import { applyContentFile, exportBackup, getDoc, loadBackup, mergeBackup, renderContentFile, settings } from '$lib/db/store';
import { contentPaths, type EditCounts } from '$lib/content-md';
import { LANGUAGES, type ManabiDocument, type ManabiSettings } from '$lib/db/types';

export const SYNC_PATH = 'manabi.manabi';
const STATE_KEY = 'manabi-sync';

// --- Status -----------------------------------------------------------------

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error' | 'offline';

export interface SyncState {
	status: SyncStatus;
	lastSyncAt: number | null;
	lastPulled: MergeSummary | null;
	lastPushed: boolean;
	error: string | null;
}

export const syncState = writable<SyncState>({
	status: 'idle',
	lastSyncAt: null,
	lastPulled: null,
	lastPushed: false,
	error: null
});

function patchState(p: Partial<SyncState>): SyncState {
	let next!: SyncState;
	syncState.update((st) => (next = { ...st, ...p }));
	return next;
}

export function isRepo(v: string): boolean {
	return /^[\w.-]+\/[\w.-]+$/.test(v.trim());
}

export function isSyncConfigured(
	s: Pick<ManabiSettings, 'githubSyncRepo' | 'githubSyncToken'>
): boolean {
	return isRepo(s.githubSyncRepo ?? '') && (s.githubSyncToken ?? '').trim().length > 0;
}

// --- The sync round (pure over an IO adapter, so it is unit-testable) -------

export interface RemoteFile {
	bytes: Uint8Array;
	sha: string;
}

export interface SyncIO {
	fetchRemote(): Promise<RemoteFile | null>;
	putRemote(bytes: Uint8Array, sha: string | undefined): Promise<'ok' | 'conflict'>;
	load(bytes: Uint8Array): ManabiDocument;
	merge(remote: ManabiDocument): MergeSummary;
	/** The local document *after* any merge. */
	local(): ManabiDocument;
	snapshot(): Uint8Array;
	/** Markdown files kept alongside the snapshot (absent: snapshot only). */
	content?: ContentIO;
}

export interface RemoteText {
	text: string;
	sha: string;
}

export interface ContentIO {
	/** The Markdown files to keep in sync. */
	paths(): string[];
	fetchText(path: string): Promise<RemoteText | null>;
	putText(path: string, text: string, sha: string | undefined): Promise<'ok' | 'conflict'>;
	/** Apply a file's hand-edited sections to the local content. */
	apply(path: string, text: string): EditCounts;
	/** The file as the local content renders it (null: nothing to write). */
	render(path: string): string | null;
}

export interface SyncResult {
	pulled: MergeSummary;
	pushed: boolean;
	/** Markdown files written this round. */
	files?: number;
}

export function addSummary(a: MergeSummary, b: MergeSummary): MergeSummary {
	const pair = (x: { added: number; updated: number }, y: { added: number; updated: number }) => ({
		added: x.added + y.added,
		updated: x.updated + y.updated
	});
	return {
		items: pair(a.items, b.items),
		srs: pair(a.srs, b.srs),
		attempts: a.attempts + b.attempts,
		lessons: pair(a.lessons, b.lessons),
		passages: pair(a.passages, b.passages),
		drafts: pair(a.drafts, b.drafts)
	};
}

/** Pull the Markdown files and apply their hand edits; returns what was fetched. */
async function pullContent(c: ContentIO, pulled: MergeSummary): Promise<{ remote: Map<string, RemoteText | null>; pulled: MergeSummary }> {
	const remote = new Map<string, RemoteText | null>();
	let sum = pulled;
	for (const path of c.paths()) {
		const r = await c.fetchText(path);
		remote.set(path, r);
		if (!r) continue;
		const n = c.apply(path, r.text);
		const into = path.endsWith('/passages.md') ? 'passages' : 'items';
		sum = { ...sum, [into]: { added: sum[into].added + n.added, updated: sum[into].updated + n.updated } };
	}
	return { remote, pulled: sum };
}

/** Write every Markdown file whose rendering differs from the repo's (retrying a conflict once). */
async function pushContent(c: ContentIO, remote: Map<string, RemoteText | null>): Promise<number> {
	let written = 0;
	for (const path of c.paths()) {
		let r = remote.has(path) ? remote.get(path)! : await c.fetchText(path);
		for (let attempt = 0; ; attempt++) {
			const text = c.render(path);
			if (text === null || text === r?.text) break;
			if ((await c.putText(path, text, r?.sha)) === 'ok') {
				written++;
				break;
			}
			if (attempt >= 1) throw new Error(`${path} on GitHub kept changing while syncing. Try again.`);
			r = await c.fetchText(path);
			if (r) c.apply(path, r.text);
		}
	}
	return written;
}

export async function runSync(io: SyncIO): Promise<SyncResult> {
	let pulled = emptySummary();
	let remoteContent = new Map<string, RemoteText | null>();
	let pushed = false;
	for (let attempt = 0; ; attempt++) {
		const remote = await io.fetchRemote();
		let remoteFp: string | null = null;
		if (remote) {
			const rdoc = io.load(remote.bytes);
			pulled = addSummary(pulled, io.merge(rdoc));
			remoteFp = await fingerprint(rdoc);
		}
		if (io.content && attempt === 0) ({ remote: remoteContent, pulled } = await pullContent(io.content, pulled));
		const localFp = await fingerprint(io.local());
		if (remoteFp === localFp) break;
		if ((await io.putRemote(io.snapshot(), remote?.sha)) === 'ok') {
			pushed = true;
			break;
		}
		if (attempt >= 1) {
			throw new Error('The sync file on GitHub kept changing while syncing. Try again.');
		}
	}
	if (!io.content) return { pulled, pushed };
	return { pulled, pushed, files: await pushContent(io.content, remoteContent) };
}

// --- GitHub Contents API adapter -------------------------------------------

export { fromBase64, toBase64 };

function headers(token: string): Record<string, string> {
	return {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28'
	};
}

async function describeError(res: Response): Promise<string> {
	if (res.status === 401) return 'GitHub rejected the token (401) — check it has not expired.';
	if (res.status === 403) {
		return 'GitHub refused (403) — the token needs Contents: read & write on that repository.';
	}
	let msg = '';
	try {
		msg = ((await res.json()) as { message?: string }).message ?? '';
	} catch {
		/* not JSON */
	}
	return `GitHub error ${res.status}${msg ? `: ${msg}` : ''}`;
}

/** Markdown content over the Contents API (UTF-8 text files). */
function githubContent(base: string, token: string): ContentIO {
	const enc = new TextEncoder();
	const dec = new TextDecoder();
	return {
		paths() {
			const d = getDoc();
			if (!d) return [];
			return LANGUAGES.flatMap(({ code }) => {
				const p = contentPaths(code);
				const hasItems = Object.values(d.learningItems).some((it) => it.language === code);
				const hasPassages = Object.values(d.passages ?? {}).some((x) => x.language === code);
				return [...(hasItems ? [p.items] : []), ...(hasPassages ? [p.passages] : [])];
			});
		},
		async fetchText(path) {
			const res = await fetch(`${base}/contents/${path}`, { headers: headers(token), cache: 'no-store' });
			if (res.status === 404) return null;
			if (!res.ok) throw new Error(await describeError(res));
			const body = (await res.json()) as { content?: string; encoding?: string; sha: string };
			if (body.encoding !== 'base64' || typeof body.content !== 'string') throw new Error(`${path} is too large for the GitHub Contents API.`);
			return { text: dec.decode(fromBase64(body.content)), sha: body.sha };
		},
		async putText(path, text, sha) {
			const res = await fetch(`${base}/contents/${path}`, {
				method: 'PUT',
				headers: { ...headers(token), 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: `manabi: ${path}`, content: toBase64(enc.encode(text)), ...(sha ? { sha } : {}) })
			});
			if (res.status === 409 || res.status === 422) return 'conflict';
			if (!res.ok) throw new Error(await describeError(res));
			return 'ok';
		},
		apply: applyContentFile,
		render: renderContentFile
	};
}

function githubIO(repo: string, token: string, markdown: boolean): SyncIO {
	const base = `https://api.github.com/repos/${repo}`;
	const url = `${base}/contents/${SYNC_PATH}`;
	return {
		...(markdown ? { content: githubContent(base, token) } : {}),
		async fetchRemote() {
			const res = await fetch(url, { headers: headers(token), cache: 'no-store' });
			if (res.status === 404) {
				// File missing, or repo/token wrong — tell them apart.
				const r = await fetch(base, { headers: headers(token), cache: 'no-store' });
				if (r.status === 404) {
					throw new Error(
						`Repository ${repo} not found — check the name and that the token can access it.`
					);
				}
				return null;
			}
			if (!res.ok) throw new Error(await describeError(res));
			const body = (await res.json()) as { content?: string; encoding?: string; sha: string };
			if (body.encoding !== 'base64' || typeof body.content !== 'string') {
				throw new Error('The sync file is too large for the GitHub Contents API (over 1 MB).');
			}
			return { bytes: fromBase64(body.content), sha: body.sha };
		},
		async putRemote(bytes, sha) {
			const res = await fetch(url, {
				method: 'PUT',
				headers: { ...headers(token), 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: `manabi sync ${new Date().toISOString()}`,
					content: toBase64(bytes),
					...(sha ? { sha } : {})
				})
			});
			if (res.status === 409 || res.status === 422) return 'conflict';
			if (!res.ok) throw new Error(await describeError(res));
			return 'ok';
		},
		load: loadBackup,
		merge: mergeBackup,
		local() {
			const d = getDoc();
			if (!d) throw new Error('Manabi database not initialized');
			return d;
		},
		snapshot: exportBackup
	};
}

// --- Entry points -----------------------------------------------------------

let inFlight: Promise<SyncState> | null = null;

/** Run one sync round now (coalesces concurrent calls). Never throws. */
export function syncNow(): Promise<SyncState> {
	if (!inFlight) {
		inFlight = doSync().finally(() => {
			inFlight = null;
		});
	}
	return inFlight;
}

async function doSync(): Promise<SyncState> {
	const s = get(settings);
	if (!isSyncConfigured(s)) return patchState({ status: 'idle', error: null });
	if (typeof navigator !== 'undefined' && navigator.onLine === false) {
		return patchState({ status: 'offline', error: null });
	}
	patchState({ status: 'syncing', error: null });
	try {
		const { pulled, pushed, files } = await runSync(
			githubIO(s.githubSyncRepo.trim(), s.githubSyncToken.trim(), s.syncMarkdown !== false)
		);
		const next = patchState({
			status: 'ok',
			lastSyncAt: Date.now(),
			lastPulled: pulled,
			lastPushed: pushed || (files ?? 0) > 0,
			error: null
		});
		void idbSet(STATE_KEY, { lastSyncAt: next.lastSyncAt }).catch(() => {});
		return next;
	} catch (err) {
		return patchState({ status: 'error', error: err instanceof Error ? err.message : String(err) });
	}
}

/** Auto-sync if configured and enabled — on start, after a session, when back online. */
export function maybeAutoSync(): Promise<SyncState> | undefined {
	const s = get(settings);
	if (!isSyncConfigured(s) || s.syncAuto === false) return undefined;
	return syncNow();
}

let started = false;

/** Call once after `initDB()`: restores the last-sync time and arms auto-sync. */
export async function startAutoSync(): Promise<void> {
	if (started) return;
	started = true;
	const saved = await idbGet<{ lastSyncAt: number }>(STATE_KEY).catch(() => undefined);
	if (saved?.lastSyncAt) patchState({ lastSyncAt: saved.lastSyncAt });
	window.addEventListener('online', () => void maybeAutoSync());
	void maybeAutoSync();
}
