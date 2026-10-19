/**
 * Markdown round-trip of content (items, passages) in the sync repository:
 * content/<lang>/items.md and content/<lang>/passages.md, one `## heading`
 * section per item or passage, readable and editable on GitHub.
 *
 * Every section carries the hash of its body as Manabi rendered it
 * (`<!-- id: … · h: … -->`). On the next sync, a section whose body no longer
 * matches its hash was edited by hand, and only those sections are applied —
 * so an untouched file never overwrites newer edits from another device. A
 * section without an id is a new item. Deleting a section deletes nothing.
 */

import type { ExampleSentence, ItemKind, ItemStatus, Language, LearningItem, Passage, PassageKind, PassageLine } from './db/types';
import type { ZhVariants } from './chinese';

const LANGUAGE_NAME: Record<Language, string> = { zh: 'Chinese', ja: 'Japanese', ko: 'Korean', he: 'Hebrew' };
const ITEM_KINDS: ItemKind[] = ['word', 'phrase', 'sentence', 'grammar', 'character'];

/** FNV-1a, 32-bit, hex — a short, stable fingerprint of a section body. */
export function hash(text: string): string {
	let h = 0x811c9dc5;
	for (const ch of text) {
		h ^= ch.codePointAt(0)!;
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h.toString(16).padStart(8, '0');
}

/** Body lines are compared trimmed and without blank lines, so re-wrapping whitespace isn't an edit. */
function bodyKey(lines: string[]): string {
	return lines.map((l) => l.trim()).filter(Boolean).join('\n');
}

const clean = (s: string) => s.replace(/\s*\n\s*/g, ' ').replace(/\|/g, '/').trim();

function quoteLine(parts: (string | undefined)[]): string {
	while (parts.length && !parts[parts.length - 1]) parts.pop();
	return '> ' + parts.map((p) => clean(p ?? '')).join(' | ');
}

function section(heading: string, id: string, body: string[]): string {
	const lines = [`## ${clean(heading)}`, ...body];
	return [lines[0], `<!-- id: ${id} · h: ${hash(bodyKey(lines))} -->`, ...body].join('\n');
}

function header(title: string, what: string): string {
	return [
		`# ${title}`,
		'',
		`Written by Manabi on every sync. Edit ${what} here and the change comes back on the next sync: change a field, add or`,
		'remove a `>` line, or add a new `## heading` section without an id comment. Deleting a section does not delete',
		'anything. Leave the `<!-- id: … -->` comments as they are.',
		''
	].join('\n');
}

// --- Items ------------------------------------------------------------------------

export function renderItems(language: Language, items: LearningItem[]): string {
	const sorted = [...items].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
	const sections = sorted.map((it) =>
		section(it.target, it.id, [
			`- reading: ${clean(it.reading)}`,
			...(it.transliteration ? [`- transliteration: ${clean(it.transliteration)}`] : []),
			`- meaning: ${clean(it.meaning)}`,
			`- kind: ${it.kind}`,
			`- level: ${clean(it.level)}`,
			`- tags: ${it.tags.map(clean).join(', ')}`,
			`- status: ${it.status}`,
			...(it.zhVariants?.tw ? [`- tw: ${clean(it.zhVariants.tw)}`] : []),
			...(it.zhVariants?.hk ? [`- hk: ${clean(it.zhVariants.hk)}`] : []),
			...(it.zhVariants?.twReading ? [`- twreading: ${clean(it.zhVariants.twReading)}`] : []),
			...it.examples.map((ex) => quoteLine([ex.target, ex.reading, ex.meaning, ex.transliteration]))
		])
	);
	return header(`Manabi — ${LANGUAGE_NAME[language]} items`, 'items') + '\n' + sections.join('\n\n') + '\n';
}

export interface ParsedItem {
	id?: string;
	/** Edited by hand since Manabi wrote it (or new). */
	touched: boolean;
	target: string;
	reading: string;
	transliteration?: string;
	meaning: string;
	kind: ItemKind;
	level: string;
	tags: string[];
	status: ItemStatus;
	examples: ExampleSentence[];
	/** Chinese: Taiwan / Hong Kong form and Taiwan reading (- tw / - hk / - twreading). */
	zhVariants?: ZhVariants;
}

interface RawSection {
	heading: string;
	id?: string;
	hash?: string;
	body: string[];
	fields: Map<string, string>;
	quotes: string[];
}

function sections(md: string): RawSection[] {
	const out: RawSection[] = [];
	let cur: RawSection | null = null;
	for (const line of md.replace(/\r\n?/g, '\n').split('\n')) {
		const h = /^##\s+(.*)$/.exec(line);
		if (h) {
			cur = { heading: h[1].trim(), body: [], fields: new Map(), quotes: [] };
			out.push(cur);
			continue;
		}
		if (!cur) continue;
		const meta = /^<!--\s*id:\s*(\S+)\s*·\s*h:\s*([0-9a-f]+)\s*-->$/.exec(line.trim());
		if (meta) {
			cur.id = meta[1];
			cur.hash = meta[2];
			continue;
		}
		cur.body.push(line);
		const field = /^\s*[-*]\s*([a-z]+):\s?(.*)$/.exec(line);
		if (field) cur.fields.set(field[1], field[2].trim());
		else if (/^\s*>/.test(line)) cur.quotes.push(line.replace(/^\s*>\s?/, '').trim());
	}
	return out;
}

const touched = (s: RawSection) => !s.id || !s.hash || hash(bodyKey([`## ${s.heading}`, ...s.body])) !== s.hash;
const splitQuote = (q: string) => q.split('|').map((p) => p.trim());

export function parseItems(md: string): ParsedItem[] {
	return sections(md)
		.filter((s) => s.heading)
		.map((s) => {
			const f = s.fields;
			const kind = f.get('kind') as ItemKind;
			const translit = f.get('transliteration');
			const variants = Object.fromEntries(
				([['tw', 'tw'], ['hk', 'hk'], ['twReading', 'twreading']] as const).map(([k, field]) => [k, f.get(field)]).filter(([, v]) => v)
			) as ZhVariants;
			return {
				...(s.id ? { id: s.id } : {}),
				touched: touched(s),
				target: s.heading,
				reading: f.get('reading') ?? '',
				...(translit ? { transliteration: translit } : {}),
				meaning: f.get('meaning') ?? '',
				kind: ITEM_KINDS.includes(kind) ? kind : 'word',
				level: f.get('level') || 'A1',
				tags: (f.get('tags') ?? '').split(',').map((t) => t.trim()).filter(Boolean),
				status: f.get('status') === 'draft' ? 'draft' : 'published',
				...(Object.keys(variants).length ? { zhVariants: variants } : {}),
				examples: s.quotes.filter(Boolean).map((q) => {
					const [target, reading = '', meaning = '', transliteration] = splitQuote(q);
					return { target, reading, meaning, ...(transliteration ? { transliteration } : {}) };
				})
			};
		});
}

// --- Passages ------------------------------------------------------------------------

export function renderPassages(language: Language, passages: Passage[]): string {
	const sorted = [...passages].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
	const sections = sorted.map((p) =>
		section(p.title, p.id, [
			`- kind: ${p.kind}`,
			`- level: ${clean(p.level)}`,
			`- tags: ${p.tags.map(clean).join(', ')}`,
			...(p.intro ? [`- intro: ${clean(p.intro)}`] : []),
			...p.lines.map((l) => quoteLine([(l.speaker ? `**${clean(l.speaker)}** ` : '') + l.target, l.reading, l.meaning, l.transliteration]))
		])
	);
	return header(`Manabi — ${LANGUAGE_NAME[language]} reading`, 'passages') + '\n' + sections.join('\n\n') + '\n';
}

export interface ParsedPassage {
	id?: string;
	touched: boolean;
	title: string;
	kind: PassageKind;
	level: string;
	tags: string[];
	intro?: string;
	lines: PassageLine[];
}

export function parsePassages(md: string): ParsedPassage[] {
	return sections(md)
		.filter((s) => s.heading)
		.map((s) => {
			const f = s.fields;
			const intro = f.get('intro');
			return {
				...(s.id ? { id: s.id } : {}),
				touched: touched(s),
				title: s.heading,
				kind: f.get('kind') === 'conversation' ? 'conversation' : 'text',
				level: f.get('level') || 'A1',
				tags: (f.get('tags') ?? '').split(',').map((t) => t.trim()).filter(Boolean),
				...(intro ? { intro } : {}),
				lines: s.quotes.filter(Boolean).map((q) => {
					const [first, reading = '', meaning = '', transliteration] = splitQuote(q);
					const sp = /^\*\*(.+?)\*\*\s*(.*)$/.exec(first);
					return {
						...(sp ? { speaker: sp[1].trim() } : {}),
						target: sp ? sp[2].trim() : first,
						reading,
						meaning,
						...(transliteration ? { transliteration } : {})
					};
				})
			};
		});
}

/** The sync-repo paths for a language's content. */
export function contentPaths(language: Language): { items: string; passages: string } {
	return { items: `content/${language}/items.md`, passages: `content/${language}/passages.md` };
}

// --- Applying hand edits ----------------------------------------------------------

export interface EditCounts {
	added: number;
	updated: number;
}

type Doc = { learningItems: Record<string, LearningItem>; passages: Record<string, Passage> };

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Set `obj[key]` to `value` (deleting it for undefined) when it differs; returns whether it did. */
function assign(obj: Record<string, unknown>, key: string, value: unknown): boolean {
	if (same(obj[key], value)) return false;
	if (value === undefined) delete obj[key];
	else obj[key] = value;
	return true;
}

/** Keep recorded / synthesized audio on examples and lines whose text didn't change. */
function keepAudio<T extends { target: string; audioRef?: string }>(next: T[], prev: T[]): T[] {
	const audio = new Map(prev.filter((p) => p.audioRef).map((p) => [p.target, p.audioRef!]));
	return next.map((n) => (audio.has(n.target) ? { ...n, audioRef: audio.get(n.target)! } : n));
}

/**
 * Apply the hand-edited sections of a language's items file to a document
 * (in place — call inside an Automerge change). Untouched sections are
 * skipped; new sections become items; items of other languages are left alone.
 */
export function applyItemEdits(d: Doc, language: Language, parsed: ParsedItem[], newId: () => string, now: number): EditCounts {
	const counts = { added: 0, updated: 0 };
	for (const p of parsed) {
		if (!p.touched || !p.target.trim()) continue;
		const it = p.id ? d.learningItems[p.id] : undefined;
		if (it && it.language !== language) continue;
		if (!it) {
			if (!p.meaning.trim()) continue;
			const id = newId();
			d.learningItems[id] = {
				id,
				language,
				kind: p.kind,
				target: p.target,
				reading: p.reading,
				...(p.transliteration ? { transliteration: p.transliteration } : {}),
				meaning: p.meaning,
				tags: p.tags,
				level: p.level,
				examples: p.examples,
				...(p.zhVariants ? { zhVariants: p.zhVariants } : {}),
				status: p.status,
				createdAt: now,
				updatedAt: now
			};
			counts.added++;
			continue;
		}
		const rec = it as Record<string, unknown>;
		let changed = false;
		for (const [k, v] of Object.entries({
			target: p.target,
			reading: p.reading,
			transliteration: p.transliteration,
			meaning: p.meaning,
			kind: p.kind,
			level: p.level,
			tags: p.tags,
			status: p.status,
			zhVariants: p.zhVariants
		})) {
			changed = assign(rec, k, v) || changed;
		}
		const examples = keepAudio(p.examples, it.examples);
		changed = assign(rec, 'examples', examples) || changed;
		if (changed) {
			it.updatedAt = now;
			counts.updated++;
		}
	}
	return counts;
}

/** Same for a language's passages file. */
export function applyPassageEdits(d: Doc, language: Language, parsed: ParsedPassage[], newId: () => string, now: number): EditCounts {
	const counts = { added: 0, updated: 0 };
	for (const p of parsed) {
		if (!p.touched || !p.title.trim() || !p.lines.length) continue;
		const ps = p.id ? d.passages[p.id] : undefined;
		if (ps && ps.language !== language) continue;
		if (!ps) {
			const id = newId();
			d.passages[id] = {
				id,
				language,
				kind: p.kind,
				title: p.title,
				level: p.level,
				tags: p.tags,
				...(p.intro ? { intro: p.intro } : {}),
				lines: p.lines,
				createdAt: now,
				updatedAt: now
			};
			counts.added++;
			continue;
		}
		const rec = ps as Record<string, unknown>;
		let changed = false;
		for (const [k, v] of Object.entries({ title: p.title, kind: p.kind, level: p.level, tags: p.tags, intro: p.intro })) {
			changed = assign(rec, k, v) || changed;
		}
		changed = assign(rec, 'lines', keepAudio(p.lines, ps.lines)) || changed;
		if (changed) {
			ps.updatedAt = now;
			counts.updated++;
		}
	}
	return counts;
}
