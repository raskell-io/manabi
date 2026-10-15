/**
 * Stroke-order data for the drawing pad (Hanzi Writer). Characters on the
 * Scripts page, in the seed and in the radical table ship in
 * static/strokes/{zh,ja}/ (works offline — `node tools/gen-stroke-data.mjs`);
 * anything else is fetched from the same pinned CDN packages and then cached
 * by the service worker.
 *
 * Japanese uses its own data set (animCJK): kanji shapes and stroke orders
 * differ from simplified Chinese (気 vs 气, 直's inner strokes, …).
 */

import type { Language } from './db/types';
import { BUNDLED_STROKES } from './strokes-index';

export type StrokeLang = 'zh' | 'ja';

// Keep in sync with tools/gen-stroke-data.mjs.
export const STROKE_CDN: Record<StrokeLang, string> = {
	zh: 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1',
	ja: 'https://cdn.jsdelivr.net/npm/hanzi-writer-data-jp@0.0.1'
};

const HAN = /\p{Script=Han}/u;

/** Is this a single hanzi/kanji (the only thing the drawing pad can draw)? */
export function isHan(char: string): boolean {
	return [...char].length === 1 && HAN.test(char);
}

/** The Han characters in a text, de-duplicated, in order of appearance. */
export function hanChars(text: string): string[] {
	return [...new Set([...text].filter((c) => HAN.test(c)))];
}

/** Which data set a language draws from (Korean/Hebrew have none). */
export function strokeLang(language: Language): StrokeLang | null {
	return language === 'zh' ? 'zh' : language === 'ja' ? 'ja' : null;
}

export function isBundled(lang: StrokeLang, char: string): boolean {
	return BUNDLED_STROKES[lang].includes(char);
}

/** Where to load a character's data from: the bundled file, else the CDN. */
export function strokeUrl(lang: StrokeLang, char: string): string {
	return isBundled(lang, char)
		? `/strokes/${lang}/${char.codePointAt(0)!.toString(16)}.json`
		: `${STROKE_CDN[lang]}/${encodeURIComponent(char)}.json`;
}

export interface StrokeData {
	strokes: string[];
	medians: number[][][];
	radStrokes?: number[];
}

const cache = new Map<string, Promise<StrokeData>>();

/** Load (and memoize) one character's stroke data. Rejects when there is none. */
export function loadStrokes(lang: StrokeLang, char: string): Promise<StrokeData> {
	const key = `${lang}:${char}`;
	let p = cache.get(key);
	if (!p) {
		p = fetch(strokeUrl(lang, char)).then(async (r) => {
			if (!r.ok) throw new Error(`No stroke data for ${char}`);
			return (await r.json()) as StrokeData;
		});
		p.catch(() => cache.delete(key)); // allow a retry (e.g. once back online)
		cache.set(key, p);
	}
	return p;
}
