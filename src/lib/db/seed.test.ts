import { describe, it, expect } from 'vitest';
import { seedItems, seedsToApply } from './seed';

const items = seedItems();
const NIQQUD = /[֑-ׇ]/;

describe('seed content', () => {
	it('has a healthy corpus per language', () => {
		const byLang = (l: string) => items.filter((i) => i.language === l).length;
		expect(byLang('zh')).toBeGreaterThanOrEqual(30);
		expect(byLang('ja')).toBeGreaterThanOrEqual(20);
		expect(byLang('he')).toBeGreaterThanOrEqual(25);
	});

	it('uses unique, stable ids', () => {
		const ids = items.map((i) => i.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids.every((id) => id.startsWith('seed-'))).toBe(true);
	});

	it('fills every required field', () => {
		for (const it of items) {
			expect(it.target.trim(), it.id).not.toBe('');
			expect(it.reading.trim(), it.id).not.toBe('');
			expect(it.meaning.trim(), it.id).not.toBe('');
			expect(it.level.trim(), it.id).not.toBe('');
			expect(it.tags.length, it.id).toBeGreaterThan(0);
			expect(it.status).toBe('published');
		}
	});

	it('gives every example a target and a meaning', () => {
		for (const it of items) {
			for (const ex of it.examples) {
				expect(ex.target.trim(), it.id).not.toBe('');
				expect(ex.meaning.trim(), it.id).not.toBe('');
			}
		}
	});

	it('keeps the original seed ids intact (no churn for existing users)', () => {
		const ids = new Set(items.map((i) => i.id));
		for (const id of ['seed-zh-0', 'seed-zh-6', 'seed-ja-0', 'seed-ja-5', 'seed-he-0', 'seed-he-5']) {
			expect(ids.has(id), id).toBe(true);
		}
	});

	it('vowels Hebrew vocabulary (niqqud present on non-letter items)', () => {
		const heVocab = items.filter((i) => i.language === 'he' && !i.tags.includes('letter'));
		for (const it of heVocab) {
			expect(NIQQUD.test(it.target), `${it.id} (${it.target}) should be vowelled`).toBe(true);
		}
	});

	it('tags Japanese additions at the B1 refresher level', () => {
		const b1 = items.filter((i) => i.language === 'ja' && i.level === 'B1');
		expect(b1.length).toBeGreaterThanOrEqual(15);
	});
});

describe('seedsToApply (existing-user upgrade path)', () => {
	it('applies everything to a brand-new doc', () => {
		expect(seedsToApply({}).length).toBe(items.length);
		expect(seedsToApply(undefined).length).toBe(items.length);
	});

	it('applies nothing once every id is recorded', () => {
		const all = Object.fromEntries(items.map((i) => [i.id, true]));
		expect(seedsToApply(all)).toHaveLength(0);
	});

	it('applies only the NEW items for an early adopter who had just the originals', () => {
		// Simulate a v1 user: only the 6 original ja + 7 zh + 6 he ids were ever seeded.
		const originals = items.map((i) => i.id).filter((id) => /^seed-(zh|ja|he)-\d+$/.test(id));
		const seeded = Object.fromEntries(originals.map((id) => [id, true]));
		const pending = seedsToApply(seeded);
		expect(pending.length).toBe(items.length - originals.length);
		// None of the returned items are originals (no churn / no resurrection).
		expect(pending.some((p) => originals.includes(p.id))).toBe(false);
	});
});
