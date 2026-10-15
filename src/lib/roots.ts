/**
 * Hebrew roots (שׁוֹרָשִׁים) — most Hebrew words are built on a root of three
 * consonants poured into a pattern of vowels and affixes: כ־ת־ב gives כּוֹתֵב
 * “writes”, מִכְתָּב “letter”, כְּתֹבֶת “address”. The Roots page lists a
 * curated set (roots-data.ts); this module adds lookups and the per-letter
 * split that highlights a root inside a word.
 */

import { stripNiqqud } from './db/types';
import { ROOT_LIST } from './roots-data';

export type RootWordPos = 'verb' | 'noun' | 'adj' | 'phrase' | 'other';

export interface RootWord {
	/** Vowelled Hebrew. */
	t: string;
	/** Transliteration. */
	r: string;
	/** English gloss. */
	m: string;
	pos: RootWordPos;
}

export interface HebrewRoot {
	/** Latin slug, used in URLs (/roots?r=ktv). */
	id: string;
	/** The consonants, regular letter forms (no final forms, no shin/sin dot). */
	letters: string;
	meaning: string;
	/** An optional one-line teaching point. */
	note?: string;
	words: RootWord[];
}

const FINAL_TO_REGULAR: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };
const REGULAR_TO_FINAL: Record<string, string> = { כ: 'ך', מ: 'ם', נ: 'ן', פ: 'ף', צ: 'ץ' };
const LETTER = /[א-ת]/;
const MARK = /[֑-ׇֽֿׁׂׅׄ]/;

/** A letter in its regular (non-final) form. */
function regular(c: string): string {
	return FINAL_TO_REGULAR[c] ?? c;
}

/** Bare consonants with final forms folded, for matching: “מִכְתָּב” → “מכתב”. */
export function consonants(text: string): string {
	return [...stripNiqqud(text)].filter((c) => LETTER.test(c)).map(regular).join('');
}

/** All roots, in alef-bet order. */
export const ROOTS: HebrewRoot[] = [...ROOT_LIST].sort((a, b) => (a.letters < b.letters ? -1 : a.letters > b.letters ? 1 : 0));

export function getRoot(id: string): HebrewRoot | undefined {
	return ROOTS.find((r) => r.id === id);
}

/** The root's letters for display, last one in its final form: [כ, ת, ב], [ש, ל, ם]. */
export function rootLetters(root: Pick<HebrewRoot, 'letters'>): string[] {
	const ls = [...root.letters];
	ls[ls.length - 1] = REGULAR_TO_FINAL[ls[ls.length - 1]] ?? ls[ls.length - 1];
	return ls;
}

/** “כ־ת־ב” — letters joined by a maqaf. */
export function rootLabel(root: Pick<HebrewRoot, 'letters'>): string {
	return rootLetters(root).join('־');
}

let byWord: Map<string, { root: HebrewRoot; word: RootWord }> | null = null;
/**
 * The root a Hebrew word or phrase is listed under: an exact (vowelled) match
 * first, else by consonants, so unvowelled text still finds its root.
 */
export function rootOfWord(target: string): { root: HebrewRoot; word: RootWord } | undefined {
	if (!byWord) {
		byWord = new Map();
		for (const root of ROOTS)
			for (const word of root.words) {
				byWord.set(word.t.normalize('NFC'), { root, word });
				if (!byWord.has(consonants(word.t))) byWord.set(consonants(word.t), { root, word });
			}
	}
	const key = consonants(target);
	return key ? (byWord.get(target.normalize('NFC')) ?? byWord.get(key)) : undefined;
}

/**
 * Roots matching a query: the root letters (“כתב”, “כ-ת-ב”, any vowels or
 * final forms), a word built on it, the meaning, a gloss, or a transliteration.
 */
export function searchRoots(query: string, list: HebrewRoot[] = ROOTS): HebrewRoot[] {
	const q = query.trim().toLowerCase();
	if (!q) return list;
	const heb = consonants(q);
	if (heb) {
		return list.filter((r) => r.letters === heb || r.words.some((w) => consonants(w.t).includes(heb)));
	}
	return list.filter(
		(r) =>
			r.id === q.replace(/[^a-z]/g, '') ||
			r.meaning.toLowerCase().includes(q) ||
			r.words.some((w) => w.m.toLowerCase().includes(q) || w.r.toLowerCase().replace(/’/g, '').includes(q.replace(/['’]/g, '')))
	);
}

/**
 * Split a vowelled word into letter clusters (a letter plus its points),
 * flagging the ones that spell the root, so the page can colour them:
 * מִכְתָּב → מִ · [כְ] · [תָּ] · [ב]. The flagged letters are the longest
 * in-order match of the root's letters, so prefixes (מ, תּ, מִתְ…) and a
 * feminine ה stay plain; letters the word has lost (the נ of מַתָּנָה) are
 * simply absent.
 */
export function splitByRoot(word: string, root: Pick<HebrewRoot, 'letters'>): { text: string; root: boolean }[] {
	const clusters: { text: string; base: string }[] = [];
	for (const c of word) {
		if (MARK.test(c) && clusters.length) clusters[clusters.length - 1].text += c;
		else clusters.push({ text: c, base: LETTER.test(c) ? regular(c) : '' });
	}
	// A phrase: highlight the root in its best-matching word only.
	const words: [number, number][] = [];
	clusters.forEach((c, k) => {
		if (!c.base) return;
		if (k > 0 && clusters[k - 1].base && words.length) words[words.length - 1][1] = k + 1;
		else words.push([k, k + 1]);
	});
	let best: Placement = { picks: [], score: [0, 0, 0, 0] };
	for (const [from, to] of words) {
		const p = placeRoot(clusters.slice(from, to).map((c) => c.base), [...root.letters]);
		if (better(p.score, best.score)) best = { picks: p.picks.map((k) => k + from), score: p.score };
	}
	const flagged = new Set(best.picks);
	return clusters.map((c, k) => ({ text: c.text, root: flagged.has(k) }));
}

type Score = [matched: number, exact: number, strong: number, negSpan: number];
interface Placement {
	picks: number[];
	score: Score;
}
const better = (a: Score, b: Score) => {
	for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] > b[k];
	return false;
};

/**
 * Try every in-order placement of the root letters in a word (each may be
 * missing). Best = most letters matched, then most exact (not shifted), then
 * most strong (non-weak) ones, then the tightest span. Words are short, so
 * brute force is fine.
 */
function placeRoot(letters: string[], R: string[]): Placement {
	let best: Placement = { picks: [], score: [0, 0, 0, 0] };
	const walk = (j: number, from: number, picks: number[], exact: number, strong: number) => {
		if (j === R.length) {
			const span = picks.length ? picks[picks.length - 1] - picks[0] : 0;
			const score: Score = [picks.length, exact, strong, -span];
			if (better(score, best.score)) best = { picks: [...picks], score };
			return;
		}
		walk(j + 1, from, picks, exact, strong); // this root letter is missing from the word
		for (let i = from; i < letters.length; i++) {
			if (!sameLetter(letters[i], R[j], j, R.length)) continue;
			picks.push(i);
			// A word-final ה is usually the feminine ending, so it isn't evidence.
			const sure = letters[i] === R[j] && !(letters[i] === 'ה' && i === letters.length - 1);
			walk(j + 1, i + 1, picks, exact + (sure ? 1 : 0), strong + (WEAK.has(R[j]) ? 0 : 1));
			picks.pop();
		}
	};
	walk(0, 0, [], 0, 0);
	return best;
}

/**
 * Whether a letter in a word spells root letter `r` (at `j` of `len`). Beyond
 * an exact match, two regular weak-letter shifts: a root-final ה surfaces as
 * י (קָנָה → קְנִיָּה), and a root-initial י as ו (י־ד־ה → תּוֹדָה, י־ש־ב → מוֹשָׁב).
 */
function sameLetter(c: string, r: string, j: number, len: number): boolean {
	return c === r || (r === 'ה' && j === len - 1 && c === 'י') || (r === 'י' && j === 0 && c === 'ו');
}

/** Letters that often drop out of, or blend into, a root's surface forms. */
const WEAK = new Set(['א', 'ה', 'ו', 'י', 'נ']);
