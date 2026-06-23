/**
 * Script reference data for the Scripts page — full kana, the Hebrew alef-bet,
 * and kanji/hanzi grouped by proficiency level (JLPT / HSK). Rendered on
 * `/scripts`; any glyph can be sent into the SRS (store `studyScriptChar`).
 *
 * Kana are laid out as the gojūon 5-column grid (a/i/u/e/o columns), `null`
 * for the gaps. Kanji/hanzi sections are "leveled" — sub-tabbed by level.
 */

import type { Language } from './db/types';

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

// --- Kanji by JLPT level ----------------------------------------------------

const KANJI_N5: Glyph[] = [
	g('一', 'ichi', 'one'), g('二', 'ni', 'two'), g('三', 'san', 'three'), g('四', 'shi / yon', 'four'),
	g('五', 'go', 'five'), g('六', 'roku', 'six'), g('七', 'shichi / nana', 'seven'), g('八', 'hachi', 'eight'),
	g('九', 'kyū / ku', 'nine'), g('十', 'jū', 'ten'), g('百', 'hyaku', 'hundred'), g('千', 'sen', 'thousand'),
	g('万', 'man', 'ten thousand'), g('円', 'en', 'yen / circle'),
	g('日', 'nichi / hi', 'day / sun'), g('月', 'getsu / tsuki', 'month / moon'), g('火', 'ka / hi', 'fire'),
	g('水', 'sui / mizu', 'water'), g('木', 'moku / ki', 'tree / wood'), g('金', 'kin / kane', 'gold / money'),
	g('土', 'do / tsuchi', 'earth / soil'), g('山', 'yama', 'mountain'), g('川', 'kawa', 'river'),
	g('田', 'ta', 'rice field'), g('天', 'ten', 'heaven / sky'), g('雨', 'ame', 'rain'),
	g('人', 'hito / jin', 'person'), g('男', 'otoko', 'man'), g('女', 'onna', 'woman'), g('子', 'ko', 'child'),
	g('目', 'me', 'eye'), g('口', 'kuchi', 'mouth'), g('手', 'te', 'hand'), g('心', 'kokoro', 'heart / mind'),
	g('大', 'dai / ō', 'big'), g('小', 'shō / chii', 'small'), g('中', 'naka / chū', 'middle / inside'),
	g('上', 'ue / jō', 'up / above'), g('下', 'shita / ka', 'down / below'), g('左', 'hidari', 'left'),
	g('右', 'migi', 'right'), g('本', 'hon', 'book / origin'),
	g('学', 'gaku / mana', 'study'), g('校', 'kō', 'school'), g('先', 'sen / saki', 'ahead / previous'),
	g('生', 'sei / i', 'life / student'), g('年', 'nen / toshi', 'year'), g('時', 'ji / toki', 'time / hour'),
	g('今', 'kon / ima', 'now'), g('何', 'nani / nan', 'what'), g('友', 'yū / tomo', 'friend')
];

const KANJI_N4: Glyph[] = [
	g('会', 'kai / a', 'meeting / to meet'), g('社', 'sha', 'company / shrine'), g('自', 'ji', 'self'),
	g('動', 'dō / ugo', 'move'), g('強', 'kyō / tsuyo', 'strong'), g('起', 'ki / o', 'get up / wake'),
	g('帰', 'ki / kae', 'return home'), g('教', 'kyō / oshi', 'teach'), g('楽', 'raku / tano', 'fun / comfort'),
	g('知', 'chi / shi', 'know'), g('使', 'shi / tsuka', 'use'), g('始', 'shi / haji', 'begin'),
	g('終', 'shū / o', 'end'), g('待', 'tai / ma', 'wait'), g('持', 'ji / mo', 'hold'),
	g('思', 'shi / omo', 'think'), g('作', 'sa / tsuku', 'make'), g('売', 'bai / u', 'sell'),
	g('買', 'bai / ka', 'buy'), g('歩', 'ho / aru', 'walk'), g('早', 'sō / haya', 'early'),
	g('長', 'chō / naga', 'long / chief'), g('近', 'kin / chika', 'near'), g('安', 'an / yasu', 'cheap / safe'),
	g('業', 'gyō', 'business / industry'), g('服', 'fuku', 'clothes'), g('開', 'kai / a', 'open'),
	g('国', 'koku / kuni', 'country')
];

const KANJI_N3: Glyph[] = [
	g('経', 'kei', 'manage / experience'), g('済', 'sai', 'settle / economy'), g('政', 'sei', 'politics'),
	g('関', 'kan', 'relation / barrier'), g('増', 'zō / fu', 'increase'), g('変', 'hen / ka', 'change / strange'),
	g('横', 'ō / yoko', 'side / horizontal'), g('顔', 'gan / kao', 'face'), g('首', 'shu / kubi', 'neck'),
	g('集', 'shū / atsu', 'gather / collect'), g('決', 'ketsu / ki', 'decide'), g('続', 'zoku / tsuzu', 'continue')
];

// --- Hanzi by HSK level -----------------------------------------------------

const HANZI_HSK1: Glyph[] = [
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

const HANZI_HSK2: Glyph[] = [
	g('吃', 'chī', 'eat'), g('喝', 'hē', 'drink'), g('看', 'kàn', 'look / watch'), g('听', 'tīng', 'listen'),
	g('说', 'shuō', 'speak'), g('读', 'dú', 'read'), g('写', 'xiě', 'write'), g('走', 'zǒu', 'walk'),
	g('跑', 'pǎo', 'run'), g('买', 'mǎi', 'buy'), g('卖', 'mài', 'sell'), g('学', 'xué', 'study'),
	g('工', 'gōng', 'work'), g('时', 'shí', 'time'), g('分', 'fēn', 'minute / divide'), g('钱', 'qián', 'money'),
	g('块', 'kuài', 'piece / yuan'), g('多', 'duō', 'many'), g('少', 'shǎo', 'few'), g('高', 'gāo', 'tall / high'),
	g('长', 'cháng', 'long'), g('来', 'lái', 'come'), g('去', 'qù', 'go'), g('到', 'dào', 'arrive')
];

const HANZI_HSK3: Glyph[] = [
	g('经', 'jīng', 'pass through'), g('关', 'guān', 'close / relation'), g('系', 'xì', 'system / relation'),
	g('增', 'zēng', 'increase'), g('变', 'biàn', 'change'), g('化', 'huà', 'transform'), g('题', 'tí', 'topic / problem'),
	g('决', 'jué', 'decide'), g('定', 'dìng', 'fix / settle'), g('续', 'xù', 'continue'), g('集', 'jí', 'gather'),
	g('完', 'wán', 'finish'), g('始', 'shǐ', 'begin'), g('慢', 'màn', 'slow'), g('快', 'kuài', 'fast'),
	g('重', 'zhòng', 'heavy / important')
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
			subtitle: 'Common characters by HSK level',
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
