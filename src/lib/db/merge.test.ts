import { describe, it, expect } from 'vitest';
import * as Automerge from '@automerge/automerge';
import { fingerprint, isManabiDocument, mergeInto } from './merge';
import {
	createEmptyDocument,
	freshSkillMemory,
	type LearningItem,
	type ManabiDocument
} from './types';

function item(id: string, updatedAt = 1000, meaning = id): LearningItem {
	return {
		id,
		language: 'zh',
		kind: 'word',
		target: id,
		reading: id,
		meaning,
		tags: [],
		level: 'HSK1',
		examples: [],
		status: 'published',
		createdAt: 1,
		updatedAt
	};
}

describe('mergeInto', () => {
	it('adds items missing locally, keeps identical ones, and lets the newer version win', () => {
		const local = createEmptyDocument();
		local.learningItems.a = item('a', 1000);
		local.learningItems.b = item('b', 2000, 'local-b');
		local.learningItems.c = item('c', 3000, 'local-c');
		const other = createEmptyDocument();
		other.learningItems.a = item('a', 1000); // identical
		other.learningItems.b = item('b', 2500, 'other-b'); // newer → wins
		other.learningItems.c = item('c', 1000, 'other-c'); // older → loses
		other.learningItems.d = item('d'); // new
		const s = mergeInto(local, other);
		expect(s.items).toEqual({ added: 1, updated: 1 });
		expect(local.learningItems.b.meaning).toBe('other-b');
		expect(local.learningItems.c.meaning).toBe('local-c');
		expect(local.learningItems.d).toBeDefined();
	});

	it('does not count a newer-but-identical record as an update (re-seeded content)', () => {
		const local = createEmptyDocument();
		local.learningItems.a = item('a', 1000);
		const other = createEmptyDocument();
		other.learningItems.a = item('a', 9000);
		expect(mergeInto(local, other).items).toEqual({ added: 0, updated: 0 });
		expect(local.learningItems.a.updatedAt).toBe(1000);
	});

	it('merges SRS state per skill: the more recently reviewed side wins, lapses take the max', () => {
		const local = createEmptyDocument();
		const l = freshSkillMemory('a');
		l.dims.recognition = { ...l.dims.recognition, introduced: true, repetitions: 3, lastReviewed: '2026-09-10', lapses: 2 };
		l.dims.listening = { ...l.dims.listening, introduced: true, repetitions: 1, lastReviewed: '2026-09-18', lapses: 0 };
		local.srsStates.a = l;

		const other = createEmptyDocument();
		const o = freshSkillMemory('a');
		o.dims.recognition = { ...o.dims.recognition, introduced: true, repetitions: 1, lastReviewed: '2026-09-15', lapses: 1 };
		o.dims.listening = { ...o.dims.listening, introduced: true, repetitions: 4, lastReviewed: '2026-09-12', lapses: 3 };
		other.srsStates.a = o;
		other.srsStates.b = freshSkillMemory('b');

		const s = mergeInto(local, other);
		expect(s.srs).toEqual({ added: 1, updated: 1 });
		// recognition: other reviewed later → other wins, lapses = max(2, 1)
		expect(local.srsStates.a.dims.recognition.repetitions).toBe(1);
		expect(local.srsStates.a.dims.recognition.lastReviewed).toBe('2026-09-15');
		expect(local.srsStates.a.dims.recognition.lapses).toBe(2);
		// listening: local reviewed later → local kept, lapses = max(0, 3)
		expect(local.srsStates.a.dims.listening.repetitions).toBe(1);
		expect(local.srsStates.a.dims.listening.lapses).toBe(3);
		expect(local.srsStates.b).toBeDefined();
	});

	it('is a no-op when both sides are identical', () => {
		const local = createEmptyDocument();
		local.learningItems.a = item('a');
		local.srsStates.a = freshSkillMemory('a');
		const other = JSON.parse(JSON.stringify(local)) as ManabiDocument;
		const s = mergeInto(local, other);
		expect(s).toEqual({
			items: { added: 0, updated: 0 },
			srs: { added: 0, updated: 0 },
			attempts: 0,
			lessons: { added: 0, updated: 0 },
			passages: { added: 0, updated: 0 },
			drafts: { added: 0, updated: 0 }
		});
	});

	it('unions attempts, lesson items, seeded ids and decided drafts; leaves settings alone', () => {
		const local = createEmptyDocument();
		local.settings.openaiApiKey = 'mine';
		local.settings.newPerDay = 7;
		local.exerciseAttempts.x = { id: 'x', itemId: 'a', language: 'zh', dimension: 'recognition', exerciseType: 'word-to-meaning', correct: true, quality: 4, expected: 'a', at: 1 };
		local.lessons.l1 = { id: 'l1', title: 'L', language: 'zh', itemIds: ['a', 'b'], createdAt: 1 };
		local.contentDrafts.d1 = { id: 'd1', language: 'zh', kind: 'word', item: item('z'), sourcePrompt: '', status: 'pending', createdAt: 1 };
		local.contentDrafts.d2 = { id: 'd2', language: 'zh', kind: 'word', item: item('y'), sourcePrompt: '', status: 'approved', createdAt: 1 };
		local.seededIds.s1 = true;

		const other = createEmptyDocument();
		other.settings.openaiApiKey = 'theirs';
		other.settings.newPerDay = 99;
		other.exerciseAttempts.x = { ...local.exerciseAttempts.x };
		other.exerciseAttempts.y = { ...local.exerciseAttempts.x, id: 'y' };
		other.pronunciationAttempts.p = { id: 'p', itemId: 'a', audioRef: 'blob', selfRating: 'good', at: 1 };
		other.lessons.l1 = { id: 'l1', title: 'L', language: 'zh', itemIds: ['b', 'c'], createdAt: 1 };
		other.lessons.l2 = { id: 'l2', title: 'M', language: 'zh', itemIds: [], createdAt: 1 };
		other.contentDrafts.d1 = { ...local.contentDrafts.d1, status: 'rejected' };
		other.contentDrafts.d2 = { ...local.contentDrafts.d2, status: 'pending' };
		other.seededIds.s2 = true;

		const s = mergeInto(local, other);
		expect(s.attempts).toBe(2);
		expect(Object.keys(local.exerciseAttempts).sort()).toEqual(['x', 'y']);
		expect(s.lessons).toEqual({ added: 1, updated: 1 });
		expect(local.lessons.l1.itemIds).toEqual(['a', 'b', 'c']);
		expect(s.drafts).toEqual({ added: 0, updated: 1 });
		expect(local.contentDrafts.d1.status).toBe('rejected');
		expect(local.contentDrafts.d2.status).toBe('approved');
		expect(local.seededIds).toEqual({ s1: true, s2: true });
		expect(local.settings.openaiApiKey).toBe('mine');
		expect(local.settings.newPerDay).toBe(7);
	});

	it('tolerates an older-schema backup with missing collections', () => {
		const local = createEmptyDocument();
		const old = { schemaVersion: 1, learningItems: { a: item('a') }, srsStates: {} } as unknown as ManabiDocument;
		expect(isManabiDocument(old)).toBe(true);
		const s = mergeInto(local, old);
		expect(s.items.added).toBe(1);
	});

	it('runs inside Automerge.change against a loaded, history-free snapshot', () => {
		const otherPlain = createEmptyDocument();
		otherPlain.learningItems.a = item('a');
		otherPlain.srsStates.a = freshSkillMemory('a');
		otherPlain.lessons.l = { id: 'l', title: 'L', language: 'zh', itemIds: ['a'], createdAt: 1 };
		const bytes = Automerge.save(Automerge.from<ManabiDocument>(otherPlain));
		const loaded = Automerge.load<ManabiDocument>(bytes);
		expect(isManabiDocument(loaded)).toBe(true);

		let local = Automerge.from<ManabiDocument>(createEmptyDocument());
		let summary;
		local = Automerge.change(local, (d) => {
			summary = mergeInto(d, loaded);
		});
		expect(summary).toMatchObject({ items: { added: 1 }, srs: { added: 1 }, lessons: { added: 1 } });
		expect(local.learningItems.a.meaning).toBe('a');
		// Merging the same snapshot again is a no-op.
		local = Automerge.change(local, (d) => {
			summary = mergeInto(d, loaded);
		});
		expect(summary).toMatchObject({ items: { added: 0, updated: 0 }, srs: { added: 0, updated: 0 } });
	});
});

describe('convergence (both devices merge each other → identical fingerprints)', () => {
	const clone = (d: ManabiDocument) => JSON.parse(JSON.stringify(d)) as ManabiDocument;
	async function converge(a: ManabiDocument, b: ManabiDocument) {
		const a2 = clone(a);
		mergeInto(a2, clone(b));
		const b2 = clone(b);
		mergeInto(b2, clone(a));
		expect(await fingerprint(a2)).toBe(await fingerprint(b2));
		// And a second round changes nothing on either side.
		const before = await fingerprint(a2);
		mergeInto(a2, clone(b2));
		expect(await fingerprint(a2)).toBe(before);
		return [a2, b2] as const;
	}

	it('same content with per-device timestamps (seeds) fingerprints equal without merging', async () => {
		const a = createEmptyDocument();
		a.learningItems.s = item('s', 1000);
		const b = createEmptyDocument();
		b.learningItems.s = item('s', 5000);
		b.learningItems.s.createdAt = 5000;
		expect(await fingerprint(a)).toBe(await fingerprint(b));
	});

	it('tied SRS states (same day, same repetitions, different ease) converge', async () => {
		const a = createEmptyDocument();
		const b = createEmptyDocument();
		const sa = freshSkillMemory('x');
		sa.dims.recognition = { ...sa.dims.recognition, introduced: true, repetitions: 2, lastReviewed: '2026-09-19', ease: 2.6, interval: 6, lapses: 1 };
		const sb = freshSkillMemory('x');
		sb.dims.recognition = { ...sb.dims.recognition, introduced: true, repetitions: 2, lastReviewed: '2026-09-19', ease: 2.36, interval: 4, lapses: 0 };
		a.srsStates.x = sa;
		b.srsStates.x = sb;
		const [a2, b2] = await converge(a, b);
		expect(a2.srsStates.x.dims.recognition.lapses).toBe(1);
		expect(b2.srsStates.x.dims.recognition.lapses).toBe(1);
	});

	it('lesson item order and membership converge', async () => {
		const a = createEmptyDocument();
		const b = createEmptyDocument();
		a.lessons.l = { id: 'l', title: 'L', language: 'zh', itemIds: ['a', 'b', 'c'], createdAt: 1 };
		b.lessons.l = { id: 'l', title: 'L', language: 'zh', itemIds: ['c', 'a', 'd'], createdAt: 1 };
		await converge(a, b);
	});

	it('items edited at the same instant, and drafts decided differently, converge', async () => {
		const a = createEmptyDocument();
		const b = createEmptyDocument();
		a.learningItems.x = item('x', 7777, 'edit-A');
		b.learningItems.x = item('x', 7777, 'edit-B');
		a.contentDrafts.d = { id: 'd', language: 'zh', kind: 'word', item: item('z'), sourcePrompt: '', status: 'approved', createdAt: 1 };
		b.contentDrafts.d = { ...a.contentDrafts.d, status: 'rejected' };
		const [a2, b2] = await converge(a, b);
		expect(a2.contentDrafts.d.status).toBe('approved');
		expect(b2.contentDrafts.d.status).toBe('approved');
	});
});

describe('isManabiDocument', () => {
	it('rejects non-documents', () => {
		expect(isManabiDocument(null)).toBe(false);
		expect(isManabiDocument('x')).toBe(false);
		expect(isManabiDocument({ schemaVersion: 4 })).toBe(false);
		expect(isManabiDocument({ schemaVersion: '4', learningItems: {}, srsStates: {} })).toBe(false);
		expect(isManabiDocument(createEmptyDocument())).toBe(true);
	});
});
