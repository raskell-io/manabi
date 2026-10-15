/**
 * Place and people names — countries, cities, family and given names per
 * language, for the Names page. Data is hand-curated in names-data.ts; this
 * module adds search and the mapping to a `LearningItem`.
 */

import type { GeneratedItem, Language } from './db/types';
import { stripNiqqud } from './db/types';
import { NAME_SECTIONS } from './names-data';

export interface NameEntry {
	/** The name in the language's script. */
	t: string;
	/** Reading: pinyin / kana / Revised Romanization / transliteration. */
	r: string;
	/** Japanese only: romaji. */
	tr?: string;
	/** English. */
	m: string;
	/** Literal meaning or a short note. */
	n?: string;
	/** Given names: male, female, or used for both. */
	g?: 'm' | 'f' | 'u';
}

export type NameGroup = 'places' | 'people';

export interface NameSection {
	/** countries · home · world · family · given */
	id: string;
	group: NameGroup;
	title: string;
	note?: string;
	entries: NameEntry[];
}

export function nameSections(language: Language, group?: NameGroup): NameSection[] {
	const all = NAME_SECTIONS[language];
	return group ? all.filter((s) => s.group === group) : all;
}

const fold = (s: string) =>
	stripNiqqud(s)
		.normalize('NFD')
		.replace(/[̀-ͯ’'\-\s]/g, '')
		.toLowerCase();

/** Sections with only the entries matching a query (script, reading, romaji, English, note). */
export function searchNames(sections: NameSection[], query: string): NameSection[] {
	const q = fold(query);
	if (!q) return sections;
	return sections
		.map((s) => ({
			...s,
			entries: s.entries.filter((e) => [e.t, e.r, e.tr ?? '', e.m, e.n ?? ''].some((f) => fold(f).includes(q)))
		}))
		.filter((s) => s.entries.length > 0);
}

const GENDER = { m: 'male', f: 'female', u: 'male or female' } as const;

/** The review item for a name: meaning says what kind of name it is. */
export function nameItem(language: Language, section: NameSection, e: NameEntry): GeneratedItem & { kind: 'word' | 'phrase' } {
	const what =
		section.id === 'family' ? ' (family name)' : section.id === 'given' ? ` (given name${e.g ? `, ${GENDER[e.g]}` : ''})` : '';
	return {
		kind: /\s/.test(e.t) ? 'phrase' : 'word',
		target: e.t,
		reading: e.r,
		...(e.tr ? { transliteration: e.tr } : language === 'he' ? { transliteration: e.r } : {}),
		meaning: e.m + what,
		tags: ['name', section.group === 'places' ? 'place' : 'person', `names-${section.id}`],
		level: 'A2',
		examples: []
	};
}

export function genderLabel(g: NameEntry['g']): string {
	return g ? GENDER[g] : '';
}
