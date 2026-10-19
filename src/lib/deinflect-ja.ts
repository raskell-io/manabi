/**
 * Japanese deinflection: map a conjugated form back to the dictionary forms
 * it could come from (食べました → 食べる, 行った → 行く, 高くなかった → 高い),
 * so tap-to-look-up finds the word. Written for Manabi from the standard
 * conjugation tables; each candidate carries the word class it must be, which
 * the lookup checks against JMdict's part-of-speech codes.
 *
 * Rules apply repeatedly (ました → ます → る), each step narrowing the class:
 * a rule `from → to` applies when the word ends in `from` and its current
 * class allows `when`; the result is of class `then`.
 */

export const V1 = 1; // ichidan (食べる)
export const V5 = 2; // godan (書く)
export const VS = 4; // する verbs (and nouns taking する)
export const VK = 8; // 来る
export const ADJ = 16; // い-adjectives — and ない / たい, which conjugate like them
const MASU = 32; // a ます form, before it becomes the plain verb
const TE = 64; // a て form
const NOUN_VS = 128; // a noun that takes する (勉強 from 勉強する)
const ANY = 0xff;

interface Rule {
	from: string;
	to: string;
	when: number;
	then: number;
	reason: string;
}

const rules: Rule[] = [];
const rule = (from: string, to: string, when: number, then: number, reason: string) =>
	rules.push({ from, to, when, then, reason });

// 行く is irregular in the past and te-form — and far more common than 行う,
// so it is tried first for 行った.
rule('った', 'く', ANY, V5, 'past');
rule('って', 'く', TE, V5, 'te-form');

// Godan rows: dictionary ending → [a, i, e, o, past, te] stems.
const GODAN: Record<string, [string, string, string, string, string, string]> = {
	う: ['わ', 'い', 'え', 'お', 'った', 'って'],
	く: ['か', 'き', 'け', 'こ', 'いた', 'いて'],
	ぐ: ['が', 'ぎ', 'げ', 'ご', 'いだ', 'いで'],
	す: ['さ', 'し', 'せ', 'そ', 'した', 'して'],
	つ: ['た', 'ち', 'て', 'と', 'った', 'って'],
	ぬ: ['な', 'に', 'ね', 'の', 'んだ', 'んで'],
	ぶ: ['ば', 'び', 'べ', 'ぼ', 'んだ', 'んで'],
	む: ['ま', 'み', 'め', 'も', 'んだ', 'んで'],
	る: ['ら', 'り', 'れ', 'ろ', 'った', 'って']
};
for (const [u, [a, i, e, o, ta, te]] of Object.entries(GODAN)) {
	rule(a + 'ない', u, ADJ, V5, 'negative');
	rule(a + 'れる', u, V1, V5, 'passive');
	rule(a + 'せる', u, V1, V5, 'causative');
	rule(i + 'ます', u, MASU, V5, 'polite');
	rule(i + 'たい', u, ADJ, V5, 'want to');
	rule(i + 'ながら', u, ANY, V5, 'while');
	rule(i + 'に', u, ANY, V5, 'to (do)');
	rule(i, u, ANY, V5, 'stem');
	rule(e + 'る', u, V1, V5, 'potential');
	rule(e + 'ば', u, ANY, V5, 'if');
	rule(e, u, ANY, V5, 'imperative');
	rule(o + 'う', u, ANY, V5, 'volitional');
	rule(ta, u, ANY, V5, 'past');
	rule(te, u, TE, V5, 'te-form');
}

// Ichidan.
rule('ない', 'る', ADJ, V1, 'negative');
rule('ます', 'る', MASU, V1, 'polite');
rule('た', 'る', ANY, V1, 'past');
rule('て', 'る', TE, V1, 'te-form');
rule('られる', 'る', V1, V1, 'passive / potential');
rule('させる', 'る', V1, V1, 'causative');
rule('よう', 'る', ANY, V1, 'volitional');
rule('ろ', 'る', ANY, V1, 'imperative');
rule('れば', 'る', ANY, V1, 'if');
rule('たい', 'る', ADJ, V1, 'want to');
rule('ながら', 'る', ANY, V1, 'while');
rule('に', 'る', ANY, V1, 'to (do)');

// する.
for (const [from, when, reason] of [
	['しない', ADJ, 'negative'], ['します', MASU, 'polite'], ['した', ANY, 'past'], ['して', TE, 'te-form'],
	['される', V1, 'passive'], ['させる', V1, 'causative'], ['できる', V1, 'potential'], ['しよう', ANY, 'volitional'],
	['しろ', ANY, 'imperative'], ['すれば', ANY, 'if'], ['したい', ADJ, 'want to'], ['しながら', ANY, 'while']
] as const) rule(from, 'する', when, VS, reason);
rule('する', '', VS, NOUN_VS, 'する verb');

// 来る, in kana and with the kanji.
for (const [ko, ki, ku] of [['こ', 'き', 'く'], ['来', '来', '来']]) {
	for (const [from, when, reason] of [
		[ko + 'ない', ADJ, 'negative'], [ki + 'ます', MASU, 'polite'], [ki + 'た', ANY, 'past'], [ki + 'て', TE, 'te-form'],
		[ko + 'られる', V1, 'passive / potential'], [ko + 'させる', V1, 'causative'], [ko + 'よう', ANY, 'volitional'],
		[ko + 'い', ANY, 'imperative'], [ku + 'れば', ANY, 'if'], [ki + 'たい', ADJ, 'want to']
	] as const) rule(from, ku + 'る', when, VK, reason);
}

// い-adjectives (and ない / たい forms, which conjugate the same way).
rule('くない', 'い', ADJ, ADJ, 'negative');
rule('かった', 'い', ANY, ADJ, 'past');
rule('くて', 'い', ANY, ADJ, 'te-form');
rule('ければ', 'い', ANY, ADJ, 'if');
rule('く', 'い', ANY, ADJ, 'adverb');
rule('さ', 'い', ANY, ADJ, 'noun');
rule('そう', 'い', ANY, ADJ, 'looks');
rule('ないで', 'ない', ANY, ADJ, 'without');

// ます forms.
rule('ました', 'ます', ANY, MASU, 'past');
rule('ません', 'ます', ANY, MASU, 'negative');
rule('ませんでした', 'ます', ANY, MASU, 'past negative');
rule('ましょう', 'ます', ANY, MASU, 'volitional');
rule('まして', 'ます', ANY, MASU, 'te-form');

// Auxiliaries after the て form.
rule('ている', 'て', V1, TE, 'progressive');
rule('でいる', 'で', V1, TE, 'progressive');
rule('てる', 'て', V1, TE, 'progressive');
rule('でる', 'で', V1, TE, 'progressive');
rule('てしまう', 'て', V5, TE, 'completely');
rule('ちゃう', 'て', V5, TE, 'completely');
rule('じゃう', 'で', V5, TE, 'completely');
rule('たら', 'た', ANY, ANY, 'if / when');
rule('だら', 'だ', ANY, ANY, 'if / when');
rule('たり', 'た', ANY, ANY, '-tari');
rule('だり', 'だ', ANY, ANY, '-tari');

export interface Deinflection {
	word: string;
	/** Word classes the dictionary entry must have (0 = no rule applied). */
	type: number;
	/** Rules applied, innermost first ("polite", "past" for 食べました). */
	reasons: string[];
}

/** Every dictionary form `text` could be an inflection of, including itself. */
export function deinflect(text: string): Deinflection[] {
	const out: Deinflection[] = [{ word: text, type: ANY, reasons: [] }];
	const seen = new Map<string, number>([[text, ANY]]);
	for (let i = 0; i < out.length && out.length < 200; i++) {
		const { word, type, reasons } = out[i];
		for (const r of rules) {
			if (!(type & r.when) || !word.endsWith(r.from)) continue;
			const next = word.slice(0, word.length - r.from.length) + r.to;
			if (!next || (seen.get(next) ?? 0) & r.then) continue;
			seen.set(next, (seen.get(next) ?? 0) | r.then);
			out.push({ word: next, type: r.then, reasons: [...reasons, r.reason] });
		}
	}
	return out.map((d, i) => (i === 0 ? { ...d, type: 0 } : { ...d, reasons: [...d.reasons].reverse() }));
}

/** Does a JMdict part-of-speech list fit a deinflected word class? */
export function posMatches(pos: string | undefined, type: number): boolean {
	if (type === 0) return true;
	const codes = (pos ?? '').split(',');
	return (
		(!!(type & V1) && codes.some((c) => c.startsWith('v1'))) ||
		(!!(type & V5) && codes.some((c) => c.startsWith('v5'))) ||
		(!!(type & VS) && codes.some((c) => c === 'vs-i' || c === 'vs-s')) ||
		(!!(type & NOUN_VS) && codes.includes('vs')) ||
		(!!(type & VK) && codes.includes('vk')) ||
		(!!(type & ADJ) && codes.includes('adj-i'))
	);
}
