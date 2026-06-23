import { describe, it, expect } from 'vitest';
import { gradeDimension, isPass, isDue, MIN_EASE } from './schedule';
import { freshDimState, isoDatePlus, todayIso, type DimState } from '$lib/db/types';

describe('gradeDimension', () => {
	it('introduces and schedules a fresh dimension on a good grade', () => {
		const next = gradeDimension(freshDimState(), 4);
		expect(next.introduced).toBe(true);
		expect(next.repetitions).toBe(1);
		expect(next.interval).toBe(1);
		expect(next.nextReview).toBe(isoDatePlus(1));
		expect(next.lastReviewed).toBe(todayIso());
	});

	it('follows the 1 → 6 → interval*ease progression', () => {
		let st = gradeDimension(freshDimState(), 4); // rep 1, interval 1
		expect(st.interval).toBe(1);
		st = gradeDimension(st, 4); // rep 2, interval 6
		expect(st.interval).toBe(6);
		const easeBefore = st.ease;
		st = gradeDimension(st, 4); // rep 3, interval = round(6 * ease)
		expect(st.interval).toBe(Math.round(6 * easeBefore));
		expect(st.repetitions).toBe(3);
	});

	it('treats quality < 3 as a lapse: resets reps, due tomorrow, counts the lapse', () => {
		let st = gradeDimension(freshDimState(), 5);
		st = gradeDimension(st, 5); // interval 6
		const lapsed = gradeDimension(st, 1);
		expect(lapsed.repetitions).toBe(0);
		expect(lapsed.interval).toBe(1);
		expect(lapsed.lapses).toBe(1);
		expect(lapsed.nextReview).toBe(isoDatePlus(1));
	});

	it('raises ease on easy grades and lowers it on hard grades', () => {
		const easy = gradeDimension(freshDimState(), 5);
		expect(easy.ease).toBeGreaterThan(2.5);
		const hard = gradeDimension(freshDimState(), 3);
		expect(hard.ease).toBeLessThan(2.5);
	});

	it('never lets ease fall below the floor', () => {
		let st: DimState = freshDimState();
		for (let i = 0; i < 20; i++) st = gradeDimension(st, 0);
		expect(st.ease).toBeGreaterThanOrEqual(MIN_EASE);
	});
});

describe('isPass', () => {
	it('passes at 3+, fails below', () => {
		expect(isPass(3)).toBe(true);
		expect(isPass(2)).toBe(false);
	});
});

describe('isDue', () => {
	it('is due when nextReview is today or earlier', () => {
		const st = { ...freshDimState(), nextReview: todayIso() };
		expect(isDue(st)).toBe(true);
	});
	it('is not due when nextReview is in the future', () => {
		const st = { ...freshDimState(), nextReview: isoDatePlus(3) };
		expect(isDue(st)).toBe(false);
	});
});
