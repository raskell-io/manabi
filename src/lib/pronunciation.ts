/**
 * Pronunciation scoring — how close a transcript of the learner's recording
 * is to the item. Pure string work; the transcript itself comes from the
 * inference router (`transcribe`). The score only *suggests* a rating: the
 * learner confirms it, so an imperfect transcription is never a silent grade.
 */

import { stripNiqqud, type Language, type SelfRating } from '$lib/db/types';

/** What speech recognition heard, and how close it was. Stored on the attempt. */
export interface AsrResult {
	transcript: string;
	score: number; // 0–100
}

/** Katakana → hiragana so 「カタカナ」 and 「かたかな」 compare equal. */
function kataToHira(s: string): string {
	return s.replace(/[\u30A1-\u30F6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/**
 * Comparable form: NFKC + lowercase, no whitespace or punctuation, no niqqud
 * (speech recognition never outputs it), kana unified.
 */
export function normalizeForCompare(text: string, language: Language): string {
	let t = text.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
	if (language === 'he') t = stripNiqqud(t);
	if (language === 'ja') t = kataToHira(t);
	return t;
}

/** Edit distance over code points. */
export function levenshtein(a: string, b: string): number {
	const A = Array.from(a);
	const B = Array.from(b);
	if (A.length === 0) return B.length;
	if (B.length === 0) return A.length;
	let prev = Array.from({ length: B.length + 1 }, (_, j) => j);
	for (let i = 1; i <= A.length; i++) {
		const cur = [i];
		for (let j = 1; j <= B.length; j++) {
			const cost = A[i - 1] === B[j - 1] ? 0 : 1;
			cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
		}
		prev = cur;
	}
	return prev[B.length];
}

/** 1 = identical, 0 = nothing in common. */
export function similarity(a: string, b: string): number {
	const max = Math.max(Array.from(a).length, Array.from(b).length);
	if (max === 0) return 1;
	return 1 - levenshtein(a, b) / max;
}

export interface PronunciationScore {
	score: number; // 0–100
	matched: 'target' | 'reading';
}

/**
 * Score a transcript against the item: its script, and for Japanese also its
 * kana reading (recognition may return 食べる or たべる for the same word).
 */
export function scorePronunciation(
	transcript: string,
	item: { target: string; reading: string; language: Language }
): PronunciationScore {
	const heard = normalizeForCompare(transcript, item.language);
	const candidates: [PronunciationScore['matched'], string][] = [['target', item.target]];
	if (item.language === 'ja' && item.reading) candidates.push(['reading', item.reading]);
	let best: PronunciationScore = { score: 0, matched: 'target' };
	for (const [matched, text] of candidates) {
		const score = Math.round(100 * similarity(heard, normalizeForCompare(text, item.language)));
		if (score > best.score) best = { score, matched };
	}
	return best;
}

/** The self-rating a score suggests. The learner still confirms. */
export function suggestRating(score: number): SelfRating {
	if (score >= 85) return 'good';
	if (score >= 60) return 'okay';
	return 'bad';
}
