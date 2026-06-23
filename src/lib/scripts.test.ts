import { describe, it, expect } from 'vitest';
import { scriptSections, sectionGlyphs } from './scripts';

const NIQQUD = /[֑-ׇ]/;

function glyphsOf(language: 'zh' | 'ja' | 'he', sectionId: string) {
	const s = scriptSections(language).find((x) => x.id === sectionId);
	return s ? sectionGlyphs(s) : [];
}

describe('script tables', () => {
	it('has the full hiragana & katakana base syllabaries (46 each)', () => {
		expect(glyphsOf('ja', 'hiragana')).toHaveLength(46);
		expect(glyphsOf('ja', 'katakana')).toHaveLength(46);
	});

	it('has the voiced (dakuten) rows (25 each)', () => {
		expect(glyphsOf('ja', 'hiragana-dakuten')).toHaveLength(25);
		expect(glyphsOf('ja', 'katakana-dakuten')).toHaveLength(25);
	});

	it('has the full Hebrew alef-bet (22) plus 5 final forms', () => {
		expect(glyphsOf('he', 'alefbet')).toHaveLength(22);
		expect(glyphsOf('he', 'alefbet-finals')).toHaveLength(5);
	});

	it('ships starter kanji and hanzi sets', () => {
		expect(glyphsOf('ja', 'kanji').length).toBeGreaterThanOrEqual(40);
		expect(glyphsOf('zh', 'hanzi').length).toBeGreaterThanOrEqual(40);
	});

	it('every glyph has a character and a reading; unique within a section', () => {
		for (const lang of ['zh', 'ja', 'he'] as const) {
			for (const section of scriptSections(lang)) {
				const glyphs = sectionGlyphs(section);
				for (const g of glyphs) {
					expect(g.char.trim(), section.id).not.toBe('');
					expect(g.roman.trim(), section.id).not.toBe('');
				}
				const chars = glyphs.map((g) => g.char);
				expect(new Set(chars).size, section.id).toBe(chars.length);
			}
		}
	});

	it('Hebrew letters are bare consonants (no niqqud in the table)', () => {
		for (const g of glyphsOf('he', 'alefbet')) {
			expect(NIQQUD.test(g.char), g.char).toBe(false);
		}
	});
});
