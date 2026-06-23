import { describe, it, expect } from 'vitest';
import { scriptSections, sectionGlyphs, blockGlyphs } from './scripts';

const NIQQUD = /[֑-ׇ]/;

function section(language: 'zh' | 'ja' | 'he', id: string) {
	return scriptSections(language).find((s) => s.id === id);
}

describe('script sections', () => {
	it('has tabbed sections per language', () => {
		expect(scriptSections('ja').map((s) => s.id)).toEqual(['hiragana', 'katakana', 'kanji']);
		expect(scriptSections('zh').map((s) => s.id)).toEqual(['hanzi', 'tones']);
		expect(scriptSections('he').map((s) => s.id)).toEqual(['alefbet', 'alefbet-finals']);
	});

	it('kana sections carry base (46) + dakuten (25) blocks', () => {
		for (const id of ['hiragana', 'katakana']) {
			const s = section('ja', id)!;
			expect(s.kind).toBe('kana');
			expect(blockGlyphs(s.kana![0])).toHaveLength(46);
			expect(blockGlyphs(s.kana![1])).toHaveLength(25);
		}
	});

	it('kanji is leveled by JLPT (N5/N4/N3)', () => {
		const s = section('ja', 'kanji')!;
		expect(s.kind).toBe('leveled');
		expect(s.levels!.map((l) => l.label)).toEqual(['JLPT N5', 'JLPT N4', 'JLPT N3']);
		expect(s.levels![0].glyphs.length).toBeGreaterThanOrEqual(45); // N5
		expect(s.levels![1].glyphs.length).toBeGreaterThanOrEqual(20); // N4
	});

	it('hanzi is leveled by HSK (1/2/3)', () => {
		const s = section('zh', 'hanzi')!;
		expect(s.kind).toBe('leveled');
		expect(s.levels!.map((l) => l.label)).toEqual(['HSK 1', 'HSK 2', 'HSK 3']);
		expect(s.levels![0].glyphs.length).toBeGreaterThanOrEqual(40); // HSK 1
		expect(s.levels![1].glyphs.length).toBeGreaterThanOrEqual(20); // HSK 2
	});

	it('has the full Hebrew alef-bet (22) plus 5 final forms', () => {
		expect(sectionGlyphs(section('he', 'alefbet')!)).toHaveLength(22);
		expect(sectionGlyphs(section('he', 'alefbet-finals')!)).toHaveLength(5);
	});

	it('every glyph has a character and reading; unique within a level/section', () => {
		for (const lang of ['zh', 'ja', 'he'] as const) {
			for (const s of scriptSections(lang)) {
				const groups =
					s.kind === 'leveled'
						? s.levels!.map((l) => l.glyphs)
						: s.kind === 'kana'
							? s.kana!.map(blockGlyphs)
							: [s.glyphs ?? []];
				for (const glyphs of groups) {
					for (const gl of glyphs) {
						expect(gl.char.trim(), s.id).not.toBe('');
						expect(gl.roman.trim(), s.id).not.toBe('');
					}
					const chars = glyphs.map((gl) => gl.char);
					expect(new Set(chars).size, s.id).toBe(chars.length);
				}
			}
		}
	});

	it('Hebrew letters are bare consonants (no niqqud)', () => {
		for (const gl of sectionGlyphs(section('he', 'alefbet')!)) {
			expect(NIQQUD.test(gl.char), gl.char).toBe(false);
		}
	});
});
