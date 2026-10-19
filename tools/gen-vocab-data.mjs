#!/usr/bin/env node
/**
 * Generates the Vocabulary browser data — full HSK 3.0 (zh), JLPT N5–N1 (ja)
 * and frequency bands of Hong Kong Cantonese (yue) — into static/wordlists/ as
 * per-level JSON files plus an index. Fetched on demand by /vocab (kept out of
 * the app bundle and the Automerge doc).
 *
 *   node tools/gen-vocab-data.mjs [zh] [ja] [yue]
 *
 * Cantonese needs the yue dictionary first (node tools/gen-dict.mjs yue): it
 * supplies the English glosses.
 *
 * Sources (attribution — see /vocab footer + README):
 *  - HSK 3.0 word lists: github.com/drkameleon/complete-hsk-vocabulary
 *  - JLPT N5–N1 vocab: github.com/jamsinclair/open-anki-jlpt-decks
 *    (expression / reading / meaning), derived from JMdict/Tanos JLPT lists.
 *  - Cantonese: words.hk corpus word frequencies and Jyutping (public domain,
 *    words.hk/faiman/analysis), glosses from static/dict/yue (CC-Canto /
 *    CC-CEDICT, CC BY-SA).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HSK_URL = (lv) => `https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/wordlists/exclusive/new/${lv}.json`;
const JLPT_URL = (lv) => `https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/master/src/${lv}.csv`;

const OUT = 'static/wordlists';

async function getJSON(url) {
	const r = await fetch(url);
	if (!r.ok) throw new Error(`${url} → ${r.status}`);
	return r.json();
}
async function getText(url) {
	const r = await fetch(url);
	if (!r.ok) throw new Error(`${url} → ${r.status}`);
	return r.text();
}

function parseCSV(text) {
	const rows = [];
	let field = '',
		row = [],
		inQ = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (inQ) {
			if (c === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i++;
				} else inQ = false;
			} else field += c;
		} else if (c === '"') inQ = true;
		else if (c === ',') {
			row.push(field);
			field = '';
		} else if (c === '\n') {
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
		} else if (c !== '\r') field += c;
	}
	if (field.length || row.length) {
		row.push(field);
		rows.push(row);
	}
	return rows;
}

function clip(s, n = 70) {
	s = (s || '').trim();
	return s.length > n ? s.slice(0, n).replace(/[,; ]+$/, '') + '…' : s;
}

const want = process.argv.slice(2).length ? process.argv.slice(2) : ['zh', 'ja', 'yue'];
const indexPath = `${OUT}/index.json`;
const index = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : {};
mkdirSync(OUT, { recursive: true });

// --- Chinese: HSK 3.0 levels 1–6 + the 7–9 band (file "7") ------------------
if (want.includes('zh')) {
index.zh = [];
const seenZh = new Set();
for (const lv of [1, 2, 3, 4, 5, 6, 7]) {
	const words = await getJSON(HSK_URL(lv));
	const out = [];
	for (const w of words) {
		const t = w.simplified;
		if (!t || seenZh.has(t)) continue;
		seenZh.add(t);
		const form = (w.forms && w.forms[0]) || {};
		const r = form.transcriptions?.pinyin || '';
		const m = clip((form.meanings || []).slice(0, 2).join('; '));
		out.push({ t, r, m });
	}
	const label = lv === 7 ? '7-9' : String(lv);
	const file = `zh-${label}.json`;
	writeFileSync(`${OUT}/${file}`, JSON.stringify(out));
	index.zh.push({ level: label, file, count: out.length });
}
}

// --- Japanese: JLPT N5 → N1 -------------------------------------------------
if (want.includes('ja')) {
index.ja = [];
const seenJa = new Set();
for (const lv of ['n5', 'n4', 'n3', 'n2', 'n1']) {
	const rows = parseCSV(await getText(JLPT_URL(lv)));
	rows.shift(); // header: expression,reading,meaning,tags,guid
	const out = [];
	for (const row of rows) {
		const [expr, reading, meaning] = row;
		if (!expr || seenJa.has(expr)) continue;
		seenJa.add(expr);
		out.push({ t: expr, r: reading || '', m: clip(meaning) });
	}
	const label = lv.toUpperCase();
	const file = `ja-${label}.json`;
	writeFileSync(`${OUT}/${file}`, JSON.stringify(out));
	index.ja.push({ level: label, file, count: out.length });
}
}

// --- Cantonese: words.hk corpus frequency, in bands --------------------------
// Bands by rank among the words we can gloss: the 500 most frequent, then up
// to 1,500, 3,000 and 5,000. Level ids are the band's upper rank.
const YUE_BANDS = [500, 1500, 3000, 5000];
const HAN_WORD = /^\p{Script=Han}+$/u;
if (want.includes('yue')) {
	index.yue = [];
	const freq = parseCSV(await getText('https://words.hk/faiman/analysis/existingwordcount.csv'));
	const lists = parseCSV(await getText('https://words.hk/faiman/analysis/wordslist.csv'));
	const jyutOf = new Map();
	for (const [w, ...readings] of lists.slice(1)) if (w && readings[0]) jyutOf.set(w, readings[0].trim());
	const shards = new Map();
	const entries = (w) => {
		const b = w.codePointAt(0) % 64;
		if (!shards.has(b)) shards.set(b, existsSync(`static/dict/yue/${b}.json`) ? JSON.parse(readFileSync(`static/dict/yue/${b}.json`, 'utf8')).e : {});
		return shards.get(b)[w] ?? [];
	};
	const ranked = freq
		.slice(1)
		.filter(([w, n]) => w && HAN_WORD.test(w) && Number(n) > 0)
		.sort((a, b) => Number(b[1]) - Number(a[1]));
	const words = [];
	for (const [t] of ranked) {
		if (words.length >= YUE_BANDS[YUE_BANDS.length - 1]) break;
		const r = jyutOf.get(t);
		const es = entries(t);
		if (!r || !es.length) continue;
		// The sense under words.hk's reading, if the dictionary ranks it near the
		// top (到 dou2 vs dou3); else the dictionary's lead sense (呢 "this", not
		// the rare nei1 "woollen cloth").
		const k = es.findIndex((x) => x.r === r);
		const e = k >= 0 && k < 2 ? es[k] : es[0];
		const senses = [...new Set(e.g.slice(0, 2).join('; ').split(/\s*;\s*/).filter(Boolean))];
		words.push({ t, r, m: clip(senses.join('; ')) });
	}
	let from = 0;
	for (const upTo of YUE_BANDS) {
		const out = words.slice(from, upTo);
		from = upTo;
		const file = `yue-${upTo}.json`;
		writeFileSync(`${OUT}/${file}`, JSON.stringify(out));
		index.yue.push({ level: String(upTo), file, count: out.length });
	}
}

writeFileSync(indexPath, JSON.stringify(index));
console.log('Wrote', OUT);
for (const lang of Object.keys(index)) console.log(`${lang}:`, index[lang].map((l) => `${l.level}:${l.count}`).join(' '));
