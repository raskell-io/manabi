/**
 * Pinyin → Zhuyin (bopomofo, 注音符號), the reading aid Taiwanese learners
 * use. Readings stay stored as tone-marked pinyin; this is a display option.
 *
 * Words like "jīntiān" carry no syllable breaks, so each word is segmented
 * against the table of standard Mandarin syllables (fewest syllables wins, at
 * most one tone mark per syllable; an apostrophe — Xī'ān — forces a break).
 * A syllable without a tone mark is neutral (˙ before it), erhua "r" becomes
 * ㄦ, and anything that doesn't segment (KTV, punctuation) is kept as is.
 */

const INITIALS: Record<string, string> = {
	b: 'ㄅ', p: 'ㄆ', m: 'ㄇ', f: 'ㄈ', d: 'ㄉ', t: 'ㄊ', n: 'ㄋ', l: 'ㄌ',
	g: 'ㄍ', k: 'ㄎ', h: 'ㄏ', j: 'ㄐ', q: 'ㄑ', x: 'ㄒ',
	zh: 'ㄓ', ch: 'ㄔ', sh: 'ㄕ', r: 'ㄖ', z: 'ㄗ', c: 'ㄘ', s: 'ㄙ'
};

const FINALS: Record<string, string> = {
	a: 'ㄚ', o: 'ㄛ', e: 'ㄜ', ê: 'ㄝ', ai: 'ㄞ', ei: 'ㄟ', ao: 'ㄠ', ou: 'ㄡ',
	an: 'ㄢ', en: 'ㄣ', ang: 'ㄤ', eng: 'ㄥ', ong: 'ㄨㄥ', er: 'ㄦ',
	i: 'ㄧ', ia: 'ㄧㄚ', io: 'ㄧㄛ', ie: 'ㄧㄝ', iao: 'ㄧㄠ', iu: 'ㄧㄡ', ian: 'ㄧㄢ', in: 'ㄧㄣ',
	iang: 'ㄧㄤ', ing: 'ㄧㄥ', iong: 'ㄩㄥ',
	u: 'ㄨ', ua: 'ㄨㄚ', uo: 'ㄨㄛ', uai: 'ㄨㄞ', ui: 'ㄨㄟ', uan: 'ㄨㄢ', un: 'ㄨㄣ', uang: 'ㄨㄤ',
	ü: 'ㄩ', üe: 'ㄩㄝ', üan: 'ㄩㄢ', ün: 'ㄩㄣ', ue: 'ㄩㄝ'
};

/** y-/w- spellings of the zero-initial syllables. */
const ZERO_INITIAL: Record<string, string> = {
	yi: 'ㄧ', ya: 'ㄧㄚ', yo: 'ㄧㄛ', ye: 'ㄧㄝ', yao: 'ㄧㄠ', you: 'ㄧㄡ', yan: 'ㄧㄢ', yin: 'ㄧㄣ',
	yang: 'ㄧㄤ', ying: 'ㄧㄥ', yong: 'ㄩㄥ', yu: 'ㄩ', yue: 'ㄩㄝ', yuan: 'ㄩㄢ', yun: 'ㄩㄣ',
	wu: 'ㄨ', wa: 'ㄨㄚ', wo: 'ㄨㄛ', wai: 'ㄨㄞ', wei: 'ㄨㄟ', wan: 'ㄨㄢ', wen: 'ㄨㄣ', wang: 'ㄨㄤ', weng: 'ㄨㄥ'
};

/** Every standard syllable, by initial (finals listed as spelled after it). */
const SYLLABLES_BY_INITIAL: Record<string, string> = {
	'': 'a o e ê ai ei ao ou an en ang eng er',
	b: 'a o ai ei ao an en ang eng i ie iao ian in ing u',
	p: 'a o ai ei ao ou an en ang eng i ie iao ian in ing u',
	m: 'a o e ai ei ao ou an en ang eng i ie iao iu ian in ing u',
	f: 'a o ei ou an en ang eng u',
	d: 'a e ai ei ao ou an en ang eng ong i ia ie iao iu ian ing u uo ui uan un',
	t: 'a e ai ei ao ou an ang eng ong i ie iao ian ing u uo ui uan un',
	n: 'a e ai ei ao ou an en ang eng ong i ie iao iu ian in iang ing u uo uan ü üe ue',
	l: 'a o e ai ei ao ou an ang eng ong i ia ie iao iu ian in iang ing u uo uan un ü üe ue',
	g: 'a e ai ei ao ou an en ang eng ong u ua uo uai ui uan un uang',
	k: 'a e ai ei ao ou an en ang eng ong u ua uo uai ui uan un uang',
	h: 'a e ai ei ao ou an en ang eng ong u ua uo uai ui uan un uang',
	j: 'i ia ie iao iu ian in iang ing iong u ue uan un',
	q: 'i ia ie iao iu ian in iang ing iong u ue uan un',
	x: 'i ia ie iao iu ian in iang ing iong u ue uan un',
	zh: 'a e i ai ei ao ou an en ang eng ong u ua uo uai ui uan un uang',
	ch: 'a e i ai ao ou an en ang eng ong u ua uo uai ui uan un uang',
	sh: 'a e i ai ei ao ou an en ang eng u ua uo uai ui uan un uang',
	r: 'e i ao ou an en ang eng ong u ua uo ui uan un',
	z: 'a e i ai ei ao ou an en ang eng ong u uo ui uan un',
	c: 'a e i ai ao ou an en ang eng ong u uo ui uan un',
	s: 'a e i ai ao ou an en ang eng ong u uo ui uan un'
};

const APICAL = new Set(['zh', 'ch', 'sh', 'r', 'z', 'c', 's']);
const PALATAL = new Set(['j', 'q', 'x']);

/** Plain syllable → its bopomofo (no tone). */
const SYLLABLE_ZHUYIN = new Map<string, string>(Object.entries(ZERO_INITIAL));
for (const [initial, finals] of Object.entries(SYLLABLES_BY_INITIAL)) {
	for (const final of finals.split(' ')) {
		let bopo: string;
		if (APICAL.has(initial) && final === 'i') bopo = INITIALS[initial]; // zhi, si: the initial alone
		else if (PALATAL.has(initial) && final.startsWith('u')) bopo = INITIALS[initial] + FINALS['ü' + final.slice(1)];
		else bopo = (INITIALS[initial] ?? '') + FINALS[final];
		SYLLABLE_ZHUYIN.set(initial + final, bopo);
	}
}
const MAX_SYLLABLE = Math.max(...[...SYLLABLE_ZHUYIN.keys()].map((s) => s.length));

const TONED: Record<string, [string, number]> = {};
for (const [base, marks] of Object.entries({ a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', ü: 'ǖǘǚǜ' })) {
	[...marks].forEach((m, i) => (TONED[m] = [base, i + 1]));
}

const TONE_MARK = ['', '', 'ˊ', 'ˇ', 'ˋ'];

/** A word of pinyin letters (tone marks allowed), apostrophes allowed between syllables. */
const WORD = /[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜê]+(?:['’][a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜê]+)*/g;

interface Syllable {
	/** The syllable as written in the pinyin (tone mark kept); "r" for erhua. */
	pinyin: string;
	zhuyin: string;
}

/** Segment one apostrophe-free chunk (`lower` is it lowercased); null when it isn't pinyin. */
function segment(chunk: string, lower: string): Syllable[] | null {
	// Strip tones: plain letters + the tone (0 = none) at each position.
	const chars = [...chunk];
	const plain: string[] = [];
	const tones: number[] = [];
	for (const ch of lower) {
		const t = TONED[ch];
		plain.push(t ? t[0] : ch === 'v' ? 'ü' : ch);
		tones.push(t ? t[1] : 0);
	}
	const n = plain.length;
	// best[i] = cheapest segmentation of plain[0..i): [cost, previous cut, piece].
	const best: ([number, number, string] | null)[] = Array(n + 1).fill(null);
	best[0] = [0, -1, ''];
	for (let i = 0; i < n; i++) {
		if (!best[i]) continue;
		for (let len = 1; len <= MAX_SYLLABLE && i + len <= n; len++) {
			const piece = plain.slice(i, i + len).join('');
			const erhua = piece === 'r' && i > 0;
			if (!erhua && !SYLLABLE_ZHUYIN.has(piece)) continue;
			const marked = tones.slice(i, i + len).filter(Boolean);
			if (marked.length > 1 || (erhua && marked.length)) continue;
			// Pinyin needs an apostrophe before an a/o/e syllable mid-word, so on a
			// tie prefer the split that doesn't start one there (dàngāo: dan·gao).
			const vowelStart = i > 0 && /^[aoeê]/.test(piece);
			const cost = best[i]![0] + (erhua ? 1.5 : 1) + (vowelStart ? 0.01 : 0);
			if (!best[i + len] || cost < best[i + len]![0]) best[i + len] = [cost, i, piece];
		}
	}
	if (!best[n]) return null;
	const out: Syllable[] = [];
	for (let i = n; i > 0; i = best[i]![1]) {
		const [, from, piece] = best[i]!;
		const pinyin = chars.slice(from, i).join('');
		if (piece === 'r') {
			out.unshift({ pinyin, zhuyin: 'ㄦ' });
			continue;
		}
		const tone = tones.slice(from, i).find(Boolean) ?? 0;
		const bopo = SYLLABLE_ZHUYIN.get(piece)!;
		out.unshift({ pinyin, zhuyin: tone === 0 ? '˙' + bopo : bopo + TONE_MARK[tone] });
	}
	return out;
}

/** The syllables of one pinyin word (may contain apostrophes); null when it isn't pinyin. */
function wordSyllables(word: string): Syllable[] | null {
	const parts: Syllable[] = [];
	for (const chunk of word.split(/['’]/)) {
		const syllables = segment(chunk, chunk.toLowerCase());
		if (!syllables) return null;
		parts.push(...syllables);
	}
	return parts;
}

/** Convert one pinyin word to Zhuyin; null when it isn't pinyin. */
function convertWord(word: string): string | null {
	const parts = wordSyllables(word)?.map((s) => s.zhuyin);
	// Erhua attaches to the syllable before it (ㄋㄚˇㄦ), as in print.
	return parts ? parts.reduce((s, p, i) => (i === 0 ? p : p === 'ㄦ' ? s + p : `${s} ${p}`), '') : null;
}

/**
 * A reading split into syllables, one per hanzi — pinyin as written or
 * Zhuyin; erhua is its own syllable (it has its own 儿). Null when part of
 * it isn't pinyin.
 */
export function readingSyllables(reading: string, mode: 'pinyin' | 'zhuyin'): string[] | null {
	const out: string[] = [];
	const text = reading.normalize('NFC').replace(/(\p{L}) r(?=\P{L}|$)/gu, '$1r');
	for (const token of text.split(/\s+/).filter(Boolean)) {
		const words = token.match(new RegExp(WORD.source, 'gi'));
		if (!words) {
			if (/\p{L}/u.test(token)) return null;
			continue;
		}
		for (const w of words) {
			const syl = wordSyllables(w);
			if (!syl) return null;
			out.push(...syl.map((s) => (mode === 'zhuyin' ? s.zhuyin : s.pinyin)));
		}
	}
	return out;
}

/** Ruby segments for `text`: each hanzi paired with its syllable. Null when they don't line up. */
export function rubySegments(text: string, syllables: string[] | null): { text: string; rt?: string }[] | null {
	if (!syllables) return null;
	const chars = [...text];
	const han = chars.filter((c) => /\p{Script=Han}/u.test(c)).length;
	if (han === 0 || han !== syllables.length) return null;
	let k = 0;
	return chars.map((c) => (/\p{Script=Han}/u.test(c) ? { text: c, rt: syllables[k++] } : { text: c }));
}

const memo = new Map<string, string>();

/** Tone-marked pinyin text → Zhuyin; non-pinyin runs (punctuation, Latin words) pass through. */
export function pinyinToZhuyin(text: string): string {
	let out = memo.get(text);
	if (out !== undefined) return out;
	out = text
		.normalize('NFC')
		// Erhua written as its own token (wán r, as in the HSK lists) joins its syllable.
		.replace(/(\p{L}) r(?=\P{L}|$)/gu, '$1r')
		.replace(/\S+/g, (token) => {
			const lower = token.toLowerCase();
			const converted = lower.replace(WORD, (word) => convertWord(word) ?? word);
			return converted === lower ? token : converted; // untouched: keep the original casing
		});
	if (memo.size > 20000) memo.clear();
	memo.set(text, out);
	return out;
}
