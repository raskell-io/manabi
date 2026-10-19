/**
 * Inference router — picks the first capable provider for a task.
 *
 * TTS is local-first (the user's choice): try on-device MMS, fall back to
 * OpenAI when available. Transcription prefers OpenAI (more accurate) and
 * falls back to on-device Whisper when that is switched on (no key, offline).
 * Generation and Hebrew diacritization are OpenAI-only.
 */

import type { ManabiSettings } from '$lib/db/types';
import { ttsLocalProvider } from './providers/tts-local';
import { openaiProvider } from './providers/openai';
import { asrLocalProvider } from './providers/asr-local';
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
	TtsResult,
	AnnotateInput,
	AnnotateResult
} from './types';

// Order matters: TTS prefers the first provider that succeeds.
const PROVIDERS: InferenceProvider[] = [ttsLocalProvider, openaiProvider];
// Transcription: the remote model first, then the on-device one.
const TRANSCRIBERS: InferenceProvider[] = [openaiProvider, asrLocalProvider];

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

/** Transcribe a learner's recording: OpenAI, else (or if it fails) on-device Whisper. */
export async function transcribe(
	input: TranscribeInput,
	settings: ManabiSettings
): Promise<InferenceResult<TranscribeResult>> {
	let last: InferenceResult<TranscribeResult> | null = null;
	for (const p of TRANSCRIBERS) {
		if (!p.transcribe || !p.capabilities(settings).transcribe) continue;
		last = await p.transcribe(input, settings);
		if (last.ok) return last;
	}
	return (
		last ?? { ok: false, error: 'No speech recognition (set an OpenAI key or turn on on-device recognition)', providerId: 'router', target: 'remote' }
	);
}

/** Reading + translation for lines of the learner's own text (OpenAI only). */
export async function annotate(
	input: AnnotateInput,
	settings: ManabiSettings
): Promise<InferenceResult<AnnotateResult>> {
	for (const p of PROVIDERS) {
		if (!p.annotate || !p.capabilities(settings).generate) continue;
		return p.annotate(input, settings);
	}
	return { ok: false, error: 'No annotation provider (set an OpenAI key in Settings)', providerId: 'router', target: 'remote' };
}

export function canDiacritize(settings: ManabiSettings): boolean {
	return PROVIDERS.some((p) => p.diacritize && p.capabilities(settings).diacritize);
}

export function canTranscribe(settings: ManabiSettings): boolean {
	return TRANSCRIBERS.some((p) => p.transcribe && p.capabilities(settings).transcribe);
}

export function canGenerate(settings: ManabiSettings): boolean {
	return PROVIDERS.some((p) => p.generateItems && p.capabilities(settings).generate);
}

export function canSynthesize(settings: ManabiSettings): boolean {
	return PROVIDERS.some((p) => p.tts && p.capabilities(settings).tts);
}
