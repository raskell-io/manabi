import { describe, expect, it } from 'vitest';
import { activityCalendar, level, reviewForecast, xpSummary } from './stats';
import { freshSkillMemory, type LearningItem } from '$lib/db/types';

const item = (id: string, language: 'zh' | 'ja' = 'zh'): LearningItem => ({
	id, language, kind: 'word', target: id, reading: id, meaning: id, tags: [], level: 'A1', examples: [], status: 'published', createdAt: 0, updatedAt: 0
});

describe('reviewForecast', () => {
	it('buckets introduced skills by due date, overdue into today', () => {
		const a = freshSkillMemory('a');
		a.dims.recognition = { ...a.dims.recognition, introduced: true, nextReview: '2026-10-10' }; // overdue
		a.dims.listening = { ...a.dims.listening, introduced: true, nextReview: '2026-10-21' };
		a.dims.context = { ...a.dims.context, introduced: false, nextReview: '2026-10-20' }; // new: not counted
		const b = freshSkillMemory('b');
		b.dims.recognition = { ...b.dims.recognition, introduced: true, nextReview: '2026-11-30' }; // beyond range
		const c = freshSkillMemory('c'); // Japanese
		c.dims.recognition = { ...c.dims.recognition, introduced: true, nextReview: '2026-10-20' };
		const f = reviewForecast([item('a'), item('b'), item('c', 'ja')], [a, b, c], 'zh', '2026-10-20', 7);
		expect(f.map((d) => d.count)).toEqual([1, 1, 0, 0, 0, 0, 0]);
		expect(f[0].date).toBe('2026-10-20');
		expect(f[6].date).toBe('2026-10-26');
	});
});

describe('activityCalendar', () => {
	it('lays out weeks Monday-first, ending this week, counting per local day', () => {
		const at = (iso: string, h = 12) => new Date(`${iso}T${String(h).padStart(2, '0')}:00:00`).getTime();
		const cal = activityCalendar([at('2026-10-19'), at('2026-10-19', 20), at('2026-10-14')], '2026-10-21', 2);
		expect(cal).toHaveLength(2);
		expect(cal[0][0]?.date).toBe('2026-10-12'); // a Monday
		expect(cal[0][2]).toEqual({ date: '2026-10-14', count: 1 });
		expect(cal[1][0]).toEqual({ date: '2026-10-19', count: 2 });
		expect(cal[1][2]).toEqual({ date: '2026-10-21', count: 0 }); // today
		expect(cal[1][3]).toBeNull(); // the future
	});
	it('levels are relative to the busiest day', () => {
		expect([0, 1, 5, 10, 20].map((n) => level(n, 20))).toEqual([0, 1, 1, 2, 4]);
		expect(level(3, 0)).toBe(0);
	});
});

describe('xpSummary', () => {
	const at = (iso: string, h = 12) => {
		const [y, m, d] = iso.split('-').map(Number);
		return new Date(y, m - 1, d, h).getTime();
	};
	it('adds up overall, today and the last seven days', () => {
		const s = xpSummary(
			[
				{ at: at('2026-10-19', 8), xp: 40, language: 'zh' },
				{ at: at('2026-10-19', 20), xp: 15, language: 'ja' },
				{ at: at('2026-10-13'), xp: 30, language: 'zh' },
				{ at: at('2026-10-12'), xp: 100, language: 'ko' }
			],
			'2026-10-19'
		);
		expect(s).toEqual({ total: 185, today: 55, week: 85 });
	});
	it('is all zero with no sessions', () => {
		expect(xpSummary([], '2026-10-19')).toEqual({ total: 0, today: 0, week: 0 });
	});
});
