/**
 * The pure parts of on-device Hebrew diacritization with Dicta's
 * DictaBERT-large-char-menaked (CC BY 4.0): its character-level tokenizer and
 * turning the model's per-character classes back into pointed text. Ported
 * from the model's BertForDiacritization.predict; the ONNX session lives in
 * inference/providers/niqqud-local.ts.
 */

/** Nikud class per index of the `nikud_logits` output (the model's config.nikud_classes). */
const MAT_LECT = '<MAT_LECT>';

export const NIKUD_CLASSES = [
	'', MAT_LECT, 'ּ', 'ְ', 'ֱ', 'ֲ', 'ֳ', 'ִ', 'ֵ', 'ֶ', 'ַ', 'ָ', 'ֹ', 'ֺ', 'ֻ',
	'ְּ', 'ֱּ', 'ֲּ', 'ֳּ', 'ִּ', 'ֵּ', 'ֶּ', 'ַּ', 'ָּ',
	'ֹּ', 'ֺּ', 'ֻּ', 'ׇ', 'ׇּ'
];
/** Shin dot / sin dot, per index of `shin_logits`. */
export const SHIN_CLASSES = ['ׁ', 'ׂ'];

const CLS = 1;
const SEP = 2;
const UNK = 0;
/** The longest input the model takes (2048 positions, minus [CLS] and [SEP]). */
export const MAX_CHARS = 2046;

const NIKUD = /[ְ-ׇֽׁׂ]/g;

/** Text without any vowel points, shin/sin dots or dagesh. */
export function removeNikud(text: string): string {
	return text.replace(NIKUD, '');
}

/** The tokenizer's normalization of one character (NFKC, lowercase, no accents). */
function normalizeChar(c: string): string {
	return c.normalize('NFKC').toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '');
}

/**
 * Token ids for `text`: one per character (the tokenizer is character-level),
 * between [CLS] and [SEP]; anything not in the vocabulary is [UNK].
 */
export function tokenize(text: string, vocab: Record<string, number>): number[] {
	const ids = [CLS];
	for (const c of text) ids.push(vocab[normalizeChar(c)] ?? UNK);
	ids.push(SEP);
	return ids;
}

/**
 * Pointed text from the predicted classes. `nikud[i]` / `shin[i]` belong to
 * character `i` of `text` (token i + 1). Matres lectionis (a vowel letter the
 * model would drop in "ktiv haser" spelling) keep their letter, unpointed, so
 * the consonantal text never changes. The result is NFC, so marks sit in the
 * canonical order the rest of Manabi's Hebrew uses (vowel before shin dot).
 */
export function applyNikud(text: string, nikud: ArrayLike<number>, shin: ArrayLike<number>): string {
	let out = '';
	let i = 0;
	for (const c of text) {
		if (c >= 'א' && c <= 'ת') {
			let mark = NIKUD_CLASSES[nikud[i]] ?? '';
			if (mark === MAT_LECT) mark = '';
			out += c + (c === 'ש' ? SHIN_CLASSES[shin[i]] ?? '' : '') + mark;
		} else {
			out += c;
		}
		i++;
	}
	return out.normalize('NFC');
}

/** Index of the largest of each `width`-long row of `logits`, skipping the first row ([CLS]). */
export function argmaxRows(logits: Float32Array, width: number, rows: number): Int32Array {
	const out = new Int32Array(rows);
	for (let r = 0; r < rows; r++) {
		const base = (r + 1) * width;
		let best = 0;
		for (let k = 1; k < width; k++) if (logits[base + k] > logits[base + best]) best = k;
		out[r] = best;
	}
	return out;
}
