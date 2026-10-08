/**
 * Review scopes — a named set of item ids a review session is restricted to.
 *
 *   /review?lesson=<id>                     a lesson (the Lessons page)
 *   /review?items=<id,id,…>&title=<label>   any explicit set — "Drill these" on
 *                                           Progress, "Review these" on Items
 *   …&mode=reading|listening|speaking|everything   start that mode right away
 *
 * Inside a scope the daily caps are lifted (see `buildQueue`): a scope is a
 * bounded set the learner chose deliberately.
 */

import type { Language, ManabiDocument } from '$lib/db/types';

export type Mode = 'reading' | 'listening' | 'speaking' | 'everything';
const MODES: Mode[] = ['reading', 'listening', 'speaking', 'everything'];

/** Keep deep links sane: an explicit set is capped at this many ids. */
export const MAX_SCOPE_ITEMS = 300;

export interface ReviewScope {
	kind: 'lesson' | 'items';
	title: string;
	language: Language;
	itemIds: string[];
}

export type ResolvedScope =
	| { ok: true; scope: ReviewScope | null }
	| { ok: false; reason: 'lesson-missing' | 'no-items' };

/** Build the `/review` link for an explicit item set. */
export function scopeHref(itemIds: string[], title: string, mode?: Mode): string {
	const q = new URLSearchParams();
	q.set('items', itemIds.slice(0, MAX_SCOPE_ITEMS).join(','));
	q.set('title', title);
	if (mode) q.set('mode', mode);
	return `/review?${q.toString()}`;
}

export function parseMode(params: URLSearchParams): Mode | null {
	const m = params.get('mode');
	return MODES.includes(m as Mode) ? (m as Mode) : null;
}

/**
 * Resolve the scope named by a `/review` query. Explicit sets keep only items
 * that exist and are published; if none are in the active language but some
 * are in another, that language is used so deep links keep working.
 */
export function resolveScope(
	doc: ManabiDocument,
	params: URLSearchParams,
	activeLanguage: Language
): ResolvedScope {
	const lessonId = params.get('lesson');
	if (lessonId) {
		const lesson = doc.lessons[lessonId];
		if (!lesson) return { ok: false, reason: 'lesson-missing' };
		return {
			ok: true,
			scope: { kind: 'lesson', title: lesson.title, language: lesson.language, itemIds: [...lesson.itemIds] }
		};
	}
	const raw = params.get('items');
	if (raw !== null) {
		const ids = raw.split(',').filter(Boolean).slice(0, MAX_SCOPE_ITEMS);
		const found = ids
			.map((id) => doc.learningItems[id])
			.filter((it) => it && it.status === 'published');
		if (found.length === 0) return { ok: false, reason: 'no-items' };
		const language = found.some((it) => it.language === activeLanguage)
			? activeLanguage
			: found[0].language;
		return {
			ok: true,
			scope: {
				kind: 'items',
				title: params.get('title')?.trim() || 'Selected items',
				language,
				itemIds: found.filter((it) => it.language === language).map((it) => it.id)
			}
		};
	}
	return { ok: true, scope: null };
}
