/**
 * Checking a typed answer (recall): the learner may type the word in its own
 * script (汉字, 漢字/かな, 한글, Hebrew with or without niqqud) or romanized
 * (pinyin with tone marks or numbers, kana or romaji, Revised Romanization,
 * transliteration). A one-letter slip, or pinyin without tones, is "close":
 * right, but worth a second look.
 */

import { levenshtein } from '$lib/pronunciation';
import { stripNiqqud, type Language } from '$lib/db/types';

export type Verdict = 'exact' | 'close' | 'wrong';

export interface TypedCheck {
	verdict: Verdict;
	/** Why a close answer isn't exact ("check the tones", "small typo"). */
	note?: string;
}

/** What a typed answer is checked against. */
export interface AnswerKey {
	language: Language;
	target: string;
	reading: string;
	transliteration?: string;
	/** Other accepted spellings of the target (e.g. its Traditional form). */
	alternatives?: string[];
}

const TONE_MARK: Record<string, string> = { '\u0304': '1', '\u0301': '2', '\u030c': '3', '\u0300': '4' };

/** Pinyin → letters without tones (ü as v) and the tone digits in order. */
function splitPinyin(s: string): { letters: string; tones: string } {
	let letters = '';
	let tones = '';
	for (const ch of s.normalize('NFD').toLowerCase()) {
		if (TONE_MARK[ch]) tones += TONE_MARK[ch];
		else if (/[1-5]/.test(ch)) tones += ch === '5' ? '' : ch;
		else if (ch === '\u0308' && letters.endsWith('u')) letters = letters.slice(0, -1) + 'v'; // ü, as typed v
		else if (/[a-z]/.test(ch)) letters += ch;
	}
	return { letters, tones };
}

/** Lowercase, no spaces, punctuation, accents or niqqud; kana as hiragana. */
function plain(s: string): string {
	return stripNiqqud(s.normalize('NFKC'))
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.normalize('NFC')
		.toLowerCase()
		.replace(/[\s\p{P}\p{S}]/gu, '')
		.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

function typoAllowance(len: number): number {
	return len >= 8 ? 2 : len >= 4 ? 1 : 0;
}

export function checkTyped(input: string, key: AnswerKey): TypedCheck {
	const typed = plain(input);
	if (!typed) return { verdict: 'wrong' };

	const scripts = [key.target, ...(key.alternatives ?? [])].map(plain).filter(Boolean);
	if (scripts.includes(typed)) return { verdict: 'exact' };

	if (key.language === 'zh' && key.reading) {
		const want = splitPinyin(key.reading);
		const got = splitPinyin(input);
		if (got.letters && got.letters === want.letters) {
			if (got.tones === want.tones) return { verdict: 'exact' };
			return { verdict: 'close', note: got.tones ? 'check the tones' : 'add the tones' };
		}
	} else {
		const romanized = [key.reading, key.transliteration ?? ''].map(plain).filter(Boolean);
		if (romanized.includes(typed)) return { verdict: 'exact' };
	}

	// A small slip in any accepted form.
	const forms = [...scripts, ...[key.reading, key.transliteration ?? ''].map((r) => (key.language === 'zh' ? splitPinyin(r).letters : plain(r)))];
	const typedLoose = key.language === 'zh' && /[a-z]/i.test(input) ? splitPinyin(input).letters : typed;
	for (const f of forms) {
		if (!f) continue;
		const allowed = typoAllowance([...f].length);
		if (allowed && levenshtein(typedLoose, f) <= allowed) return { verdict: 'close', note: 'small typo' };
	}
	return { verdict: 'wrong' };
}
