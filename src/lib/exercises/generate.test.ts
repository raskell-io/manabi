import { describe, it, expect } from 'vitest';
import { buildExercise } from './generate';
import type { LearningItem } from '$lib/db/types';

function item(id: string, over: Partial<LearningItem> = {}): LearningItem {
	const now = Date.now();
	return {
		id,
		language: 'zh',
		kind: 'word',
		target: id,
		reading: `r-${id}`,
		meaning: `m-${id}`,
		tags: ['daily'],
		level: 'A1',
		examples: [],
		status: 'published',
		createdAt: now,
		updatedAt: now,
		...over
	};
}

// Deterministic LCG so tests don't depend on Math.random.
function seededRng(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s = (1664525 * s + 1013904223) >>> 0;
		return s / 0xffffffff;
	};
}

const target = item('今天', {
	reading: 'jīntiān',
	meaning: 'today',
	examples: [{ target: '我今天很忙。', reading: 'Wǒ jīntiān hěn máng.', meaning: 'I am very busy today.' }]
});
const pool = [target, item('a'), item('b'), item('c'), item('d')];

describe('buildExercise', () => {
	it('builds a recognition MCQ with the correct meaning among the choices', () => {
		const ex = buildExercise(target, 'recognition', pool, { audio: false, rng: seededRng(1) });
		expect(ex).not.toBeNull();
		expect(ex!.type).toBe('word-to-meaning');
		expect(ex!.promptScript).toBe('今天');
		expect(ex!.choices).toHaveLength(4);
		const correct = ex!.choices!.filter((c) => c.correct);
		expect(correct).toHaveLength(1);
		expect(correct[0].label).toBe('today');
	});

	it('never includes the answer twice among distractors', () => {
		const ex = buildExercise(target, 'recall', pool, { audio: false, rng: seededRng(7) });
		const labels = ex!.choices!.map((c) => c.label);
		expect(new Set(labels).size).toBe(labels.length);
	});

	it('uses a cloze for context when an example exists', () => {
		const ex = buildExercise(target, 'context', pool, { audio: false, rng: seededRng(3) });
		expect(ex!.type).toBe('cloze');
		expect(ex!.clozeText).toContain('＿＿');
		expect(ex!.clozeText).not.toContain('今天');
	});

	it('falls back from cloze to recall when there are no examples', () => {
		const noEx = item('x', { examples: [] });
		const ex = buildExercise(noEx, 'context', [noEx, item('y'), item('z'), item('w')], {
			audio: false,
			rng: seededRng(2)
		});
		expect(ex!.type).toBe('meaning-to-word');
	});

	it('selects record-compare for pronunciation when audio is on', () => {
		const ex = buildExercise(target, 'pronunciation', pool, { audio: true, rng: seededRng(4) });
		expect(ex!.type).toBe('record-compare');
		expect(ex!.choices).toBeUndefined();
	});
});
