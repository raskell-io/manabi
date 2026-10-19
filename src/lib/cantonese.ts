/**
 * Cantonese (yue) readings: Jyutping, the LSHK romanization — one syllable
 * per character, tone as a digit 1–6 (nei5 hou2 = 你好). Content is written in
 * Hong Kong Traditional characters as colloquial Cantonese (係 嘅 唔 咗).
 */

import { rubySegments } from './zhuyin';

/** One Jyutping syllable: initial + final, then the tone digit. */
const SYLLABLE = /^(?:[bpmfdtnlgkhwzcsj]|gw|kw|ng)?(?:aa|a|e|i|o|u|oe|eo|yu)?[a-z]*[1-6]$/;

/**
 * A Jyutping reading split into syllables ("Nei5 hou2!" → nei5, hou2), or null
 * when something in it isn't Jyutping (so no ruby is drawn).
 */
export function jyutpingSyllables(reading: string): string[] | null {
	const out: string[] = [];
	for (const token of reading.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) {
		if (!SYLLABLE.test(token)) return null;
		out.push(token);
	}
	return out.length ? out : null;
}

/** Each character with its Jyutping syllable above, when the counts line up; else null. */
export function jyutpingRuby(text: string, reading: string | undefined): { text: string; rt?: string }[] | null {
	return reading ? rubySegments(text, jyutpingSyllables(reading)) : null;
}

/** Jyutping → its letters and its tone digits ("nei5 hou2" → neihou, 52). */
export function splitJyutping(s: string): { letters: string; tones: string } {
	let letters = '';
	let tones = '';
	for (const ch of s.normalize('NFKC').toLowerCase()) {
		if (/[1-6]/.test(ch)) tones += ch;
		else if (/[a-z]/.test(ch)) letters += ch;
	}
	return { letters, tones };
}

export interface JyutpingTone {
	tone: number;
	name: string;
	contour: string;
	example: string;
	jyutping: string;
	gloss: string;
}

/** The six tones, on the classic si minimal set. */
export const JYUTPING_TONES: JyutpingTone[] = [
	{ tone: 1, name: 'high level', contour: '55', example: '詩', jyutping: 'si1', gloss: 'poem' },
	{ tone: 2, name: 'high rising', contour: '35', example: '史', jyutping: 'si2', gloss: 'history' },
	{ tone: 3, name: 'mid level', contour: '33', example: '試', jyutping: 'si3', gloss: 'to try' },
	{ tone: 4, name: 'low falling', contour: '21', example: '時', jyutping: 'si4', gloss: 'time' },
	{ tone: 5, name: 'low rising', contour: '23', example: '市', jyutping: 'si5', gloss: 'market' },
	{ tone: 6, name: 'low level', contour: '22', example: '事', jyutping: 'si6', gloss: 'matter' }
];

/**
 * Standard written Chinese (書面語) → colloquial Cantonese (口語), the pairs
 * speech recognition most often writes "properly": Whisper hears 係 and
 * writes 是. Longest first.
 */
const WRITTEN_TO_SPOKEN: [string, string][] = [
	['沒有', '冇'], ['什麼', '乜嘢'], ['東西', '嘢'], ['為什麼', '點解'], ['哪裡', '邊度'], ['這裡', '呢度'], ['那裡', '嗰度'],
	['我們', '我哋'], ['你們', '你哋'], ['他們', '佢哋'], ['現在', '而家'], ['喜歡', '鍾意'], ['睡覺', '瞓覺'], ['謝謝', '多謝'],
	['是', '係'], ['的', '嘅'], ['不', '唔'], ['了', '咗'], ['他', '佢'], ['她', '佢'], ['它', '佢'], ['在', '喺'],
	['看', '睇'], ['吃', '食'], ['喝', '飲'], ['這', '呢'], ['那', '嗰'], ['給', '畀'], ['來', '嚟'], ['說', '講'], ['些', '啲'],
	['啊', '呀'] // a particle recognizers spell either way
];

/**
 * A transcript brought closer to the colloquial target it was meant to say:
 * each written-Chinese word is swapped for its Cantonese one, but only where
 * the target actually uses that Cantonese word (so 是 stays where 是 is meant).
 */
export function colloquialize(transcript: string, target: string): string {
	let out = transcript;
	for (const [written, spoken] of WRITTEN_TO_SPOKEN) {
		if (target.includes(spoken) && out.includes(written)) out = out.split(written).join(spoken);
	}
	return out;
}
