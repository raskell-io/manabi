#!/usr/bin/env node
/**
 * Generates the Vocabulary browser data — full HSK 3.0 (zh) and JLPT N5–N1 (ja)
 * word lists — into static/wordlists/ as per-level JSON files plus an index.
 * Fetched on demand by /vocab (kept out of the app bundle and the Automerge doc).
 *
 *   node tools/gen-vocab-data.mjs
 *
 * Sources (attribution — see /vocab footer + README):
 *  - HSK 3.0 word lists: github.com/drkameleon/complete-hsk-vocabulary
 *  - JLPT N5–N1 vocab: github.com/jamsinclair/open-anki-jlpt-decks
 *    (expression / reading / meaning), derived from JMdict/Tanos JLPT lists.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

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

const index = { zh: [], ja: [] };
mkdirSync(OUT, { recursive: true });

// --- Chinese: HSK 3.0 levels 1–6 + the 7–9 band (file "7") ------------------
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

// --- Japanese: JLPT N5 → N1 -------------------------------------------------
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

writeFileSync(`${OUT}/index.json`, JSON.stringify(index));
console.log('Wrote', OUT);
console.log('zh:', index.zh.map((l) => `${l.level}:${l.count}`).join(' '));
console.log('ja:', index.ja.map((l) => `${l.level}:${l.count}`).join(' '));
