/**
 * Script reference tables — full kana, the Hebrew alef-bet, and starter
 * kanji/hanzi sets. Static reference data rendered on `/tables`; any glyph can
 * be sent into the SRS (see store `studyScriptChar`).
 *
 * Kana are laid out as the gojūon 5-column grid (a/i/u/e/o columns), with
 * `null` for the gaps (yi, ye, wu, …). Hebrew + characters are flat lists.
 */

import type { Language } from './db/types';

/** One glyph: the character, its reading (romaji / letter name / pinyin), and an optional gloss. */
export interface Glyph {
	char: string;
	roman: string;
	gloss?: string;
}

export type GridLayout = 'kana' | 'wrap';

export interface ScriptSection {
	id: string;
	title: string;
	subtitle?: string;
	layout: GridLayout;
	/** kana layout: rows of 5 cells (null = gap). */
	rows?: (Glyph | null)[][];
	/** wrap layout: a flat list of glyphs. */
	glyphs?: Glyph[];
}

const g = (char: string, roman: string, gloss?: string): Glyph => ({ char, roman, gloss });

// --- Japanese kana ----------------------------------------------------------

const HIRAGANA_BASE: (Glyph | null)[][] = [
	[g('あ', 'a'), g('い', 'i'), g('う', 'u'), g('え', 'e'), g('お', 'o')],
	[g('か', 'ka'), g('き', 'ki'), g('く', 'ku'), g('け', 'ke'), g('こ', 'ko')],
	[g('さ', 'sa'), g('し', 'shi'), g('す', 'su'), g('せ', 'se'), g('そ', 'so')],
	[g('た', 'ta'), g('ち', 'chi'), g('つ', 'tsu'), g('て', 'te'), g('と', 'to')],
	[g('な', 'na'), g('に', 'ni'), g('ぬ', 'nu'), g('ね', 'ne'), g('の', 'no')],
	[g('は', 'ha'), g('ひ', 'hi'), g('ふ', 'fu'), g('へ', 'he'), g('ほ', 'ho')],
	[g('ま', 'ma'), g('み', 'mi'), g('む', 'mu'), g('め', 'me'), g('も', 'mo')],
	[g('や', 'ya'), null, g('ゆ', 'yu'), null, g('よ', 'yo')],
	[g('ら', 'ra'), g('り', 'ri'), g('る', 'ru'), g('れ', 're'), g('ろ', 'ro')],
	[g('わ', 'wa'), null, null, null, g('を', 'wo')],
	[g('ん', 'n'), null, null, null, null]
];

const HIRAGANA_DAKUTEN: (Glyph | null)[][] = [
	[g('が', 'ga'), g('ぎ', 'gi'), g('ぐ', 'gu'), g('げ', 'ge'), g('ご', 'go')],
	[g('ざ', 'za'), g('じ', 'ji'), g('ず', 'zu'), g('ぜ', 'ze'), g('ぞ', 'zo')],
	[g('だ', 'da'), g('ぢ', 'ji'), g('づ', 'zu'), g('で', 'de'), g('ど', 'do')],
	[g('ば', 'ba'), g('び', 'bi'), g('ぶ', 'bu'), g('べ', 'be'), g('ぼ', 'bo')],
	[g('ぱ', 'pa'), g('ぴ', 'pi'), g('ぷ', 'pu'), g('ぺ', 'pe'), g('ぽ', 'po')]
];

const KATAKANA_BASE: (Glyph | null)[][] = [
	[g('ア', 'a'), g('イ', 'i'), g('ウ', 'u'), g('エ', 'e'), g('オ', 'o')],
	[g('カ', 'ka'), g('キ', 'ki'), g('ク', 'ku'), g('ケ', 'ke'), g('コ', 'ko')],
	[g('サ', 'sa'), g('シ', 'shi'), g('ス', 'su'), g('セ', 'se'), g('ソ', 'so')],
	[g('タ', 'ta'), g('チ', 'chi'), g('ツ', 'tsu'), g('テ', 'te'), g('ト', 'to')],
	[g('ナ', 'na'), g('ニ', 'ni'), g('ヌ', 'nu'), g('ネ', 'ne'), g('ノ', 'no')],
	[g('ハ', 'ha'), g('ヒ', 'hi'), g('フ', 'fu'), g('ヘ', 'he'), g('ホ', 'ho')],
	[g('マ', 'ma'), g('ミ', 'mi'), g('ム', 'mu'), g('メ', 'me'), g('モ', 'mo')],
	[g('ヤ', 'ya'), null, g('ユ', 'yu'), null, g('ヨ', 'yo')],
	[g('ラ', 'ra'), g('リ', 'ri'), g('ル', 'ru'), g('レ', 're'), g('ロ', 'ro')],
	[g('ワ', 'wa'), null, null, null, g('ヲ', 'wo')],
	[g('ン', 'n'), null, null, null, null]
];

const KATAKANA_DAKUTEN: (Glyph | null)[][] = [
	[g('ガ', 'ga'), g('ギ', 'gi'), g('グ', 'gu'), g('ゲ', 'ge'), g('ゴ', 'go')],
	[g('ザ', 'za'), g('ジ', 'ji'), g('ズ', 'zu'), g('ゼ', 'ze'), g('ゾ', 'zo')],
	[g('ダ', 'da'), g('ヂ', 'ji'), g('ヅ', 'zu'), g('デ', 'de'), g('ド', 'do')],
	[g('バ', 'ba'), g('ビ', 'bi'), g('ブ', 'bu'), g('ベ', 'be'), g('ボ', 'bo')],
	[g('パ', 'pa'), g('ピ', 'pi'), g('プ', 'pu'), g('ペ', 'pe'), g('ポ', 'po')]
];

// --- Kanji (starter set) ----------------------------------------------------

const KANJI: Glyph[] = [
	g('一', 'ichi', 'one'), g('二', 'ni', 'two'), g('三', 'san', 'three'), g('四', 'shi / yon', 'four'),
	g('五', 'go', 'five'), g('六', 'roku', 'six'), g('七', 'shichi / nana', 'seven'), g('八', 'hachi', 'eight'),
	g('九', 'kyū / ku', 'nine'), g('十', 'jū', 'ten'), g('百', 'hyaku', 'hundred'), g('千', 'sen', 'thousand'),
	g('万', 'man', 'ten thousand'),
	g('日', 'nichi / hi', 'day / sun'), g('月', 'getsu / tsuki', 'month / moon'), g('火', 'ka / hi', 'fire'),
	g('水', 'sui / mizu', 'water'), g('木', 'moku / ki', 'tree / wood'), g('金', 'kin / kane', 'gold / money'),
	g('土', 'do / tsuchi', 'earth / soil'), g('山', 'yama', 'mountain'), g('川', 'kawa', 'river'),
	g('田', 'ta', 'rice field'), g('天', 'ten', 'heaven / sky'), g('雨', 'ame', 'rain'),
	g('人', 'hito / jin', 'person'), g('男', 'otoko', 'man'), g('女', 'onna', 'woman'), g('子', 'ko', 'child'),
	g('目', 'me', 'eye'), g('口', 'kuchi', 'mouth'), g('手', 'te', 'hand'), g('心', 'kokoro', 'heart / mind'),
	g('大', 'dai / ō', 'big'), g('小', 'shō / chii', 'small'), g('中', 'naka / chū', 'middle / inside'),
	g('上', 'ue / jō', 'up / above'), g('下', 'shita / ka', 'down / below'), g('左', 'hidari', 'left'),
	g('右', 'migi', 'right'), g('本', 'hon', 'book / origin')
];

// --- Hanzi (starter set) ----------------------------------------------------

const HANZI: Glyph[] = [
	g('一', 'yī', 'one'), g('二', 'èr', 'two'), g('三', 'sān', 'three'), g('四', 'sì', 'four'),
	g('五', 'wǔ', 'five'), g('六', 'liù', 'six'), g('七', 'qī', 'seven'), g('八', 'bā', 'eight'),
	g('九', 'jiǔ', 'nine'), g('十', 'shí', 'ten'), g('百', 'bǎi', 'hundred'), g('千', 'qiān', 'thousand'),
	g('万', 'wàn', 'ten thousand'),
	g('日', 'rì', 'sun / day'), g('月', 'yuè', 'moon / month'), g('水', 'shuǐ', 'water'), g('火', 'huǒ', 'fire'),
	g('木', 'mù', 'tree / wood'), g('金', 'jīn', 'gold / metal'), g('土', 'tǔ', 'earth / soil'),
	g('山', 'shān', 'mountain'), g('川', 'chuān', 'river'), g('天', 'tiān', 'sky / heaven'), g('雨', 'yǔ', 'rain'),
	g('人', 'rén', 'person'), g('男', 'nán', 'man'), g('女', 'nǚ', 'woman'), g('子', 'zǐ', 'child'),
	g('目', 'mù', 'eye'), g('口', 'kǒu', 'mouth'), g('手', 'shǒu', 'hand'), g('心', 'xīn', 'heart'),
	g('大', 'dà', 'big'), g('小', 'xiǎo', 'small'), g('中', 'zhōng', 'middle'), g('上', 'shàng', 'up / above'),
	g('下', 'xià', 'down / below'), g('左', 'zuǒ', 'left'), g('右', 'yòu', 'right'), g('本', 'běn', 'root / book')
];

const PINYIN_TONES: Glyph[] = [
	g('mā', '1st — high level', 'mother (妈)'),
	g('má', '2nd — rising', 'hemp (麻)'),
	g('mǎ', '3rd — dip-rising', 'horse (马)'),
	g('mà', '4th — falling', 'scold (骂)'),
	g('ma', 'neutral', 'question particle (吗)')
];

// --- Hebrew alef-bet --------------------------------------------------------

const ALEFBET: Glyph[] = [
	g('א', 'alef', 'silent / glottal'), g('ב', 'bet', 'b / v'), g('ג', 'gimel', 'g'), g('ד', 'dalet', 'd'),
	g('ה', 'he', 'h'), g('ו', 'vav', 'v / o / u'), g('ז', 'zayin', 'z'), g('ח', 'chet', 'kh (guttural)'),
	g('ט', 'tet', 't'), g('י', 'yod', 'y'), g('כ', 'kaf', 'k / kh'), g('ל', 'lamed', 'l'), g('מ', 'mem', 'm'),
	g('נ', 'nun', 'n'), g('ס', 'samekh', 's'), g('ע', 'ayin', 'silent / glottal'), g('פ', 'pe', 'p / f'),
	g('צ', 'tsadi', 'ts'), g('ק', 'qof', 'k'), g('ר', 'resh', 'r'), g('ש', 'shin / sin', 'sh / s'),
	g('ת', 'tav', 't')
];

const ALEFBET_FINALS: Glyph[] = [
	g('ך', 'kaf sofit', 'final kaf (kh)'), g('ם', 'mem sofit', 'final mem (m)'),
	g('ן', 'nun sofit', 'final nun (n)'), g('ף', 'pe sofit', 'final pe (f)'),
	g('ץ', 'tsadi sofit', 'final tsadi (ts)')
];

// --- Per-language assembly --------------------------------------------------

const SECTIONS: Record<Language, ScriptSection[]> = {
	ja: [
		{ id: 'hiragana', title: 'Hiragana', subtitle: 'ひらがな — the basic syllabary', layout: 'kana', rows: HIRAGANA_BASE },
		{ id: 'hiragana-dakuten', title: 'Hiragana — voiced (dakuten)', subtitle: 'が・ざ・だ・ば・ぱ', layout: 'kana', rows: HIRAGANA_DAKUTEN },
		{ id: 'katakana', title: 'Katakana', subtitle: 'カタカナ — for loanwords & emphasis', layout: 'kana', rows: KATAKANA_BASE },
		{ id: 'katakana-dakuten', title: 'Katakana — voiced (dakuten)', subtitle: 'ガ・ザ・ダ・バ・パ', layout: 'kana', rows: KATAKANA_DAKUTEN },
		{ id: 'kanji', title: 'Kanji — starter set', subtitle: 'Common N5 kanji (numbers, nature, people, basics)', layout: 'wrap', glyphs: KANJI }
	],
	zh: [
		{ id: 'hanzi', title: 'Hanzi — starter set', subtitle: 'Common characters (numbers, nature, people, basics)', layout: 'wrap', glyphs: HANZI },
		{ id: 'tones', title: 'Pinyin tones', subtitle: 'The four tones (+ neutral) on the syllable "ma"', layout: 'wrap', glyphs: PINYIN_TONES }
	],
	he: [
		{ id: 'alefbet', title: 'Alef-bet', subtitle: 'The 22 letters (right to left)', layout: 'wrap', glyphs: ALEFBET },
		{ id: 'alefbet-finals', title: 'Final forms (sofit)', subtitle: 'Used at the end of a word', layout: 'wrap', glyphs: ALEFBET_FINALS }
	]
};

export function scriptSections(language: Language): ScriptSection[] {
	return SECTIONS[language];
}

/** Flatten a section's glyphs (skipping kana gaps). */
export function sectionGlyphs(section: ScriptSection): Glyph[] {
	if (section.layout === 'wrap') return section.glyphs ?? [];
	return (section.rows ?? []).flat().filter((c): c is Glyph => c !== null);
}
