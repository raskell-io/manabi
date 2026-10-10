/**
 * Home-screen helpers: which session to offer first, and small formatting.
 */

import type { Dimension } from '$lib/db/types';
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
