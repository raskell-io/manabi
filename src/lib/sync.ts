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
 */

import { get, writable } from 'svelte/store';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { emptySummary, fingerprint, type MergeSummary } from '$lib/db/merge';
import { exportBackup, getDoc, loadBackup, mergeBackup, settings } from '$lib/db/store';
import type { ManabiDocument, ManabiSettings } from '$lib/db/types';

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
}

export interface SyncResult {
	pulled: MergeSummary;
	pushed: boolean;
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

export async function runSync(io: SyncIO): Promise<SyncResult> {
	let pulled = emptySummary();
	for (let attempt = 0; ; attempt++) {
		const remote = await io.fetchRemote();
		let remoteFp: string | null = null;
		if (remote) {
			const rdoc = io.load(remote.bytes);
			pulled = addSummary(pulled, io.merge(rdoc));
			remoteFp = await fingerprint(rdoc);
		}
		const localFp = await fingerprint(io.local());
		if (remoteFp === localFp) return { pulled, pushed: false };
		const res = await io.putRemote(io.snapshot(), remote?.sha);
		if (res === 'ok') return { pulled, pushed: true };
		if (attempt >= 1) {
			throw new Error('The sync file on GitHub kept changing while syncing. Try again.');
		}
	}
}

// --- GitHub Contents API adapter -------------------------------------------

export function toBase64(bytes: Uint8Array): string {
	let s = '';
	for (let i = 0; i < bytes.length; i += 0x8000) {
		s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(s);
}

export function fromBase64(b64: string): Uint8Array {
	const bin = atob(b64.replace(/\s+/g, ''));
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

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

function githubIO(repo: string, token: string): SyncIO {
	const base = `https://api.github.com/repos/${repo}`;
	const url = `${base}/contents/${SYNC_PATH}`;
	return {
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
		const { pulled, pushed } = await runSync(
			githubIO(s.githubSyncRepo.trim(), s.githubSyncToken.trim())
		);
		const next = patchState({
			status: 'ok',
			lastSyncAt: Date.now(),
			lastPulled: pulled,
			lastPushed: pushed,
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
