import { describe, expect, it } from 'vitest';
import { applyItemEdits, applyPassageEdits, parseItems, parsePassages, renderItems, renderPassages } from './content-md';
import { seedItems, seedPassages } from './db/seed';

const zhItems = seedItems().filter((it) => it.language === 'zh');
const hePassages = seedPassages().filter((p) => p.language === 'he');
const zhPassages = seedPassages().filter((p) => p.language === 'zh');

describe('items markdown', () => {
	const md = renderItems('zh', zhItems);

	it('reads back exactly, every section untouched', () => {
		const parsed = parseItems(md);
		expect(parsed).toHaveLength(zhItems.length);
		expect(parsed.every((p) => !p.touched)).toBe(true);
		const byId = new Map(zhItems.map((it) => [it.id, it]));
		for (const p of parsed) {
			const it = byId.get(p.id!)!;
			expect(p.target).toBe(it.target);
			expect(p.reading).toBe(it.reading);
			expect(p.meaning).toBe(it.meaning);
			expect(p.tags).toEqual(it.tags);
			expect(p.examples.map((e) => [e.target, e.reading, e.meaning])).toEqual(it.examples.map((e) => [e.target, e.reading, e.meaning]));
		}
	});

	it('looks like a readable document', () => {
		expect(md).toMatch(/^# Manabi — Chinese items/);
		expect(md).toContain('## 今天\n<!-- id: seed-zh-0 · h: ');
		expect(md).toContain('- reading: jīntiān\n- meaning: today');
		expect(md).toContain('> 我今天很忙。 | ');
	});

	it('marks a hand-edited section, and only that one', () => {
		const edited = md.replace('- meaning: today', '- meaning: today, this day');
		const parsed = parseItems(edited);
		const touched = parsed.filter((p) => p.touched);
		expect(touched).toHaveLength(1);
		expect(touched[0].id).toBe('seed-zh-0');
		expect(touched[0].meaning).toBe('today, this day');
	});

	it('whitespace-only changes are not edits', () => {
		expect(parseItems(md.replace(/\n\n## /g, '\n\n\n## ').replace('- meaning: today', '-  meaning: today ')).filter((p) => p.touched).length).toBeLessThanOrEqual(1);
		expect(parseItems(md.replace(/\n\n## /g, '\n\n\n\n## ')).every((p) => !p.touched)).toBe(true);
	});

	it('a new section is a new item', () => {
		const added = md + '\n## 明白\n- reading: míngbai\n- meaning: to understand\n- tags: verb, HSK2\n> 我明白了。 | Wǒ míngbai le. | I understand.\n';
		const fresh = parseItems(added).filter((p) => !p.id);
		expect(fresh).toEqual([
			{
				touched: true,
				target: '明白',
				reading: 'míngbai',
				meaning: 'to understand',
				kind: 'word',
				level: 'A1',
				tags: ['verb', 'HSK2'],
				status: 'published',
				examples: [{ target: '我明白了。', reading: 'Wǒ míngbai le.', meaning: 'I understand.' }]
			}
		]);
	});
});

describe('passages markdown', () => {
	it('round-trips conversations with speakers, and Hebrew', () => {
		for (const [lang, list] of [['zh', zhPassages], ['he', hePassages]] as const) {
			const parsed = parsePassages(renderPassages(lang, list));
			expect(parsed).toHaveLength(list.length);
			expect(parsed.every((p) => !p.touched)).toBe(true);
			const byId = new Map(list.map((p) => [p.id, p]));
			for (const p of parsed) {
				const want = byId.get(p.id!)!;
				expect(p.title).toBe(want.title);
				expect(p.kind).toBe(want.kind);
				expect(p.lines.map((l) => [l.speaker, l.target, l.reading, l.meaning])).toEqual(want.lines.map((l) => [l.speaker, l.target, l.reading, l.meaning]));
			}
		}
	});
});

describe('applying hand edits', () => {
	const fresh = () => ({
		learningItems: Object.fromEntries(zhItems.map((it) => [it.id, structuredClone(it)])),
		passages: Object.fromEntries(zhPassages.map((p) => [p.id, structuredClone(p)]))
	});
	let n = 0;
	const newId = () => `new-${++n}`;

	it('an untouched file changes nothing', () => {
		const d = fresh();
		expect(applyItemEdits(d, 'zh', parseItems(renderItems('zh', zhItems)), newId, 1)).toEqual({ added: 0, updated: 0 });
		expect(applyPassageEdits(d, 'zh', parsePassages(renderPassages('zh', zhPassages)), newId, 1)).toEqual({ added: 0, updated: 0 });
		expect(d).toEqual(fresh());
	});

	it('applies an edited field and a new section, keeping the rest', () => {
		const d = fresh();
		d.learningItems['seed-zh-0'].examples[0].audioRef = 'blob-1';
		const md = renderItems('zh', zhItems).replace('- meaning: today', '- meaning: today; nowadays') + '\n## 明白\n- reading: míngbai\n- meaning: to understand\n';
		expect(applyItemEdits(d, 'zh', parseItems(md), newId, 5)).toEqual({ added: 1, updated: 1 });
		const it = d.learningItems['seed-zh-0'];
		expect(it.meaning).toBe('today; nowadays');
		expect(it.updatedAt).toBe(5);
		expect(it.examples[0].audioRef).toBe('blob-1');
		const added = Object.values(d.learningItems).find((x) => x.target === '明白')!;
		expect(added).toMatchObject({ language: 'zh', reading: 'míngbai', meaning: 'to understand', status: 'published', createdAt: 5 });
	});

	it('a line added to a passage comes back', () => {
		const d = fresh();
		const p = zhPassages[0];
		const md = renderPassages('zh', zhPassages).replace(
			new RegExp(`(<!-- id: ${p.id} [^\\n]*-->[\\s\\S]*?)(\\n\\n|\\n$)`),
			'$1\n> 再见！ | Zàijiàn! | Bye!$2'
		);
		expect(applyPassageEdits(d, 'zh', parsePassages(md), newId, 9)).toEqual({ added: 0, updated: 1 });
		expect(d.passages[p.id].lines.at(-1)).toEqual({ target: '再见！', reading: 'Zàijiàn!', meaning: 'Bye!' });
	});
});
