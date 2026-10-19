/**
 * On-device speech recognition with Whisper (transformers.js), for scoring a
 * learner's recording without an OpenAI key or a connection. Opt-in
 * (settings.localAsr): the model downloads on first use — whisper-base
 * (≈ 130 MB) or whisper-small (≈ 300 MB), and for Cantonese optionally a
 * Cantonese fine-tune (settings.localAsrCantonese) — and runs on WebGPU when
 * the browser has it (settings.localAsrGpu), else WASM.
 *
 * Small Whisper models are weak at Hebrew, so Hebrew needs `small`; Chinese
 * output is normalized to Simplified (the stored script). The learner still
 * confirms every suggested rating, so a wrong transcript never grades alone.
 */

import { writable } from 'svelte/store';
import type { Language, ManabiSettings } from '$lib/db/types';
import { loadPipeline } from '../local-models';
import { toHongKong, toSimplified } from '$lib/chinese';
import { cleanTranscript, maxTokensFor, WHISPER_LANGUAGE } from '../asr-text';
import type { InferenceProvider, InferenceResult, ProviderCapabilities, TranscribeInput, TranscribeResult } from '../types';

type AsrPipeline = (
	audio: Float32Array,
	options: { language?: string; task?: 'transcribe'; decoder_input_ids?: number[][]; max_new_tokens: number }
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

export type AsrDevice = 'webgpu' | 'wasm';

/** One on-device recognizer: which model, which weights per device. */
export interface AsrModel {
	id: string;
	dtype: Record<AsrDevice, Record<string, string>>;
	/**
	 * Decoder start tokens, for a fine-tune whose generation config lost its
	 * language table (transformers.js then refuses `language` / `task`).
	 */
	prompt?: number[];
}

/**
 * Weights chosen because they load in onnxruntime-web. Its WASM backend
 * rejects Whisper's int8 decoders ("Missing required scale"), while fp16 / q4
 * decoders work; on WebGPU, q4 (MatMulNBits) runs on the GPU and base keeps a
 * full-precision encoder, as in transformers.js's WebGPU Whisper demo.
 * Measured warm in Chromium on a laptop, WASM: base ≈ 3 s per take, small ≈ 10 s.
 */
const SMALL_Q4 = { encoder_model: 'q4', decoder_model_merged: 'q4' }; // ≈ 66 + 233 MB
export const ASR_MODELS: Record<ManabiSettings['localAsrModel'] | 'cantonese', AsrModel> = {
	base: {
		id: 'onnx-community/whisper-base',
		dtype: {
			wasm: { encoder_model: 'q8', decoder_model_merged: 'fp16' }, // ≈ 23 + 105 MB
			webgpu: { encoder_model: 'fp32', decoder_model_merged: 'q4' } // ≈ 82 + 85 MB
		}
	},
	small: { id: 'onnx-community/whisper-small', dtype: { wasm: SMALL_Q4, webgpu: SMALL_Q4 } },
	// alvanlii/whisper-small-cantonese (Apache-2.0): Whisper small fine-tuned on
	// Hong Kong Cantonese, ≈ 8 % CER on Common Voice — writes colloquial 係 / 嘅.
	// Its ONNX config has no language table: start it as <|startoftranscript|>
	// <|zh|> <|transcribe|> <|notimestamps|>, as the model card forces zh.
	cantonese: {
		id: 'onnx-community/whisper-small-cantonese-ONNX',
		dtype: { wasm: SMALL_Q4, webgpu: SMALL_Q4 },
		prompt: [50258, 50260, 50359, 50363]
	}
};

/** The recognizer for a language: the Cantonese fine-tune when it's on, else the chosen size. */
export function asrModelFor(settings: ManabiSettings, language: Language | undefined): AsrModel {
	return language === 'yue' && settings.localAsrCantonese ? ASR_MODELS.cantonese : ASR_MODELS[settings.localAsrModel];
}

let gpuCheck: Promise<boolean> | null = null;
interface GpuAdapterLike {
	isFallbackAdapter?: boolean;
	info?: { isFallbackAdapter?: boolean };
}

/**
 * Whether this browser has a real GPU for WebGPU. An adapter request can hang
 * where WebGPU is exposed but unusable, so it gets two seconds; a software
 * fallback adapter (SwiftShader, e.g. headless Chromium) is far slower than
 * WASM, so it doesn't count.
 */
export function hasWebGpu(): Promise<boolean> {
	gpuCheck ??= (async () => {
		const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<GpuAdapterLike | null> } }).gpu;
		if (!gpu) return false;
		const adapter = await Promise.race([
			gpu.requestAdapter().catch(() => null),
			new Promise<null>((r) => setTimeout(() => r(null), 2000))
		]);
		return !!adapter && !(adapter.info?.isFallbackAdapter ?? adapter.isFallbackAdapter);
	})();
	return gpuCheck;
}

/** Where each model ended up running (shown in Settings). */
export const asrDevice = writable<Record<string, AsrDevice>>({});

/**
 * Load (downloading on first use) a recognizer: on the GPU when that's on and
 * available, falling back to WASM if WebGPU fails to load it.
 */
export async function loadAsr(settings: ManabiSettings, language: Language | undefined): Promise<AsrPipeline> {
	const model = asrModelFor(settings, language);
	const devices: AsrDevice[] = settings.localAsrGpu && (await hasWebGpu()) ? ['webgpu', 'wasm'] : ['wasm'];
	for (const device of devices) {
		try {
			const pipe = (await loadPipeline('asr', model.id, { device, dtype: model.dtype[device] })) as AsrPipeline;
			asrDevice.update((d) => ({ ...d, [model.id]: device }));
			return pipe;
		} catch (err) {
			if (device === 'wasm') throw err;
			console.warn(`WebGPU could not load ${model.id}, using WASM:`, err);
		}
	}
	throw new Error('unreachable');
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
			const model = asrModelFor(settings, input.language);
			const pipe = await loadAsr(settings, input.language);
			const audio = await decode(input.audio);
			const max_new_tokens = maxTokensFor(audio.length / SAMPLE_RATE);
			const out = await pipe(
				audio,
				model.prompt
					? { decoder_input_ids: [model.prompt], max_new_tokens }
					: { language: WHISPER_LANGUAGE[input.language], task: 'transcribe', max_new_tokens }
			);
			let text = cleanTranscript(out.text ?? '');
			if (input.language === 'zh' && text) text = await toSimplified(text);
			if (input.language === 'yue' && text) text = await toHongKong(text);
			return { ok: true, value: { text }, providerId: 'asr-local', target: 'local' };
		} catch (err) {
			return fail(err instanceof Error ? err.message : 'On-device recognition failed');
		}
	}
};
