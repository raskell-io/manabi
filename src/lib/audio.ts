/**
 * Audio helpers: play prerecorded pronunciation, fall back to synthesis.
 *
 * Primary path is PRERECORDED audio packs (AAC sprites generated offline by
 * tools/gen-audio.py). Cloudflare Pages caps a deployment at 20k files, so the
 * ~20k clips are bundled into a few hundred `.m4a` packs; per-language manifests
 * map text → { pack, startSec, durSec } and we play the slice by seeking an
 * <audio> element (HTTP Range) and pausing at the clip's end. Works with no
 * in-browser TTS at all. Synthesis (local MMS / OpenAI) is only a last resort.
 */

import { base } from '$app/paths';
import type { Language, ManabiSettings } from '$lib/db/types';
import { getBlobUrl, hasBlob, storeBlob } from '$lib/db/blob-store';
import { synthesize } from '$lib/inference/router';

// --- Prerecorded audio packs ------------------------------------------------

/** A clip's location within a pack: pack file, start (s), duration (s). */
export type PackEntry = { p: string; s: number; d: number };
/** One language's manifest: exact text → pack entry. */
export type LangManifest = Record<string, PackEntry>;

const manifestCache = new Map<Language, Promise<LangManifest>>();

/** Load (and cache) the prerecorded-audio manifest for one language. */
export function loadAudioManifest(language: Language): Promise<LangManifest> {
	let p = manifestCache.get(language);
	if (!p) {
		p = fetch(`${base}/audio/manifest-${language}.json`)
			.then((r) => (r.ok ? (r.json() as Promise<LangManifest>) : {}))
			.catch(() => ({}));
		manifestCache.set(language, p);
	}
	return p;
}

/** Whether a prerecorded clip exists for this exact text (sync, given a manifest). */
export function hasPrerecorded(manifest: LangManifest, text: string): boolean {
	return !!manifest[text.trim()];
}

// One <audio> element per pack, reused so each pack file is fetched once.
const packEls = new Map<string, HTMLAudioElement>();
function packEl(url: string): HTMLAudioElement {
	let a = packEls.get(url);
	if (!a) {
		a = new Audio(url);
		a.preload = 'auto';
		packEls.set(url, a);
	}
	return a;
}

// The clip currently playing — lets a new play supersede an in-flight one.
let active: HTMLAudioElement | null = null;

function once(el: HTMLAudioElement, ev: string): Promise<void> {
	return new Promise((res) => {
		const h = () => {
			el.removeEventListener(ev, h);
			res();
		};
		el.addEventListener(ev, h);
	});
}

/** Play the `[start, start+dur]` slice of a pack file via seek-and-pause. */
async function playSlice(url: string, start: number, dur: number): Promise<void> {
	if (active) active.pause();
	const a = packEl(url);
	active = a;
	if (a.readyState < 1) {
		await Promise.race([once(a, 'loadedmetadata'), once(a, 'error')]);
	}
	if (active !== a) return; // superseded while loading
	if (Math.abs(a.currentTime - start) > 0.05) {
		a.currentTime = start;
		await once(a, 'seeked');
	}
	if (active !== a) return;
	const end = start + dur;
	await a.play().catch(() => {});
	await new Promise<void>((res) => {
		const tick = () => {
			if (active !== a || a.paused || a.ended || a.currentTime >= end - 0.02) {
				if (active === a) a.pause();
				res();
				return;
			}
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});
}

/** Play the prerecorded clip for `text`; resolves true if one existed and played. */
export async function playPrerecorded(language: Language, text: string): Promise<boolean> {
	const entry = (await loadAudioManifest(language))[text.trim()];
	if (!entry) return false;
	await playSlice(`${base}/audio/packs/${entry.p}`, entry.s, entry.d);
	return true;
}

// --- Synthesis fallback + recordings ----------------------------------------

/** Synthesize `text` and store the result, returning a `blob:` ref or null. */
export async function synthesizeToRef(
	text: string,
	language: Language,
	settings: ManabiSettings
): Promise<string | null> {
	const res = await synthesize({ text, language }, settings);
	if (!res.ok || !res.value) return null;
	const blob = new Blob([res.value.audio], { type: res.value.mimeType });
	return storeBlob(blob, res.value.mimeType);
}

/** Play a stored blob by ref. Resolves when playback starts (or no-ops). */
export async function playRef(ref: string): Promise<void> {
	const url = await getBlobUrl(ref);
	if (!url) return;
	const audio = new Audio(url);
	audio.addEventListener('ended', () => URL.revokeObjectURL(url));
	await audio.play().catch(() => URL.revokeObjectURL(url));
}

export { hasBlob };
