import { describe, it, expect } from 'vitest';
import {
	DONE_AT,
	STEP,
	isPathId,
	pathFor,
	pathsFor,
	pathState,
	stageItemIds,
	stagePreview,
	stageProgress,
	suggestedPath,
	type PathData
} from './path';
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
const stage = (lang: Language, path: 'beginner' | 'refresher', id: string) => pathFor(lang, path).stages.find((s) => s.id === id)!;

describe('paths', () => {
	it('gives every language a Beginner and a Refresher path', () => {
		for (const { code } of LANGUAGES) {
			const ps = pathsFor(code);
			expect(ps.map((p) => p.id), code).toEqual(['beginner', 'refresher']);
			for (const p of ps) {
				expect(p.stages.length, `${code}/${p.id}`).toBeGreaterThanOrEqual(6);
				expect(p.stages.at(-1)!.kind).toBe('explore');
				expect(new Set(p.stages.map((s) => s.id)).size).toBe(p.stages.length);
				expect(p.level).toBeTruthy();
			}
		}
	});
	it('starts Beginners with the script and Refreshers without it', () => {
		expect(pathFor('ja', 'beginner').stages.slice(0, 2).map((s) => s.id)).toEqual(['hiragana', 'katakana']);
		expect(pathFor('he', 'beginner').stages[0].entries!.length).toBe(27);
		expect(pathFor('ko', 'beginner').stages[0].entries!.length).toBe(40);
		for (const { code } of LANGUAGES) {
			const scripts = ['tones', 'hiragana', 'katakana', 'jamo', 'syllables', 'alefbet'];
			expect(pathFor(code, 'refresher').stages.some((s) => scripts.includes(s.id)), code).toBe(false);
		}
	});
	it('ends the Beginner path with a step up to the Refresher', () => {
		for (const { code } of LANGUAGES) {
			const last = pathFor(code, 'beginner').stages.at(-1)!;
			expect(last.links.map((l) => l.href)).toContain('/path?path=refresher');
		}
	});
	it('has content behind every stage of the built-in data', () => {
		for (const { code } of LANGUAGES)
			for (const p of pathsFor(code)) {
				const d = data(code);
				for (const st of p.stages) {
					if (st.kind === 'explore' || st.kind === 'skills') continue;
					expect(stageProgress(st, d).total, `${code}/${p.id}/${st.id}`).toBeGreaterThan(0);
				}
			}
	});
	it('splits Chinese characters between the paths without overlap', () => {
		const c1 = stage('zh', 'beginner', 'chars1').entries!.map((e) => e.target);
		const c2 = stage('zh', 'refresher', 'chars2').entries!.map((e) => e.target);
		const first = new Set(seedItems(0).filter((it) => it.language === 'zh' && it.tags.includes('HSK1')).flatMap((it) => [...it.target]));
		expect(c1.length).toBeGreaterThan(20);
		expect(c2.length).toBeGreaterThan(10);
		for (const c of c1) expect(first.has(c), c).toBe(true);
		for (const c of c2) expect(c1).not.toContain(c);
	});
	it('gives Refreshers the places from the Names page', () => {
		const places = stage('he', 'refresher', 'places');
		expect(places.entries!.length).toBeGreaterThan(30);
		expect(places.entries![0]).toMatchObject({ target: 'יִשְׂרָאֵל', meaning: 'Israel', tags: ['name', 'place', 'names-countries'] });
	});
	it('caps the Chinese beginner reading at a few texts', () => {
		expect(stageProgress(stage('zh', 'beginner', 'taste'), data('zh')).total).toBe(3);
		expect(stagePreview(stage('zh', 'beginner', 'taste'), data('zh'))).toHaveLength(3);
	});
	it('recognizes path ids', () => {
		expect(isPathId('refresher')).toBe(true);
		expect(isPathId('expert')).toBe(false);
		expect(pathFor('zh', 'nope' as 'beginner').id).toBe('beginner');
	});
});

describe('stageProgress', () => {
	it('counts learned and started items, and is done at 80%', () => {
		const st = stage('zh', 'beginner', 'words1');
		const ids = stageItemIds(st, data('zh'));
		const n = Math.ceil(ids.length * DONE_AT);
		const srs = passed(ids.slice(0, n));
		const started = freshSkillMemory(ids[n]);
		started.dims.recognition.introduced = true;
		srs[ids[n]] = started;
		expect(stageProgress(st, data('zh', { srs }))).toMatchObject({ total: ids.length, learned: n, started: 1, done: true });
		expect(stageProgress(st, data('zh', { srs: passed(ids.slice(0, n - 1)) })).done).toBe(false);
	});
	it('offers the next step: started items first, then new ones, at most STEP', () => {
		const st = stage('zh', 'beginner', 'words1');
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
		const st = pathFor('ja', 'beginner').stages[0];
		const p = stageProgress(st, data('ja'));
		expect(p.nextItems.create.map((e) => e.target)).toEqual(st.entries!.slice(0, STEP).map((e) => e.target));
		expect(p.nextItems.create[0]).toMatchObject({ kind: 'character', tags: ['script', 'path-hiragana'] });
		const a: LearningItem = { ...seedItems(0)[0], id: 'x-a', language: 'ja', target: 'あ' };
		const q = stageProgress(st, data('ja', { items: [a], srs: passed(['x-a']) }));
		expect(q.learned).toBe(1);
		expect(q.nextItems.create[0].target).not.toBe('あ');
	});
	it('tracks reading by passages read, and points at the next one', () => {
		const st = stage('ko', 'beginner', 'read1');
		const d = data('ko');
		const ps = d.passages.filter((p) => p.level === 'A1');
		const p0 = stageProgress(st, d);
		expect(p0).toMatchObject({ total: ps.length, learned: 0 });
		expect(p0.nextPassage?.id).toBe(ps[0].id);
		const p1 = stageProgress(st, { ...d, reads: { [ps[0].id]: 1 } });
		expect(p1.learned).toBe(1);
		expect(p1.nextPassage?.id).toBe(ps[1].id);
	});
	it('measures skills over the path’s own words', () => {
		const d0 = data('he');
		const b = pathState('he', d0, 'beginner');
		const ears = b.stages.find((s) => s.id === 'ears')!;
		const inPath = b.itemIds.slice(0, 3);
		const outside = d0.items.find((it) => it.level === 'A2' && !b.itemIds.includes(it.id))!.id;
		const srs = { ...passed(inPath.slice(0, 2)), ...passed(inPath.slice(2), ['listening']), ...passed([outside], ['listening']) };
		const s = pathState('he', data('he', { srs }), 'beginner');
		expect(s.progress[s.stages.indexOf(ears)]).toMatchObject({ total: 3, learned: 1 });
		expect(stageProgress(ears, data('he', { srs }))).toMatchObject({ total: 4, learned: 2 }); // unscoped
	});
});

describe('pathState', () => {
	it('puts you on the first unfinished stage', () => {
		expect(pathState('ja', data('ja'), 'beginner').current).toBe(0);
		const kana = pathFor('ja', 'beginner').stages[0].entries!.map((e, i) => ({ ...seedItems(0)[0], id: `k${i}`, language: 'ja' as const, target: e.target }));
		const d = data('ja', { items: [...data('ja').items, ...kana], srs: passed(kana.map((k) => k.id)) });
		const s = pathState('ja', d, 'beginner');
		expect(s).toMatchObject({ current: 1, doneCount: 1 });
		expect(s.countable).toBe(pathFor('ja', 'beginner').stages.length - 1);
		expect(s.itemIds).toEqual(expect.arrayContaining(kana.map((k) => k.id)));
	});
	it('suggests the Refresher once the Beginner path is done', () => {
		expect(suggestedPath('ko', data('ko'))).toBe('beginner');
		const d0 = data('ko');
		const b = pathFor('ko', 'beginner');
		// Make every beginner item exist and pass every skill, and read every A1 text.
		const created: LearningItem[] = b.stages.flatMap((st) =>
			(st.entries ?? []).map((e, i) => ({ ...seedItems(0)[0], id: `${st.id}-${i}`, language: 'ko' as const, target: e.target }))
		);
		const items = [...d0.items, ...created];
		const srs = passed(items.map((it) => it.id), ['listening', 'recall']);
		const reads = Object.fromEntries(d0.passages.map((p) => [p.id, 1]));
		expect(suggestedPath('ko', { ...d0, items, srs, reads })).toBe('refresher');
	});
	it('previews a stage', () => {
		expect(stagePreview(pathFor('he', 'beginner').stages[0], data('he'), 3)).toEqual(['א', 'ב', 'ג']);
		expect(stagePreview(stage('ko', 'beginner', 'read1'), data('ko'))).toHaveLength(4);
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
