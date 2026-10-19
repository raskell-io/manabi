import { describe, it, expect } from 'vitest';
import { addSummary, fromBase64, isRepo, isSyncConfigured, runSync, toBase64, type RemoteFile, type SyncIO } from './sync';
import { emptySummary, fingerprint, mergeInto, stableStringify } from '$lib/db/merge';
import { createEmptyDocument, freshSkillMemory, type LearningItem, type ManabiDocument } from '$lib/db/types';
import { applyItemEdits, parseItems, renderItems } from '$lib/content-md';

function item(id: string): LearningItem {
	return {
		id, language: 'zh', kind: 'word', target: id, reading: id, meaning: id, tags: [], level: 'HSK1',
		examples: [], status: 'published', createdAt: 1, updatedAt: 1
	};
}
const enc = (d: ManabiDocument) => new TextEncoder().encode(JSON.stringify(d));
const dec = (b: Uint8Array) => JSON.parse(new TextDecoder().decode(b)) as ManabiDocument;

/** Fake GitHub + fake store: `remote` is the file on GitHub, `local` this device's doc. */
function fakeIO(local: ManabiDocument, remote: ManabiDocument | null, opts: { conflicts?: number; onConflictRemote?: ManabiDocument } = {}) {
	const log: string[] = [];
	let file: RemoteFile | null = remote ? { bytes: enc(remote), sha: 'r1' } : null;
	let conflicts = opts.conflicts ?? 0;
	const io: SyncIO = {
		async fetchRemote() { log.push('fetch'); return file; },
		async putRemote(bytes, sha) {
			log.push(`put sha=${sha}`);
			if (conflicts > 0) {
				conflicts--;
				if (opts.onConflictRemote) file = { bytes: enc(opts.onConflictRemote), sha: 'r2' };
				return 'conflict';
			}
			file = { bytes, sha: 'r' + (log.length + 1) };
			return 'ok';
		},
		load: dec,
		merge: (r) => mergeInto(local, r),
		local: () => local,
		snapshot: () => enc(local)
	};
	return { io, log, remoteDoc: () => (file ? dec(file.bytes) : null) };
}

describe('runSync', () => {
	it('pushes when there is no remote file yet', async () => {
		const local = createEmptyDocument();
		local.learningItems.a = item('a');
		const f = fakeIO(local, null);
		const r = await runSync(f.io);
		expect(r.pushed).toBe(true);
		expect(f.log).toEqual(['fetch', 'put sha=undefined']);
		expect(f.remoteDoc()?.learningItems.a).toBeDefined();
	});

	it('does nothing when remote and local content are identical', async () => {
		const local = createEmptyDocument();
		local.learningItems.a = item('a');
		const remote = JSON.parse(JSON.stringify(local)) as ManabiDocument;
		remote.settings.openaiApiKey = 'ignored-for-fingerprint';
		const f = fakeIO(local, remote);
		const r = await runSync(f.io);
		expect(r.pushed).toBe(false);
		expect(r.pulled).toEqual(emptySummary());
		expect(f.log).toEqual(['fetch']);
	});

	it('pulls only when the remote is strictly ahead (no useless commit)', async () => {
		const local = createEmptyDocument();
		local.learningItems.a = item('a');
		const remote = JSON.parse(JSON.stringify(local)) as ManabiDocument;
		remote.learningItems.b = item('b');
		remote.srsStates.b = freshSkillMemory('b');
		const f = fakeIO(local, remote);
		const r = await runSync(f.io);
		expect(r.pulled.items.added).toBe(1);
		expect(r.pulled.srs.added).toBe(1);
		expect(r.pushed).toBe(false);
		expect(local.learningItems.b).toBeDefined();
	});

	it('merges then pushes when both sides diverged, locking on the remote sha', async () => {
		const local = createEmptyDocument();
		local.learningItems.a = item('a');
		const remote = createEmptyDocument();
		remote.learningItems.b = item('b');
		const f = fakeIO(local, remote);
		const r = await runSync(f.io);
		expect(r.pulled.items.added).toBe(1);
		expect(r.pushed).toBe(true);
		expect(f.log).toEqual(['fetch', 'put sha=r1']);
		expect(Object.keys(f.remoteDoc()!.learningItems).sort()).toEqual(['a', 'b']);
	});

	it('retries once from the pull when the push conflicts, merging what landed in between', async () => {
		const local = createEmptyDocument();
		local.learningItems.a = item('a');
		const remote = createEmptyDocument();
		remote.learningItems.b = item('b');
		const inBetween = createEmptyDocument();
		inBetween.learningItems.b = item('b');
		inBetween.learningItems.c = item('c');
		const f = fakeIO(local, remote, { conflicts: 1, onConflictRemote: inBetween });
		const r = await runSync(f.io);
		expect(f.log).toEqual(['fetch', 'put sha=r1', 'fetch', 'put sha=r2']);
		expect(r.pushed).toBe(true);
		expect(r.pulled.items.added).toBe(2); // b on the first pull, c on the retry
		expect(Object.keys(f.remoteDoc()!.learningItems).sort()).toEqual(['a', 'b', 'c']);
	});

	it('gives up after a second conflict', async () => {
		const local = createEmptyDocument();
		local.learningItems.a = item('a');
		const f = fakeIO(local, createEmptyDocument(), { conflicts: 2 });
		await expect(runSync(f.io)).rejects.toThrow(/kept changing/);
	});
});

describe('fingerprint', () => {
	it('ignores settings and key order, but sees content changes', async () => {
		const a = createEmptyDocument();
		a.learningItems.x = item('x');
		a.learningItems.y = item('y');
		const b = createEmptyDocument();
		b.learningItems.y = item('y');
		b.learningItems.x = item('x');
		b.settings.openaiApiKey = 'different';
		expect(await fingerprint(a)).toBe(await fingerprint(b));
		b.learningItems.x = { ...item('x'), meaning: 'changed' };
		expect(await fingerprint(a)).not.toBe(await fingerprint(b));
	});

	it('stableStringify sorts keys and drops undefined', () => {
		expect(stableStringify({ b: 1, a: [{ d: undefined, c: 2 }] })).toBe('{"a":[{"c":2}],"b":1}');
	});
});

describe('helpers', () => {
	it('base64 round-trips binary (including chunk boundaries)', () => {
		const bytes = new Uint8Array(70000).map((_, i) => (i * 7) % 256);
		expect(fromBase64(toBase64(bytes))).toEqual(bytes);
		expect(fromBase64('aGk=\n')).toEqual(new TextEncoder().encode('hi'));
	});

	it('validates the repo slug and the configuration', () => {
		expect(isRepo('me/manabi-sync')).toBe(true);
		expect(isRepo('https://github.com/me/x')).toBe(false);
		expect(isRepo('me')).toBe(false);
		expect(isSyncConfigured({ githubSyncRepo: 'me/x', githubSyncToken: 'tok' })).toBe(true);
		expect(isSyncConfigured({ githubSyncRepo: 'me/x', githubSyncToken: ' ' })).toBe(false);
	});

	it('adds summaries', () => {
		const a = emptySummary();
		a.items.added = 1;
		a.attempts = 2;
		const b = emptySummary();
		b.items.updated = 3;
		b.attempts = 4;
		expect(addSummary(a, b)).toMatchObject({ items: { added: 1, updated: 3 }, attempts: 6 });
	});
});

describe('runSync with Markdown content', () => {
	/** A content IO over the real render/parse/apply, against an in-memory repo. */
	function withContent(local: ManabiDocument, files: Map<string, { text: string; sha: string }>) {
		const f = fakeIO(local, null);
		let n = 0;
		f.io.content = {
			paths: () => ['content/zh/items.md'],
			async fetchText(path) {
				f.log.push(`get ${path}`);
				return files.get(path) ?? null;
			},
			async putText(path, text, sha) {
				f.log.push(`put ${path} sha=${sha}`);
				files.set(path, { text, sha: `s${++n}` });
				return 'ok';
			},
			apply: (_path, text) => applyItemEdits(local, 'zh', parseItems(text), () => `new-${++n}`, 2),
			render: () => renderItems('zh', Object.values(local.learningItems))
		};
		return f;
	}

	it('writes the Markdown on first sync, and leaves it alone when nothing changed', async () => {
		const local = createEmptyDocument();
		local.learningItems.a = item('a');
		const files = new Map<string, { text: string; sha: string }>();
		const first = await runSync(withContent(local, files).io);
		expect(first.files).toBe(1);
		expect(files.get('content/zh/items.md')?.text).toContain('## a\n<!-- id: a');
		const again = withContent(local, files);
		const second = await runSync(again.io);
		expect(second.files).toBe(0);
		expect(again.log.filter((l) => l.startsWith('put content'))).toEqual([]);
	});

	it('applies a hand edit before pushing the snapshot, then rewrites the file', async () => {
		const local = createEmptyDocument();
		local.learningItems.a = item('a');
		const files = new Map<string, { text: string; sha: string }>();
		await runSync(withContent(local, files).io);
		const md = files.get('content/zh/items.md')!;
		files.set('content/zh/items.md', { text: md.text.replace('- meaning: a', '- meaning: edited on GitHub'), sha: 'gh1' });

		const f = withContent(local, files);
		const r = await runSync(f.io);
		expect(local.learningItems.a.meaning).toBe('edited on GitHub');
		expect(r.pulled.items.updated).toBe(1);
		expect(r.pushed).toBe(true);
		expect(f.remoteDoc()?.learningItems.a.meaning).toBe('edited on GitHub');
		// The rewritten file carries a fresh hash, so the edit isn't applied twice.
		expect(r.files).toBe(1);
		expect(parseItems(files.get('content/zh/items.md')!.text).every((p) => !p.touched)).toBe(true);
	});
});
