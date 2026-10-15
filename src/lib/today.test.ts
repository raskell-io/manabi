import { describe, it, expect } from 'vitest';
import { computeStreak, formatDuration, greeting, lastSevenDays, pickNextSession } from './today';

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

describe('computeStreak', () => {
	const now = new Date(2026, 9, 15, 20, 0); // Thu 15 Oct 2026, 20:00 local
	const at = (day: number, h = 12) => new Date(2026, 9, day, h).getTime();
	it('counts consecutive days ending today', () => {
		expect(computeStreak([at(13), at(14), at(15, 1), at(15, 9)], now)).toEqual({ days: 3, today: true });
	});
	it('keeps a streak alive through yesterday until today is practiced', () => {
		expect(computeStreak([at(12), at(13), at(14)], now)).toEqual({ days: 3, today: false });
	});
	it('breaks on a gap', () => {
		expect(computeStreak([at(10), at(11), at(13)], now)).toEqual({ days: 0, today: false });
		expect(computeStreak([at(11), at(13), at(14), at(15)], now)).toEqual({ days: 3, today: true });
		expect(computeStreak([], now)).toEqual({ days: 0, today: false });
	});
	it('spans month boundaries', () => {
		const n = new Date(2026, 9, 1, 10);
		expect(computeStreak([new Date(2026, 8, 30, 22).getTime(), new Date(2026, 9, 1, 8).getTime()], n).days).toBe(2);
	});
});

describe('lastSevenDays', () => {
	it('lists the week ending today with practice marks', () => {
		const now = new Date(2026, 9, 15, 20, 0); // a Thursday
		const week = lastSevenDays([new Date(2026, 9, 14, 9).getTime(), new Date(2026, 9, 9, 9).getTime()], now);
		expect(week.map((d) => d.label).join('')).toBe('FSSMTWT');
		expect(week.map((d) => d.done)).toEqual([true, false, false, false, false, true, false]);
		expect(week[6]).toMatchObject({ iso: '2026-10-15', isToday: true });
	});
});

describe('greeting', () => {
	it('follows the clock', () => {
		expect(greeting(3)).toBe('Up late?');
		expect(greeting(8)).toBe('Good morning');
		expect(greeting(14)).toBe('Good afternoon');
		expect(greeting(21)).toBe('Good evening');
	});
});
