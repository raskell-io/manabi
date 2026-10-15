import { describe, it, expect } from 'vitest';
import { nameItem, nameSections, searchNames } from './names';
import { seedItems } from './db/seed';
import { LANGUAGES, hasNiqqud, stripNiqqud } from './db/types';
import { ROOTS } from './roots';

describe('name data', () => {
	it('has the same five sections in every language', () => {
		for (const { code } of LANGUAGES) {
			expect(nameSections(code).map((s) => s.id), code).toEqual(['countries', 'home', 'world', 'family', 'given']);
			expect(nameSections(code, 'places').map((s) => s.id)).toEqual(['countries', 'home', 'world']);
			expect(nameSections(code, 'people').map((s) => s.id)).toEqual(['family', 'given']);
			for (const s of nameSections(code)) expect(s.entries.length, `${code}/${s.id}`).toBeGreaterThanOrEqual(8);
		}
	});
	it('never lists a name twice in a language, and every entry is complete', () => {
		for (const { code } of LANGUAGES) {
			const all = nameSections(code).flatMap((s) => s.entries);
			const keys = all.map((e) => (code === 'he' ? stripNiqqud(e.t) : e.t));
			expect(new Set(keys).size, code).toBe(keys.length);
			for (const e of all) expect(e.t && e.r && e.m, `${code} ${e.t}`).toBeTruthy();
		}
	});
	it('marks every given name with a gender, and nothing else', () => {
		for (const { code } of LANGUAGES)
			for (const s of nameSections(code))
				for (const e of s.entries) expect(!!e.g, `${code} ${e.t}`).toBe(s.id === 'given');
	});
	it('uses each language’s reading conventions', () => {
		const tone = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/;
		for (const e of nameSections('zh').flatMap((s) => s.entries)) {
			expect(e.t, e.t).toMatch(/^\p{Script=Han}+$/u);
			expect(e.r, e.r).toMatch(tone);
		}
		for (const e of nameSections('ja').flatMap((s) => s.entries)) {
			expect(e.r, e.t).toMatch(/^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u);
			expect(e.tr, e.t).toMatch(/^[A-Za-zāīūēōĀĪŪĒŌ ]+$/);
		}
		for (const e of nameSections('ko').flatMap((s) => s.entries)) {
			expect(e.t, e.t).toMatch(/^\p{Script=Hangul}+$/u);
			expect(e.r, e.t).toMatch(/^[A-Za-z]+$/);
		}
		for (const e of nameSections('he').flatMap((s) => s.entries)) {
			expect(hasNiqqud(e.t), e.t).toBe(true);
			expect(e.t, e.t).not.toMatch(/ש(?![ְ-ּ]*[ׁׂ])/u);
		}
	});
	it('spells Hebrew names that are also seed or root words the same way', () => {
		const known = [
			...seedItems().filter((i) => i.language === 'he').map((i) => i.target),
			...ROOTS.flatMap((r) => r.words.map((w) => w.t))
		];
		for (const e of nameSections('he').flatMap((s) => s.entries)) {
			const twin = known.find((k) => stripNiqqud(k) === stripNiqqud(e.t));
			if (twin) expect(e.t).toBe(twin);
		}
	});
});

describe('nameItem', () => {
	const [zhFamily] = nameSections('zh', 'people');
	const heGiven = nameSections('he', 'people')[1];
	it('says what kind of name it is', () => {
		const wang = nameItem('zh', zhFamily, zhFamily.entries[0]);
		expect(wang).toMatchObject({ kind: 'word', target: '王', reading: 'Wáng', meaning: 'Wang (family name)' });
		expect(wang.tags).toEqual(['name', 'person', 'names-family']);
		expect(wang.transliteration).toBeUndefined();
		const david = nameItem('he', heGiven, heGiven.entries[0]);
		expect(david).toMatchObject({ meaning: 'David (given name, male)', transliteration: 'David' });
	});
	it('keeps romaji, and makes multi-word names phrases', () => {
		const tokyo = nameSections('ja', 'places')[1];
		expect(nameItem('ja', tokyo, tokyo.entries[0])).toMatchObject({ reading: 'とうきょう', transliteration: 'Tōkyō', meaning: 'Tokyo' });
		const il = nameSections('he', 'places')[1];
		const tlv = il.entries.find((e) => e.m === 'Tel Aviv')!;
		expect(nameItem('he', il, tlv)).toMatchObject({ kind: 'phrase', tags: ['name', 'place', 'names-home'] });
	});
});

describe('searchNames', () => {
	it('matches script, reading without tones, romaji, English and notes', () => {
		const zh = nameSections('zh');
		const hit = (q: string, s = zh) => searchNames(s, q).flatMap((x) => x.entries.map((e) => e.m));
		expect(hit('beijing')).toEqual(['Beijing']);
		expect(hit('北京')).toEqual(['Beijing']);
		expect(hit('northern capital')).toEqual(['Beijing']);
		expect(hit('tokyo', nameSections('ja'))).toContain('Tokyo');
		expect(hit('Tel Aviv', nameSections('he'))).toEqual(['Tel Aviv']);
		expect(hit('ירושלים', nameSections('he'))).toEqual(['Jerusalem']);
		expect(searchNames(zh, ' ')).toBe(zh);
		expect(searchNames(zh, 'zzzz')).toEqual([]);
	});
});
