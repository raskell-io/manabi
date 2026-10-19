/**
 * The app's dictionary: tap-a-word lookup (lookup.ts) over the shards in
 * static/dict, fetched on first use and then cached by the service worker.
 */

import { base } from '$app/paths';
import type { Language } from './db/types';
import type { DictManifest, DictShard } from './dict-shard';
import { createLookup } from './lookup';

let manifest: Promise<DictManifest | null> | null = null;
function getManifest(): Promise<DictManifest | null> {
	manifest ??= fetch(`${base}/dict/index.json`)
		.then((r) => (r.ok ? (r.json() as Promise<DictManifest>) : null))
		.catch(() => {
			manifest = null; // offline: try again next time
			return null;
		});
	return manifest;
}

export const dictionary = createLookup(async (language: Language, bucket: number): Promise<DictShard | null> => {
	const m = await getManifest();
	if (!m) throw new Error('dictionary unavailable');
	if (!m[language]?.buckets.includes(bucket)) return null;
	const r = await fetch(`${base}/dict/${language}/${bucket}.json`);
	if (!r.ok) throw new Error(`dictionary shard ${r.status}`);
	return (await r.json()) as DictShard;
});

/** Attribution line for a language's dictionary. */
export const DICT_CREDIT: Record<Language, string> = {
	zh: 'CC-CEDICT (MDBG), CC BY-SA 4.0',
	yue: 'CC-Canto (Pleco) and CC-CEDICT, CC BY-SA 3.0 / 4.0',
	ja: 'JMdict (EDRDG), CC BY-SA 4.0',
	ko: 'English Wiktionary via kaikki.org, CC BY-SA 4.0',
	he: 'English Wiktionary via kaikki.org, CC BY-SA 4.0'
};
