/**
 * Script reference data for the Scripts page — full kana, the Hebrew alef-bet,
 * and kanji/hanzi grouped by proficiency level (JLPT / HSK). Rendered on
 * `/scripts`; any glyph can be sent into the SRS (store `studyScriptChar`).
 *
 * Kana are laid out as the gojūon 5-column grid (a/i/u/e/o columns), `null`
 * for the gaps. Kanji/hanzi sections are "leveled" — sub-tabbed by level.
 */

import type { Language } from './db/types';
// Full JLPT N5–N3 kanji + HSK 1–3 hanzi, generated from open data
// (KANJIDIC2 / Tanos JLPT, complete-hsk-vocabulary, makemeahanzi).
// Regenerate with `node tools/gen-scripts-data.mjs`.
import { KANJI_N5, KANJI_N4, KANJI_N3, HANZI_HSK1, HANZI_HSK2, HANZI_HSK3 } from './scripts-data';

/** One glyph: the character, its reading (romaji / letter name / pinyin), and an optional gloss. */
export interface Glyph {
	char: string;
	roman: string;
	gloss?: string;
}

/** A labelled 5-column kana grid (e.g. "Basic", "Voiced (dakuten)"). */
export interface KanaBlock {
	label?: string;
	rows: (Glyph | null)[][];
}

/** A proficiency level within a leveled section (e.g. "JLPT N5", "HSK 1"). */
export interface ScriptLevel {
	label: string;
	glyphs: Glyph[];
}

export interface ScriptSection {
	id: string;
	title: string;
	subtitle?: string;
	kind: 'kana' | 'wrap' | 'leveled';
	kana?: KanaBlock[]; // kind 'kana'
	glyphs?: Glyph[]; // kind 'wrap'
	levels?: ScriptLevel[]; // kind 'leveled'
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
		{
			id: 'hiragana',
			title: 'Hiragana',
			subtitle: 'ひらがな — the basic syllabary (+ voiced dakuten)',
			kind: 'kana',
			kana: [
				{ label: 'Basic (gojūon)', rows: HIRAGANA_BASE },
				{ label: 'Voiced — dakuten / handakuten', rows: HIRAGANA_DAKUTEN }
			]
		},
		{
			id: 'katakana',
			title: 'Katakana',
			subtitle: 'カタカナ — for loanwords & emphasis',
			kind: 'kana',
			kana: [
				{ label: 'Basic (gojūon)', rows: KATAKANA_BASE },
				{ label: 'Voiced — dakuten / handakuten', rows: KATAKANA_DAKUTEN }
			]
		},
		{
			id: 'kanji',
			title: 'Kanji',
			subtitle: 'Common kanji by JLPT level',
			kind: 'leveled',
			levels: [
				{ label: 'JLPT N5', glyphs: KANJI_N5 },
				{ label: 'JLPT N4', glyphs: KANJI_N4 },
				{ label: 'JLPT N3', glyphs: KANJI_N3 }
			]
		}
	],
	zh: [
		{
			id: 'hanzi',
			title: 'Hanzi',
			subtitle: 'Characters by HSK 3.0 level',
			kind: 'leveled',
			levels: [
				{ label: 'HSK 1', glyphs: HANZI_HSK1 },
				{ label: 'HSK 2', glyphs: HANZI_HSK2 },
				{ label: 'HSK 3', glyphs: HANZI_HSK3 }
			]
		},
		{
			id: 'tones',
			title: 'Pinyin tones',
			subtitle: 'The four tones (+ neutral) on the syllable “ma”',
			kind: 'wrap',
			glyphs: PINYIN_TONES
		}
	],
	he: [
		{ id: 'alefbet', title: 'Alef-bet', subtitle: 'The 22 letters (right to left)', kind: 'wrap', glyphs: ALEFBET },
		{ id: 'alefbet-finals', title: 'Final forms', subtitle: 'Sofit — used at the end of a word', kind: 'wrap', glyphs: ALEFBET_FINALS }
	]
};

export function scriptSections(language: Language): ScriptSection[] {
	return SECTIONS[language];
}

/** Every glyph in a section, flattened across kana blocks / levels / wrap. */
export function sectionGlyphs(section: ScriptSection): Glyph[] {
	if (section.kind === 'kana') {
		return (section.kana ?? []).flatMap((b) => b.rows.flat().filter((c): c is Glyph => c !== null));
	}
	if (section.kind === 'leveled') {
		return (section.levels ?? []).flatMap((l) => l.glyphs);
	}
	return section.glyphs ?? [];
}

/** Flatten a kana block's non-null cells. */
export function blockGlyphs(block: KanaBlock): Glyph[] {
	return block.rows.flat().filter((c): c is Glyph => c !== null);
}
