/**
 * On-device speech recognition with Whisper (transformers.js), for scoring a
 * learner's recording without an OpenAI key or a connection. Opt-in
 * (settings.localAsr): the model downloads on first use — whisper-base
 * (≈ 130 MB) or whisper-small (≈ 300 MB) — and runs in WASM.
 *
 * Small Whisper models are weak at Hebrew, so Hebrew needs `small`; Chinese
 * output is normalized to Simplified (the stored script). The learner still
 * confirms every suggested rating, so a wrong transcript never grades alone.
 */

import type { ManabiSettings } from '$lib/db/types';
import { loadPipeline } from '../local-models';
import { toHongKong, toSimplified } from '$lib/chinese';
import { cleanTranscript, maxTokensFor, WHISPER_LANGUAGE } from '../asr-text';
import type { InferenceProvider, InferenceResult, ProviderCapabilities, TranscribeInput, TranscribeResult } from '../types';

type AsrPipeline = (
	audio: Float32Array,
	options: { language: string; task: 'transcribe'; max_new_tokens: number }
) => Promise<{ text: string }>;

const SAMPLE_RATE = 16000;

/** Decode a recording (webm/opus, mp4/aac…) to 16 kHz mono samples. */
async function decode(blob: Blob): Promise<Float32Array> {
	const ctx = new AudioContext();
	try {
		const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
		const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(buf.duration * SAMPLE_RATE)), SAMPLE_RATE);
		const src = offline.createBufferSource();
		src.buffer = buf;
		src.connect(offline.destination);
		src.start();
		return (await offline.startRendering()).getChannelData(0);
	} finally {
		void ctx.close();
	}
}

/** The model id for the chosen size. */
export function asrModelId(settings: ManabiSettings): string {
	return `onnx-community/whisper-${settings.localAsrModel}`;
}

/**
 * Weights per size, chosen because they load in onnxruntime-web: its WASM
 * backend rejects Whisper's int8 decoders ("Missing required scale"), while
 * fp16 / q4 decoders work. Measured warm in Chromium on a laptop: base ≈ 3 s
 * per take, small ≈ 10 s. (WASM only — WebGPU is untested here.)
 */
const DTYPE: Record<ManabiSettings['localAsrModel'], Record<string, string>> = {
	base: { encoder_model: 'q8', decoder_model_merged: 'fp16' }, // ≈ 23 + 105 MB
	small: { encoder_model: 'q4', decoder_model_merged: 'q4' } // ≈ 66 + 233 MB
};

/** Load (downloading on first use) the Whisper pipeline for the chosen size. */
export function loadAsr(settings: ManabiSettings): Promise<AsrPipeline> {
	return loadPipeline('asr', asrModelId(settings), { device: 'wasm', dtype: DTYPE[settings.localAsrModel] }) as Promise<AsrPipeline>;
}

function fail(error: string): InferenceResult<TranscribeResult> {
	return { ok: false, error, providerId: 'asr-local', target: 'local' };
}

export const asrLocalProvider: InferenceProvider = {
	id: 'asr-local',
	target: 'local',
	capabilities(settings: ManabiSettings): ProviderCapabilities {
		return { tts: false, generate: false, diacritize: false, transcribe: settings.localAsr && settings.asrScoring !== false };
	},
	async transcribe(input: TranscribeInput, settings: ManabiSettings): Promise<InferenceResult<TranscribeResult>> {
		if (!settings.localAsr) return fail('On-device recognition is off');
		if (input.language === 'he' && settings.localAsrModel !== 'small') {
			return fail('Hebrew needs the larger on-device model (Settings → Pronunciation)');
		}
		try {
			const pipe = await loadAsr(settings);
			const audio = await decode(input.audio);
			const out = await pipe(audio, {
				language: WHISPER_LANGUAGE[input.language],
				task: 'transcribe',
				max_new_tokens: maxTokensFor(audio.length / SAMPLE_RATE)
			});
			let text = cleanTranscript(out.text ?? '');
			if (input.language === 'zh' && text) text = await toSimplified(text);
			if (input.language === 'yue' && text) text = await toHongKong(text);
			return { ok: true, value: { text }, providerId: 'asr-local', target: 'local' };
		} catch (err) {
			return fail(err instanceof Error ? err.message : 'On-device recognition failed');
		}
	}
};
