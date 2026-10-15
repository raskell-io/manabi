/**
 * Learning paths — one ordered trail of stages per language, built from the
 * content Manabi already ships (script tables, the seed, reading passages,
 * Hebrew roots). A stage is never locked; the path just makes the order
 * obvious and shows how far you are. Progress is derived, never stored:
 *
 *   script / words  share of the stage's items whose recognition skill has
 *                   passed at least one review (light share: introduced)
 *   reading         share of the stage's passages you have read
 *   skills          share of your introduced items that have passed one of
 *                   the stage's skills (listening/speaking, or recall/context)
 *   explore         open-ended — no progress, just doors
 */

import type { Dimension, GeneratedItem, ItemKind, Language, LearningItem, Passage, SkillMemory } from './db/types';
import { scriptSections, sectionGlyphs, type Glyph } from './scripts';
import { ROOTS } from './roots';
import { seedItems } from './db/seed';

export type StageKind = 'script' | 'words' | 'reading' | 'skills' | 'explore';

/** An item a stage creates on demand (script glyphs, root words). */
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
	/** script stages: the glyphs/words to learn, created when you start. */
	entries?: StageEntry[];
	/** words stages: which existing items belong to the stage. */
	match?: (it: LearningItem) => boolean;
	/** reading stages: which passages belong to the stage. */
	passages?: (p: Passage) => boolean;
	/** skills stages: passing any of these counts. */
	dims?: Dimension[];
	/** Where else to go for this stage. */
	links: StageLink[];
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

const readingAt = (...levels: string[]) => (p: Passage) => levels.includes(p.level);

const SKILL_EARS: Omit<PathStage, 'id'> = {
	kind: 'skills',
	title: 'Ears & voice',
	blurb: 'Hear each word without seeing it, then say it aloud and compare with a native recording.',
	badge: '',
	dims: ['listening', 'pronunciation'],
	links: [
		{ href: '/review?mode=listening', label: 'Listening' },
		{ href: '/review?mode=speaking', label: 'Speaking' }
	]
};
const SKILL_RECALL: Omit<PathStage, 'id'> = {
	kind: 'skills',
	title: 'From memory',
	blurb: 'The hardest step: produce the word from its meaning, and pick it out in a real sentence.',
	badge: '',
	dims: ['recall', 'context'],
	links: [{ href: '/review?mode=reading', label: 'Review' }]
};

// --- The paths --------------------------------------------------------------

function zh(): PathStage[] {
	const words1 = (it: LearningItem) => seedOf('zh')(it) && hasTag('HSK1')(it);
	const hsk1 = new Map(level('zh', 'hanzi', 'HSK 1').map((g) => [g.char, g]));
	// The characters inside the first words, as listed on the Scripts page.
	const chars = [
		...new Set(
			seedPathItems('zh')
				.filter(words1)
				.flatMap((it) => [...it.target].filter((c) => HAN.test(c)))
		)
	]
		.map((c) => hsk1.get(c))
		.filter((g): g is Glyph => !!g);
	return [
		{ id: 'tones', kind: 'script', title: 'The four tones', badge: 'mā', links: [{ href: '/scripts', label: 'Scripts' }],
			blurb: 'Mandarin is tonal: mā, má, mǎ and mà are different words. Learn to hear and read the tone marks first.',
			entries: glyphEntries(section('zh', 'tones'), 'tones') },
		{ id: 'words1', kind: 'words', title: 'First words', badge: '你', match: words1, links: [{ href: '/items', label: 'Items' }],
			blurb: 'Greetings, numbers, people and food — the HSK 1 words you will meet everywhere.' },
		{ id: 'chars', kind: 'script', title: 'Their characters', badge: '字', links: [{ href: '/radicals', label: 'Radicals' }, { href: '/scripts', label: 'Scripts' }],
			blurb: 'The characters inside your first words, one by one — tap one on Scripts to watch and trace its strokes.',
			entries: glyphEntries(chars, 'chars') },
		{ id: 'words2', kind: 'words', title: 'Everyday words', badge: '吃', match: (it) => seedOf('zh')(it) && hasTag('HSK2', 'HSK3')(it), links: [{ href: '/items', label: 'Items' }],
			blurb: 'HSK 2–3 words for shopping, travel, health and plans — enough to follow real conversations.' },
		{ id: 'read', kind: 'reading', title: 'Read conversations', badge: '读', passages: readingAt('A1', 'A2'), links: [{ href: '/read', label: 'Read' }],
			blurb: 'Short dialogues and texts with audio. Tap a line for its pinyin and meaning, and save lines you like.' },
		{ id: 'ears', ...SKILL_EARS },
		{ id: 'recall', ...SKILL_RECALL },
		{ id: 'beyond', kind: 'explore', title: 'Keep going', badge: '', blurb: 'Full HSK word lists, the radicals behind every character, names of places and people, and AI-made lessons.',
			links: [{ href: '/vocab', label: 'HSK vocab' }, { href: '/radicals', label: 'Radicals' }, { href: '/names', label: 'Names' }, { href: '/workbench', label: 'Workbench' }] }
	];
}

function ja(): PathStage[] {
	return [
		{ id: 'hiragana', kind: 'script', title: 'Hiragana', badge: 'あ', links: [{ href: '/scripts', label: 'Scripts' }],
			blurb: 'The basic syllables. Every Japanese word can be written in hiragana, so this unlocks everything else.',
			entries: glyphEntries(section('ja', 'hiragana'), 'hiragana') },
		{ id: 'katakana', kind: 'script', title: 'Katakana', badge: 'カ', links: [{ href: '/scripts', label: 'Scripts' }],
			blurb: 'The same sounds in a sharper script, used for foreign words — コーヒー, テレビ, and most country names.',
			entries: glyphEntries(section('ja', 'katakana'), 'katakana') },
		{ id: 'words5', kind: 'words', title: 'First words', badge: '水', match: (it) => seedOf('ja')(it) && hasTag('N5')(it), links: [{ href: '/items', label: 'Items' }],
			blurb: 'JLPT N5 words: today, water, to eat… each with its kana reading and an example sentence.' },
		{ id: 'kanji5', kind: 'script', title: 'First kanji', badge: '日', links: [{ href: '/radicals', label: 'Radicals' }, { href: '/scripts', label: 'Scripts' }],
			blurb: 'The 79 N5 kanji — sun, person, mountain, the numbers. Tap one on Scripts to watch and trace its strokes.',
			entries: glyphEntries(level('ja', 'kanji', 'JLPT N5'), 'kanji5') },
		{ id: 'words4', kind: 'words', title: 'Daily life & grammar', badge: '行', match: (it) => seedOf('ja')(it) && hasTag('N4')(it), links: [{ href: '/items', label: 'Items' }],
			blurb: 'N4 words and grammar patterns — the glue that turns words into sentences.' },
		{ id: 'words3', kind: 'words', title: 'Intermediate words', badge: '経', match: (it) => seedOf('ja')(it) && hasTag('N3')(it), links: [{ href: '/items', label: 'Items' }],
			blurb: 'N3 vocabulary and grammar for work, news and opinions.' },
		{ id: 'read', kind: 'reading', title: 'Read conversations', badge: '読', passages: () => true, links: [{ href: '/read', label: 'Read' }],
			blurb: 'Everyday dialogues and short texts with audio: tap a line for its reading and meaning, save the ones you like.' },
		{ id: 'ears', ...SKILL_EARS },
		{ id: 'recall', ...SKILL_RECALL },
		{ id: 'beyond', kind: 'explore', title: 'Keep going', badge: '', blurb: 'Full JLPT word lists, the radicals inside every kanji, names of places and people, and AI-made lessons.',
			links: [{ href: '/vocab', label: 'JLPT vocab' }, { href: '/radicals', label: 'Radicals' }, { href: '/names', label: 'Names' }, { href: '/workbench', label: 'Workbench' }] }
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

function ko(): PathStage[] {
	return [
		{ id: 'jamo', kind: 'script', title: 'Hangul letters', badge: 'ㄱ', links: [{ href: '/scripts', label: 'Scripts' }],
			blurb: 'Hangul was designed to be learned in a day: 14 consonants and 10 vowels, plus their doubled and combined forms.',
			entries: glyphEntries(section('ko', 'jamo'), 'jamo') },
		{ id: 'syllables', kind: 'script', title: 'Syllable blocks', badge: '가', links: [{ href: '/scripts', label: 'Scripts' }],
			blurb: 'Letters stack into one block per syllable: ㄱ + ㅏ = 가. Read blocks with the five core vowels.',
			entries: glyphEntries(coreSyllables(), 'syllables') },
		{ id: 'words1', kind: 'words', title: 'First words', badge: '물', match: (it) => seedOf('ko')(it), links: [{ href: '/items', label: 'Items' }],
			blurb: 'TOPIK I basics in polite -요 forms: greetings, numbers, food, time and the verbs you need most.' },
		{ id: 'read1', kind: 'reading', title: 'First conversations', badge: '읽', passages: readingAt('A1'), links: [{ href: '/read', label: 'Read' }],
			blurb: 'At a café, at the convenience store, asking the way — short dialogues with audio and romanization.' },
		{ id: 'read2', kind: 'reading', title: 'Out and about', badge: '책', passages: readingAt('A2'), links: [{ href: '/read', label: 'Read' }],
			blurb: 'Taxis, shops and the pharmacy — slightly longer conversations and a text about everyday Korea.' },
		{ id: 'ears', ...SKILL_EARS },
		{ id: 'recall', ...SKILL_RECALL },
		{ id: 'beyond', kind: 'explore', title: 'Keep going', badge: '', blurb: 'Names of places and people, more reading, and AI-made lessons on any topic you like.',
			links: [{ href: '/names', label: 'Names' }, { href: '/read', label: 'Read' }, { href: '/workbench', label: 'Workbench' }] }
	];
}

/** Root families on the Hebrew path, most useful first. */
const PATH_ROOTS = ['lmd', 'dbr', 'ktv', 'akl', 'hlch', 'avd', 'kra', 'chbr'];

function he(): PathStage[] {
	const letters = [...section('he', 'alefbet'), ...section('he', 'alefbet-finals')];
	const isLetter = hasTag('alefbet', 'letter');
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
		{ id: 'alefbet', kind: 'script', title: 'The alef-bet', badge: 'א', links: [{ href: '/scripts', label: 'Scripts' }],
			blurb: '22 letters read right to left, plus five final forms. Vowels are dots and dashes around them (niqqud).',
			entries: glyphEntries(letters, 'alefbet') },
		{ id: 'words1', kind: 'words', title: 'First words', badge: 'שׁ', match: (it) => seedOf('he')(it) && !isLetter(it), links: [{ href: '/items', label: 'Items' }],
			blurb: 'Shalom, todah, water, family and the verbs of every day — always shown with vowels.' },
		{ id: 'roots', kind: 'script', title: 'Word families', badge: 'כתב', links: [{ href: '/roots', label: 'Roots' }],
			blurb: 'Most Hebrew words grow from a three-letter root. Learn eight root families and watch new words make sense.',
			entries: rootEntries },
		{ id: 'read1', kind: 'reading', title: 'First conversations', badge: 'קְרָא', passages: readingAt('A1'), links: [{ href: '/read', label: 'Read' }],
			blurb: 'Introductions, meeting a friend, your morning — short texts with audio and transliteration.' },
		{ id: 'read2', kind: 'reading', title: 'Out and about', badge: 'סֵפֶר', passages: readingAt('A2'), links: [{ href: '/read', label: 'Read' }],
			blurb: 'Cafés, taxis, the doctor and a Shabbat invitation — longer everyday conversations.' },
		{ id: 'ears', ...SKILL_EARS },
		{ id: 'recall', ...SKILL_RECALL },
		{ id: 'beyond', kind: 'explore', title: 'Keep going', badge: '', blurb: 'All 50 roots, names of places and people, reading without vowels (Settings), and AI-made lessons.',
			links: [{ href: '/roots', label: 'Roots' }, { href: '/names', label: 'Names' }, { href: '/settings', label: 'Hide vowels' }, { href: '/workbench', label: 'Workbench' }] }
	];
}

function seedPathItems(lang: Language): LearningItem[] {
	return seedItems(0).filter((it) => it.language === lang);
}

const BUILDERS: Record<Language, () => PathStage[]> = { zh, ja, ko, he };
const cache = new Map<Language, PathStage[]>();

/** The stages of a language's path, in order. */
export function pathFor(language: Language): PathStage[] {
	let p = cache.get(language);
	if (!p) cache.set(language, (p = BUILDERS[language]()));
	return p;
}

// --- Progress ---------------------------------------------------------------

function itemState(it: LearningItem | undefined, srs: Record<string, SkillMemory>): 'learned' | 'started' | 'new' {
	const rec = it ? srs[it.id]?.dims.recognition : undefined;
	if (rec && rec.repetitions >= 1) return 'learned';
	return rec?.introduced ? 'started' : 'new';
}

export function stageProgress(stage: PathStage, data: PathData): StageProgress {
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
		const ps = data.passages.filter((p) => stage.passages?.(p));
		const read = ps.filter((p) => data.reads[p.id]);
		return finish(ps.length, read.length, 0, { nextPassage: ps.find((p) => !data.reads[p.id]) });
	}

	if (stage.kind === 'skills') {
		const dims = stage.dims ?? [];
		const base = data.items.filter((it) => data.srs[it.id]?.dims.recognition.introduced);
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

export interface PathState {
	stages: PathStage[];
	progress: StageProgress[];
	/** Index of the first stage not done yet (the explore stage once all are). */
	current: number;
	doneCount: number;
	/** Stages that can be done (everything but explore). */
	countable: number;
}

export function pathState(language: Language, data: PathData): PathState {
	const stages = pathFor(language);
	const progress = stages.map((s) => stageProgress(s, data));
	const countable = stages.filter((s) => s.kind !== 'explore').length;
	let current = stages.findIndex((s, i) => s.kind !== 'explore' && !progress[i].done);
	if (current < 0) current = stages.length - 1;
	const doneCount = progress.filter((p, i) => stages[i].kind !== 'explore' && p.done).length;
	return { stages, progress, current, doneCount, countable };
}

/** Items of an item stage that already exist (for "review this stage"). */
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
	if (stage.passages) return data.passages.filter((p) => stage.passages!(p)).slice(0, Math.min(n, 4)).map((p) => p.title);
	return [];
}
