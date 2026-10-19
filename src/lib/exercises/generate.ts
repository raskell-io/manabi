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

/** The words of a sentence (punctuation dropped), via Intl.Segmenter. */
export function sentenceWords(text: string, language: LearningItem['language']): string[] {
	if (typeof Intl.Segmenter !== 'function') return text.split(/\s+/).filter(Boolean);
	const seg = new Intl.Segmenter(language, { granularity: 'word' });
	return [...seg.segment(text)].filter((s) => s.isWordLike).map((s) => s.segment);
}

/** A short example (2–8 words) to dictate, about half the time; else none. */
function pickDictation(item: LearningItem, rng: Rng) {
	const usable = item.examples
		.map((ex) => ({ ...ex, words: sentenceWords(ex.target, item.language) }))
		.filter((ex) => ex.words.length >= 2 && ex.words.length <= 8);
	if (!usable.length || rng() < 0.5) return undefined;
	return usable[Math.floor(rng() * usable.length)];
}

function choice(label: string, sublabel: string | undefined, correct: boolean, key: string): Choice {
	return { key, label, sublabel, correct };
}

export interface BuildOptions {
	audio: boolean; // local TTS available
	typed?: boolean; // recall by typing (settings.typedRecall)
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
	let type = exerciseTypeFor(dimension, opts.audio, opts.typed ?? false);

	// Context needs an example sentence; fall back to recall-style if none.
	if (type === 'cloze' && item.examples.length === 0) {
		type = 'meaning-to-word';
	}

	// Listening: every other card or so, a short example sentence to rebuild by ear.
	const dictationExample = type === 'audio-to-word' ? pickDictation(item, rng) : undefined;
	if (dictationExample) type = 'dictation';

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
			// Listening drill: hide the reading on each option so the answer is not
			// given away in text — it should be decided by ear.
			const choices = shuffle(
				[
					choice(item.target, undefined, true, item.id),
					...distractors.map((d) => choice(d.target, undefined, false, d.id))
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
				clozeFull: example.target,
				clozeReading: example.reading,
				clozeTranslit: example.transliteration,
				choices,
				answer: item.target
			};
		}
		case 'type-recall': {
			return {
				...base,
				instruction: 'Type the word',
				promptMode: 'meaning',
				promptMeaning: item.meaning,
				typeKey: {
					language: item.language,
					target: item.target,
					reading: item.reading,
					...(item.transliteration ? { transliteration: item.transliteration } : {})
				},
				answer: item.target
			};
		}
		case 'dictation': {
			const ex = dictationExample!;
			return {
				...base,
				instruction: 'Build the sentence you hear',
				promptMode: 'audio',
				promptScript: ex.target,
				clozeFull: ex.target,
				clozeReading: ex.reading,
				clozeTranslit: ex.transliteration,
				clozeMeaning: ex.meaning,
				tiles: shuffle(ex.words, rng),
				tileAnswer: ex.words,
				answer: ex.target
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
