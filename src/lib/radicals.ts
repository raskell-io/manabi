/**
 * Radicals (部首) — the 214 Kangxi radicals every hanzi/kanji is filed under.
 * Data is generated (`node tools/gen-radicals-data.mjs` → radicals-data.ts);
 * this module adds lookups for the Radicals page and the glyph sheet.
 */

import { RADICALS, RADICAL_MEMBERS } from './radicals-data';

export interface Radical {
	/** Kangxi radical number, 1–214. */
	n: number;
	/** The radical as an ordinary ideograph (水, not the ⽔ compatibility glyph). */
	char: string;
	/** Strokes in the full form. */
	strokes: number;
	meaning: string;
	pinyin: string;
	/** Component / simplified forms, e.g. 氵 for 水, 讠 for 言. */
	variants: string[];
}

export { RADICALS };

export function getRadical(n: number): Radical | undefined {
	return RADICALS[n - 1];
}

let byChar: Map<string, { n: number; residual: number }> | null = null;
function index(): Map<string, { n: number; residual: number }> {
	if (byChar) return byChar;
	byChar = new Map();
	RADICAL_MEMBERS.forEach((runs, n) => {
		runs.split('|').forEach((run, residual) => {
			for (const c of run) byChar!.set(c, { n, residual });
		});
	});
	return byChar;
}

/** The radical a character is filed under, with its remaining stroke count. */
export function radicalOf(char: string): { radical: Radical; residual: number } | undefined {
	const hit = index().get(char);
	const radical = hit && getRadical(hit.n);
	return radical ? { radical, residual: hit!.residual } : undefined;
}

/**
 * Characters filed under radical `n`, grouped by residual strokes, keeping only
 * those `keep` accepts (e.g. the active language's reference set). Empty groups
 * are dropped.
 */
export function radicalMembers(n: number, keep: (c: string) => boolean = () => true): { residual: number; chars: string[] }[] {
	const runs = (RADICAL_MEMBERS[n] ?? '').split('|');
	return runs
		.map((run, residual) => ({ residual, chars: [...run].filter(keep) }))
		.filter((g) => g.chars.length > 0);
}

/** Radicals matching a query: number, the radical or a variant, meaning, or pinyin (tones ignored). */
export function searchRadicals(query: string, list: Radical[] = RADICALS): Radical[] {
	const q = fold(query.trim());
	if (!q) return list;
	if (/^\d+$/.test(q)) return list.filter((r) => String(r.n) === q);
	return list.filter(
		(r) =>
			r.char === query.trim() ||
			r.variants.includes(query.trim()) ||
			fold(r.meaning).includes(q) ||
			(r.pinyin && fold(r.pinyin) === q)
	);
}

/** Lower-case and strip tone marks, so "shui" matches "shuǐ". */
function fold(s: string): string {
	return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
