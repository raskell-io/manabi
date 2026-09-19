import { describe, it, expect } from 'vitest';
import { levenshtein, normalizeForCompare, scorePronunciation, similarity, suggestRating } from './pronunciation';

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

describe('suggestRating', () => {
	it('maps scores to good / okay / bad', () => {
		expect(suggestRating(100)).toBe('good');
		expect(suggestRating(85)).toBe('good');
		expect(suggestRating(84)).toBe('okay');
		expect(suggestRating(60)).toBe('okay');
		expect(suggestRating(59)).toBe('bad');
	});
});
