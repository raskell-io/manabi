/**
 * Progress views (dashboard): how many reviews fall due on each coming day,
 * and how much was practised on each past day. Pure, over plain data.
 */

import { isoDate, type Dimension, type Language, type LearningItem, type SkillMemory } from '$lib/db/types';

export interface DayCount {
	date: string; // ISO YYYY-MM-DD
	count: number;
}

function addDays(iso: string, n: number): string {
	const [y, m, d] = iso.split('-').map(Number);
	return isoDate(new Date(y, m - 1, d + n));
}

/**
 * Skill reviews due on each of the next `days` days for one language. Today
 * includes anything overdue; only skills already introduced are counted (new
 * ones depend on the daily new-word limit, not on the schedule).
 */
export function reviewForecast(
	items: LearningItem[],
	memories: SkillMemory[],
	language: Language,
	today: string,
	days = 14
): DayCount[] {
	const out = Array.from({ length: days }, (_, i) => ({ date: addDays(today, i), count: 0 }));
	const index = new Map(out.map((d, i) => [d.date, i]));
	const mine = new Set(items.filter((it) => it.language === language && it.status === 'published').map((it) => it.id));
	for (const sm of memories) {
		if (!mine.has(sm.itemId)) continue;
		for (const dim of Object.keys(sm.dims) as Dimension[]) {
			const st = sm.dims[dim];
			if (!st.introduced) continue;
			const i = st.nextReview <= today ? 0 : index.get(st.nextReview);
			if (i !== undefined) out[i].count++;
		}
	}
	return out;
}

/**
 * Practice per day for the last `weeks` weeks as calendar columns (Monday
 * first), ending with the week of `today`; days after today are null.
 */
export function activityCalendar(times: number[], today: string, weeks = 18): (DayCount | null)[][] {
	const perDay = new Map<string, number>();
	for (const t of times) {
		const d = isoDate(new Date(t));
		perDay.set(d, (perDay.get(d) ?? 0) + 1);
	}
	const [y, m, d] = today.split('-').map(Number);
	const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7; // 0 = Monday
	const start = addDays(today, -weekday - (weeks - 1) * 7);
	return Array.from({ length: weeks }, (_, w) =>
		Array.from({ length: 7 }, (_, day) => {
			const date = addDays(start, w * 7 + day);
			return date > today ? null : { date, count: perDay.get(date) ?? 0 };
		})
	);
}

/** Intensity step 0–4 for a count, relative to the busiest day shown. */
export function level(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
	if (count <= 0 || max <= 0) return 0;
	return Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as 1 | 2 | 3 | 4;
}
