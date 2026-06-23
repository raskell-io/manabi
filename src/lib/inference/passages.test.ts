import { describe, it, expect } from 'vitest';
import { validateGeneratedPassages } from './providers/openai';

describe('validateGeneratedPassages', () => {
	it('parses a conversation and keeps speakers', () => {
		const raw = {
			passages: [
				{
					title: '在咖啡店 — At a café',
					intro: 'Ordering coffee.',
					tags: ['daily', 'food'],
					lines: [
						{ speaker: '店员', target: '要点什么？', reading: 'Yào diǎn shénme?', meaning: 'What would you like?' },
						{ speaker: '顾客', target: '一杯拿铁。', reading: 'Yì bēi nátiě.', meaning: 'A latte.' }
					]
				}
			]
		};
		const out = validateGeneratedPassages(raw, 'conversation');
		expect(out).toHaveLength(1);
		expect(out[0].title).toContain('café');
		expect(out[0].lines).toHaveLength(2);
		expect(out[0].lines[0].speaker).toBe('店员');
	});

	it('drops speakers for text passages', () => {
		const raw = {
			passages: [
				{ title: 'ニュース', tags: [], lines: [{ speaker: 'X', target: '今日は晴れです。', reading: 'きょうははれです。', meaning: 'It is sunny today.' }] }
			]
		};
		const out = validateGeneratedPassages(raw, 'text');
		expect(out[0].lines[0].speaker).toBeUndefined();
	});

	it('drops lines missing target or meaning, and passages left empty', () => {
		const raw = {
			passages: [
				{ title: 'ok', tags: [], lines: [{ target: 'שָׁלוֹם', reading: 'shalom', meaning: 'hello' }, { target: '', meaning: 'x' }] },
				{ title: 'empty', tags: [], lines: [{ target: '', meaning: '' }] },
				{ title: '', tags: [], lines: [{ target: 'x', reading: 'x', meaning: 'x' }] }
			]
		};
		const out = validateGeneratedPassages(raw, 'text');
		expect(out).toHaveLength(1);
		expect(out[0].lines).toHaveLength(1);
	});

	it('returns empty for malformed input', () => {
		expect(validateGeneratedPassages({}, 'text')).toEqual([]);
		expect(validateGeneratedPassages({ passages: 'nope' }, 'text')).toEqual([]);
		expect(validateGeneratedPassages(null, 'conversation')).toEqual([]);
	});
});
