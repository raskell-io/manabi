/**
 * Dictionary data layout, shared by the build script (tools/gen-dict.mjs) and
 * the runtime (dictionary.ts). Each language's entries are split into shards
 * by the first character of the lookup key, so a lookup fetches one small
 * file (static/dict/<lang>/<bucket>.json) instead of the whole dictionary.
 */

import type { Language } from './db/types';

/** One dictionary sense group. Compact keys: these ship by the thousand. */
export interface DictEntry {
	/** Headword as written: Simplified / kanji (or kana) / Hangul / vowelled Hebrew. */
	w: string;
	/** Reading: pinyin with tone marks / kana / Revised Romanization / transliteration. */
	r: string;
	/** English glosses, most common sense first. */
	g: string[];
	/** Part of speech (JMdict codes for Japanese, used by deinflection). */
	p?: string;
}

export interface DictShard {
	/** Lookup key → entries. */
	e: Record<string, DictEntry[]>;
	/** Inflected form → lemma keys (Korean, Hebrew). */
	f?: Record<string, string[]>;
}

export interface DictManifest {
	[lang: string]: { buckets: number[]; entries: number; source: string; license: string };
}

export const DICT_LANGUAGES: Language[] = ['zh', 'yue', 'ja', 'ko', 'he'];

const BUCKETS = 64;

/** Hebrew points and cantillation (U+0591–U+05C7), maqaf and geresh marks. */
const HEBREW_MARKS = /[֑-ׇ׳״]/g;

/** The lookup key form of a word: Hebrew without niqqud; everything else as is. */
export function dictKey(word: string, language: Language): string {
	const w = word.normalize('NFC');
	return language === 'he' ? w.replace(HEBREW_MARKS, '') : w;
}

/** Which shard a key lives in. */
export function bucketOf(key: string): number {
	return (key.codePointAt(0) ?? 0) % BUCKETS;
}
