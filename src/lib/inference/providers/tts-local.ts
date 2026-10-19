/**
 * Local TTS via transformers.js using Facebook's MMS text-to-speech models.
 * Models load on demand and cache in the browser. If there is no model for a
 * language, or it fails, the router falls back to OpenAI TTS.
 *
 * Only Korean has a transformers.js (ONNX) port: MMS has no Mandarin or
 * Japanese voice, and Hebrew (facebook/mms-tts-heb) exists only as PyTorch.
 * Those languages rely on the bundled recordings, then OpenAI.
 */

import type { Language, ManabiSettings } from '$lib/db/types';
import { loadPipeline } from '../local-models';
import type {
	InferenceProvider,
	InferenceResult,
	ProviderCapabilities,
	TtsInput,
	TtsResult
} from '../types';

const MMS_MODEL: Partial<Record<Language, string>> = {
	ko: 'Xenova/mms-tts-kor'
};

/** Can this language be synthesized on-device? */
export function hasLocalVoice(language: Language): boolean {
	return MMS_MODEL[language] !== undefined;
}

interface TtsPipelineOutput {
	audio: Float32Array;
	sampling_rate: number;
}
type TtsPipelineFn = (text: string) => Promise<TtsPipelineOutput>;

function writeString(view: DataView, offset: number, str: string): void {
	for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

/** Encode mono Float32 PCM as a 16-bit WAV the <audio> element can play. */
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
	const bytesPerSample = 2;
	const dataSize = samples.length * bytesPerSample;
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);
	writeString(view, 0, 'RIFF');
	view.setUint32(4, 36 + dataSize, true);
	writeString(view, 8, 'WAVE');
	writeString(view, 12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * bytesPerSample, true);
	view.setUint16(32, bytesPerSample, true);
	view.setUint16(34, 16, true);
	writeString(view, 36, 'data');
	view.setUint32(40, dataSize, true);
	for (let i = 0; i < samples.length; i++) {
		const s = Math.max(-1, Math.min(1, samples[i]));
		view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
	}
	return buffer;
}

export const ttsLocalProvider: InferenceProvider = {
	id: 'tts-local',
	target: 'local',
	capabilities(settings: ManabiSettings): ProviderCapabilities {
		return { tts: settings.localTtsEnabled, generate: false, diacritize: false, transcribe: false };
	},
	async tts(input: TtsInput, settings: ManabiSettings): Promise<InferenceResult<TtsResult>> {
		if (!settings.localTtsEnabled) {
			return { ok: false, error: 'Local TTS disabled', providerId: 'tts-local', target: 'local' };
		}
		if (!input.text.trim()) {
			return { ok: false, error: 'Empty text', providerId: 'tts-local', target: 'local' };
		}
		const model = MMS_MODEL[input.language];
		if (!model) {
			return { ok: false, error: 'No on-device voice for this language', providerId: 'tts-local', target: 'local' };
		}
		try {
			const pipe = (await loadPipeline('tts', model)) as TtsPipelineFn;
			const out = await pipe(input.text);
			return {
				ok: true,
				value: { audio: encodeWav(out.audio, out.sampling_rate), mimeType: 'audio/wav' },
				providerId: 'tts-local',
				target: 'local'
			};
		} catch (err) {
			return {
				ok: false,
				error: err instanceof Error ? err.message : 'Local TTS failed',
				providerId: 'tts-local',
				target: 'local'
			};
		}
	}
};
