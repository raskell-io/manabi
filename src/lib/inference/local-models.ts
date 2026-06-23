/**
 * Local model manager — wraps transformers.js so callers don't deal with HF
 * pipeline loading/caching. The runtime is dynamically imported so it stays
 * out of the initial bundle; only users who trigger local TTS pay the cost.
 * Models download once into transformers.js's own cache. Ported from kurumi.
 */

import { get, writable, type Writable } from 'svelte/store';

export type LocalTask = 'tts';

export type ModelStatus =
	| { state: 'idle' }
	| { state: 'loading'; progress: number; phase: string }
	| { state: 'ready' }
	| { state: 'error'; error: string };

export const localModelStatus: Writable<Record<string, ModelStatus>> = writable({});

function setStatus(key: string, status: ModelStatus): void {
	localModelStatus.update((cur) => ({ ...cur, [key]: status }));
}

export function getModelStatus(task: LocalTask, model: string): ModelStatus {
	return get(localModelStatus)[`${task}:${model}`] ?? { state: 'idle' };
}

const pipelineCache = new Map<string, unknown>();
const pendingLoads = new Map<string, Promise<unknown>>();

interface ProgressEvent {
	status: string;
	progress?: number;
	file?: string;
}

export async function loadPipeline(task: LocalTask, model: string): Promise<unknown> {
	const key = `${task}:${model}`;
	if (pipelineCache.has(key)) return pipelineCache.get(key);
	if (pendingLoads.has(key)) return pendingLoads.get(key)!;

	const loadPromise = (async () => {
		setStatus(key, { state: 'loading', progress: 0, phase: 'starting' });
		try {
			const { pipeline } = await import('@huggingface/transformers');
			const hfTask = 'text-to-speech' as Parameters<typeof pipeline>[0];
			const instance = await pipeline(hfTask, model, {
				progress_callback: (event: ProgressEvent) => {
					if (event.status === 'progress' && typeof event.progress === 'number') {
						setStatus(key, { state: 'loading', progress: event.progress, phase: event.file || 'downloading' });
					} else if (event.status === 'done') {
						setStatus(key, { state: 'loading', progress: 100, phase: 'initializing' });
					}
				}
			} as Parameters<typeof pipeline>[2]);
			pipelineCache.set(key, instance);
			setStatus(key, { state: 'ready' });
			return instance;
		} catch (err) {
			setStatus(key, { state: 'error', error: err instanceof Error ? err.message : 'load failed' });
			throw err;
		} finally {
			pendingLoads.delete(key);
		}
	})();

	pendingLoads.set(key, loadPromise);
	return loadPromise;
}
