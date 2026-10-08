import { describe, it, expect } from 'vitest';
import { easeToNeed, rankAudioPractice } from './practice';
import { createEmptyDocument, freshSkillMemory, type LearningItem, type ManabiDocument } from '$lib/db/types';

function item(id: string): LearningItem {
	return { id, language: 'zh', kind: 'word', target: id, reading: id, meaning: id, tags: [], level: 'A1', examples: [], status: 'published', createdAt: 1, updatedAt: 1 };
}
function practiced(doc: ManabiDocument, id: string, dim: 'listening' | 'pronunciation', ease: number, last: string) {
	const sm = doc.srsStates[id] ?? freshSkillMemory(id);
	sm.dims[dim] = { ...sm.dims[dim], introduced: true, ease, lastReviewed: last, repetitions: 1 };
	doc.srsStates[id] = sm;
}
function scored(doc: ManabiDocument, id: string, score: number, at: number) {
	const k = `${id}-${at}`;
	doc.pronunciationAttempts[k] = { id: k, itemId: id, audioRef: 'r', selfRating: 'okay', score, transcript: 'x', at };
}
const ids = (r: { tasks: { itemId: string }[] }) => r.tasks.map((t) => t.itemId);

describe('rankAudioPractice', () => {
	it('puts never-practiced words first, then the neediest, then the stalest; caps and reports the total', () => {
		const doc = createEmptyDocument();
		const items = ['a', 'b', 'c', 'd', 'e'].map(item);
		practiced(doc, 'a', 'listening', 2.5, '2026-10-01'); // easy, recent
		practiced(doc, 'b', 'listening', 1.5, '2026-10-05'); // hard
		practiced(doc, 'c', 'listening', 2.5, '2026-09-01'); // easy, stale
		// d, e never practiced
		const r = rankAudioPractice(items, 'listening', doc, 10);
		expect(ids(r)).toEqual(['d', 'e', 'b', 'c', 'a']);
		expect(r.total).toBe(5);
		expect(r.tasks[0].isNew).toBe(true);
		expect(r.tasks[2].isNew).toBe(false);
		const capped = rankAudioPractice(items, 'listening', doc, 2);
		expect(ids(capped)).toEqual(['d', 'e']);
		expect(capped.total).toBe(5);
	});

	it('Speaking ranks practiced words by their latest match score when they have one', () => {
		const doc = createEmptyDocument();
		const items = ['a', 'b', 'c'].map(item);
		for (const id of ['a', 'b', 'c']) practiced(doc, id, 'pronunciation', 2.5, '2026-10-01');
		scored(doc, 'a', 95, 1);
		scored(doc, 'a', 40, 2); // latest wins
		scored(doc, 'b', 70, 1);
		// c: no score → falls back to ease (2.5 → 100)
		expect(ids(rankAudioPractice(items, 'pronunciation', doc, 10))).toEqual(['a', 'b', 'c']);
	});

	it('Listening ignores speech scores and uses ease', () => {
		const doc = createEmptyDocument();
		const items = ['a', 'b'].map(item);
		practiced(doc, 'a', 'listening', 2.5, '2026-10-01');
		practiced(doc, 'b', 'listening', 1.8, '2026-10-01');
		scored(doc, 'b', 100, 1);
		expect(ids(rankAudioPractice(items, 'listening', doc, 10))).toEqual(['b', 'a']);
	});

	it('keeps input order for exact ties and tolerates a zero cap', () => {
		const doc = createEmptyDocument();
		const items = ['x', 'y', 'z'].map(item);
		expect(ids(rankAudioPractice(items, 'listening', doc, 10))).toEqual(['x', 'y', 'z']);
		expect(rankAudioPractice(items, 'listening', doc, 0)).toEqual({ tasks: [], total: 3 });
	});
});

describe('easeToNeed', () => {
	it('maps the SM-2 ease range onto 0–100 and clamps', () => {
		expect(easeToNeed(1.3)).toBe(0);
		expect(easeToNeed(2.5)).toBe(100);
		expect(easeToNeed(1.9)).toBe(50);
		expect(easeToNeed(3.1)).toBe(100);
		expect(easeToNeed(1.0)).toBe(0);
	});
});
