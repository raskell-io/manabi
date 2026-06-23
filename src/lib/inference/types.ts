/**
 * Inference layer — task-level provider abstraction (mirrors kurumi).
 *
 * Manabi needs two tasks: text-to-speech (pronunciation audio) and item
 * generation (the AI content workbench). Providers advertise which tasks they
 * support; the router picks the first capable provider in priority order.
 */

import type { GeneratedItem, ItemKind, Language, ManabiSettings } from '$lib/db/types';

export type ExecutionTarget = 'local' | 'remote';

export interface InferenceResult<T> {
	ok: boolean;
	value?: T;
	error?: string;
	providerId: string;
	target: ExecutionTarget;
}

export interface TtsInput {
	text: string;
	language: Language;
}
export interface TtsResult {
	audio: ArrayBuffer;
	mimeType: string;
}

export interface GenerateItemsInput {
	language: Language;
	kind: ItemKind;
	level: string;
	topic?: string;
	count: number;
	/** Targets already in the collection, so the model avoids duplicates. */
	existingTargets: string[];
}
export interface GenerateItemsResult {
	items: GeneratedItem[];
}

export interface ProviderCapabilities {
	tts: boolean;
	generate: boolean;
}

export interface InferenceProvider {
	id: string;
	target: ExecutionTarget;
	capabilities(settings: ManabiSettings): ProviderCapabilities;
	tts?(input: TtsInput, settings: ManabiSettings): Promise<InferenceResult<TtsResult>>;
	generateItems?(
		input: GenerateItemsInput,
		settings: ManabiSettings
	): Promise<InferenceResult<GenerateItemsResult>>;
}
