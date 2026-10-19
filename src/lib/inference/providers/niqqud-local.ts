/**
 * On-device Hebrew diacritization with Dicta's DictaBERT-large-char-menaked
 * (CC BY 4.0), as an INT8 ONNX export run in onnxruntime-web (WASM). Opt-in
 * (settings.localNiqqud): ≈ 320 MB, downloaded once into the Cache API, then
 * offline. Both files are pinned to a revision and checked by size.
 *
 * Like the OpenAI path it only proposes marks: hebrew.ts accepts a result only
 * when its letters are exactly the input's.
 */

import type { ManabiSettings } from '$lib/db/types';
import { applyNikud, argmaxRows, MAX_CHARS, NIKUD_CLASSES, removeNikud, SHIN_CLASSES, tokenize } from '$lib/niqqud-model';
import { setStatus } from '../local-models';
import type { DiacritizeInput, DiacritizeResult, InferenceProvider, InferenceResult, ProviderCapabilities } from '../types';

/** Independent INT8 conversion of dicta-il/dictabert-large-char-menaked (revision d311fbf). */
export const NIQQUD_MODEL = {
	id: 'dicta-il/dictabert-large-char-menaked',
	url: 'https://huggingface.co/avraham123/tale-me-dictabert-menaked-browser/resolve/c9e5cf7f1e6d88918968c75a2aad701675d76209/dictabert-menaked.int8.onnx',
	bytes: 317980253,
	tokenizer: 'https://huggingface.co/dicta-il/dictabert-large-char-menaked/resolve/d311fbf7c403e50b040440e4859ac78064d025d0/tokenizer.json'
};
export const NIQQUD_STATUS_KEY = `niqqud:${NIQQUD_MODEL.id}`;

const CACHE = 'manabi-models';

type Ort = typeof import('onnxruntime-web');
interface Menaked {
	ort: Ort;
	session: import('onnxruntime-web').InferenceSession;
	vocab: Record<string, number>;
}

/** A file from the Cache API, else downloaded (reporting progress) and cached. */
async function cachedBytes(url: string, expected: number, onProgress: (pct: number) => void): Promise<ArrayBuffer> {
	const cache = typeof caches !== 'undefined' ? await caches.open(CACHE).catch(() => null) : null;
	const hit = await cache?.match(url);
	if (hit) return hit.arrayBuffer();
	const res = await fetch(url);
	if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
	const total = Number(res.headers.get('content-length')) || expected;
	const chunks: Uint8Array[] = [];
	let got = 0;
	const reader = res.body.getReader();
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		got += value.length;
		onProgress(Math.min(100, (100 * got) / total));
	}
	if (expected && got !== expected) throw new Error('The model download was incomplete — try again');
	const bytes = new Uint8Array(got);
	let at = 0;
	for (const c of chunks) {
		bytes.set(c, at);
		at += c.length;
	}
	await cache?.put(url, new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } })).catch((err) => console.warn('Could not cache', url, err));
	return bytes.buffer;
}

let loading: Promise<Menaked> | null = null;

/** Load (downloading on first use) the model and its vocabulary. */
export function loadNiqqud(): Promise<Menaked> {
	loading ??= (async () => {
		setStatus(NIQQUD_STATUS_KEY, { state: 'loading', progress: 0, phase: 'downloading' });
		try {
			const ort: Ort = await import('onnxruntime-web/webgpu');
			// The same WASM files transformers.js uses (one onnxruntime-web, one download).
			if (!ort.env.wasm.wasmPaths) {
				const base = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ort.env.versions.web}/dist/`;
				const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
				ort.env.wasm.wasmPaths = safari
					? { mjs: `${base}ort-wasm-simd-threaded.mjs`, wasm: `${base}ort-wasm-simd-threaded.wasm` }
					: { mjs: `${base}ort-wasm-simd-threaded.asyncify.mjs`, wasm: `${base}ort-wasm-simd-threaded.asyncify.wasm` };
			}
			const tokenizer = JSON.parse(new TextDecoder().decode(await cachedBytes(NIQQUD_MODEL.tokenizer, 0, () => {}))) as {
				model: { vocab: Record<string, number> };
			};
			const model = await cachedBytes(NIQQUD_MODEL.url, NIQQUD_MODEL.bytes, (pct) =>
				setStatus(NIQQUD_STATUS_KEY, { state: 'loading', progress: pct, phase: 'downloading' })
			);
			setStatus(NIQQUD_STATUS_KEY, { state: 'loading', progress: 100, phase: 'initializing' });
			const session = await ort.InferenceSession.create(new Uint8Array(model), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
			setStatus(NIQQUD_STATUS_KEY, { state: 'ready' });
			return { ort, session, vocab: tokenizer.model.vocab };
		} catch (err) {
			loading = null;
			setStatus(NIQQUD_STATUS_KEY, { state: 'error', error: err instanceof Error ? err.message : 'load failed' });
			throw err;
		}
	})();
	return loading;
}

/** Point one bare Hebrew text. */
async function point(m: Menaked, text: string): Promise<string> {
	const plain = removeNikud(text);
	if ([...plain].length > MAX_CHARS) return text;
	const ids = tokenize(plain, m.vocab);
	const n = ids.length;
	const tensor = (values: number[]) => new m.ort.Tensor('int64', BigInt64Array.from(values, BigInt), [1, n]);
	const out = await m.session.run({
		input_ids: tensor(ids),
		attention_mask: tensor(ids.map(() => 1)),
		token_type_ids: tensor(ids.map(() => 0))
	});
	const chars = n - 2;
	const nikud = argmaxRows(out.nikud_logits.data as Float32Array, NIKUD_CLASSES.length, chars);
	const shin = argmaxRows(out.shin_logits.data as Float32Array, SHIN_CLASSES.length, chars);
	return applyNikud(plain, nikud, shin);
}

export const niqqudLocalProvider: InferenceProvider = {
	id: 'niqqud-local',
	target: 'local',
	capabilities(settings: ManabiSettings): ProviderCapabilities {
		return { tts: false, generate: false, diacritize: settings.localNiqqud, transcribe: false };
	},
	async diacritize(input: DiacritizeInput): Promise<InferenceResult<DiacritizeResult>> {
		try {
			const m = await loadNiqqud();
			const texts: string[] = [];
			for (const t of input.texts) texts.push(await point(m, t));
			return { ok: true, value: { texts }, providerId: 'niqqud-local', target: 'local' };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : 'On-device vowels failed', providerId: 'niqqud-local', target: 'local' };
		}
	}
};
