import { describe, it, expect } from 'vitest';
import { formatDuration, pickNextSession } from './today';

const none = { count: 0, total: 0 };

describe('pickNextSession', () => {
	it('prefers Reading, then Listening, then Speaking', () => {
		expect(pickNextSession({ reading: 7, listening: { count: 3, total: 9 }, speaking: { count: 3, total: 9 }, published: 9 })).toMatchObject({ mode: 'reading', href: '/review?mode=reading', detail: '7 cards · new & due' });
		expect(pickNextSession({ reading: 0, listening: { count: 3, total: 9 }, speaking: { count: 3, total: 9 }, published: 9 })).toMatchObject({ mode: 'listening', detail: '3 of 9 words · new & weakest first' });
		expect(pickNextSession({ reading: 0, listening: none, speaking: { count: 2, total: 2 }, published: 9 })).toMatchObject({ mode: 'speaking' });
	});
	it('points to the Library when there is nothing to practice', () => {
		expect(pickNextSession({ reading: 0, listening: none, speaking: none, published: 9 })).toMatchObject({ mode: null, title: 'All caught up', href: '/library' });
		expect(pickNextSession({ reading: 0, listening: none, speaking: none, published: 0 })).toMatchObject({ mode: null, title: 'Add your first words' });
	});
	it('singularizes', () => {
		expect(pickNextSession({ reading: 1, listening: none, speaking: none, published: 1 }).detail).toBe('1 card · new & due');
	});
});

describe('formatDuration', () => {
	it('formats seconds, minutes and hours', () => {
		expect(formatDuration(0)).toBe('0s');
		expect(formatDuration(41_600)).toBe('42s');
		expect(formatDuration(185_000)).toBe('3m 05s');
		expect(formatDuration(3_720_000)).toBe('1h 02m');
	});
});
