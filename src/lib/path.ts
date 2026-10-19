/**
 * Learning paths — per language, a Beginner path (from the script up) and a
 * Refresher path (for learners who know the basics), each an ordered trail of
 * stages built from the content Manabi already ships (script tables, the seed,
 * reading passages, Hebrew roots, names). A stage is never locked; the path
 * makes the order obvious and shows how far you are. Progress is derived,
 * never stored:
 *
 *   script / words  share of the stage's items whose recognition skill has
 *                   passed at least one review (light share: introduced)
 *   reading         share of the stage's passages you have read
 *   skills          share of this path's words you have started that have
 *                   passed one of the stage's skills (listening/speaking, or
 *                   recall/context)
 *   explore         open-ended — no progress, just doors
 */

import type { Dimension, GeneratedItem, ItemKind, Language, LearningItem, Passage, SkillMemory } from './db/types';
import { scriptSections, sectionGlyphs, type Glyph } from './scripts';
import { ROOTS } from './roots';
import { nameItem, nameSections } from './names';
import { seedItems } from './db/seed';

export type StageKind = 'script' | 'words' | 'reading' | 'skills' | 'explore';

/** An item a stage creates on demand (script glyphs, root words, names). */
export type StageEntry = GeneratedItem & { kind: ItemKind };

export interface StageLink {
	href: string;
	label: string;
}

export interface PathStage {
	id: string;
	kind: StageKind;
	title: string;
	/** One sentence: what you learn here and why it comes now. */
	blurb: string;
	/** The badge on the path node: a glyph, or empty for an icon. */
	badge: string;
	/** Item stages: the glyphs/words to learn, created when you start. */
	entries?: StageEntry[];
	/** words stages: which existing items belong to the stage. */
	match?: (it: LearningItem) => boolean;
	/** reading stages: which passages belong to the stage … */
	passages?: (p: Passage) => boolean;
	/** … and at most how many of them (in order). */
	passageLimit?: number;
	/** skills stages: passing any of these counts. */
	dims?: Dimension[];
	/** Where else to go for this stage. */
	links: StageLink[];
}

export type PathId = 'beginner' | 'refresher';

export interface LearningPath {
	id: PathId;
	title: string;
	/** The level it covers, in the language's own terms: "HSK 1", "N4–N3". */
	level: string;
	/** Who it is for. */
	blurb: string;
	stages: PathStage[];
}

export interface PathData {
	items: LearningItem[]; // published items in the language
	srs: Record<string, SkillMemory>;
	passages: Passage[]; // passages in the language
	reads: Record<string, number>;
}

export interface StageProgress {
	total: number;
	learned: number;
	started: number;
	pct: number; // learned / total, 0–1
	done: boolean;
	/** Item stages: up to STEP item ids (or entries still to create) to practise next. */
	nextItems: { ids: string[]; create: StageEntry[] };
	/** Reading stages: the first passage you haven't read. */
	nextPassage?: Passage;
}

/** A stage counts as done at this share. */
export const DONE_AT = 0.8;
/** How many items one "practise" tap takes on. */
export const STEP = 10;

// --- Building blocks --------------------------------------------------------

const seedOf = (lang: Language) => (it: LearningItem) => it.id.startsWith(`seed-${lang}-`);
const hasTag = (...tags: string[]) => (it: LearningItem) => it.tags.some((t) => tags.includes(t));

function section(language: Language, id: string): Glyph[] {
	const s = scriptSections(language).find((x) => x.id === id);
	return s ? sectionGlyphs(s) : [];
}
function level(language: Language, id: string, label: string): Glyph[] {
	return scriptSections(language).find((x) => x.id === id)?.levels?.find((l) => l.label === label)?.glyphs ?? [];
}
function glyphEntries(glyphs: Glyph[], stage: string): StageEntry[] {
	return glyphs.map((g) => ({
		kind: 'character',
		target: g.char,
		reading: g.roman,
		meaning: g.gloss ?? g.roman,
		tags: ['script', `path-${stage}`],
		level: 'A1',
		examples: []
	}));
}

const HAN = /\p{Script=Han}/u;

/** The Han characters inside some seed words, as listed in the language's Scripts tables. */
function charsOf(lang: Language, words: (it: LearningItem) => boolean, skip: Set<string> = new Set()): Glyph[] {
	const table = new Map(
		(scriptSections(lang).find((s) => s.kind === 'leveled')?.levels ?? []).flatMap((l) => l.glyphs.map((g) => [g.char, g] as const))
	);
	const chars = new Set(
		seedItems(0)
			.filter((it) => it.language === lang && words(it))
			.flatMap((it) => [...it.target].filter((c) => HAN.test(c) && !skip.has(c)))
	);
	return [...chars].map((c) => table.get(c)).filter((g): g is Glyph => !!g);
}

const readingAt = (...levels: string[]) => (p: Passage) => levels.includes(p.level);

/** Countries and home places from the Names page, as a refresher stage. */
function placesStage(lang: Language, region: string, badge: string): PathStage {
	const entries = nameSections(lang, 'places')
		.filter((s) => s.id !== 'world')
		.flatMap((s) => s.entries.map((e) => nameItem(lang, s, e)));
	return {
		id: 'places',
		kind: 'script',
		title: 'Places on the map',
		badge,
		blurb: `Countries and the main places of ${region} — names you will meet in every text, and can rarely guess.`,
		entries,
		links: [{ href: '/names', label: 'Names' }]
	};
}

const ears = (): PathStage => ({
	id: 'ears',
	kind: 'skills',
	title: 'Ears & voice',
	blurb: 'Hear this path’s words without seeing them, then say them aloud and compare with a native recording.',
	badge: '',
	dims: ['listening', 'pronunciation'],
	links: []
});
const recall = (): PathStage => ({
	id: 'recall',
	kind: 'skills',
	title: 'From memory',
	blurb: 'The hardest step: produce each word from its meaning, and pick it out in a real sentence.',
	badge: '',
	dims: ['recall', 'context'],
	links: []
});
const levelUp = (blurb: string): PathStage => ({
	id: 'next',
	kind: 'explore',
	title: 'On to the Refresher',
	badge: '',
	blurb,
	links: [{ href: '/path?path=refresher', label: 'Start the Refresher path' }]
});

// --- The paths --------------------------------------------------------------

function zh(): LearningPath[] {
	const hsk1 = (it: LearningItem) => seedOf('zh')(it) && hasTag('HSK1')(it);
	const hsk23 = (it: LearningItem) => seedOf('zh')(it) && hasTag('HSK2', 'HSK3')(it);
	const firstChars = charsOf('zh', hsk1);
	return [
		{
			id: 'beginner',
			title: 'Beginner',
			level: 'HSK 1',
			blurb: 'New to Chinese: tones, your first words and the characters inside them.',
			stages: [
				{ id: 'tones', kind: 'script', title: 'The four tones', badge: 'mā', links: [{ href: '/scripts', label: 'Scripts' }],
					blurb: 'Mandarin is tonal: mā, má, mǎ and mà are different words. Learn to hear and read the tone marks first.',
					entries: glyphEntries(section('zh', 'tones'), 'tones') },
				{ id: 'words1', kind: 'words', title: 'First words', badge: '你', match: hsk1, links: [{ href: '/items', label: 'Items' }],
					blurb: 'Greetings, numbers, people and food — the HSK 1 words you will meet everywhere.' },
				{ id: 'chars1', kind: 'script', title: 'Their characters', badge: '字', links: [{ href: '/radicals', label: 'Radicals' }, { href: '/scripts', label: 'Scripts' }],
					blurb: 'The characters inside your first words, one by one — tap one on Scripts to watch and trace its strokes.',
					entries: glyphEntries(firstChars, 'chars1') },
				{ id: 'taste', kind: 'reading', title: 'A first conversation', badge: '读', passages: () => true, passageLimit: 3, links: [{ href: '/read', label: 'Read' }],
					blurb: 'Try real dialogues early: tap each line for its pinyin and meaning. It is fine not to get everything.' },
				ears(),
				recall(),
				levelUp('You can greet, count and read your first characters. The Refresher path takes you to everyday conversations.')
			]
		},
		{
			id: 'refresher',
			title: 'Refresher',
			level: 'HSK 2–3',
			blurb: 'You know the basics: everyday words, more characters, real conversations.',
			stages: [
				{ id: 'words2', kind: 'words', title: 'Everyday words', badge: '吃', match: hsk23, links: [{ href: '/items', label: 'Items' }],
					blurb: 'HSK 2–3 words for shopping, travel, health and plans — enough to follow real conversations.' },
				{ id: 'chars2', kind: 'script', title: 'More characters', badge: '汉', links: [{ href: '/radicals', label: 'Radicals' }, { href: '/scripts', label: 'Scripts' }],
					blurb: 'The new characters inside those words. Their radicals often hint at the meaning.',
					entries: glyphEntries(charsOf('zh', hsk23, new Set(firstChars.map((g) => g.char))), 'chars2') },
				placesStage('zh', 'China and Taiwan', '国'),
				{ id: 'read', kind: 'reading', title: 'Read conversations', badge: '读', passages: () => true, links: [{ href: '/read', label: 'Read' }],
					blurb: 'Café, doctor, taxi, Spring Festival — dialogues and short texts with audio. Save lines you like.' },
				ears(),
				recall(),
				{ id: 'beyond', kind: 'explore', title: 'Keep going', badge: '', blurb: 'Full HSK word lists, the radicals behind every character, names of people, and AI-made lessons.',
					links: [{ href: '/vocab', label: 'HSK vocab' }, { href: '/radicals', label: 'Radicals' }, { href: '/names?tab=people', label: 'Names' }, { href: '/workbench', label: 'Workbench' }] }
			]
		}
	];
}

function yue(): LearningPath[] {
	const at = (lvl: string) => (it: LearningItem) => seedOf('yue')(it) && it.level === lvl;
	const firstChars = level('yue', 'hanzi', 'Starter');
	return [
		{
			id: 'beginner',
			title: 'Beginner',
			level: 'A1',
			blurb: 'New to Cantonese: six tones, Jyutping, your first words and the characters inside them.',
			stages: [
				{ id: 'tones', kind: 'script', title: 'The six tones', badge: 'si1', links: [{ href: '/scripts', label: 'Scripts' }],
					blurb: 'Cantonese has six tones: si1 is a poem, si4 is time, si6 a matter. Jyutping writes each as a digit after the syllable.',
					entries: glyphEntries(section('yue', 'tones'), 'tones') },
				{ id: 'words1', kind: 'words', title: 'First words', badge: '你', match: at('A1'), links: [{ href: '/items', label: 'Items' }],
					blurb: 'Greetings, people, numbers and the little words that make it Cantonese: 係, 嘅, 唔, 咗, 喺.' },
				{ id: 'chars1', kind: 'script', title: 'Their characters', badge: '字', links: [{ href: '/radicals', label: 'Radicals' }, { href: '/scripts', label: 'Scripts' }],
					blurb: 'The characters inside your first words, in Hong Kong forms — tap one on Scripts to watch and trace its strokes.',
					entries: glyphEntries(firstChars, 'chars1') },
				{ id: 'taste', kind: 'reading', title: 'First conversations', badge: '讀', passages: readingAt('A1'), links: [{ href: '/read', label: 'Read' }],
					blurb: 'Order at a cha chaan teng and ask the way: short dialogues with audio and Jyutping.' },
				ears(),
				recall(),
				levelUp('You can greet, order and read your first characters. The Refresher path takes you round Hong Kong.')
			]
		},
		{
			id: 'refresher',
			title: 'Refresher',
			level: 'A2',
			blurb: 'You know the basics: everyday verbs, shopping and getting around, longer conversations.',
			stages: [
				{ id: 'words2', kind: 'words', title: 'Everyday words', badge: '買', match: at('A2'), links: [{ href: '/items', label: 'Items' }],
					blurb: 'Buying, waiting, the MTR and the bus, cheap and expensive — words for a day out in Hong Kong.' },
				{ id: 'chars2', kind: 'script', title: 'More characters', badge: '漢', links: [{ href: '/radicals', label: 'Radicals' }, { href: '/scripts', label: 'Scripts' }],
					blurb: 'The new characters inside those words. Their radicals often hint at the meaning.',
					entries: glyphEntries(level('yue', 'hanzi', 'Everyday'), 'chars2') },
				placesStage('yue', 'Hong Kong and the Pearl River Delta', '港'),
				{ id: 'read', kind: 'reading', title: 'Read conversations', badge: '讀', passages: () => true, links: [{ href: '/read', label: 'Read' }],
					blurb: 'The wet market, a hike on the Dragon’s Back and a text about Hong Kong — read along with the audio.' },
				ears(),
				recall(),
				{ id: 'beyond', kind: 'explore', title: 'Keep going', badge: '', blurb: 'Names of people, the radicals behind every character, your own texts, and AI-made lessons.',
					links: [{ href: '/names?tab=people', label: 'Names' }, { href: '/radicals', label: 'Radicals' }, { href: '/read/new', label: 'Your own text' }, { href: '/workbench', label: 'Workbench' }] }
			]
		}
	];
}

function ja(): LearningPath[] {
	const at = (tag: string) => (it: LearningItem) => seedOf('ja')(it) && hasTag(tag)(it);
	return [
		{
			id: 'beginner',
			title: 'Beginner',
			level: 'N5',
			blurb: 'New to Japanese: both kana, your first words and first kanji.',
			stages: [
				{ id: 'hiragana', kind: 'script', title: 'Hiragana', badge: 'あ', links: [{ href: '/scripts', label: 'Scripts' }],
					blurb: 'The basic syllables. Every Japanese word can be written in hiragana, so this unlocks everything else.',
					entries: glyphEntries(section('ja', 'hiragana'), 'hiragana') },
				{ id: 'katakana', kind: 'script', title: 'Katakana', badge: 'カ', links: [{ href: '/scripts', label: 'Scripts' }],
					blurb: 'The same sounds in a sharper script, used for foreign words — コーヒー, テレビ, and most country names.',
					entries: glyphEntries(section('ja', 'katakana'), 'katakana') },
				{ id: 'words5', kind: 'words', title: 'First words', badge: '水', match: at('N5'), links: [{ href: '/items', label: 'Items' }],
					blurb: 'JLPT N5 words: today, water, to eat… each with its kana reading and an example sentence.' },
				{ id: 'kanji5', kind: 'script', title: 'First kanji', badge: '日', links: [{ href: '/radicals', label: 'Radicals' }, { href: '/scripts', label: 'Scripts' }],
					blurb: 'The 79 N5 kanji — sun, person, mountain, the numbers. Tap one on Scripts to watch and trace its strokes.',
					entries: glyphEntries(level('ja', 'kanji', 'JLPT N5'), 'kanji5') },
				ears(),
				recall(),
				levelUp('Kana, first kanji and first words are in place. The Refresher path brings grammar, N4–N3 words and real reading.')
			]
		},
		{
			id: 'refresher',
			title: 'Refresher',
			level: 'N4–N3',
			blurb: 'You can read kana: grammar, intermediate words and kanji, and real reading.',
			stages: [
				{ id: 'words4', kind: 'words', title: 'Daily life & grammar', badge: '行', match: at('N4'), links: [{ href: '/items', label: 'Items' }],
					blurb: 'N4 words and grammar patterns — the glue that turns words into sentences.' },
				{ id: 'kanji4', kind: 'script', title: 'N4 kanji', badge: '会', links: [{ href: '/radicals', label: 'Radicals' }, { href: '/scripts', label: 'Scripts' }],
					blurb: 'The 166 kanji of N4: meet, weather, station, write… Most everyday signs use them.',
					entries: glyphEntries(level('ja', 'kanji', 'JLPT N4'), 'kanji4') },
				{ id: 'words3', kind: 'words', title: 'Intermediate words', badge: '経', match: at('N3'), links: [{ href: '/items', label: 'Items' }],
					blurb: 'N3 vocabulary and grammar for work, news and opinions.' },
				placesStage('ja', 'Japan', '県'),
				{ id: 'read', kind: 'reading', title: 'Read conversations', badge: '読', passages: () => true, links: [{ href: '/read', label: 'Read' }],
					blurb: 'Everyday dialogues and short texts with audio: tap a line for its reading and meaning, save the ones you like.' },
				ears(),
				recall(),
				{ id: 'beyond', kind: 'explore', title: 'Keep going', badge: '', blurb: 'Full JLPT word lists, the radicals inside every kanji, names of people, and AI-made lessons.',
					links: [{ href: '/vocab', label: 'JLPT vocab' }, { href: '/radicals', label: 'Radicals' }, { href: '/names?tab=people', label: 'Names' }, { href: '/workbench', label: 'Workbench' }] }
			]
		}
	];
}

/** Hangul syllables with the vowel ㅏ ㅓ ㅗ ㅜ or ㅣ — the readable core of the syllable table. */
function coreSyllables(): Glyph[] {
	const core = new Set([0, 4, 8, 13, 20]); // ㅏ ㅓ ㅗ ㅜ ㅣ (index of the medial vowel)
	return section('ko', 'syllables').filter((g) => {
		const c = g.char.codePointAt(0)! - 0xac00;
		return c >= 0 && core.has(Math.floor((c % 588) / 28));
	});
}

function ko(): LearningPath[] {
	const words = seedOf('ko');
	return [
		{
			id: 'beginner',
			title: 'Beginner',
			level: 'TOPIK I',
			blurb: 'New to Korean: Hangul, syllable blocks, first words and first conversations.',
			stages: [
				{ id: 'jamo', kind: 'script', title: 'Hangul letters', badge: 'ㄱ', links: [{ href: '/scripts', label: 'Scripts' }],
					blurb: 'Hangul was designed to be learned in a day: 14 consonants and 10 vowels, plus their doubled and combined forms.',
					entries: glyphEntries(section('ko', 'jamo'), 'jamo') },
				{ id: 'syllables', kind: 'script', title: 'Syllable blocks', badge: '가', links: [{ href: '/scripts', label: 'Scripts' }],
					blurb: 'Letters stack into one block per syllable: ㄱ + ㅏ = 가. Read blocks with the five core vowels.',
					entries: glyphEntries(coreSyllables(), 'syllables') },
				{ id: 'words1', kind: 'words', title: 'First words', badge: '물', match: words, links: [{ href: '/items', label: 'Items' }],
					blurb: 'TOPIK I basics in polite -요 forms: greetings, numbers, food, time and the verbs you need most.' },
				{ id: 'read1', kind: 'reading', title: 'First conversations', badge: '읽', passages: readingAt('A1'), links: [{ href: '/read', label: 'Read' }],
					blurb: 'At a café, at the convenience store, asking the way — short dialogues with audio and romanization.' },
				ears(),
				recall(),
				levelUp('You can read Hangul and get by in a café. The Refresher path adds places, longer conversations and recall.')
			]
		},
		{
			id: 'refresher',
			title: 'Refresher',
			level: 'TOPIK I–II',
			blurb: 'You can read Hangul: refresh the core words, then places and longer conversations.',
			stages: [
				{ id: 'core', kind: 'words', title: 'Core words', badge: '말', match: words, links: [{ href: '/items', label: 'Items' }],
					blurb: 'The TOPIK I basics again, quickly: anything you still know passes in a single review.' },
				placesStage('ko', 'Korea', '서'),
				{ id: 'read1', kind: 'reading', title: 'Everyday texts', badge: '읽', passages: readingAt('A1'), links: [{ href: '/read', label: 'Read' }],
					blurb: 'Read the short texts and dialogues aloud along with the audio — a quick fluency workout.' },
				{ id: 'read2', kind: 'reading', title: 'Out and about', badge: '책', passages: readingAt('A2'), links: [{ href: '/read', label: 'Read' }],
					blurb: 'Taxis, shops and the pharmacy — longer conversations and a text about everyday Korea.' },
				ears(),
				recall(),
				{ id: 'beyond', kind: 'explore', title: 'Keep going', badge: '', blurb: 'Names of people, more reading, and AI-made lessons on any topic you like.',
					links: [{ href: '/names?tab=people', label: 'Names' }, { href: '/read', label: 'Read' }, { href: '/workbench', label: 'Workbench' }] }
			]
		}
	];
}

/** Root families on the Hebrew refresher path, most useful first. */
const PATH_ROOTS = ['lmd', 'dbr', 'ktv', 'akl', 'hlch', 'avd', 'kra', 'chbr'];

function he(): LearningPath[] {
	const letters = [...section('he', 'alefbet'), ...section('he', 'alefbet-finals')];
	const isLetter = hasTag('alefbet', 'letter');
	const words = (lvl: string) => (it: LearningItem) => seedOf('he')(it) && !isLetter(it) && it.level === lvl;
	const rootEntries: StageEntry[] = PATH_ROOTS.flatMap((id) => {
		const root = ROOTS.find((r) => r.id === id);
		return (root?.words ?? []).map((w) => ({
			kind: (w.pos === 'phrase' ? 'phrase' : 'word') as ItemKind,
			target: w.t,
			reading: w.r,
			transliteration: w.r,
			meaning: w.m,
			tags: ['root', `root-${id}`],
			level: 'A2',
			examples: []
		}));
	});
	return [
		{
			id: 'beginner',
			title: 'Beginner',
			level: 'A1',
			blurb: 'New to Hebrew: the alef-bet, first words and first conversations, always with vowels.',
			stages: [
				{ id: 'alefbet', kind: 'script', title: 'The alef-bet', badge: 'א', links: [{ href: '/scripts', label: 'Scripts' }],
					blurb: '22 letters read right to left, plus five final forms. Vowels are dots and dashes around them (niqqud).',
					entries: glyphEntries(letters, 'alefbet') },
				{ id: 'words1', kind: 'words', title: 'First words', badge: 'שׁ', match: words('A1'), links: [{ href: '/items', label: 'Items' }],
					blurb: 'Shalom, todah, water, family and the verbs of every day — always shown with vowels.' },
				{ id: 'read1', kind: 'reading', title: 'First conversations', badge: 'קְרָא', passages: readingAt('A1'), links: [{ href: '/read', label: 'Read' }],
					blurb: 'Introductions, meeting a friend, your morning — short texts with audio and transliteration.' },
				ears(),
				recall(),
				levelUp('You can read vowelled Hebrew and introduce yourself. The Refresher path brings roots, places and longer conversations.')
			]
		},
		{
			id: 'refresher',
			title: 'Refresher',
			level: 'A2',
			blurb: 'You can read with vowels: word families, places, everyday conversations — then without vowels.',
			stages: [
				{ id: 'roots', kind: 'script', title: 'Word families', badge: 'כתב', links: [{ href: '/roots', label: 'Roots' }],
					blurb: 'Most Hebrew words grow from a three-letter root. Learn eight root families and watch new words make sense.',
					entries: rootEntries },
				{ id: 'words2', kind: 'words', title: 'Colours & questions', badge: 'מָה', match: words('A2'), links: [{ href: '/items', label: 'Items' }],
					blurb: 'Family, colours, a week, and “when?” — the A2 words of the starter set.' },
				placesStage('he', 'Israel', 'יָם'),
				{ id: 'read2', kind: 'reading', title: 'Out and about', badge: 'סֵפֶר', passages: readingAt('A2'), links: [{ href: '/read', label: 'Read' }],
					blurb: 'Cafés, taxis, the doctor and a Shabbat invitation — longer everyday conversations.' },
				ears(),
				recall(),
				{ id: 'beyond', kind: 'explore', title: 'Keep going', badge: '', blurb: 'All 50 roots, names of people, reading without vowels (Settings), and AI-made lessons.',
					links: [{ href: '/roots', label: 'Roots' }, { href: '/names?tab=people', label: 'Names' }, { href: '/settings', label: 'Hide vowels' }, { href: '/workbench', label: 'Workbench' }] }
			]
		}
	];
}

const BUILDERS: Record<Language, () => LearningPath[]> = { zh, yue, ja, ko, he };
const cache = new Map<Language, LearningPath[]>();

/** A language's paths, Beginner first. */
export function pathsFor(language: Language): LearningPath[] {
	let p = cache.get(language);
	if (!p) cache.set(language, (p = BUILDERS[language]()));
	return p;
}

/** One path (falls back to Beginner for an unknown id). */
export function pathFor(language: Language, id: PathId = 'beginner'): LearningPath {
	const all = pathsFor(language);
	return all.find((p) => p.id === id) ?? all[0];
}

export function isPathId(x: unknown): x is PathId {
	return x === 'beginner' || x === 'refresher';
}

// --- Progress ---------------------------------------------------------------

function itemState(it: LearningItem | undefined, srs: Record<string, SkillMemory>): 'learned' | 'started' | 'new' {
	const rec = it ? srs[it.id]?.dims.recognition : undefined;
	if (rec && rec.repetitions >= 1) return 'learned';
	return rec?.introduced ? 'started' : 'new';
}

/**
 * Progress of one stage. `pathItems` (the ids of the path's item stages) is
 * what skills stages measure; without it they measure every item.
 */
export function stageProgress(stage: PathStage, data: PathData, pathItems?: ReadonlySet<string>): StageProgress {
	const empty = { ids: [] as string[], create: [] as StageEntry[] };
	const finish = (total: number, learned: number, started: number, extra: Partial<StageProgress> = {}): StageProgress => {
		const pct = total ? learned / total : 0;
		return { total, learned, started, pct, done: total > 0 && pct >= DONE_AT, nextItems: empty, ...extra };
	};

	if (stage.kind === 'script' || stage.kind === 'words') {
		const byTarget = new Map(data.items.map((it) => [it.target, it]));
		const rows: { it?: LearningItem; entry?: StageEntry }[] = stage.entries
			? stage.entries.map((entry) => ({ it: byTarget.get(entry.target), entry }))
			: data.items.filter((it) => stage.match?.(it)).map((it) => ({ it }));
		let learned = 0;
		let started = 0;
		const startedIds: string[] = [];
		const fresh: { it?: LearningItem; entry?: StageEntry }[] = [];
		for (const r of rows) {
			const s = itemState(r.it, data.srs);
			if (s === 'learned') learned++;
			else if (s === 'started') {
				started++;
				startedIds.push(r.it!.id);
			} else fresh.push(r);
		}
		// Next: what you've begun but not passed yet, then new ones in path order.
		const take = [...startedIds.map((id) => ({ id })), ...fresh].slice(0, STEP);
		const nextItems = {
			ids: take.flatMap((t) => ('id' in t ? [t.id] : t.it ? [t.it.id] : [])),
			create: take.flatMap((t) => ('entry' in t && !t.it && t.entry ? [t.entry] : []))
		};
		return finish(rows.length, learned, started, { nextItems });
	}

	if (stage.kind === 'reading') {
		const ps = data.passages.filter((p) => stage.passages?.(p)).slice(0, stage.passageLimit ?? Infinity);
		const read = ps.filter((p) => data.reads[p.id]);
		return finish(ps.length, read.length, 0, { nextPassage: ps.find((p) => !data.reads[p.id]) });
	}

	if (stage.kind === 'skills') {
		const dims = stage.dims ?? [];
		const base = data.items.filter((it) => (!pathItems || pathItems.has(it.id)) && data.srs[it.id]?.dims.recognition.introduced);
		let learned = 0;
		let started = 0;
		for (const it of base) {
			const d = data.srs[it.id].dims;
			if (dims.some((k) => d[k]?.repetitions >= 1)) learned++;
			else if (dims.some((k) => d[k]?.introduced)) started++;
		}
		return finish(base.length, learned, started);
	}

	return finish(0, 0, 0);
}

/** Items of an item stage that already exist. */
export function stageItemIds(stage: PathStage, data: PathData): string[] {
	if (stage.entries) {
		const byTarget = new Map(data.items.map((it) => [it.target, it.id]));
		return stage.entries.flatMap((e) => byTarget.get(e.target) ?? []);
	}
	if (stage.match) return data.items.filter((it) => stage.match!(it)).map((it) => it.id);
	return [];
}

/** A taste of what a stage holds: a few glyphs / words, or passage titles. */
export function stagePreview(stage: PathStage, data: PathData, n = 12): string[] {
	if (stage.entries) return stage.entries.slice(0, n).map((e) => e.target);
	if (stage.match) return data.items.filter((it) => stage.match!(it)).slice(0, n).map((it) => it.target);
	if (stage.passages)
		return data.passages
			.filter((p) => stage.passages!(p))
			.slice(0, Math.min(n, 4, stage.passageLimit ?? Infinity))
			.map((p) => p.title);
	return [];
}

export interface PathState {
	path: LearningPath;
	stages: PathStage[];
	progress: StageProgress[];
	/** Index of the first stage not done yet (the last stage once all are). */
	current: number;
	doneCount: number;
	/** Stages that can be done (everything but explore). */
	countable: number;
	/** The path's existing words (what skills stages measure, and practise). */
	itemIds: string[];
}

export function pathState(language: Language, data: PathData, id: PathId = 'beginner'): PathState {
	const path = pathFor(language, id);
	const stages = path.stages;
	const itemIds = [
		...new Set(stages.filter((s) => s.kind === 'script' || s.kind === 'words').flatMap((s) => stageItemIds(s, data)))
	];
	const scope = new Set(itemIds);
	const progress = stages.map((s) => stageProgress(s, data, scope));
	const countable = stages.filter((s) => s.kind !== 'explore').length;
	let current = stages.findIndex((s, i) => s.kind !== 'explore' && !progress[i].done);
	if (current < 0) current = stages.length - 1;
	const doneCount = progress.filter((p, i) => stages[i].kind !== 'explore' && p.done).length;
	return { path, stages, progress, current, doneCount, countable, itemIds };
}

/** Which path to show when the learner hasn't picked one: the Refresher once the Beginner path is done. */
export function suggestedPath(language: Language, data: PathData): PathId {
	const b = pathState(language, data, 'beginner');
	return b.doneCount === b.countable ? 'refresher' : 'beginner';
}
