import { describe, it, expect } from 'vitest';
import { STROKE_CDN, hanChars, isBundled, isHan, strokeLang, strokeUrl } from './strokes';

describe('strokes', () => {
	it('recognizes single hanzi/kanji only', () => {
		expect(isHan('水')).toBe(true);
		expect(isHan('気')).toBe(true);
		expect(isHan('あ')).toBe(false);
		expect(isHan('한')).toBe(false);
		expect(isHan('水火')).toBe(false);
	});
	it('extracts unique Han characters in order', () => {
		expect(hanChars('今日は今日')).toEqual(['今', '日']);
		expect(hanChars('你好！')).toEqual(['你', '好']);
		expect(hanChars('ありがとう')).toEqual([]);
	});
	it('maps languages to data sets', () => {
		expect(strokeLang('zh')).toBe('zh');
		expect(strokeLang('ja')).toBe('ja');
		expect(strokeLang('ko')).toBeNull();
		expect(strokeLang('he')).toBeNull();
	});
	it('serves bundled characters locally (by code point) and others from the pinned CDN', () => {
		expect(isBundled('zh', '水')).toBe(true);
		expect(isBundled('ja', '気')).toBe(true);
		expect(strokeUrl('zh', '水')).toBe('/strokes/zh/6c34.json');
		expect(strokeUrl('ja', '気')).toBe('/strokes/ja/6c17.json');
		expect(isBundled('zh', '龘')).toBe(false);
		expect(strokeUrl('zh', '龘')).toBe(`${STROKE_CDN.zh}/${encodeURIComponent('龘')}.json`);
	});
});
