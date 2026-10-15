import { describe, it, expect } from 'vitest';
import { ROOTS, consonants, getRoot, rootLabel, rootLetters, rootOfWord, searchRoots, splitByRoot } from './roots';
import { seedItems } from './db/seed';
import { hasNiqqud } from './db/types';

const hl = (word: string, id: string) =>
	splitByRoot(word, getRoot(id)!)
		.filter((c) => c.root)
		.map((c) => consonants(c.text))
		.join('');

describe('root data', () => {
	it('has unique ids and letters, in alef-bet order', () => {
		expect(ROOTS.length).toBeGreaterThanOrEqual(40);
		expect(new Set(ROOTS.map((r) => r.id)).size).toBe(ROOTS.length);
		expect(new Set(ROOTS.map((r) => r.letters)).size).toBe(ROOTS.length);
		const letters = ROOTS.map((r) => r.letters);
		expect([...letters].sort()).toEqual(letters);
	});
	it('stores roots as three regular letters', () => {
		for (const r of ROOTS) expect(r.letters, r.id).toMatch(/^[אבגדהוזחטיכלמנסעפצקרשת]{3}$/);
	});
	it('vowels every word, with a dot on every shin/sin', () => {
		for (const r of ROOTS) {
			expect(r.words.length, r.id).toBeGreaterThanOrEqual(3);
			for (const w of r.words) {
				expect(hasNiqqud(w.t), w.t).toBe(true);
				expect(w.t, w.t).not.toMatch(/ש(?![ְ-ּ]*[ׁׂ])/u);
				expect(w.r && w.m, w.t).toBeTruthy();
			}
		}
	});
	it('lists each spelling under one root only (homographs share a root: אָדָם / אָדֹם)', () => {
		const seen = new Map<string, string>();
		for (const r of ROOTS)
			for (const w of r.words) {
				const k = consonants(w.t);
				expect(seen.get(k) ?? r.id, `${w.t} in ${r.id} and ${seen.get(k)}`).toBe(r.id);
				seen.set(k, r.id);
			}
		const all = ROOTS.flatMap((r) => r.words.map((w) => w.t));
		expect(new Set(all).size).toBe(all.length);
	});
	it('spells words that are also seed items exactly like the seed (no near-duplicates)', () => {
		const seed = seedItems().filter((i) => i.language === 'he').map((i) => i.target);
		const words = new Set(ROOTS.flatMap((r) => r.words.map((w) => w.t)));
		const shared = seed.filter((t) => words.has(t));
		expect(shared.length).toBeGreaterThanOrEqual(20);
		// A seed item whose consonants match a root word must itself be listed, vowelled the same.
		for (const t of seed) if ([...words].some((w) => consonants(w) === consonants(t))) expect(words.has(t), t).toBe(true);
	});
	it('finds at least two root letters in every word', () => {
		for (const r of ROOTS)
			for (const w of r.words) expect(splitByRoot(w.t, r).filter((c) => c.root).length, `${w.t} / ${r.id}`).toBeGreaterThanOrEqual(2);
	});
});

describe('lookups', () => {
	it('labels roots with a final form and maqaf', () => {
		expect(rootLabel(getRoot('ktv')!)).toBe('כ־ת־ב');
		expect(rootLetters(getRoot('shlm')!)).toEqual(['ש', 'ל', 'ם']);
		expect(rootLabel(getRoot('hlch')!)).toBe('ה־ל־ך');
	});
	it('finds the root of a word however it is vowelled', () => {
		expect(rootOfWord('מִכְתָּב')?.root.id).toBe('ktv');
		expect(rootOfWord('מכתב')?.root.id).toBe('ktv');
		expect(rootOfWord('אָדָם')?.word.m).toBe('person, human');
		expect(rootOfWord('אָדֹם')?.word.m).toBe('red (m.)');
		expect(rootOfWord('לוֹמֵד')?.root.id).toBe('lmd');
		expect(rootOfWord('הוֹלֵךְ')?.root.id).toBe('hlch');
		expect(rootOfWord('קָטָן')).toBeUndefined();
		expect(rootOfWord('')).toBeUndefined();
	});
	it('searches by letters, words, meanings and transliteration', () => {
		expect(searchRoots('כתב').map((r) => r.id)).toEqual(['ktv']);
		expect(searchRoots('כ-ת-ב').map((r) => r.id)).toEqual(['ktv']);
		expect(searchRoots('מִכְתָּב').map((r) => r.id)).toEqual(['ktv']);
		expect(searchRoots('writing').map((r) => r.id)).toContain('ktv');
		expect(searchRoots('michtav').map((r) => r.id)).toEqual(['ktv']);
		expect(searchRoots('ma’achal').map((r) => r.id)).toEqual(['akl']);
		expect(searchRoots('maachal').map((r) => r.id)).toEqual(['akl']);
		expect(searchRoots('  ')).toBe(ROOTS);
		expect(searchRoots('zzz')).toEqual([]);
	});
});

describe('splitByRoot', () => {
	it('keeps every point with its letter', () => {
		const parts = splitByRoot('מִכְתָּב', getRoot('ktv')!);
		expect(parts.map((p) => p.text).join('')).toBe('מִכְתָּב');
		expect(parts.map((p) => p.root)).toEqual([false, true, true, true]);
	});
	it('skips prefixes and the feminine ending', () => {
		expect(hl('תַּלְמִיד', 'lmd')).toBe('למד');
		expect(hl('מִשְׁמֶרֶת', 'shmr')).toBe('שמר');
		expect(hl('קַנְיוֹן', 'knh')).toBe('קני');
	});
	it('follows the weak-letter shifts and dropped letters', () => {
		expect(hl('מוֹשָׁב', 'yshv')).toBe('ושב'); // initial י → ו
		expect(hl('יוֹשֵׁב', 'yshv')).toBe('ישב'); // …but a real י wins
		expect(hl('שְׁתִיָּה', 'sth')).toBe('שתי'); // final ה → י
		expect(hl('מַתָּנָה', 'ntn')).toBe('תנ'); // first נ assimilated
	});
	it('highlights within one word of a phrase', () => {
		expect(hl('יוֹם הֻלֶּדֶת', 'yld')).toBe('לד');
		expect(hl('רֹאשׁ הַשָּׁנָה', 'rsh')).toBe('ראש');
	});
});
