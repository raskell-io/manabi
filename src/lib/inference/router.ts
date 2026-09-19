/**
 * Inference router — picks the first capable provider for a task.
 *
 * TTS is local-first (the user's choice): try on-device MMS, fall back to
 * OpenAI when available. Generation, Hebrew diacritization and transcription
 * are OpenAI-only.
 */

import type { ManabiSettings } from '$lib/db/types';
import { ttsLocalProvider } from './providers/tts-local';
import { openaiProvider } from './providers/openai';
import type {
	DiacritizeInput,
	DiacritizeResult,
	GenerateItemsInput,
	GenerateItemsResult,
	GeneratePassagesInput,
	GeneratePassagesResult,
	InferenceProvider,
	InferenceResult,
	TranscribeInput,
	TranscribeResult,
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

/** Generate reading passages (OpenAI only). */
export async function generatePassages(
	input: GeneratePassagesInput,
	settings: ManabiSettings
): Promise<InferenceResult<GeneratePassagesResult>> {
	for (const p of PROVIDERS) {
		if (!p.generatePassages || !p.capabilities(settings).generate) continue;
		return p.generatePassages(input, settings);
	}
	return { ok: false, error: 'No generation provider (set an OpenAI key in Settings)', providerId: 'router', target: 'remote' };
}

/** Add niqqud to Hebrew strings (OpenAI only). Callers validate the result. */
export async function diacritize(
	input: DiacritizeInput,
	settings: ManabiSettings
): Promise<InferenceResult<DiacritizeResult>> {
	for (const p of PROVIDERS) {
		if (!p.diacritize || !p.capabilities(settings).diacritize) continue;
		return p.diacritize(input, settings);
	}
	return { ok: false, error: 'No diacritization provider (set an OpenAI key in Settings)', providerId: 'router', target: 'remote' };
}

/** Transcribe a learner's recording (OpenAI only). */
export async function transcribe(
	input: TranscribeInput,
	settings: ManabiSettings
): Promise<InferenceResult<TranscribeResult>> {
	for (const p of PROVIDERS) {
		if (!p.transcribe || !p.capabilities(settings).transcribe) continue;
		return p.transcribe(input, settings);
	}
	return { ok: false, error: 'No transcription provider (set an OpenAI key in Settings)', providerId: 'router', target: 'remote' };
}

export function canDiacritize(settings: ManabiSettings): boolean {
	return PROVIDERS.some((p) => p.diacritize && p.capabilities(settings).diacritize);
}

export function canTranscribe(settings: ManabiSettings): boolean {
	return PROVIDERS.some((p) => p.transcribe && p.capabilities(settings).transcribe);
}

export function canGenerate(settings: ManabiSettings): boolean {
	return PROVIDERS.some((p) => p.generateItems && p.capabilities(settings).generate);
}

export function canSynthesize(settings: ManabiSettings): boolean {
	return PROVIDERS.some((p) => p.tts && p.capabilities(settings).tts);
}
