import { describe, expect, it } from 'vitest';
import { colloquialize, jyutpingRuby, jyutpingSyllables, splitJyutping } from './cantonese';

describe('jyutpingSyllables', () => {
	it('splits a sentence into syllables, dropping punctuation and case', () => {
		expect(jyutpingSyllables('Nei5 hou2, ngo5 hai6 Siu2 Ming4!')).toEqual(['nei5', 'hou2', 'ngo5', 'hai6', 'siu2', 'ming4']);
	});
	it('handles gw / kw / ng initials and syllabic m, ng', () => {
		expect(jyutpingSyllables('gwong2 dung1 waa2')).toEqual(['gwong2', 'dung1', 'waa2']);
		expect(jyutpingSyllables('m4 goi1')).toEqual(['m4', 'goi1']);
		expect(jyutpingSyllables('ng5')).toEqual(['ng5']);
	});
	it('rejects text that is not Jyutping', () => {
		expect(jyutpingSyllables('nǐ hǎo')).toBeNull();
		expect(jyutpingSyllables('nei hou')).toBeNull();
		expect(jyutpingSyllables('')).toBeNull();
	});
});

describe('jyutpingRuby', () => {
	it('puts one syllable over each character, punctuation left alone', () => {
		expect(jyutpingRuby('唔該，一杯茶。', 'm4 goi1, jat1 bui1 caa4.')).toEqual([
			{ text: '唔', rt: 'm4' },
			{ text: '該', rt: 'goi1' },
			{ text: '，' },
			{ text: '一', rt: 'jat1' },
			{ text: '杯', rt: 'bui1' },
			{ text: '茶', rt: 'caa4' },
			{ text: '。' }
		]);
	});
	it('gives up when the counts differ', () => {
		expect(jyutpingRuby('你好', 'nei5')).toBeNull();
		expect(jyutpingRuby('你好', undefined)).toBeNull();
	});
});

describe('splitJyutping', () => {
	it('separates letters from tone digits', () => {
		expect(splitJyutping('Nei5 hou2')).toEqual({ letters: 'neihou', tones: '52' });
		expect(splitJyutping('nei hou')).toEqual({ letters: 'neihou', tones: '' });
	});
});

describe('colloquialize', () => {
	it('swaps written forms for the colloquial ones the target uses', () => {
		expect(colloquialize('他是我的朋友', '佢係我嘅朋友')).toBe('佢係我嘅朋友');
		expect(colloquialize('我沒有錢', '我冇錢')).toBe('我冇錢');
	});
	it('leaves words the target writes the standard way', () => {
		expect(colloquialize('是', '是非')).toBe('是');
		expect(colloquialize('我們去吃飯', '我哋去食飯')).toBe('我哋去食飯');
	});
});
