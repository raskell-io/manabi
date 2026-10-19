/**
 * "Read your own text": turn pasted text into a passage — split into
 * sentences, with readings worked out from the dictionary (no key needed),
 * or a reading and translation per line from the AI when there is a key.
 */

import type { Language, PassageLine } from './db/types';
import type { Lookup } from './lookup';

/** Split pasted text into sentence lines (keeps the end punctuation). */
export function splitSentences(text: string): string[] {
	return text
		.replace(/\r\n?/g, '\n')
		.split(/\n+/)
		.flatMap((para) => para.match(/[^。！？!?.…]+[。！？!?.…]*[」』"')）]*\s*/gu) ?? [])
		.map((s) => s.trim())
		.filter((s) => /\p{L}/u.test(s));
}

const CJK_PUNCT: Record<string, string> = { '，': ',', '。': '.', '！': '!', '？': '?', '、': ',', '：': ':', '；': ';', '「': '"', '」': '"' };

const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}ー]/u;

/**
 * Reading of an inflected Japanese span from its dictionary entry: the kana of
 * the kanji stem plus the span's own okurigana (食べました, 食べる / たべる →
 * たべました).
 */
export function inflectedKana(surface: string, word: string, reading: string): string {
	let stem = 0;
	while (stem < word.length && !KANA.test(word[stem])) stem++;
	const tail = word.slice(stem);
	if (stem === 0 || !reading.endsWith(tail) || !surface.startsWith(word.slice(0, stem))) return reading;
	return reading.slice(0, reading.length - tail.length) + surface.slice(stem);
}

// Revised Romanization, syllable by syllable (no sound-change rules beyond
// carrying a final consonant over to a following vowel).
const RR_INITIAL = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const RR_VOWEL = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const RR_FINAL = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];
const RR_LIAISON = ['', 'g', 'kk', 'ks', 'n', 'nj', 'nh', 'd', 'r', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'b', 'bs', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h'];

/** Hangul → Revised Romanization (approximate: no assimilation rules). */
export function romanizeHangul(text: string): string {
	const syl = [...text];
	let out = '';
	for (let i = 0; i < syl.length; i++) {
		const c = syl[i].charCodeAt(0) - 0xac00;
		if (c < 0 || c > 11171) {
			out += syl[i];
			continue;
		}
		const ini = Math.floor(c / 588);
		const vow = Math.floor((c % 588) / 28);
		const fin = c % 28;
		const next = (syl[i + 1]?.charCodeAt(0) ?? 0) - 0xac00;
		const nextVowelInitial = next >= 0 && next <= 11171 && Math.floor(next / 588) === 11;
		out += RR_INITIAL[ini] + RR_VOWEL[vow];
		if (fin && nextVowelInitial && fin !== 21) out += RR_LIAISON[fin];
		else out += RR_FINAL[fin];
	}
	return out;
}

/**
 * A line's reading worked out offline: pinyin / Jyutping word by word from
 * the dictionary (zh / yue), kana (ja), Revised Romanization (ko). Hebrew needs the AI
 * (unvowelled text has no reliable reading), so it stays empty.
 */
export async function dictionaryReading(language: Language, line: string, lookup: Lookup): Promise<string> {
	if (language === 'ko') return romanizeHangul(line);
	if (language === 'he') return '';
	const parts = await lookup.segment(language, line);
	const words = parts.map((p) => {
		if (!p.hit) return language !== 'ja' ? (CJK_PUNCT[p.text] ?? p.text) : p.text;
		const e = p.hit.entries[0];
		return language === 'ja' && p.hit.key !== p.text ? inflectedKana(p.text, e.w, e.r) : e.r;
	});
	return language !== 'ja' ? words.join(' ').replace(/ ([,.!?:;"])/g, '$1') : words.join('');
}

/** Lines for a passage from pasted text, readings from the dictionary. */
export async function linesFromText(language: Language, text: string, lookup: Lookup): Promise<PassageLine[]> {
	const lines: PassageLine[] = [];
	for (const target of splitSentences(text)) {
		lines.push({ target, reading: await dictionaryReading(language, target, lookup), meaning: '' });
	}
	return lines;
}
