/**
 * Tap-a-word lookup over the sharded dictionaries (dict-shard.ts). Pure apart
 * from the injected shard loader, so it is tested against the real data.
 *
 *  - Chinese: longest dictionary match starting at the tapped character.
 *  - Japanese: the same, also trying every deinflection of each span
 *    (食べました → 食べる), checked against the entry's part of speech.
 *  - Korean: the tapped word; else its inflection (먹었습니다 → 먹다), else
 *    without a trailing particle (학교에서 → 학교) or a common verb ending.
 *  - Hebrew: the tapped word without niqqud; else its inflection (ילדים →
 *    ילד), else with up to three prefix letters peeled (ובבית → בית).
 */

import { isHanLanguage, type HanLanguage, type Language } from './db/types';
import { deinflect, posMatches } from './deinflect-ja';
import { bucketOf, dictKey, type DictEntry, type DictShard } from './dict-shard';

export interface DictHit {
	/** The tapped span of the original text. */
	surface: string;
	/** Where the span starts in the original text. */
	start: number;
	/** The dictionary key that matched (the base form when deinflected). */
	key: string;
	entries: DictEntry[];
	/** How the span relates to the key: "polite · past", "form of 먹다", "ב + בית". */
	note?: string;
}

/** Fetch one shard; null when the language has none for that bucket. */
export type ShardLoader = (language: Language, bucket: number) => Promise<DictShard | null>;

const HAN = /\p{Script=Han}/u;
const JA_CHAR = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々]/u;
const HANGUL = /[가-힣]/;
const HEBREW = /[א-ת֑-ׇ׳״"']/;

const KO_PARTICLES = [
	'에서부터', '으로부터', '에게서', '한테서', '에서는', '에게는', '으로는', '까지는', '부터는', '에서도', '이라고',
	'라고', '처럼', '보다', '까지', '부터', '에서', '에게', '한테', '으로', '이나', '이랑', '하고', '께서', '이에요', '예요',
	'입니다', '은', '는', '이', '가', '을', '를', '에', '의', '로', '와', '과', '도', '만', '랑', '께', '요'
];
const KO_HADA = /(했습니다|했어요|했다|합니다|해요|해서|하고|하면|하는|한|해)$/;
const KO_ENDINGS = [
	'었습니다', '았습니다', '였습니다', '습니다', '었어요', '았어요', '였어요', '었다', '았다', '어요', '아요', '세요',
	'으세요', '지만', '면서', '으면', '면', '는데', '어서', '아서', '고', '네요', '지요', '죠', '겠다'
];
const HE_PREFIX = 'והבכלמש';

export function createLookup(load: ShardLoader) {
	const shards = new Map<string, Promise<DictShard | null>>();
	function shardFor(language: Language, key: string): Promise<DictShard | null> {
		const b = bucketOf(key);
		const id = `${language}/${b}`;
		let p = shards.get(id);
		if (!p) {
			// A failed fetch (offline) is not remembered, so the next tap retries.
			p = load(language, b).catch(() => {
				shards.delete(id);
				return null;
			});
			shards.set(id, p);
		}
		return p;
	}
	async function entries(language: Language, key: string): Promise<DictEntry[] | undefined> {
		if (!key) return undefined;
		return (await shardFor(language, key))?.e[key];
	}
	async function lemmasOf(language: Language, form: string): Promise<string[]> {
		return (await shardFor(language, form))?.f?.[form] ?? [];
	}

	/** Exact entry, else via the inflected-form map. */
	async function viaForms(language: Language, key: string): Promise<{ key: string; entries: DictEntry[]; note?: string } | null> {
		const direct = await entries(language, key);
		if (direct) return { key, entries: direct };
		for (const lemma of await lemmasOf(language, key)) {
			const e = await entries(language, lemma);
			if (e) return { key: lemma, entries: e, note: `form of ${e[0].w}` };
		}
		return null;
	}

	async function lookupCjk(language: HanLanguage, text: string, start: number): Promise<DictHit | null> {
		const ok = language === 'ja' ? JA_CHAR : HAN;
		if (!ok.test(text[start] ?? '')) return null;
		let end = start;
		while (end < text.length && end - start < 12 && ok.test(text[end])) end++;
		for (let len = end - start; len > 0; len--) {
			const surface = text.slice(start, start + len);
			if (language !== 'ja') {
				const e = await entries(language, surface);
				if (e) return { surface, start, key: surface, entries: e };
				continue;
			}
			for (const d of deinflect(surface)) {
				const e = (await entries('ja', d.word))?.filter((x) => posMatches(x.p, d.type));
				if (e?.length) return { surface, start, key: d.word, entries: e, ...(d.reasons.length ? { note: d.reasons.join(' · ') } : {}) };
			}
		}
		return null;
	}

	/** The run of `ok` characters around `index`. */
	function wordAt(text: string, index: number, ok: RegExp): { word: string; start: number } | null {
		if (!ok.test(text[index] ?? '')) return null;
		let s = index;
		let e = index;
		while (s > 0 && ok.test(text[s - 1])) s--;
		while (e < text.length && ok.test(text[e])) e++;
		return { word: text.slice(s, e), start: s };
	}

	async function lookupKo(text: string, index: number): Promise<DictHit | null> {
		const at = wordAt(text, index, HANGUL);
		if (!at) return null;
		const { word, start } = at;
		const tries: [string, string | undefined][] = [[word, undefined]];
		for (const p of KO_PARTICLES) if (word.length > p.length && word.endsWith(p)) tries.push([word.slice(0, -p.length), `${word.slice(0, -p.length)} + ${p}`]);
		if (KO_HADA.test(word)) tries.push([word.replace(KO_HADA, '하다'), undefined]);
		for (const ending of KO_ENDINGS) if (word.length > ending.length && word.endsWith(ending)) tries.push([word.slice(0, -ending.length) + '다', undefined]);
		for (const [key, note] of tries) {
			const hit = await viaForms('ko', key);
			if (hit) return { surface: word, start, ...hit, note: hit.note ?? note ?? (key !== word ? `form of ${hit.entries[0].w}` : undefined) };
		}
		return null;
	}

	async function lookupHe(text: string, index: number): Promise<DictHit | null> {
		const at = wordAt(text, index, HEBREW);
		if (!at) return null;
		// Keys are bare letters (dictKey drops niqqud and gershayim; ASCII quotes stand in for them).
		const key = dictKey(at.word, 'he').replace(/["']/g, '');
		for (let peel = 0; peel <= 3 && key.length - peel >= 2; peel++) {
			if (peel > 0 && !HE_PREFIX.includes(key[peel - 1])) break;
			const hit = await viaForms('he', key.slice(peel));
			if (!hit) continue;
			const note = peel ? [...key.slice(0, peel), hit.key].join(' + ') : hit.note;
			return { surface: at.word, start: at.start, ...hit, note };
		}
		return null;
	}

	return {
		/** The dictionary entry for the word at `index` of `text`, or null. */
		async lookupAt(language: Language, text: string, index: number): Promise<DictHit | null> {
			const t = text.normalize('NFC');
			if (isHanLanguage(language)) return lookupCjk(language, t, index);
			if (language === 'ko') return lookupKo(t, index);
			return lookupHe(t, index);
		},
		/** Whole-text segmentation into dictionary words (Chinese / Cantonese / Japanese readings for pasted text). */
		async segment(language: HanLanguage, text: string): Promise<{ text: string; hit: DictHit | null }[]> {
			const out: { text: string; hit: DictHit | null }[] = [];
			let i = 0;
			while (i < text.length) {
				const hit = await lookupCjk(language, text, i);
				const len = hit?.surface.length ?? 1;
				out.push({ text: text.slice(i, i + len), hit });
				i += len;
			}
			return out;
		}
	};
}

export type Lookup = ReturnType<typeof createLookup>;
