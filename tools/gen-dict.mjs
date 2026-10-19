#!/usr/bin/env node
/**
 * Builds the tap-a-word dictionaries: static/dict/<lang>/<bucket>.json shards
 * plus static/dict/index.json (src/lib/dict-shard.ts has the layout, and
 * src/lib/dictionary.ts reads it). Run manually (needs network; downloads are
 * cached in .cache/dict/, ~300 MB):
 *
 *   node tools/gen-dict.mjs [zh] [ja] [ko] [he]
 *
 * Sources (all CC BY-SA; see static/dict/LICENSE.md):
 *  - zh: CC-CEDICT (MDBG) — every entry, pinyin converted to tone marks
 *  - ja: JMdict via scriptin/jmdict-simplified — common words plus every
 *        word in Manabi's lists; JMdict part-of-speech codes kept for deinflection
 *  - ko, he: English Wiktionary via kaikki.org (Wiktextract) — lemmas, plus an
 *        inflected-form → lemma map from the conjugation / declension tables
 */
import { build } from 'esbuild';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

const CACHE = '.cache/dict';
const OUT = 'static/dict';
const MAX_SENSES = 3;

async function loadTs(entry) {
	const out = join(tmpdir(), `manabi-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
	await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent' });
	const mod = await import(pathToFileURL(out).href);
	rmSync(out, { force: true });
	return mod;
}

const { bucketOf, dictKey } = await loadTs('src/lib/dict-shard.ts');

/** Download once into the cache; returns the local path. */
async function cached(url, name) {
	mkdirSync(CACHE, { recursive: true });
	const path = join(CACHE, name);
	if (existsSync(path)) return path;
	console.log(`  downloading ${url}`);
	const res = await fetch(url, { headers: { 'user-agent': 'manabi-gen-dict' } });
	if (!res.ok) throw new Error(`${url} → ${res.status}`);
	await pipeline(Readable.fromWeb(res.body), createWriteStream(path + '.part'));
	execFileSync('mv', [path + '.part', path]);
	return path;
}

async function* jsonLines(path) {
	const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
	for await (const line of rl) if (line.trim()) yield JSON.parse(line);
}

/** Shard and write one language. `entries`: key → DictEntry[]; `forms`: form → lemma keys. */
function write(lang, entries, forms, meta) {
	const dir = join(OUT, lang);
	rmSync(dir, { recursive: true, force: true });
	mkdirSync(dir, { recursive: true });
	const shards = new Map();
	const shard = (key) => {
		const b = bucketOf(key);
		if (!shards.has(b)) shards.set(b, { e: {} });
		return shards.get(b);
	};
	for (const [key, list] of entries) shard(key).e[key] = list;
	for (const [form, lemmas] of forms ?? []) {
		const s = shard(form);
		(s.f ??= {})[form] = [...lemmas];
	}
	let bytes = 0;
	for (const [b, s] of shards) {
		const json = JSON.stringify(s);
		bytes += json.length;
		writeFileSync(join(dir, `${b}.json`), json);
	}
	console.log(`${lang}: ${entries.size} keys, ${forms?.size ?? 0} forms, ${shards.size} shards, ${(bytes / 1e6).toFixed(1)} MB`);
	return { buckets: [...shards.keys()].sort((a, b) => a - b), entries: entries.size, ...meta };
}

function add(map, key, entry) {
	const list = map.get(key) ?? [];
	if (!list.some((e) => e.w === entry.w && e.r === entry.r)) list.push(entry);
	map.set(key, list);
}

// --- Chinese: CC-CEDICT ----------------------------------------------------------

const TONE_MARKS = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', ü: 'ǖǘǚǜ' };

/** "xue2" → "xué", "lu:4" → "lǜ", "ma5" → "ma". */
function markSyllable(syl) {
	const m = /^([a-zA-ZüÜ:]+)([1-5])$/.exec(syl);
	if (!m) return syl;
	let [, body, tone] = m;
	body = body.replace(/u:|v/g, 'ü').replace(/U:|V/g, 'Ü');
	if (tone === '5') return body;
	const lower = body.toLowerCase();
	let at = lower.search(/[ae]/);
	if (at < 0) at = lower.indexOf('ou');
	if (at < 0) {
		for (let i = lower.length - 1; i >= 0; i--) if ('aeiouü'.includes(lower[i])) { at = i; break; }
	}
	if (at < 0) return body;
	const v = lower[at];
	const marked = TONE_MARKS[v][Number(tone) - 1];
	const out = body[at] === v ? marked : marked.toUpperCase();
	return body.slice(0, at) + out + body.slice(at + 1);
}

function cedictPinyin(raw) {
	const SYL = /^[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/;
	// Join syllables into a word (Běijīng, nǚ'ér, yīhuìr); keep spaces around anything else (·, letters).
	let out = '';
	let prev = '';
	for (const p of raw.split(' ').map(markSyllable)) {
		const joins = prev && SYL.test(prev) && SYL.test(p) && (p.length > 1 || p === 'r');
		out += !prev ? p : joins ? (/^[aoeāáǎàōóǒòēéěè]/i.test(p) ? "'" : '') + p : ' ' + p;
		prev = p;
	}
	return out;
}

async function buildZh() {
	const path = await cached('https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz', 'cedict.txt.gz');
	const text = gunzipSync(readFileSync(path)).toString('utf8');
	const entries = new Map();
	for (const line of text.split('\n')) {
		const m = /^(\S+) (\S+) \[([^\]]*)\] \/(.*)\/\s*$/.exec(line);
		if (!m) continue;
		const [, , simp, pinyin, defs] = m;
		const g = defs
			.split('/')
			.filter((d) => d && !/^CL:/.test(d) && !/^(old )?variant of /.test(d) && !/^see [^ ]+\|/.test(d))
			.slice(0, MAX_SENSES);
		if (!g.length) continue;
		const r = cedictPinyin(pinyin);
		// Long proper names (places, people, organisations) are most of CEDICT's bulk.
		if (/^[A-Z]/.test(r) && [...simp].length > 3) continue;
		add(entries, simp, { w: simp, r, g: g.map((x) => (x.length > 90 ? x.slice(0, 89) + '…' : x)) });
	}
	// Common words before surnames / proper nouns (王: king before Wang).
	for (const list of entries.values()) list.sort((a, b) => Number(/^[A-Z]/.test(a.r)) - Number(/^[A-Z]/.test(b.r)));
	return write('zh', entries, null, { source: 'CC-CEDICT (MDBG)', license: 'CC BY-SA 4.0' });
}

// --- Japanese: JMdict (jmdict-simplified) ---------------------------------------------

async function buildJa() {
	const rel = await (await fetch('https://api.github.com/repos/scriptin/jmdict-simplified/releases/latest', { headers: { 'user-agent': 'manabi-gen-dict' } })).json();
	const asset = rel.assets.find((a) => /^jmdict-eng-\d.*\.json\.tgz$/.test(a.name));
	if (!asset) throw new Error('jmdict-eng asset not found in latest release');
	const tgz = await cached(asset.browser_download_url, asset.name);
	const jsonPath = join(CACHE, asset.name.replace(/\.tgz$/, ''));
	if (!existsSync(jsonPath)) execFileSync('tar', ['-xzf', tgz, '-C', CACHE]);
	const extracted = readdirSync(CACHE).find((f) => /^jmdict-eng-\d.*\.json$/.test(f));
	const jm = JSON.parse(readFileSync(join(CACHE, extracted), 'utf8'));

	// Every word Manabi teaches gets an entry even if JMdict doesn't mark it common.
	const ours = new Set();
	const addWord = (t) => {
		for (const w of String(t ?? '').replace(/[〜～()（）]/g, ' ').split(/[\s,、・/]+/)) if (w) ours.add(w);
	};
	for (const f of readdirSync('static/wordlists').filter((f) => f.startsWith('ja-'))) {
		for (const w of JSON.parse(readFileSync(`static/wordlists/${f}`, 'utf8'))) addWord(w.t);
	}
	const { seedItems } = await loadTs('src/lib/db/seed.ts');
	for (const it of seedItems()) if (it.language === 'ja') addWord(it.target);

	const entries = new Map();
	for (const e of jm.words) {
		const forms = [...e.kanji.map((k) => k.text), ...e.kana.map((k) => k.text)];
		const common = e.kanji.some((k) => k.common) || e.kana.some((k) => k.common);
		if (!common && !forms.some((f) => ours.has(f))) continue;
		const kanji = e.kanji.find((k) => k.common) ?? e.kanji[0];
		const kana = (kanji && e.kana.find((k) => k.appliesToKanji.includes('*') || k.appliesToKanji.includes(kanji.text))) ?? e.kana[0];
		const g = e.sense
			.map((s) => s.gloss.filter((x) => x.lang === 'eng').slice(0, 3).map((x) => x.text).join(', '))
			.filter(Boolean)
			.slice(0, MAX_SENSES);
		if (!g.length) continue;
		const pos = [...new Set(e.sense.flatMap((s) => s.partOfSpeech))].filter((p) => /^(v|adj-i|vs)/.test(p));
		const entry = { w: kanji?.text ?? kana.text, r: kana.text, g, ...(pos.length ? { p: pos.join(',') } : {}) };
		for (const f of new Set(forms)) add(entries, f, entry);
	}
	return write('ja', entries, null, { source: 'JMdict (EDRDG) via jmdict-simplified', license: 'CC BY-SA 4.0' });
}

// --- Korean & Hebrew: kaikki.org (Wiktextract) -------------------------------------

const SKIP_POS = new Set(['character', 'syllable', 'romanization', 'soft-redirect', 'symbol', 'punct', 'letter']);

function glossesOf(w) {
	return (w.senses ?? [])
		.filter((s) => !s.form_of && !s.alt_of && s.glosses?.length)
		.map((s) => s.glosses[s.glosses.length - 1])
		.slice(0, MAX_SENSES);
}

async function buildKaikki(lang, name) {
	const path = await cached(`https://kaikki.org/dictionary/${name}/kaikki.org-dictionary-${name}.jsonl`, `kaikki-${name}.jsonl`);
	const entries = new Map();
	const forms = new Map();
	const SCRIPT = lang === 'ko' ? /^[가-힣]+$/ : /^[א-ת]+$/;
	const linkForm = (form, lemma) => {
		if (!SCRIPT.test(form) || form === lemma) return;
		const set = forms.get(form) ?? new Set();
		set.add(lemma);
		forms.set(form, set);
	};
	for await (const w of jsonLines(path)) {
		if (SKIP_POS.has(w.pos) || !w.word) continue;
		const key = dictKey(w.word, lang);
		if (!SCRIPT.test(key)) continue;
		// Pure form-of / alt-of entries (e.g. an inflected form) only point at their lemma.
		const lemmaOf = (w.senses ?? []).flatMap((s) => [...(s.form_of ?? []), ...(s.alt_of ?? [])]).map((x) => dictKey(x.word, lang));
		const g = glossesOf(w);
		if (!g.length) {
			for (const l of lemmaOf) linkForm(key, l);
			continue;
		}
		const tagged = (t) => (w.forms ?? []).find((f) => f.tags?.includes(t))?.form;
		const entry = {
			w: lang === 'he' ? (tagged('canonical') ?? w.word) : w.word,
			r: tagged('romanization') ?? '',
			g,
			p: w.pos
		};
		add(entries, key, entry);
		if (/^(verb|adj|noun)$/.test(w.pos)) {
			for (const f of w.forms ?? []) {
				if (f.tags?.some((t) => /^(romanization|canonical|table-tags|inflection-template|class)$/.test(t))) continue;
				linkForm(dictKey(f.form ?? '', lang), key);
			}
		}
	}
	// Only keep forms that lead to an entry we ship and aren't entries themselves.
	for (const [form, lemmas] of forms) {
		const kept = [...lemmas].filter((l) => entries.has(l));
		if (!kept.length || entries.has(form)) forms.delete(form);
		else forms.set(form, new Set(kept));
	}
	return write(lang, entries, forms, { source: `English Wiktionary via kaikki.org (${name})`, license: 'CC BY-SA 4.0 / GFDL' });
}

// --- Main -----------------------------------------------------------------------

const want = process.argv.slice(2).length ? process.argv.slice(2) : ['zh', 'ja', 'ko', 'he'];
const manifestPath = join(OUT, 'index.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const BUILD = { zh: buildZh, ja: buildJa, ko: () => buildKaikki('ko', 'Korean'), he: () => buildKaikki('he', 'Hebrew') };
for (const lang of want) manifest[lang] = await BUILD[lang]();
writeFileSync(manifestPath, JSON.stringify(manifest, null, '\t') + '\n');
console.log(`wrote ${manifestPath}`);
