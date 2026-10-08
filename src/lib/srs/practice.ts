/**
 * Audio practice ranking — which words Listening and Speaking serve, in what
 * order, and how many.
 *
 * Listening and Speaking are deliberately not due-scheduled: any word with a
 * clip is always available. A session still needs a bound and an order:
 * words never practiced in that skill come first; then the ones that need it
 * most — for Speaking the latest speech-recognition match score when there is
 * one, otherwise the skill's SM-2 ease — stalest first among equals. The
 * session is capped (the review cap), so the picker says "20 of 84".
 */

import type { LearningItem, ManabiDocument } from '$lib/db/types';
import type { QueueTask } from './queue';

export type AudioDimension = 'listening' | 'pronunciation';

export interface RankedPractice {
	tasks: QueueTask[]; // the session, in order
	total: number; // how many words were eligible
}

/** 0–100, lower = needs more work. Ease 1.3 (the SM-2 floor) → 0, 2.5 (default) → 100. */
export function easeToNeed(ease: number): number {
	return Math.max(0, Math.min(100, Math.round(((ease - 1.3) / 1.2) * 100)));
}

export function rankAudioPractice(
	items: LearningItem[],
	dim: AudioDimension,
	doc: ManabiDocument,
	cap: number
): RankedPractice {
	// Speaking: each word's latest speech-recognition score, when it has one.
	const latestScore = new Map<string, { score: number; at: number }>();
	if (dim === 'pronunciation') {
		for (const a of Object.values(doc.pronunciationAttempts ?? {})) {
			if (typeof a.score !== 'number') continue;
			const prev = latestScore.get(a.itemId);
			if (!prev || a.at > prev.at) latestScore.set(a.itemId, { score: a.score, at: a.at });
		}
	}
	const ranked = items.map((it, i) => {
		const st = doc.srsStates[it.id]?.dims[dim];
		const introduced = !!st?.introduced;
		const score = latestScore.get(it.id)?.score;
		const need = score !== undefined ? score : easeToNeed(st?.ease ?? 2.5);
		return { itemId: it.id, introduced, need, last: st?.lastReviewed ?? '', i };
	});
	ranked.sort(
		(a, b) =>
			Number(a.introduced) - Number(b.introduced) ||
			a.need - b.need ||
			a.last.localeCompare(b.last) ||
			a.i - b.i
	);
	return {
		total: ranked.length,
		tasks: ranked
			.slice(0, Math.max(0, cap))
			.map((r) => ({ itemId: r.itemId, dimension: dim, isNew: !r.introduced }))
	};
}
