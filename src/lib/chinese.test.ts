import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { displayText, scriptLangTag, setZhScript, toZhScript, zhLangTag, zhScript } from './chinese';
import { radicalOf } from './radicals';

describe('zhLangTag / scriptLangTag', () => {
	it('tags each script for regional glyph forms', () => {
		expect(zhLangTag('simplified')).toBe('zh-Hans');
		expect(zhLangTag('traditional-tw')).toBe('zh-Hant-TW');
		expect(zhLangTag('traditional-hk')).toBe('zh-Hant-HK');
	});
	it('leaves other languages alone', () => {
		expect(scriptLangTag('ja', 'traditional-tw')).toBe('ja');
		expect(scriptLangTag('zh', 'traditional-hk')).toBe('zh-Hant-HK');
	});
});

describe('setZhScript', () => {
	it('is the identity for Simplified', async () => {
		await setZhScript('simplified');
		expect(get(zhScript)).toBe('simplified');
		expect(get(toZhScript)('头发')).toBe('头发');
	});

	it('converts phrase-aware to Taiwan Traditional', async () => {
		await setZhScript('traditional-tw');
		const conv = get(toZhScript);
		expect(get(zhScript)).toBe('traditional-tw');
		expect(conv('头发')).toBe('頭髮');
		expect(conv('发展')).toBe('發展');
		expect(conv('我们吃面条吧。')).toBe('我們吃麵條吧。');
		expect(conv('这里')).toBe('這裡');
		// Characters only, never vocabulary — the word must still match its pinyin.
		expect(conv('软件')).toBe('軟件');
		// Traditional input passes through, so mixed text (e.g. transcripts) normalizes.
		expect(conv('頭髮')).toBe('頭髮');
	});

	it('uses Hong Kong character standards', async () => {
		await setZhScript('traditional-hk');
		const conv = get(toZhScript);
		expect(conv('这里')).toBe('這裏');
		expect(conv('说话')).toBe('説話');
		await setZhScript('simplified');
	});
});

describe('displayText', () => {
	it('converts only Chinese', () => {
		const upper = (t: string) => t.toUpperCase();
		expect(displayText('ni', 'zh', upper)).toBe('NI');
		expect(displayText('ni', 'ja', upper)).toBe('ni');
	});
});

describe('radical data covers Traditional forms', () => {
	it('files Traditional characters under their full radical', () => {
		expect(radicalOf('語')?.radical.n).toBe(149); // 言
		expect(radicalOf('语')?.radical.n).toBe(149);
		expect(radicalOf('髮')?.radical.n).toBe(190); // 髟
	});
});
