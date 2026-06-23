/**
 * Multi-dimensional SM-2 scheduler.
 *
 * Each (item, dimension) pair carries its own `DimState`. Grading advances
 * that one dimension's schedule using the classic SM-2 algorithm, adapted
 * from kurumi's flashcard scheduler. Pure functions — unit tested.
 *
 * Quality scale (0-5), as surfaced by the review UI:
 *   0  total blackout ("Again")
 *   3  correct but hard ("Hard")
 *   4  correct ("Good")
 *   5  perfect ("Easy")
 * A quality < 3 is a lapse: repetitions reset and the item comes back soon.
 */

import { isoDatePlus, todayIso, type DimState } from '$lib/db/types';

export const MIN_EASE = 1.3;

/**
 * Apply an SM-2 grade to a dimension's state and return the next state.
 * Does not mutate the input.
 */
export function gradeDimension(prev: DimState, quality: number): DimState {
	const q = Math.max(0, Math.min(5, Math.round(quality)));
	const next: DimState = { ...prev, introduced: true, lastReviewed: todayIso() };

	if (q < 3) {
		// Lapse — relearn from the start, due tomorrow.
		next.repetitions = 0;
		next.interval = 1;
		next.lapses = prev.lapses + 1;
	} else {
		next.repetitions = prev.repetitions + 1;
		if (next.repetitions === 1) {
			next.interval = 1;
		} else if (next.repetitions === 2) {
			next.interval = 6;
		} else {
			next.interval = Math.round(prev.interval * prev.ease);
		}
	}

	// Ease adjustment (SM-2 formula). Applied on every grade, floored at 1.3.
	const ease = prev.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
	next.ease = Math.max(MIN_EASE, Number(ease.toFixed(4)));
	next.nextReview = isoDatePlus(next.interval);

	return next;
}

/** Map a 0-5 grade to whether it counts as "correct" for attempt logging. */
export function isPass(quality: number): boolean {
	return quality >= 3;
}

/** Whether a dimension is due for review on the given ISO date (default today). */
export function isDue(state: DimState, onIso: string = todayIso()): boolean {
	return state.nextReview <= onIso;
}
