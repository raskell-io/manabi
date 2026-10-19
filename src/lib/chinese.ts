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

 */

import { derived, writable, type Readable } from 'svelte/store';
import type { Language } from './db/types';

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

/** Simplified → the rendered script. Identity for Simplified. */
export const toZhScript: Readable<Convert> = derived(active, ($a) => $a.convert);

/** Convert text in `language` for display (non-Chinese text passes through). */
export function displayText(text: string, language: Language, convert: Convert): string {
	return language === 'zh' ? convert(text) : text;
}
