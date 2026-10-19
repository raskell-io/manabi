import { describe, expect, it } from 'vitest';
import { pinyinToZhuyin, readingSyllables, rubySegments } from './zhuyin';
import { seedItems, seedPassages } from './db/seed';
import { HANZI_HSK1, HANZI_HSK2, HANZI_HSK3 } from './scripts-data';

describe('pinyinToZhuyin', () => {
	it.each([
		['jīntiān', 'ㄐㄧㄣ ㄊㄧㄢ'],
		['nǐ hǎo', 'ㄋㄧˇ ㄏㄠˇ'],
		['xièxie', 'ㄒㄧㄝˋ ˙ㄒㄧㄝ'],
		['māma', 'ㄇㄚ ˙ㄇㄚ'],
		['shì', 'ㄕˋ'],
		['zì', 'ㄗˋ'],
		['rì', 'ㄖˋ'],
		['xué', 'ㄒㄩㄝˊ'],
		['qù', 'ㄑㄩˋ'],
		['jiǒng', 'ㄐㄩㄥˇ'],
		['nǚ', 'ㄋㄩˇ'],
		['lǜ', 'ㄌㄩˋ'],
		['yuè', 'ㄩㄝˋ'],
		['yī', 'ㄧ'],
		['wǒ', 'ㄨㄛˇ'],
		['yǒu', 'ㄧㄡˇ'],
		['liù', 'ㄌㄧㄡˋ'],
		['duì', 'ㄉㄨㄟˋ'],
		['lùn', 'ㄌㄨㄣˋ'],
		['jūn', 'ㄐㄩㄣ'],
		['ér', 'ㄦˊ'],
		['bō', 'ㄅㄛ'],
		['zhōngguó', 'ㄓㄨㄥ ㄍㄨㄛˊ'],
		['Běijīng', 'ㄅㄟˇ ㄐㄧㄥ'],
		["Xī'ān", 'ㄒㄧ ㄢ'],
		['xiān', 'ㄒㄧㄢ'],
		['dàngāo', 'ㄉㄢˋ ㄍㄠ'],
		['nǎr', 'ㄋㄚˇㄦ'],
		['yìdiǎnr', 'ㄧˋ ㄉㄧㄢˇㄦ'],
		['yī diǎn r', 'ㄧ ㄉㄧㄢˇㄦ']
	])('%s → %s', (pinyin, zhuyin) => {
		expect(pinyinToZhuyin(pinyin)).toBe(zhuyin);
	});

	it('keeps punctuation and spacing of a sentence', () => {
		expect(pinyinToZhuyin('Nǐ hǎo ma?')).toBe('ㄋㄧˇ ㄏㄠˇ ˙ㄇㄚ?');
		expect(pinyinToZhuyin('Wǒ jīntiān hěn máng.')).toBe('ㄨㄛˇ ㄐㄧㄣ ㄊㄧㄢ ㄏㄣˇ ㄇㄤˊ.');
	});

	it('leaves what is not pinyin alone', () => {
		expect(pinyinToZhuyin('KTV')).toBe('KTV');
		expect(pinyinToZhuyin('3 diǎn')).toBe('3 ㄉㄧㄢˇ');
	});

	it('converts every Chinese reading Manabi ships', () => {
		const readings = [
			...seedItems().filter((it) => it.language === 'zh').flatMap((it) => [it.reading, ...it.examples.map((e) => e.reading)]),
			...seedPassages().filter((p) => p.language === 'zh').flatMap((p) => p.lines.map((l) => l.reading)),
			...[...HANZI_HSK1, ...HANZI_HSK2, ...HANZI_HSK3].flatMap((g) => g.roman.split(/[,/]\s*/))
		];
		const leftovers = readings.filter((r) => /[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/i.test(pinyinToZhuyin(r)));
		expect(leftovers).toEqual([]);
	});
});

describe('syllables for ruby', () => {
	it('splits a reading into one syllable per hanzi', () => {
		expect(readingSyllables('jīntiān', 'pinyin')).toEqual(['jīn', 'tiān']);
		expect(readingSyllables('Wǒ jīntiān hěn máng.', 'zhuyin')).toEqual(['ㄨㄛˇ', 'ㄐㄧㄣ', 'ㄊㄧㄢ', 'ㄏㄣˇ', 'ㄇㄤˊ']);
		expect(readingSyllables("Xī'ān", 'pinyin')).toEqual(['Xī', 'ān']);
		expect(readingSyllables('yīhuìr', 'zhuyin')).toEqual(['ㄧ', 'ㄏㄨㄟˋ', 'ㄦ']);
		expect(readingSyllables('KTV', 'pinyin')).toBeNull();
	});
	it('pairs hanzi with syllables, skipping punctuation', () => {
		expect(rubySegments('我很忙。', readingSyllables('Wǒ hěn máng.', 'pinyin'))).toEqual([
			{ text: '我', rt: 'Wǒ' },
			{ text: '很', rt: 'hěn' },
			{ text: '忙', rt: 'máng' },
			{ text: '。' }
		]);
		expect(rubySegments('一会儿', readingSyllables('yīhuìr', 'pinyin'))?.map((s) => s.rt)).toEqual(['yī', 'huì', 'r']);
		expect(rubySegments('我很忙', readingSyllables('wǒ hěn', 'pinyin'))).toBeNull();
	});
	it('every shipped seed word lines up', () => {
		const zh = seedItems().filter((it) => it.language === 'zh' && /\p{Script=Han}/u.test(it.target));
		const off = zh.filter((it) => !rubySegments(it.target, readingSyllables(it.reading, 'pinyin'))).map((it) => `${it.target} ${it.reading}`);
		expect(off).toEqual([]);
	});
});
