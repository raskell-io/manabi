/**
 * Audio helpers: synthesize pronunciation, cache it as a blob, and play it.
 *
 * Synthesis goes through the inference router (local MMS first, OpenAI
 * fallback). Synthesized clips are cached in the blob store so the second
 * play is instant and offline.
 */

import type { Language, ManabiSettings } from '$lib/db/types';
import { getBlobUrl, hasBlob, storeBlob } from '$lib/db/blob-store';
import { synthesize } from '$lib/inference/router';

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
