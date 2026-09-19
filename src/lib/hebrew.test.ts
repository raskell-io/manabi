import { describe, it, expect } from 'vitest';
import { acceptDiacritized, diacritizeItems, diacritizeTexts, type Diacritizer } from './hebrew';
import { defaultSettings, needsNiqqud } from '$lib/db/types';

const BARE = 'שלום';
const POINTED = 'שָׁלוֹם';

describe('needsNiqqud', () => {
	it('flags bare Hebrew words but not pointed text, lone letters or other scripts', () => {
		expect(needsNiqqud(BARE)).toBe(true);
		expect(needsNiqqud('שלום, מה שלומך?')).toBe(true);
		expect(needsNiqqud(POINTED)).toBe(false);
		expect(needsNiqqud('ה')).toBe(false);
		expect(needsNiqqud('hello')).toBe(false);
		expect(needsNiqqud('今天')).toBe(false);
	});
});

describe('acceptDiacritized', () => {
	it('accepts only the same consonantal text with marks added', () => {
		expect(acceptDiacritized(BARE, POINTED)).toBe(true);
		expect(acceptDiacritized(BARE, BARE)).toBe(false); // nothing added
		expect(acceptDiacritized(BARE, POINTED + '!')).toBe(false); // punctuation added
		expect(acceptDiacritized(BARE, 'שָׁלוֹ')).toBe(false); // letter dropped
		expect(acceptDiacritized(BARE, 'שָׁלוֹם רַב')).toBe(false); // word added
		expect(acceptDiacritized(BARE, 42)).toBe(false);
	});
});

describe('diacritizeTexts / diacritizeItems', () => {
	const settings = defaultSettings();
	const fake =
		(answers: unknown[]): Diacritizer =>
		async (input) => ({ ok: true, value: { texts: answers.slice(0, input.texts.length) as string[] }, providerId: 'fake', target: 'remote' });

	it('only sends texts that need pointing, and keeps rejected answers as they were', async () => {
		let sent: string[] = [];
		const fn: Diacritizer = async (input) => {
			sent = input.texts;
			return { ok: true, value: { texts: [POINTED, 'שלום שלום'] }, providerId: 'fake', target: 'remote' };
		};
		const r = await diacritizeTexts([BARE, POINTED, 'hello', 'תודה'], settings, fn);
		expect(sent).toEqual([BARE, 'תודה']);
		expect(r.texts).toEqual([POINTED, POINTED, 'hello', 'תודה']);
		expect(r.changed).toBe(1);
		expect(r.failed).toBe(1);
	});

	it('is a no-op without a call when nothing needs pointing', async () => {
		let calls = 0;
		const fn: Diacritizer = async () => { calls++; return { ok: false, error: 'x', providerId: 'fake', target: 'remote' }; };
		const r = await diacritizeTexts([POINTED, 'hi'], settings, fn);
		expect(calls).toBe(0);
		expect(r).toEqual({ texts: [POINTED, 'hi'], changed: 0, failed: 0 });
	});

	it('reports provider errors and leaves texts untouched', async () => {
		const fn: Diacritizer = async () => ({ ok: false, error: 'no key', providerId: 'fake', target: 'remote' });
		const r = await diacritizeTexts([BARE], settings, fn);
		expect(r.texts).toEqual([BARE]);
		expect(r.error).toBe('no key');
		expect(r.failed).toBe(1);
	});

	it('points items and their example sentences in one batch, returning new objects', async () => {
		const items = [
			{ target: BARE, meaning: 'hello', examples: [{ target: 'שלום לך', reading: 'shalom lekha', meaning: 'hello to you' }] },
			{ target: POINTED, meaning: 'hello', examples: [] }
		];
		const r = await diacritizeItems(items, settings, fake([POINTED, 'שָׁלוֹם לְךָ']));
		expect(r.changed).toBe(2);
		expect(r.items[0].target).toBe(POINTED);
		expect(r.items[0].examples[0].target).toBe('שָׁלוֹם לְךָ');
		expect(r.items[0].examples[0].reading).toBe('shalom lekha');
		expect(r.items[1].target).toBe(POINTED);
		expect(items[0].target).toBe(BARE); // input untouched
	});
});
