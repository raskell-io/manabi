/**
 * Manabi data model.
 *
 * Everything lives on a single Automerge document persisted to IndexedDB.
 * The atomic unit is the `LearningItem` — words, phrases, sentences and
 * grammar points all share that shape, distinguished by `kind`. Lessons,
 * SRS state, attempts and AI drafts all reference items by id.
 *
 * Entities carry `[key: string]: unknown` so Automerge's proxy is happy
 * mutating them in place (kurumi idiom).
 */

// --- ID generation ----------------------------------------------------------

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Cryptographically-random base62 id. */
export function generateId(length: number = 12): string {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	let id = '';
	for (let i = 0; i < length; i++) {
		id += BASE62[bytes[i] % 62];
	}
	return id;
}

// --- Core enums -------------------------------------------------------------

export type Language = 'zh' | 'ja' | 'he';

export const LANGUAGES: { code: Language; name: string; native: string; dir: 'ltr' | 'rtl' }[] = [
	{ code: 'zh', name: 'Chinese', native: '中文', dir: 'ltr' },
	{ code: 'ja', name: 'Japanese', native: '日本語', dir: 'ltr' },
	{ code: 'he', name: 'Hebrew', native: 'עברית', dir: 'rtl' }
];

export function languageDir(language: Language): 'ltr' | 'rtl' {
	return language === 'he' ? 'rtl' : 'ltr';
}

/**
 * Strip Hebrew niqqud (vowel points), dagesh, shin/sin dots and cantillation
 * marks — the U+0591–U+05C7 combining range — leaving the bare consonantal
 * text. Used for the "hide vowels" mode (pitch §3: vowelled first, then
 * gradually hide vowels). No-op for non-Hebrew strings.
 */
export function stripNiqqud(text: string): string {
	return text.replace(/[֑-ׇ]/g, '');
}

export type ItemKind = 'word' | 'phrase' | 'sentence' | 'grammar';

/**
 * The five skills tracked independently per item (pitch §5). A learner may
 * recognize a word visually but fail to pronounce it, or understand pinyin
 * but fail when hearing it — so each gets its own SRS schedule.
 */
export type Dimension = 'recognition' | 'pronunciation' | 'listening' | 'recall' | 'context';

export const DIMENSIONS: Dimension[] = [
	'recognition',
	'pronunciation',
	'listening',
	'recall',
	'context'
];

export const DIMENSION_LABELS: Record<Dimension, string> = {
	recognition: 'Recognition',
	pronunciation: 'Pronunciation',
	listening: 'Listening',
	recall: 'Recall',
	context: 'Context'
};

// --- Learning content -------------------------------------------------------

export interface ExampleSentence {
	target: string; // script
	reading: string; // pinyin / kana / vowelled
	transliteration?: string; // latin transliteration (esp. Hebrew)
	meaning: string; // English
	audioRef?: string; // blob ref of synthesized/native audio
	[key: string]: unknown;
}

export type ItemStatus = 'published' | 'draft';

export interface LearningItem {
	id: string;
	language: Language;
	kind: ItemKind;
	target: string; // 今天 / 食べる / שָׁלוֹם
	reading: string; // jīntiān / たべる / shalom (vowelled for he)
	transliteration?: string; // optional latin form (he: "shalom")
	meaning: string; // English gloss
	tags: string[]; // ['time','daily','HSK1','A1'] — HSK/JLPT/CEFR as metadata
	level: string; // 'A1' | 'HSK1' | 'N4' ...
	examples: ExampleSentence[];
	audioRef?: string; // blob ref of word-level audio
	status: ItemStatus;
	createdAt: number;
	updatedAt: number;
	[key: string]: unknown;
}

export interface Lesson {
	id: string;
	title: string;
	language: Language;
	itemIds: string[];
	createdAt: number;
	[key: string]: unknown;
}

// --- Reading material: conversations & texts --------------------------------

export type PassageKind = 'conversation' | 'text';

export const PASSAGE_KIND_LABELS: Record<PassageKind, string> = {
	conversation: 'Conversation',
	text: 'Text'
};

/** One turn of a dialogue, or one sentence of a prose passage. */
export interface PassageLine {
	speaker?: string; // dialogue speaker label; absent for prose
	target: string; // line in the target script
	reading: string; // pinyin / kana / transliteration
	transliteration?: string;
	meaning: string; // English
	audioRef?: string;
	[key: string]: unknown;
}

/**
 * A reading passage — a natural conversation or a newspaper/non-fiction style
 * text. Read in `/read`; individual lines can be mined into SRS items.
 */
export interface Passage {
	id: string;
	language: Language;
	kind: PassageKind;
	title: string;
	level: string;
	tags: string[];
	intro?: string; // English context blurb
	lines: PassageLine[];
	createdAt: number;
	updatedAt: number;
	[key: string]: unknown;
}

// --- SRS state (multi-dimensional SM-2) -------------------------------------

export interface DimState {
	interval: number; // days until next review
	ease: number; // easiness factor (default 2.5)
	repetitions: number; // successful reviews in a row
	nextReview: string; // ISO YYYY-MM-DD
	lastReviewed: string | null; // ISO YYYY-MM-DD
	lapses: number; // total times forgotten
	introduced: boolean; // has this dimension been studied yet?
	[key: string]: unknown;
}

export interface SkillMemory {
	itemId: string;
	dims: Record<Dimension, DimState>;
	createdAt: number;
	updatedAt: number;
	[key: string]: unknown;
}

// --- Exercises --------------------------------------------------------------

export type ExerciseType =
	| 'word-to-meaning' // recognition
	| 'word-to-reading' // recognition / pronunciation
	| 'reading-to-word' // recognition
	| 'audio-to-word' // listening
	| 'cloze' // context
	| 'meaning-to-word' // recall
	| 'record-compare'; // pronunciation (M3)

export const EXERCISE_DIMENSION: Record<ExerciseType, Dimension> = {
	'word-to-meaning': 'recognition',
	'word-to-reading': 'recognition',
	'reading-to-word': 'recognition',
	'audio-to-word': 'listening',
	cloze: 'context',
	'meaning-to-word': 'recall',
	'record-compare': 'pronunciation'
};

export interface ExerciseAttempt {
	id: string;
	itemId: string;
	language: Language;
	dimension: Dimension;
	exerciseType: ExerciseType;
	correct: boolean;
	quality: number; // 0-5 SM-2 grade
	chosen?: string;
	expected: string;
	at: number;
	[key: string]: unknown;
}

export type SelfRating = 'bad' | 'okay' | 'good';

export interface PronunciationAttempt {
	id: string;
	itemId: string;
	audioRef: string; // blob ref of the recording
	selfRating: SelfRating;
	at: number;
	[key: string]: unknown;
}

// --- AI content pipeline ----------------------------------------------------

export type DraftStatus = 'pending' | 'approved' | 'rejected';

/**
 * AI-generated item awaiting human review. Mirrors kurumi's proposal queues:
 * the assistant proposes, the user approves, approval publishes a LearningItem.
 */
export interface ContentDraft {
	id: string;
	language: Language;
	kind: ItemKind;
	item: GeneratedItem; // the proposed content (no ids yet)
	sourcePrompt: string;
	status: DraftStatus;
	createdAt: number;
	[key: string]: unknown;
}

/** The shape the LLM is asked to return (validated before becoming a draft). */
export interface GeneratedItem {
	target: string;
	reading: string;
	transliteration?: string;
	meaning: string;
	tags: string[];
	level: string;
	examples: ExampleSentence[];
	[key: string]: unknown;
}

/** AI-generated reading passage (conversation or text) awaiting review. */
export interface GeneratedPassage {
	title: string;
	intro?: string;
	tags: string[];
	lines: PassageLine[];
	[key: string]: unknown;
}

export interface PassageDraft {
	id: string;
	language: Language;
	kind: PassageKind;
	level: string;
	passage: GeneratedPassage;
	sourcePrompt: string;
	status: DraftStatus;
	createdAt: number;
	[key: string]: unknown;
}

// --- Settings ---------------------------------------------------------------

export interface ManabiSettings {
	activeLanguage: Language;
	newPerDay: number; // new items introduced per day per language
	reviewCap: number; // max reviews per session
	openaiApiKey: string; // stored locally; never committed
	openaiModel: string; // chat model for content generation
	localTtsEnabled: boolean; // synthesize pronunciation on-device
	hideHebrewVowels: boolean; // render Hebrew without niqqud (advanced reading)
	theme: 'system' | 'light' | 'dark';
	[key: string]: unknown;
}

export function defaultSettings(): ManabiSettings {
	return {
		activeLanguage: 'zh',
		newPerDay: 5,
		reviewCap: 40,
		openaiApiKey: '',
		openaiModel: 'gpt-4o',
		localTtsEnabled: true,
		hideHebrewVowels: false,
		theme: 'system'
	};
}

// --- Document ---------------------------------------------------------------

export const SCHEMA_VERSION = 4;

export interface ManabiDocument {
	schemaVersion: number;
	learningItems: Record<string, LearningItem>;
	lessons: Record<string, Lesson>;
	passages: Record<string, Passage>;
	srsStates: Record<string, SkillMemory>; // keyed by itemId
	exerciseAttempts: Record<string, ExerciseAttempt>;
	pronunciationAttempts: Record<string, PronunciationAttempt>;
	contentDrafts: Record<string, ContentDraft>;
	passageDrafts: Record<string, PassageDraft>;
	/** Seed ids already applied, so new seeds upsert without re-adding deleted ones. */
	seededIds: Record<string, boolean>;
	settings: ManabiSettings;
	[key: string]: unknown;
}

export function createEmptyDocument(): ManabiDocument {
	return {
		schemaVersion: SCHEMA_VERSION,
		learningItems: {},
		lessons: {},
		passages: {},
		srsStates: {},
		exerciseAttempts: {},
		pronunciationAttempts: {},
		contentDrafts: {},
		passageDrafts: {},
		seededIds: {},
		settings: defaultSettings()
	};
}

// --- SM-2 / SRS helpers -----------------------------------------------------

/** ISO YYYY-MM-DD for "today" in local time. */
export function todayIso(): string {
	return isoDate(new Date());
}

export function isoDate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/** ISO date `days` from today. */
export function isoDatePlus(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return isoDate(d);
}

/** A fresh, never-studied dimension state, due today. */
export function freshDimState(): DimState {
	return {
		interval: 0,
		ease: 2.5,
		repetitions: 0,
		nextReview: todayIso(),
		lastReviewed: null,
		lapses: 0,
		introduced: false
	};
}

export function freshSkillMemory(itemId: string): SkillMemory {
	const now = Date.now();
	const dims = {} as Record<Dimension, DimState>;
	for (const dim of DIMENSIONS) {
		dims[dim] = freshDimState();
	}
	return { itemId, dims, createdAt: now, updatedAt: now };
}
