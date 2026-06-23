import { describe, it, expect } from 'vitest';
import { stripNiqqud } from './types';

describe('stripNiqqud', () => {
	it('removes vowel points, leaving bare consonants', () => {
		expect(stripNiqqud('שָׁלוֹם')).toBe('שלום');
		expect(stripNiqqud('תּוֹדָה')).toBe('תודה');
		expect(stripNiqqud('מַיִם')).toBe('מים');
	});

	it('leaves already-bare Hebrew untouched', () => {
		expect(stripNiqqud('שלום')).toBe('שלום');
	});

	it('leaves non-Hebrew text untouched', () => {
		expect(stripNiqqud('今天')).toBe('今天');
		expect(stripNiqqud('hello')).toBe('hello');
	});

	it('strips niqqud within a full sentence but keeps letters and spaces', () => {
		expect(stripNiqqud('הַיּוֹם אֲנִי עָסוּק')).toBe('היום אני עסוק');
	});
});
