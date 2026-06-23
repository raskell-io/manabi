/**
 * Inference router — picks the first capable provider for a task.
 *
 * TTS is local-first (the user's choice): try on-device MMS, fall back to
 * OpenAI when available. Item generation is OpenAI-only.
 */

import type { ManabiSettings } from '$lib/db/types';
import { ttsLocalProvider } from './providers/tts-local';
import { openaiProvider } from './providers/openai';
import type {
	GenerateItemsInput,
	GenerateItemsResult,
	InferenceProvider,
	InferenceResult,
	TtsInput,
	TtsResult
} from './types';

// Order matters: TTS prefers the first provider that succeeds.
const PROVIDERS: InferenceProvider[] = [ttsLocalProvider, openaiProvider];

/** Synthesize speech, trying each capable provider until one succeeds. */
export async function synthesize(
	input: TtsInput,
	settings: ManabiSettings
): Promise<InferenceResult<TtsResult>> {
	let lastError = 'No TTS provider available';
	for (const p of PROVIDERS) {
		if (!p.tts || !p.capabilities(settings).tts) continue;
		const result = await p.tts(input, settings);
		if (result.ok) return result;
		lastError = result.error ?? lastError;
	}
	return { ok: false, error: lastError, providerId: 'router', target: 'local' };
}

/** Generate learning items (OpenAI only). */
export async function generateItems(
	input: GenerateItemsInput,
	settings: ManabiSettings
): Promise<InferenceResult<GenerateItemsResult>> {
	for (const p of PROVIDERS) {
		if (!p.generateItems || !p.capabilities(settings).generate) continue;
		return p.generateItems(input, settings);
	}
	return { ok: false, error: 'No generation provider (set an OpenAI key in Settings)', providerId: 'router', target: 'remote' };
}

export function canGenerate(settings: ManabiSettings): boolean {
	return PROVIDERS.some((p) => p.generateItems && p.capabilities(settings).generate);
}

export function canSynthesize(settings: ManabiSettings): boolean {
	return PROVIDERS.some((p) => p.tts && p.capabilities(settings).tts);
}
