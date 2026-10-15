import { describe, it, expect } from 'vitest';
import { DONE_AT, STEP, pathFor, pathState, stageItemIds, stagePreview, stageProgress, type PathData } from './path';
import { seedItems, seedPassages } from './db/seed';
import { createEmptyDocument, freshSkillMemory, LANGUAGES, type Language, type LearningItem, type SkillMemory } from './db/types';
import { mergeInto } from './db/merge';

function data(lang: Language, over: Partial<PathData> = {}): PathData {
	return {
		items: seedItems(0).filter((it) => it.language === lang),
		srs: {},
		passages: seedPassages(0).filter((p) => p.language === lang),
		reads: {},
		...over
	};
}
/** SRS where these items passed recognition (and optionally other skills). */
function passed(ids: string[], extra: (keyof SkillMemory['dims'])[] = []): Record<string, SkillMemory> {
	const out: Record<string, SkillMemory> = {};
	for (const id of ids) {
		const sm = freshSkillMemory(id);
		for (const d of ['recognition', ...extra] as const) sm.dims[d] = { ...sm.dims[d], introduced: true, repetitions: 1 };
		out[id] = sm;
	}
	return out;
}

describe('paths', () => {
	it('gives every language an ordered path ending in an open-ended stage', () => {
		for (const { code } of LANGUAGES) {
			const p = pathFor(code);
			expect(p.length, code).toBeGreaterThanOrEqual(7);
			expect(p.at(-1)!.kind).toBe('explore');
			expect(new Set(p.map((s) => s.id)).size).toBe(p.length);
			expect(p.map((s) => s.kind)).toContain('reading');
		}
	});
	it('has content behind every stage of the built-in data', () => {
		for (const { code } of LANGUAGES) {
			const d = data(code);
			for (const st of pathFor(code)) {
				if (st.kind === 'explore' || st.kind === 'skills') continue;
				expect(stageProgress(st, d).total, `${code}/${st.id}`).toBeGreaterThan(0);
			}
		}
	});
	it('builds the Chinese character stage from the characters of the first words', () => {
		const chars = pathFor('zh').find((s) => s.id === 'chars')!;
		const first = new Set(seedItems(0).filter((it) => it.language === 'zh' && it.tags.includes('HSK1')).flatMap((it) => [...it.target]));
		expect(chars.entries!.length).toBeGreaterThan(20);
		for (const e of chars.entries!) expect(first.has(e.target), e.target).toBe(true);
	});
	it('starts Japanese with kana and Hebrew with the alef-bet', () => {
		expect(pathFor('ja').slice(0, 2).map((s) => s.id)).toEqual(['hiragana', 'katakana']);
		expect(pathFor('he')[0].entries!.length).toBe(27);
		expect(pathFor('ko')[0].entries!.length).toBe(40);
	});
});

describe('stageProgress', () => {
	it('counts learned and started items, and is done at 80%', () => {
		const st = pathFor('zh').find((s) => s.id === 'words1')!;
		const ids = stageItemIds(st, data('zh'));
		const n = Math.ceil(ids.length * DONE_AT);
		const srs = passed(ids.slice(0, n));
		const started = freshSkillMemory(ids[n]);
		started.dims.recognition.introduced = true;
		srs[ids[n]] = started;
		const p = stageProgress(st, data('zh', { srs }));
		expect(p).toMatchObject({ total: ids.length, learned: n, started: 1, done: true });
		expect(stageProgress(st, data('zh', { srs: passed(ids.slice(0, n - 1)) })).done).toBe(false);
	});
	it('offers the next step: started items first, then new ones, at most STEP', () => {
		const st = pathFor('zh').find((s) => s.id === 'words1')!;
		const ids = stageItemIds(st, data('zh'));
		const started = freshSkillMemory(ids[5]);
		started.dims.recognition.introduced = true;
		const p = stageProgress(st, data('zh', { srs: { ...passed(ids.slice(0, 3)), [ids[5]]: started } }));
		expect(p.nextItems.ids[0]).toBe(ids[5]);
		expect(p.nextItems.ids).toHaveLength(STEP);
		expect(p.nextItems.ids).not.toContain(ids[0]);
		expect(p.nextItems.create).toEqual([]);
	});
	it('creates script entries that are not items yet', () => {
		const st = pathFor('ja')[0];
		const p = stageProgress(st, data('ja'));
		expect(p.nextItems.create.map((e) => e.target)).toEqual(st.entries!.slice(0, STEP).map((e) => e.target));
		expect(p.nextItems.create[0]).toMatchObject({ kind: 'character', tags: ['script', 'path-hiragana'] });
		// An existing item for a glyph counts toward the stage.
		const a: LearningItem = { ...seedItems(0)[0], id: 'x-a', language: 'ja', target: 'あ' };
		const q = stageProgress(st, data('ja', { items: [a], srs: passed(['x-a']) }));
		expect(q.learned).toBe(1);
		expect(q.nextItems.create[0].target).not.toBe('あ');
	});
	it('tracks reading by passages read, and points at the next one', () => {
		const st = pathFor('ko').find((s) => s.id === 'read1')!;
		const d = data('ko');
		const ps = d.passages.filter((p) => p.level === 'A1');
		const p0 = stageProgress(st, d);
		expect(p0).toMatchObject({ total: ps.length, learned: 0 });
		expect(p0.nextPassage?.id).toBe(ps[0].id);
		const p1 = stageProgress(st, { ...d, reads: { [ps[0].id]: 1 } });
		expect(p1.learned).toBe(1);
		expect(p1.nextPassage?.id).toBe(ps[1].id);
	});
	it('measures skills over the words you have started', () => {
		const ears = pathFor('he').find((s) => s.id === 'ears')!;
		const ids = data('he').items.slice(0, 4).map((it) => it.id);
		const srs = { ...passed(ids.slice(0, 3)), ...passed(ids.slice(3), ['listening']) };
		expect(stageProgress(ears, data('he', { srs }))).toMatchObject({ total: 4, learned: 1 });
		expect(stageProgress(ears, data('he')).total).toBe(0);
	});
});

describe('pathState', () => {
	it('puts you on the first unfinished stage', () => {
		expect(pathState('ja', data('ja')).current).toBe(0);
		const kana = pathFor('ja')[0].entries!.map((e, i) => ({ ...seedItems(0)[0], id: `k${i}`, language: 'ja' as const, target: e.target }));
		const d = data('ja', { items: [...data('ja').items, ...kana], srs: passed(kana.map((k) => k.id)) });
		const s = pathState('ja', d);
		expect(s).toMatchObject({ current: 1, doneCount: 1 });
		expect(s.countable).toBe(pathFor('ja').length - 1);
	});
	it('previews a stage', () => {
		expect(stagePreview(pathFor('he')[0], data('he'), 3)).toEqual(['א', 'ב', 'ג']);
		expect(stagePreview(pathFor('ko').find((s) => s.id === 'read1')!, data('ko'))).toHaveLength(4);
	});
});

describe('passageReads merge', () => {
	it('unions reads and keeps the earliest time', () => {
		const local = createEmptyDocument();
		const other = createEmptyDocument();
		local.passageReads = { a: 5, b: 9 };
		other.passageReads = { b: 3, c: 7 };
		mergeInto(local, other);
		expect(local.passageReads).toEqual({ a: 5, b: 3, c: 7 });
		const old = createEmptyDocument();
		delete old.passageReads;
		mergeInto(old, other);
		expect(old.passageReads).toEqual({ b: 3, c: 7 });
	});
});
