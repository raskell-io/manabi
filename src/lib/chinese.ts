/**
 * Chinese script option — Simplified (the stored form) or Traditional as
 * written in Taiwan or Hong Kong. Content stays Simplified in the document;
 * Traditional is a display conversion, so SRS progress, audio and seeds are
 * shared whichever script the learner reads.
 *
 * Conversion is OpenCC (opencc-js), phrase-level so one-to-many characters
 * resolve by context (头发 → 頭髮, 发展 → 發展, 面条 → 麵條). It converts
 * characters only — never vocabulary (软件 stays 軟件, not 軟體) — so the
 * displayed word always matches its pinyin and audio. The dictionaries are
 * ~1 MB, so they load lazily, only once a Traditional script is picked.
 *
 * Readings are likewise stored as pinyin and can be shown as Zhuyin
 * (bopomofo), independently of the script.
 */

import { derived, writable, type Readable } from 'svelte/store';
import type { Language } from './db/types';
import { pinyinToZhuyin, readingSyllables, rubySegments } from './zhuyin';

export type ZhScript = 'simplified' | 'traditional-tw' | 'traditional-hk';

export const ZH_SCRIPTS: { value: ZhScript; native: string; label: string }[] = [
	{ value: 'simplified', native: '简体', label: 'Simplified' },
	{ value: 'traditional-tw', native: '繁體', label: 'Traditional · Taiwan' },
	{ value: 'traditional-hk', native: '繁體', label: 'Traditional · Hong Kong' }
];

/** BCP 47 tag, so the browser picks the regional glyph forms (e.g. 着 / 著, 戶 / 户). */
export function zhLangTag(script: ZhScript): string {
	return script === 'traditional-tw' ? 'zh-Hant-TW' : script === 'traditional-hk' ? 'zh-Hant-HK' : 'zh-Hans';
}

/** The `lang` attribute for script text in any language. */
export function scriptLangTag(language: Language, script: ZhScript): string {
	return language === 'zh' ? zhLangTag(script) : language;
}

export type Convert = (text: string) => string;
const identity: Convert = (text) => text;

/** OpenCC target locale per script. */
const OPENCC_TO: Record<Exclude<ZhScript, 'simplified'>, 'tw' | 'hk'> = {
	'traditional-tw': 'tw',
	'traditional-hk': 'hk'
};

const active = writable<{ script: ZhScript; convert: Convert }>({ script: 'simplified', convert: identity });
const loading = new Map<ZhScript, Promise<Convert>>();

function build(script: ZhScript): Promise<Convert> {
	if (script === 'simplified') return Promise.resolve(identity);
	let p = loading.get(script);
	if (!p) {
		p = import('opencc-js/cn2t').then((OpenCC) => {
			const raw = OpenCC.Converter({ from: 'cn', to: OPENCC_TO[script] });
			const memo = new Map<string, string>();
			return (text: string) => {
				let out = memo.get(text);
				if (out === undefined) {
					out = raw(text);
					if (memo.size > 20000) memo.clear();
					memo.set(text, out);
				}
				return out;
			};
		});
		loading.set(script, p);
		// A failed load (offline before the chunk was cached) may be retried later.
		p.catch(() => loading.delete(script));
	}
	return p;
}

/**
 * Switch the display script. Resolves once the converter is ready; until then
 * text keeps rendering in Simplified. A failed load leaves Simplified on.
 */
export async function setZhScript(script: ZhScript): Promise<void> {
	try {
		const convert = await build(script);
		active.set({ script, convert });
	} catch (err) {
		console.error('Failed to load the Traditional Chinese converter:', err);
		active.set({ script: 'simplified', convert: identity });
	}
}

/** The script currently rendered (lags the setting while the converter loads). */
export const zhScript: Readable<ZhScript> = derived(active, ($a) => $a.script);


/** Convert text in `language` for display (non-Chinese text passes through). */
export function displayText(text: string, language: Language, convert: Convert): string {
	return language === 'zh' ? convert(text) : text;
}

export type ZhReading = 'pinyin' | 'zhuyin';

export const ZH_READINGS: { value: ZhReading; native: string; label: string }[] = [
	{ value: 'pinyin', native: 'pīnyīn', label: 'Pinyin' },
	{ value: 'zhuyin', native: 'ㄅㄆㄇ', label: 'Zhuyin (bopomofo)' }
];

/**
 * An item's own regional forms, where character conversion isn't enough: a
 * one-to-many character on its own (干 → 乾 or 幹), or Taiwan vocabulary and
 * readings (软件 → 軟體, 垃圾 lèsè).
 */
export interface ZhVariants {
	tw?: string;
	hk?: string;
	twReading?: string;
	[key: string]: unknown;
}

const variants = writable<Map<string, ZhVariants>>(new Map());
let variantsKey = '';

/** Register every Chinese item's variants (layout effect over all items). */
export function setZhVariants(items: { language: Language; target: string; zhVariants?: ZhVariants }[]): void {
	const list = items.filter((it) => it.language === 'zh' && it.zhVariants).map((it) => [it.target, it.zhVariants!] as const);
	const key = JSON.stringify(list);
	if (key === variantsKey) return;
	variantsKey = key;
	variants.set(new Map(list));
}

const readingMode = writable<ZhReading>('pinyin');
/** Follow the reading-aid setting (layout effect). */
export function setZhReadingMode(mode: ZhReading): void {
	readingMode.set(mode);
}

const ruby = writable(false);
/** Follow the reading-above-characters setting (layout effect). */
export function setZhRuby(on: boolean): void {
	ruby.set(on);
}

/** Simplified → the rendered script, preferring an item's own regional form. Identity for Simplified. */
export const toZhScript: Readable<Convert> = derived([active, variants], ([$a, $v]) => {
	if ($a.script === 'simplified') return identity;
	const tw = $a.script === 'traditional-tw';
	return (text: string) => {
		const v = $v.get(text);
		return (tw ? v?.tw : v?.hk) || $a.convert(text);
	};
});

const HAN = /\p{Script=Han}/u;

/**
 * A reading for display: the item's Taiwan reading when reading Taiwan
 * Traditional, as Zhuyin when picked — for Chinese written in hanzi
 * (`target` is what the reading belongs to: bopomofo glyphs and the pinyin
 * tone drill keep their pinyin).
 */
export const readingOf: Readable<(reading: string, target: string, language: Language) => string> = derived(
	[active, variants, readingMode],
	([$a, $v, $mode]) =>
		(reading: string, target: string, language: Language) => {
			if (language !== 'zh' || !HAN.test(target)) return reading;
			const r = ($a.script === 'traditional-tw' && $v.get(target)?.twReading) || reading;
			return $mode === 'zhuyin' ? pinyinToZhuyin(r) : r;
		}
);

/**
 * Ruby for Chinese text with a known reading (each hanzi with its syllable
 * above), when that option is on and the syllables line up; else null.
 */
export const rubyOf: Readable<(text: string, reading: string | undefined) => { text: string; rt?: string }[] | null> = derived(
	[active, variants, readingMode, ruby, toZhScript],
	([$a, $v, $mode, $ruby, $convert]) =>
		(text: string, reading: string | undefined) => {
			if (!$ruby || !reading) return null;
			const r = ($a.script === 'traditional-tw' && $v.get(text)?.twReading) || reading;
			return rubySegments($convert(text), readingSyllables(r, $mode));
		}
);
