/**
 * Review-queue builder.
 *
 * Given the document, the active language and the user's daily limits, this
 * produces an ordered list of review tasks — each a (item, dimension) pair.
 * The concrete exercise for a task is chosen later by `exercises/generate.ts`,
 * keeping scheduling and presentation decoupled.
 *
 * Dimensions unlock progressively over an item's life (pitch §1.4): you learn
 * to recognize a word before you're asked to recall it cold. Brand-new items
 * are gated by `newPerDay`; reviews are capped by `reviewCap`.
 *
 * A queue can also be *scoped* to a set of item ids (a lesson). A scope is a
 * bounded, deliberately chosen set, so inside one the daily caps do not apply
 * — "review this lesson" means all of it.
 */

import {
	DIMENSIONS,
	todayIso,
	type Dimension,
	type LearningItem,
	type ManabiDocument,
	type ManabiSettings,
	type SkillMemory
} from '$lib/db/types';
import { isDue } from './schedule';

export interface QueueTask {
	itemId: string;
	dimension: Dimension;
	isNew: boolean; // first time this dimension is studied
}

export interface QueueSummary {
	dueReviews: number;
	newItems: number;
	tasks: QueueTask[];
}

export interface QueueOptions {
	/**
	 * Restrict the queue to these item ids (e.g. a lesson's `itemIds`). Items
	 * keep the scope's order, and `newPerDay` / `reviewCap` are not applied.
	 */
	scope?: ReadonlySet<string>;
}

/**
 * Whether a dimension is available to study yet, based on how far the item's
 * `recognition` skill has progressed. Recognition is the gateway; recall and
 * context (the hardest) come last.
 */
export function isUnlocked(dim: Dimension, srs: SkillMemory): boolean {
	const rec = srs.dims.recognition;
	switch (dim) {
		case 'recognition':
			return true;
		case 'pronunciation':
		case 'listening':
			return rec.introduced;
		case 'context':
			return rec.introduced && rec.repetitions >= 1;
		case 'recall':
			return rec.introduced && rec.repetitions >= 2;
	}
}

function publishedItemsFor(doc: ManabiDocument, language: string): LearningItem[] {
	return Object.values(doc.learningItems).filter(
		(it) => it.language === language && it.status === 'published'
	);
}

/**
 * Build the review queue for the active language.
 *
 * @param onIso  ISO date to schedule against (defaults to today; injectable for tests)
 * @param opts   optional `scope` — restrict to (and order by) a set of item ids
 */
export function buildQueue(
	doc: ManabiDocument,
	settings: ManabiSettings,
	onIso: string = todayIso(),
	opts: QueueOptions = {}
): QueueSummary {
	const language = settings.activeLanguage;
	const scope = opts.scope;
	let items = publishedItemsFor(doc, language);
	if (scope) {
		const order = new Map([...scope].map((id, i) => [id, i] as const));
		items = items
			.filter((it) => order.has(it.id))
			.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
	}
	// A scope is its own bound; the daily caps only apply to the whole collection.
	const reviewLimit = scope ? Infinity : settings.reviewCap;
	const newLimit = scope ? Infinity : settings.newPerDay;

	const reviewTasks: { task: QueueTask; due: string }[] = [];
	const newItemIds: string[] = [];

	for (const item of items) {
		const srs = doc.srsStates[item.id];
		// No SRS state yet, or recognition never introduced → brand-new item.
		if (!srs || !srs.dims.recognition.introduced) {
			newItemIds.push(item.id);
			continue;
		}
		// In-progress item: surface every unlocked dimension that is due.
		for (const dim of DIMENSIONS) {
			const st = srs.dims[dim];
			if (!isUnlocked(dim, srs)) continue;
			if (!isDue(st, onIso)) continue;
			reviewTasks.push({
				task: { itemId: item.id, dimension: dim, isNew: !st.introduced },
				due: st.nextReview
			});
		}
	}

	// Most-overdue first.
	reviewTasks.sort((a, b) => a.due.localeCompare(b.due));
	const reviews = reviewTasks.slice(0, reviewLimit).map((r) => r.task);

	// Introduce up to `newPerDay` brand-new items via their recognition skill.
	const newTasks: QueueTask[] = newItemIds
		.slice(0, newLimit)
		.map((itemId) => ({ itemId, dimension: 'recognition' as Dimension, isNew: true }));

	// New items first so the session starts by learning, then reinforces.
	return {
		dueReviews: reviews.length,
		newItems: newTasks.length,
		tasks: [...newTasks, ...reviews]
	};
}

/** Lightweight counts for the home dashboard without building the full queue. */
export function queueCounts(
	doc: ManabiDocument,
	settings: ManabiSettings,
	onIso: string = todayIso(),
	opts: QueueOptions = {}
): { dueReviews: number; newItems: number } {
	const summary = buildQueue(doc, settings, onIso, opts);
	return { dueReviews: summary.dueReviews, newItems: summary.newItems };
}
