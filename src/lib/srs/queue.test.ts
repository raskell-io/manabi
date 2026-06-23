import { describe, it, expect } from 'vitest';
import { buildQueue, isUnlocked } from './queue';
import {
	createEmptyDocument,
	defaultSettings,
	freshSkillMemory,
	isoDatePlus,
	todayIso,
	type LearningItem,
	type ManabiDocument
} from '$lib/db/types';

function makeItem(id: string, language: LearningItem['language'] = 'zh'): LearningItem {
	const now = Date.now();
	return {
		id,
		language,
		kind: 'word',
		target: id,
		reading: id,
		meaning: id,
		tags: [],
		level: 'A1',
		examples: [],
		status: 'published',
		createdAt: now,
		updatedAt: now
	};
}

function docWith(items: LearningItem[]): ManabiDocument {
	const doc = createEmptyDocument();
	for (const it of items) doc.learningItems[it.id] = it;
	return doc;
}

describe('buildQueue', () => {
	it('introduces new items up to newPerDay, recognition first', () => {
		const doc = docWith([makeItem('a'), makeItem('b'), makeItem('c')]);
		const settings = { ...defaultSettings(), newPerDay: 2 };
		const q = buildQueue(doc, settings);
		expect(q.newItems).toBe(2);
		expect(q.tasks.every((t) => t.dimension === 'recognition')).toBe(true);
		expect(q.tasks.every((t) => t.isNew)).toBe(true);
	});

	it('only counts items in the active language', () => {
		const doc = docWith([makeItem('a', 'zh'), makeItem('b', 'ja')]);
		const settings = { ...defaultSettings(), activeLanguage: 'zh' as const, newPerDay: 5 };
		const q = buildQueue(doc, settings);
		expect(q.newItems).toBe(1);
		expect(q.tasks[0].itemId).toBe('a');
	});

	it('surfaces a due in-progress dimension as a review, not a new item', () => {
		const doc = docWith([makeItem('a')]);
		const srs = freshSkillMemory('a');
		srs.dims.recognition.introduced = true;
		srs.dims.recognition.repetitions = 1;
		srs.dims.recognition.nextReview = todayIso(); // due now
		doc.srsStates['a'] = srs;
		const q = buildQueue(doc, defaultSettings());
		expect(q.newItems).toBe(0);
		expect(q.dueReviews).toBeGreaterThanOrEqual(1);
		expect(q.tasks.some((t) => t.dimension === 'recognition' && !t.isNew)).toBe(true);
	});

	it('does not surface dimensions scheduled in the future', () => {
		const doc = docWith([makeItem('a')]);
		const srs = freshSkillMemory('a');
		// recognition introduced (so pronunciation/listening unlock), but every
		// already-introduced dimension is scheduled ahead; context/recall stay
		// locked (0 reps). Nothing should be due.
		for (const dim of ['recognition', 'pronunciation', 'listening'] as const) {
			srs.dims[dim].introduced = true;
			srs.dims[dim].nextReview = isoDatePlus(5);
		}
		doc.srsStates['a'] = srs;
		const q = buildQueue(doc, defaultSettings());
		expect(q.dueReviews).toBe(0);
	});

	it('auto-introduces newly-unlocked dimensions (due immediately) for an in-progress item', () => {
		const doc = docWith([makeItem('a')]);
		const srs = freshSkillMemory('a');
		srs.dims.recognition.introduced = true;
		srs.dims.recognition.nextReview = isoDatePlus(5); // recognition not due
		doc.srsStates['a'] = srs;
		const q = buildQueue(doc, defaultSettings());
		// pronunciation + listening are unlocked and fresh (due today).
		expect(q.dueReviews).toBe(2);
		expect(q.tasks.every((t) => t.isNew)).toBe(true);
	});

	it('respects the reviewCap', () => {
		const items = Array.from({ length: 10 }, (_, i) => makeItem(`i${i}`));
		const doc = docWith(items);
		for (const it of items) {
			const srs = freshSkillMemory(it.id);
			srs.dims.recognition.introduced = true;
			srs.dims.recognition.nextReview = todayIso();
			doc.srsStates[it.id] = srs;
		}
		const q = buildQueue(doc, { ...defaultSettings(), reviewCap: 3 });
		expect(q.dueReviews).toBe(3);
	});
});

describe('isUnlocked', () => {
	it('gates recall behind 2+ recognition reps; context behind 1', () => {
		const srs = freshSkillMemory('a');
		srs.dims.recognition.introduced = true;
		srs.dims.recognition.repetitions = 0;
		expect(isUnlocked('recognition', srs)).toBe(true);
		expect(isUnlocked('pronunciation', srs)).toBe(true);
		expect(isUnlocked('context', srs)).toBe(false);
		expect(isUnlocked('recall', srs)).toBe(false);

		srs.dims.recognition.repetitions = 1;
		expect(isUnlocked('context', srs)).toBe(true);
		expect(isUnlocked('recall', srs)).toBe(false);

		srs.dims.recognition.repetitions = 2;
		expect(isUnlocked('recall', srs)).toBe(true);
	});
});
