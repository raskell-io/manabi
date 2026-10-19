/**
 * Cleaning up what on-device Whisper heard, before it is scored: Whisper
 * hallucinates stock phrases on short or silent clips ("thanks for
 * watching"), and writes Chinese in either script.
 */

import type { Language } from '$lib/db/types';

/** Subtitle-credit lines Whisper is known to invent on near-silent audio. */
const HALLUCINATIONS = [
	/谢谢(大家)?(观看|收看)/,
	/謝謝(大家)?(觀看|收看)/,
	/(字幕|訂閱|订阅|点赞|點贊|打赏|打賞)/,
	/ご視聴(ありがとうございました)?/,
	/チャンネル登録/,
	/(시청|구독)해\s*주셔서\s*감사합니다/,
	/MBC\s*뉴스/,
	/תודה\s+(רבה\s+)?(שצפיתם|על\s+הצפייה)/,
	/thank(s| you) for watching/i,
	/please subscribe/i
];

/** Drop a transcript that is only a known hallucination; trim the rest. */
export function cleanTranscript(text: string): string {
	const t = text.trim();
	return HALLUCINATIONS.some((re) => re.test(t)) ? '' : t;
}

/**
 * Whisper's language names (transformers.js accepts these or ISO codes).
 * Only large-v3 knows Cantonese as its own language; base and small take it as
 * Chinese.
 */
export const WHISPER_LANGUAGE: Record<Language, string> = {
	zh: 'chinese',
	yue: 'chinese',
	ja: 'japanese',
	ko: 'korean',
	he: 'hebrew'
};

/** Token budget for a clip: short answers should never run on for long. */
export function maxTokensFor(seconds: number): number {
	return Math.min(96, Math.max(8, Math.round(seconds * 6) + 8));
}
