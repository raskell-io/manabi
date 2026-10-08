import { describe, it, expect } from 'vitest';
import { MAX_SCOPE_ITEMS, parseMode, resolveScope, scopeHref } from './scope';
import { createEmptyDocument, type LearningItem } from '$lib/db/types';

function item(id: string, language: LearningItem['language'] = 'zh', status: LearningItem['status'] = 'published'): LearningItem {
	return { id, language, kind: 'word', target: id, reading: id, meaning: id, tags: [], level: 'A1', examples: [], status, createdAt: 1, updatedAt: 1 };
}
function doc() {
	const d = createEmptyDocument();
	for (const it of [item('a'), item('b'), item('j', 'ja'), item('d', 'zh', 'draft')]) d.learningItems[it.id] = it;
	d.lessons.L = { id: 'L', title: 'Food', language: 'zh', itemIds: ['b', 'a'], createdAt: 1 };
	return d;
}
const q = (s: string) => new URLSearchParams(s);

describe('resolveScope', () => {
	it('is null without a scope param', () => {
		expect(resolveScope(doc(), q(''), 'zh')).toEqual({ ok: true, scope: null });
	});
	it('resolves a lesson in its own order and reports a missing one', () => {
		expect(resolveScope(doc(), q('lesson=L'), 'zh')).toEqual({ ok: true, scope: { kind: 'lesson', title: 'Food', language: 'zh', itemIds: ['b', 'a'] } });
		expect(resolveScope(doc(), q('lesson=nope'), 'zh')).toEqual({ ok: false, reason: 'lesson-missing' });
	});
	it('resolves an explicit set: published items of the active language, titled', () => {
		const r = resolveScope(doc(), q('items=a,ghost,d,j,b&title=Needs%20work'), 'zh');
		expect(r).toEqual({ ok: true, scope: { kind: 'items', title: 'Needs work', language: 'zh', itemIds: ['a', 'b'] } });
	});
	it('falls back to the items\' language when none are in the active one, and defaults the title', () => {
		expect(resolveScope(doc(), q('items=j'), 'zh')).toEqual({ ok: true, scope: { kind: 'items', title: 'Selected items', language: 'ja', itemIds: ['j'] } });
	});
	it('reports a set with nothing usable', () => {
		expect(resolveScope(doc(), q('items=ghost,d'), 'zh')).toEqual({ ok: false, reason: 'no-items' });
		expect(resolveScope(doc(), q('items='), 'zh')).toEqual({ ok: false, reason: 'no-items' });
	});
	it('caps an explicit set', () => {
		const d = doc();
		const ids = Array.from({ length: MAX_SCOPE_ITEMS + 50 }, (_, i) => `x${i}`);
		for (const id of ids) d.learningItems[id] = item(id);
		const r = resolveScope(d, q('items=' + ids.join(',')), 'zh');
		expect(r.ok && r.scope?.itemIds.length).toBe(MAX_SCOPE_ITEMS);
	});
});

describe('scopeHref / parseMode', () => {
	it('round-trips ids, title and mode through the URL', () => {
		const href = scopeHref(['a', 'b'], 'Needs work: “今天”', 'speaking');
		const params = new URL('http://x' + href).searchParams;
		expect(params.get('items')).toBe('a,b');
		expect(params.get('title')).toBe('Needs work: “今天”');
		expect(parseMode(params)).toBe('speaking');
		expect(parseMode(q('mode=bogus'))).toBeNull();
		expect(parseMode(q(''))).toBeNull();
	});
	it('caps the ids it links', () => {
		const ids = Array.from({ length: MAX_SCOPE_ITEMS + 5 }, (_, i) => `x${i}`);
		expect(new URL('http://x' + scopeHref(ids, 't')).searchParams.get('items')!.split(',').length).toBe(MAX_SCOPE_ITEMS);
	});
});
