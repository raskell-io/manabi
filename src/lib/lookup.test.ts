import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createLookup } from './lookup';
import { deinflect } from './deinflect-ja';
import type { DictShard } from './dict-shard';

// The real shipped data, read from static/dict.
const lookup = createLookup(async (lang, bucket) => {
	const path = `static/dict/${lang}/${bucket}.json`;
	return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as DictShard) : null;
});

describe('Chinese', () => {
	it('takes the longest word at the tapped character', async () => {
		const hit = await lookup.lookupAt('zh', '我们在学校学习汉语。', 5);
		expect(hit?.surface).toBe('学习');
		expect(hit?.entries[0].r).toBe('xuéxí');
		expect((await lookup.lookupAt('zh', '我们在学校学习汉语。', 3))?.surface).toBe('学校');
	});
	it('falls back to a single character', async () => {
		expect((await lookup.lookupAt('zh', '我很忙', 1))?.surface).toBe('很');
	});
	it('ignores punctuation', async () => {
		expect(await lookup.lookupAt('zh', '你好。', 2)).toBeNull();
	});
	it('segments a sentence', async () => {
		const seg = await lookup.segment('zh', '我喜欢吃米饭');
		expect(seg.map((s) => s.text)).toEqual(['我', '喜欢', '吃', '米饭']);
	});
});

describe('Japanese', () => {
	it.each([
		['食べました', '食べる', 'polite · past'],
		['行った', '行く', 'past'],
		['読んで', '読む', 'te-form'],
		['書かない', '書く', 'negative'],
		['見たい', '見る', 'want to'],
		['高くなかった', '高い', 'negative · past'],
		['来ました', '来る', 'polite · past'],
		['話せる', '話す', 'potential'],
		['書かれた', '書く', 'passive · past'],
		['勉強しています', '勉強', undefined],
		['飲んでいた', '飲む', undefined]
	])('%s → %s', async (form, base, note) => {
		const hit = await lookup.lookupAt('ja', form, 0);
		expect(hit?.key).toBe(base);
		expect(hit?.surface).toBe(form);
		if (note) expect(hit?.note).toBe(note);
	});
	it('finds a word inside a sentence', async () => {
		const hit = await lookup.lookupAt('ja', '昨日、友達と映画を見に行きました。', 9);
		expect(hit?.key).toBe('見る');
	});
	it('deinflection always offers the word itself first', () => {
		expect(deinflect('猫')[0]).toEqual({ word: '猫', type: 0, reasons: [] });
	});
});

describe('Korean', () => {
	it('finds the word, its inflection, or the word without a particle', async () => {
		expect((await lookup.lookupAt('ko', '학교', 0))?.entries[0].r).toBe('hakgyo');
		expect((await lookup.lookupAt('ko', '저는 밥을 먹었습니다.', 7))?.key).toBe('먹다');
		expect((await lookup.lookupAt('ko', '학교에서 공부했어요', 1))?.key).toBe('학교');
		expect((await lookup.lookupAt('ko', '학교에서 공부했어요', 6))?.key).toBe('공부하다');
	});
	it('reports the whole tapped word as the surface', async () => {
		const hit = await lookup.lookupAt('ko', '한국어를 배워요', 2);
		expect(hit?.surface).toBe('한국어를');
		expect(hit?.key).toBe('한국어');
	});
});

describe('Hebrew', () => {
	it('matches with or without niqqud', async () => {
		expect((await lookup.lookupAt('he', 'שָׁלוֹם', 0))?.entries[0].w).toBe('שָׁלוֹם');
		expect((await lookup.lookupAt('he', 'שלום', 0))?.entries[0].r).toBe('shalóm');
	});
	it('follows inflections and peels prefixes', async () => {
		expect((await lookup.lookupAt('he', 'הַיְלָדִים', 2))?.key).toBe('ילד');
		const hit = await lookup.lookupAt('he', 'וּבַבַּיִת', 0);
		expect(hit?.key).toBe('בית');
		expect(hit?.note).toBe('ו + ב + בית');
	});
	it('selects the word around the tapped letter', async () => {
		const hit = await lookup.lookupAt('he', 'אני כתבתי ספר', 6);
		expect(hit?.surface).toBe('כתבתי');
		expect(hit?.key).toBe('כתב');
	});
});
