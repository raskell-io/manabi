import { describe, expect, it } from 'vitest';
import { applyNikud, argmaxRows, NIKUD_CLASSES, removeNikud, tokenize } from './niqqud-model';

const vocab: Record<string, number> = { ' ': 10, ש: 20, ל: 21, ו: 22, ם: 23, a: 30 };
const cls = (mark: string) => NIKUD_CLASSES.indexOf(mark);

describe('tokenize', () => {
	it('is one token per character between [CLS] and [SEP], unknowns as [UNK]', () => {
		expect(tokenize('שלום', vocab)).toEqual([1, 20, 21, 22, 23, 2]);
		expect(tokenize('A ש!', vocab)).toEqual([1, 30, 10, 20, 0, 2]);
	});
});

describe('applyNikud', () => {
	it('puts each class on its letter, with the shin dot, leaving other characters alone', () => {
		// שָׁלוֹם: qamats on shin (+ shin dot), holam on vav, nothing on lamed / final mem.
		const nikud = [cls('ָ'), cls(''), cls('ֹ'), cls(''), cls(''), cls('')];
		const shin = [0, 0, 0, 0, 0, 0];
		expect(applyNikud('שלום, ', nikud, shin)).toBe('שָׁלוֹם, ');
	});
	it('keeps a mater lectionis letter, unpointed', () => {
		expect(applyNikud('לימוד', [cls('ִ'), cls('<MAT_LECT>'), cls('ּ'), cls('ֹ'), cls('')], [0, 0, 0, 0, 0])).toBe(
			'לִימּוֹד'
		);
	});
	it('marks sin with the sin dot', () => {
		expect(applyNikud('ש', [cls('\u05B8')], [1])).toBe('ש\u05B8\u05C2'); // NFC: qamats, then the sin dot
	});
});

describe('argmaxRows', () => {
	it('skips the [CLS] row', () => {
		const logits = Float32Array.from([9, 0, 0, 1, 0, 5, 2, 0]);
		expect([...argmaxRows(logits, 2, 3)]).toEqual([1, 1, 0]);
	});
});

describe('removeNikud', () => {
	it('drops points, dagesh and shin/sin dots', () => {
		expect(removeNikud('שָׁלוֹם כׇּל')).toBe('שלום כל');
	});
});
