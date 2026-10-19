import { describe, expect, it } from 'vitest';
import { checkTyped, type AnswerKey } from './answer';

const zh: AnswerKey = { language: 'zh', target: '今天', reading: 'jīntiān', alternatives: ['今天'] };
const nv: AnswerKey = { language: 'zh', target: '女儿', reading: "nǚ'ér", alternatives: ['女兒'] };
const ja: AnswerKey = { language: 'ja', target: '食べる', reading: 'たべる', transliteration: 'taberu' };
const ko: AnswerKey = { language: 'ko', target: '학교', reading: 'hakgyo', transliteration: 'hakgyo' };
const he: AnswerKey = { language: 'he', target: 'שָׁלוֹם', reading: 'shalom', transliteration: 'shalom' };

describe('checkTyped', () => {
	it('accepts the word in its script', () => {
		expect(checkTyped('今天', zh).verdict).toBe('exact');
		expect(checkTyped('女兒', nv).verdict).toBe('exact');
		expect(checkTyped('食べる', ja).verdict).toBe('exact');
		expect(checkTyped('학교', ko).verdict).toBe('exact');
		expect(checkTyped('שלום', he).verdict).toBe('exact'); // no niqqud needed
		expect(checkTyped('שָׁלוֹם', he).verdict).toBe('exact');
	});
	it('pinyin: tone marks or numbers are exact; without tones is close', () => {
		expect(checkTyped('jīntiān', zh).verdict).toBe('exact');
		expect(checkTyped('jin1 tian1', zh).verdict).toBe('exact');
		expect(checkTyped('Jin1Tian1', zh).verdict).toBe('exact');
		expect(checkTyped('jintian', zh)).toEqual({ verdict: 'close', note: 'add the tones' });
		expect(checkTyped('jin2tian1', zh)).toEqual({ verdict: 'close', note: 'check the tones' });
		expect(checkTyped('nv3er2', nv).verdict).toBe('exact');
		expect(checkTyped("nǚ'ér", nv).verdict).toBe('exact');
	});
	it('kana, katakana and romaji', () => {
		expect(checkTyped('たべる', ja).verdict).toBe('exact');
		expect(checkTyped('タベル', ja).verdict).toBe('exact');
		expect(checkTyped('Taberu', ja).verdict).toBe('exact');
	});
	it('romanization, accents ignored', () => {
		expect(checkTyped('hakgyo', ko).verdict).toBe('exact');
		expect(checkTyped('shalóm', he).verdict).toBe('exact');
	});
	it('a small typo is close; anything else is wrong', () => {
		expect(checkTyped('tabero', ja)).toEqual({ verdict: 'close', note: 'small typo' });
		expect(checkTyped('jintien', zh).verdict).toBe('close');
		expect(checkTyped('明天', zh).verdict).toBe('wrong');
		expect(checkTyped('nomu', ja).verdict).toBe('wrong');
		expect(checkTyped('  ', ja).verdict).toBe('wrong');
	});
});
