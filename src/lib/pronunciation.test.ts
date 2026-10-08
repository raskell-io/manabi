import { describe, it, expect } from 'vitest';
import { levenshtein, normalizeForCompare, scorePronunciation, similarity, suggestRating, summarizePronunciation } from './pronunciation';
import type { PronunciationAttempt } from '$lib/db/types';

describe('normalizeForCompare', () => {
	it('drops punctuation/space, folds case and width, strips niqqud, unifies kana', () => {
		expect(normalizeForCompare('今天。', 'zh')).toBe('今天');
		expect(normalizeForCompare('Hello, World!', 'zh')).toBe('helloworld');
		expect(normalizeForCompare('ＡＢＣ　ｄｅｆ', 'ja')).toBe('abcdef');
		expect(normalizeForCompare('カタカナ', 'ja')).toBe('かたかな');
		expect(normalizeForCompare('שָׁלוֹם', 'he')).toBe('שלום');
	});
});

describe('levenshtein / similarity', () => {
	it('computes edit distance over code points', () => {
		expect(levenshtein('abc', 'abc')).toBe(0);
		expect(levenshtein('abc', 'abd')).toBe(1);
		expect(levenshtein('', 'abc')).toBe(3);
		expect(levenshtein('今天', '明天')).toBe(1);
	});
	it('maps to 0..1 with empty strings handled', () => {
		expect(similarity('abc', 'abc')).toBe(1);
		expect(similarity('', '')).toBe(1);
		expect(similarity('a', '')).toBe(0);
		expect(similarity('abc', 'abd')).toBeCloseTo(2 / 3);
	});
});

describe('scorePronunciation', () => {
	it('scores Chinese against the characters, ignoring punctuation', () => {
		expect(scorePronunciation('今天。', { target: '今天', reading: 'jīntiān', language: 'zh' }).score).toBe(100);
		expect(scorePronunciation('明天', { target: '今天', reading: 'jīntiān', language: 'zh' }).score).toBe(50);
		expect(scorePronunciation('', { target: '今天', reading: 'jīntiān', language: 'zh' }).score).toBe(0);
	});
	it('scores Japanese against kanji or the kana reading, whichever is closer', () => {
		const item = { target: '食べる', reading: 'たべる', language: 'ja' as const };
		expect(scorePronunciation('食べる', item)).toEqual({ score: 100, matched: 'target' });
		expect(scorePronunciation('たべる', item)).toEqual({ score: 100, matched: 'reading' });
		expect(scorePronunciation('タベル', item)).toEqual({ score: 100, matched: 'reading' });
	});
	it('scores Hebrew on consonants (recognition returns unpointed text)', () => {
		const item = { target: 'שָׁלוֹם', reading: 'shalom', language: 'he' as const };
		expect(scorePronunciation('שלום', item).score).toBe(100);
		expect(scorePronunciation('שלום!', item).score).toBe(100);
		expect(scorePronunciation('תודה', item).score).toBeLessThan(50);
	});
});

describe('summarizePronunciation', () => {
	const take = (id: string, itemId: string, at: number, score?: number, transcript?: string): PronunciationAttempt => ({
		id, itemId, audioRef: 'r', selfRating: 'okay', at, ...(score === undefined ? {} : { score, transcript })
	});
	const lang = (itemId: string) => (itemId.startsWith('ja') ? 'ja' : itemId === 'ghost' ? undefined : 'zh');

	it('counts takes, scored takes, average, and each item\'s latest scored take, weakest first', () => {
		const s = summarizePronunciation(
			[take('1', 'a', 1, 40, 'x'), take('2', 'a', 5, 90, 'y'), take('3', 'b', 2, 55, 'z'), take('4', 'c', 3), take('5', 'ja1', 4, 10), take('6', 'ghost', 9, 0)],
			lang,
			'zh'
		);
		expect(s.takes).toBe(4);
		expect(s.scored).toBe(3);
		expect(s.avgScore).toBe(62); // (40+90+55)/3
		expect(s.weakest.map((w) => [w.itemId, w.score, w.transcript])).toEqual([['b', 55, 'z'], ['a', 90, 'y']]);
	});
	it('handles no takes and unscored takes', () => {
		expect(summarizePronunciation([], lang, 'zh')).toEqual({ takes: 0, scored: 0, avgScore: null, weakest: [] });
		expect(summarizePronunciation([take('1', 'a', 1)], lang, 'zh')).toEqual({ takes: 1, scored: 0, avgScore: null, weakest: [] });
	});
	it('respects the limit', () => {
		const many = Array.from({ length: 12 }, (_, i) => take(String(i), 'i' + i, i, i * 5));
		expect(summarizePronunciation(many, () => 'zh', 'zh', 3).weakest.map((w) => w.score)).toEqual([0, 5, 10]);
	});
});

describe('suggestRating', () => {
	it('maps scores to good / okay / bad', () => {
		expect(suggestRating(100)).toBe('good');
		expect(suggestRating(85)).toBe('good');
		expect(suggestRating(84)).toBe('okay');
		expect(suggestRating(60)).toBe('okay');
		expect(suggestRating(59)).toBe('bad');
	});
});
