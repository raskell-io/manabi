import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createLookup } from './lookup';
import { dictionaryReading, inflectedKana, romanizeHangul, splitSentences } from './own-text';
import type { DictShard } from './dict-shard';

const lookup = createLookup(async (lang, bucket) => {
	const path = `static/dict/${lang}/${bucket}.json`;
	return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as DictShard) : null;
});

describe('splitSentences', () => {
	it('splits on sentence punctuation and line breaks', () => {
		expect(splitSentences('我很忙。你呢？\n明天见！')).toEqual(['我很忙。', '你呢？', '明天见！']);
		expect(splitSentences('Hi there. 「はい」と言った。')).toEqual(['Hi there.', '「はい」と言った。']);
		expect(splitSentences('שלום! מה שלומך?')).toEqual(['שלום!', 'מה שלומך?']);
	});
	it('drops lines without letters', () => {
		expect(splitSentences('……\n\n---\n好。')).toEqual(['好。']);
	});
});

describe('readings', () => {
	it('Chinese: pinyin word by word', async () => {
		expect(await dictionaryReading('zh', '我喜欢吃米饭。', lookup)).toBe('wǒ xǐhuan chī mǐfàn.');
	});
	it('Japanese: kana, inflected forms included', async () => {
		expect(inflectedKana('食べました', '食べる', 'たべる')).toBe('たべました');
		expect(inflectedKana('行った', '行く', 'いく')).toBe('いった');
		expect(await dictionaryReading('ja', '昨日ご飯を食べました。', lookup)).toBe('きのうごはんをたべました。');
	});
	it('Korean: Revised Romanization with liaison', () => {
		expect(romanizeHangul('학교')).toBe('hakgyo');
		expect(romanizeHangul('한국어')).toBe('hangugeo');
		expect(romanizeHangul('밥을 먹어요.')).toBe('babeul meogeoyo.');
	});
});
