/**
 * Home-screen helpers: which session to offer first, and small formatting.
 */

import { isoDate, type Dimension } from '$lib/db/types';
import type { Mode } from '$lib/srs/scope';

export const READING_DIMS = new Set<Dimension>(['recognition', 'recall', 'context']);

export interface NextSession {
	mode: Mode | null; // null → nothing to practice; href points somewhere useful
	title: string;
	detail: string;
	href: string;
}

/**
 * The one thing to tap on Home. Reading (the spaced-repetition core) wins
 * whenever anything is new or due; otherwise audio practice, Listening first
 * (no microphone needed); otherwise a pointer to where words come from.
 */
export function pickNextSession(input: {
	reading: number;
	listening: { count: number; total: number };
	speaking: { count: number; total: number };
	published: number;
}): NextSession {
	const { reading, listening, speaking, published } = input;
	if (reading > 0) {
		return {
			mode: 'reading',
			title: 'Continue reading',
			detail: `${reading} ${reading === 1 ? 'card' : 'cards'} · new & due`,
			href: '/review?mode=reading'
		};
	}
	if (listening.count > 0) {
		return {
			mode: 'listening',
			title: 'Practice listening',
			detail: `${listening.count} of ${listening.total} words · new & weakest first`,
			href: '/review?mode=listening'
		};
	}
	if (speaking.count > 0) {
		return {
			mode: 'speaking',
			title: 'Practice speaking',
			detail: `${speaking.count} of ${speaking.total} words · lowest scores first`,
			href: '/review?mode=speaking'
		};
	}
	if (published > 0) {
		return { mode: null, title: 'All caught up', detail: 'Nothing due right now — come back tomorrow, or browse the Library.', href: '/library' };
	}
	return { mode: null, title: 'Add your first words', detail: 'Browse Vocab or Scripts, or generate a batch in the Workbench.', href: '/library' };
}

/** "42s", "3m 05s", "1h 02m". */
export function formatDuration(ms: number): string {
	const s = Math.max(0, Math.round(ms / 1000));
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
	return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

/** The local calendar day `n` days from `now` (negative = past), as YYYY-MM-DD. */
function dayPlus(now: Date, n: number): string {
	const d = new Date(now);
	d.setDate(d.getDate() + n);
	return isoDate(d);
}

/**
 * Practice streak from attempt timestamps: consecutive local days with at
 * least one attempt, ending today — or ending yesterday while today has no
 * practice yet (the streak is still alive until midnight).
 */
export function computeStreak(timestamps: Iterable<number>, now: Date = new Date()): { days: number; today: boolean } {
	const days = new Set<string>();
	for (const t of timestamps) days.add(isoDate(new Date(t)));
	const today = days.has(dayPlus(now, 0));
	let n = 0;
	for (let i = today ? 0 : -1; days.has(dayPlus(now, i)); i--) n++;
	return { days: n, today };
}

export interface WeekDay {
	iso: string;
	/** One-letter weekday label (M T W T F S S). */
	label: string;
	done: boolean;
	isToday: boolean;
}

/** The last seven local days ending today, with whether each had practice. */
export function lastSevenDays(timestamps: Iterable<number>, now: Date = new Date()): WeekDay[] {
	const days = new Set<string>();
	for (const t of timestamps) days.add(isoDate(new Date(t)));
	const out: WeekDay[] = [];
	for (let i = -6; i <= 0; i++) {
		const d = new Date(now);
		d.setDate(d.getDate() + i);
		const iso = isoDate(d);
		out.push({ iso, label: 'SMTWTFS'[d.getDay()], done: days.has(iso), isToday: i === 0 });
	}
	return out;
}

/** "Good morning" / "Good afternoon" / "Good evening" / "Up late?" by local hour. */
export function greeting(hour: number): string {
	if (hour < 5) return 'Up late?';
	if (hour < 12) return 'Good morning';
	if (hour < 18) return 'Good afternoon';
	return 'Good evening';
}
