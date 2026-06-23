/**
 * Build a concrete `Exercise` from a review task.
 *
 * Distractors are drawn from other items in the same language, preferring the
 * same kind/level/tags so wrong options are plausible but not ambiguous
 * (pitch §8). `rng` is injectable so the logic is deterministic in tests.
 */

import type { Dimension, LearningItem } from '$lib/db/types';
import { exerciseTypeFor, type Choice, type Exercise } from './templates';

type Rng = () => number;

function shuffle<T>(arr: T[], rng: Rng): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/** Score how good a distractor `cand` is for `item` — higher is closer. */
function affinity(item: LearningItem, cand: LearningItem): number {
	let score = 0;
	if (cand.kind === item.kind) score += 1;
	if (cand.level === item.level) score += 1;
	const shared = cand.tags.filter((t) => item.tags.includes(t)).length;
	score += shared;
	return score;
}

/** Pick up to `n` distractor items (excluding `item`), closest-first then random. */
function pickDistractors(item: LearningItem, pool: LearningItem[], n: number, rng: Rng): LearningItem[] {
	const candidates = pool.filter((p) => p.id !== item.id && p.target !== item.target);
	// Group by affinity, shuffle within group, then take the best `n`.
	const ranked = shuffle(candidates, rng).sort((a, b) => affinity(item, b) - affinity(item, a));
	return ranked.slice(0, n);
}

function choice(label: string, sublabel: string | undefined, correct: boolean, key: string): Choice {
	return { key, label, sublabel, correct };
}

export interface BuildOptions {
	audio: boolean; // local TTS available
	rng?: Rng;
	choiceCount?: number; // total options incl. correct (default 4)
}

/**
 * Build the exercise for `(item, dimension)`. Returns null only when the item
 * can't support the chosen drill and has no fallback (shouldn't happen for
 * seeded content).
 */
export function buildExercise(
	item: LearningItem,
	dimension: Dimension,
	pool: LearningItem[],
	opts: BuildOptions
): Exercise | null {
	const rng = opts.rng ?? Math.random;
	const total = opts.choiceCount ?? 4;
	let type = exerciseTypeFor(dimension, opts.audio);

	// Context needs an example sentence; fall back to recall-style if none.
	if (type === 'cloze' && item.examples.length === 0) {
		type = 'meaning-to-word';
	}

	const base = {
		itemId: item.id,
		language: item.language,
		dimension,
		type,
		instruction: '',
		answer: ''
	} satisfies Partial<Exercise> as Exercise;

	const distractors = pickDistractors(item, pool, total - 1, rng);

	switch (type) {
		case 'word-to-meaning': {
			const choices = shuffle(
				[
					choice(item.meaning, undefined, true, item.id),
					...distractors.map((d) => choice(d.meaning, undefined, false, d.id))
				],
				rng
			);
			return {
				...base,
				instruction: 'What does this mean?',
				promptMode: 'script',
				promptScript: item.target,
				promptReading: item.reading,
				choices,
				answer: item.meaning
			};
		}
		case 'word-to-reading': {
			const choices = shuffle(
				[
					choice(item.reading, item.transliteration, true, item.id),
					...distractors.map((d) => choice(d.reading, d.transliteration, false, d.id))
				],
				rng
			);
			return {
				...base,
				instruction: 'How is this pronounced?',
				promptMode: 'script',
				promptScript: item.target,
				choices,
				answer: item.reading
			};
		}
		case 'reading-to-word': {
			const choices = shuffle(
				[
					choice(item.target, undefined, true, item.id),
					...distractors.map((d) => choice(d.target, undefined, false, d.id))
				],
				rng
			);
			return {
				...base,
				instruction: 'Which word is this?',
				promptMode: 'reading',
				promptReading: item.reading,
				promptMeaning: item.meaning,
				choices,
				answer: item.target
			};
		}
		case 'audio-to-word': {
			const choices = shuffle(
				[
					choice(item.target, item.reading, true, item.id),
					...distractors.map((d) => choice(d.target, d.reading, false, d.id))
				],
				rng
			);
			return {
				...base,
				instruction: 'Which word do you hear?',
				promptMode: 'audio',
				promptScript: item.target, // synthesized by the runner
				promptAudioRef: item.audioRef,
				choices,
				answer: item.target
			};
		}
		case 'meaning-to-word': {
			const choices = shuffle(
				[
					choice(item.target, item.reading, true, item.id),
					...distractors.map((d) => choice(d.target, d.reading, false, d.id))
				],
				rng
			);
			return {
				...base,
				instruction: 'Choose the word',
				promptMode: 'meaning',
				promptMeaning: item.meaning,
				choices,
				answer: item.target
			};
		}
		case 'cloze': {
			const example = item.examples[Math.floor(rng() * item.examples.length)];
			const blanked = example.target.includes(item.target)
				? example.target.replace(item.target, '＿＿')
				: `＿＿ (${example.target})`;
			const choices = shuffle(
				[
					choice(item.target, item.reading, true, item.id),
					...distractors.map((d) => choice(d.target, d.reading, false, d.id))
				],
				rng
			);
			return {
				...base,
				instruction: 'Fill in the blank',
				promptMode: 'cloze',
				clozeText: blanked,
				clozeMeaning: example.meaning,
				choices,
				answer: item.target
			};
		}
		case 'record-compare': {
			return {
				...base,
				instruction: 'Listen, then record yourself',
				promptMode: 'audio',
				promptScript: item.target,
				promptReading: item.reading,
				promptAudioRef: item.audioRef,
				answer: item.target
			};
		}
	}
}
