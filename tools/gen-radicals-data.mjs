#!/usr/bin/env node
/**
 * Generates src/lib/radicals-data.ts — the 214 Kangxi radicals and, for every
 * hanzi/kanji Manabi ships (Scripts sets, seed, vocab word lists), which
 * radical it is filed under. Run manually (needs network + `unzip`):
 *
 *   node tools/gen-radicals-data.mjs
 *
 * Data sources:
 *  - Radical/stroke index (kRSUnicode): Unicode Unihan database.
 *  - Radical ↔ ideograph mapping (CJKRadicals.txt) and radical names
 *    (UnicodeData.txt, "KANGXI RADICAL …"): Unicode Character Database.
 *  - Pinyin of each radical: github.com/skishore/makemeahanzi (Unihan-derived).
 *  - Traditional forms of the Chinese text (Taiwan + Hong Kong): opencc-js.
 * Unicode data © Unicode, Inc., Unicode License v3.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const UCD = 'https://www.unicode.org/Public/UCD/latest/ucd';
const MMAH_URL = 'https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt';
const HAN = /\p{Script=Han}/u;

const OpenCC = await import('opencc-js/cn2t');
const toTraditional = ['tw', 'hk'].map((to) => OpenCC.Converter({ from: 'cn', to }));

async function get(url) {
	const r = await fetch(url);
	if (!r.ok) throw new Error(`${url} → ${r.status}`);
	return r;
}

async function loadTs(entry) {
	const out = join(tmpdir(), `manabi-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
	await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent' });
	const mod = await import(pathToFileURL(out).href);
	rmSync(out, { force: true });
	return mod;
}

// Stroke count of each Kangxi radical, by radical-number range.
const STROKE_RANGES = [
	[1, 1], [7, 2], [30, 3], [61, 4], [95, 5], [118, 6], [147, 7], [167, 8], [176, 9],
	[187, 10], [195, 11], [201, 12], [205, 13], [209, 14], [211, 15], [212, 16], [214, 17]
];
function radicalStrokes(n) {
	let s = 1;
	for (const [from, strokes] of STROKE_RANGES) if (n >= from) s = strokes;
	return s;
}

// Component forms worth showing next to the full radical (all in the unified
// CJK block, so they render in ordinary CJK fonts). Simplified Chinese forms
// come from CJKRadicals.txt and are merged in below.
const VARIANTS = {
	9: ['亻'], 18: ['刂'], 47: ['川'], 61: ['忄'], 64: ['扌'], 66: ['攵'], 85: ['氵', '氺'],
	86: ['灬'], 94: ['犭'], 96: ['王'], 113: ['礻'], 122: ['罒'], 130: ['月'], 140: ['艹'],
	145: ['衤'], 162: ['辶'], 163: ['阝'], 170: ['阝'], 174: ['青'], 184: ['飠']
};

// Friendlier glosses where the Unicode name is opaque.
const MEANING_FIX = {
	5: 'second (hook)', 6: 'hook', 9: 'person', 8: 'lid', 13: 'down box', 14: 'cover', 17: 'open box',
	22: 'box', 23: 'hiding enclosure', 27: 'cliff', 28: 'private', 31: 'enclosure', 44: 'corpse',
	50: 'turban', 53: 'dotted cliff', 54: 'long stride', 55: 'two hands', 56: 'shoot', 58: 'snout',
	59: 'bristle', 60: 'step', 62: 'halberd', 65: 'branch', 66: 'rap', 68: 'dipper', 70: 'square',
	78: 'death', 79: 'weapon', 80: 'do not', 89: 'double x', 90: 'half tree trunk', 91: 'slice',
	103: 'bolt of cloth', 104: 'sickness', 105: 'dotted tent', 114: 'track', 117: 'stand',
	125: 'old', 127: 'plow', 134: 'mortar', 141: 'tiger', 146: 'west', 162: 'walk',
	163: 'city', 170: 'mound', 171: 'slave', 172: 'short-tailed bird', 189: 'tall', 191: 'fight',
	192: 'sacrificial wine', 193: 'cauldron', 200: 'hemp', 204: 'embroidery', 205: 'frog'
};

async function main() {
	const tmp = mkdtempSync(join(tmpdir(), 'unihan-'));
	try {
		// --- Unihan kRSUnicode --------------------------------------------------
		const zip = Buffer.from(await (await get(`${UCD}/Unihan.zip`)).arrayBuffer());
		writeFileSync(join(tmp, 'Unihan.zip'), zip);
		const irg = execFileSync('unzip', ['-p', join(tmp, 'Unihan.zip'), 'Unihan_IRGSources.txt'], {
			maxBuffer: 256 * 1024 * 1024
		}).toString('utf8');
		const rs = new Map(); // char → [radical, residual strokes]
		for (const line of irg.split('\n')) {
			const m = /^U\+([0-9A-F]+)\tkRSUnicode\t(\d+)'*\.(-?\d+)/.exec(line);
			if (m) rs.set(String.fromCodePoint(parseInt(m[1], 16)), [Number(m[2]), Math.max(0, Number(m[3]))]);
		}

		// --- Radical table --------------------------------------------------------
		const radicalsTxt = await (await get(`${UCD}/CJKRadicals.txt`)).text();
		const unified = {}; // n → ideograph
		const simplified = {}; // n → [simplified forms]
		for (const line of radicalsTxt.split('\n')) {
			const m = /^(\d+)('*);\s*([0-9A-F]*);\s*([0-9A-F]+)/.exec(line);
			if (!m) continue;
			const n = Number(m[1]);
			const ch = String.fromCodePoint(parseInt(m[4], 16));
			if (m[2]) (simplified[n] ??= []).push(ch);
			else unified[n] = ch;
		}
		const names = {};
		for (const line of (await (await get(`${UCD}/UnicodeData.txt`)).text()).split('\n')) {
			const [cp, name] = line.split(';');
			const v = parseInt(cp, 16);
			if (v >= 0x2f00 && v <= 0x2fd5) names[v - 0x2f00 + 1] = name.replace('KANGXI RADICAL ', '').toLowerCase();
		}
		const pinyin = {};
		for (const line of (await (await get(MMAH_URL)).text()).split('\n')) {
			if (!line.trim()) continue;
			const e = JSON.parse(line);
			if (e.pinyin?.length) pinyin[e.character] = e.pinyin[0];
		}

		const radicals = [];
		for (let n = 1; n <= 214; n++) {
			const char = unified[n];
			if (!char) throw new Error(`radical ${n} missing from CJKRadicals.txt`);
			const variants = [...new Set([...(VARIANTS[n] ?? []), ...(simplified[n] ?? [])])]
				// Only BMP forms: astral-plane variants are missing from most fonts.
				.filter((v) => v !== char && v.codePointAt(0) <= 0xffff);
			radicals.push({
				n,
				char,
				strokes: radicalStrokes(n),
				meaning: MEANING_FIX[n] ?? names[n] ?? '',
				pinyin: pinyin[char] ?? '',
				variants
			});
		}

		// --- Which characters to index -------------------------------------------
		const chars = new Set();
		const addText = (t) => {
			for (const c of t ?? '') if (HAN.test(c)) chars.add(c);
		};
		// Chinese text also contributes its Traditional forms (Taiwan + Hong Kong),
		// which the Traditional script option displays (src/lib/chinese.ts).
		const addZh = (t) => {
			addText(t);
			for (const conv of toTraditional) addText(conv(t ?? ''));
		};
		const sd = await loadTs('src/lib/scripts-data.ts');
		for (const [name, list] of Object.entries(sd)) {
			if (Array.isArray(list)) for (const g of list) (name.startsWith('HANZI_') ? addZh : addText)(g.char);
		}
		const { seedItems, seedPassages } = await loadTs('src/lib/db/seed.ts');
		for (const it of seedItems()) if (it.language === 'zh') addZh(it.target); else if (it.language === 'ja') addText(it.target);
		for (const p of seedPassages()) {
			if (p.language === 'zh') for (const l of p.lines) addZh(l.target);
			else if (p.language === 'ja') for (const l of p.lines) addText(l.target);
		}
		for (const f of readdirSync('static/wordlists')) {
			if (!/^(zh|ja)-.*\.json$/.test(f)) continue;
			const add = f.startsWith('zh-') ? addZh : addText;
			for (const w of JSON.parse(readFileSync(`static/wordlists/${f}`, 'utf8'))) add(w.t);
		}
		for (const r of radicals) addText(r.char);

		// members[n] = "|"-separated runs of characters by residual stroke count.
		const buckets = Array.from({ length: 215 }, () => []);
		let missing = 0;
		for (const c of chars) {
			const v = rs.get(c);
			if (!v) {
				missing++;
				continue;
			}
			const [n, residual] = v;
			(buckets[n][residual] ??= []).push(c);
		}
		const members = buckets.map((runs) =>
			Array.from({ length: runs.length }, (_, i) => (runs[i] ?? []).sort().join('')).join('|')
		);

		const header = `// AUTO-GENERATED by tools/gen-radicals-data.mjs — do not edit by hand.
//
// The 214 Kangxi radicals and the hanzi/kanji Manabi ships, filed by radical.
//  • Radical/stroke index (kRSUnicode): Unicode Unihan database
//  • Radical ideographs & names: Unicode CJKRadicals.txt / UnicodeData.txt
//    (Unicode data © Unicode, Inc., Unicode License v3)
//  • Radical pinyin: github.com/skishore/makemeahanzi
//
// eslint-disable
/* prettier-ignore */
import type { Radical } from './radicals';

`;
		writeFileSync(
			'src/lib/radicals-data.ts',
			header +
				`export const RADICALS: Radical[] = ${JSON.stringify(radicals)};\n\n` +
				`/** Index = radical number; "|"-separated runs of characters, run i = i residual strokes. */\n` +
				`export const RADICAL_MEMBERS: string[] = ${JSON.stringify(members)};\n`
		);
		console.log(`wrote src/lib/radicals-data.ts — 214 radicals, ${chars.size - missing} characters indexed (${missing} without kRSUnicode)`);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
}

await main();
