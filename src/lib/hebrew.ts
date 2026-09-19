/**
 * Hebrew diacritization — adding niqqud to bare (unpointed) Hebrew.
 *
 * The model is only ever asked to *add marks*. A pointed result is accepted
 * solely when stripping its marks gives back exactly the input, so a model
 * that rewrites, drops or "corrects" letters is caught and the original text
 * is kept. Nothing here writes to the store: callers show the result and the
 * learner decides (human-in-the-loop).
 */

import { diacritize as routerDiacritize } from '$lib/inference/router';
import type { DiacritizeInput, DiacritizeResult, InferenceResult } from '$lib/inference/types';
import {
	needsNiqqud,
	stripNiqqud,
	type ExampleSentence,
	type ManabiSettings,
	type PassageLine
} from '$lib/db/types';

export type Diacritizer = (
	input: DiacritizeInput,
	settings: ManabiSettings
) => Promise<InferenceResult<DiacritizeResult>>;

/** A pointed version is accepted only if it is the same consonantal text, with marks added. */
export function acceptDiacritized(input: string, output: unknown): output is string {
	return (
		typeof output === 'string' &&
		output !== input &&
		stripNiqqud(output) === stripNiqqud(input)
	);
}

export interface DiacritizeOutcome {
	texts: string[];
	changed: number;
	failed: number;
	error?: string;
}

/**
 * Point every text that needs it (one request for the whole batch). Texts the
 * model altered come back unchanged and are counted in `failed`.
 */
export async function diacritizeTexts(
	texts: string[],
	settings: ManabiSettings,
	fn: Diacritizer = routerDiacritize
): Promise<DiacritizeOutcome> {
	const out = [...texts];
	const idx = texts.map((t, i) => (needsNiqqud(t) ? i : -1)).filter((i) => i >= 0);
	if (idx.length === 0) return { texts: out, changed: 0, failed: 0 };
	const res = await fn({ texts: idx.map((i) => texts[i]) }, settings);
	if (!res.ok || !res.value) {
		return { texts: out, changed: 0, failed: idx.length, error: res.error ?? 'Diacritization failed' };
	}
	const got = res.value.texts;
	let changed = 0;
	let failed = 0;
	idx.forEach((i, k) => {
		if (acceptDiacritized(texts[i], got[k])) {
			out[i] = got[k];
			changed++;
		} else {
			failed++;
		}
	});
	return { texts: out, changed, failed };
}

type Pointable = { target: string; examples: ExampleSentence[] };
type Outcome<T> = { changed: number; failed: number; error?: string } & T;

/** Point many items' targets and example sentences in one request (returns new objects). */
export async function diacritizeItems<T extends Pointable>(
	items: T[],
	settings: ManabiSettings,
	fn: Diacritizer = routerDiacritize
): Promise<Outcome<{ items: T[] }>> {
	const texts = items.flatMap((it) => [it.target, ...it.examples.map((e) => e.target)]);
	const r = await diacritizeTexts(texts, settings, fn);
	let k = 0;
	const pointed = items.map((it) => {
		const target = r.texts[k++];
		const examples = it.examples.map((e) => ({ ...e, target: r.texts[k++] }));
		return { ...it, target, examples };
	});
	return { items: pointed, changed: r.changed, failed: r.failed, error: r.error };
}

/** Point one item (target + examples). */
export async function diacritizeItem<T extends Pointable>(
	item: T,
	settings: ManabiSettings,
	fn: Diacritizer = routerDiacritize
): Promise<Outcome<{ item: T }>> {
	const r = await diacritizeItems([item], settings, fn);
	return { item: r.items[0], changed: r.changed, failed: r.failed, error: r.error };
}

/** Point every line of many passages in one request (returns new objects). */
export async function diacritizePassages<T extends { lines: PassageLine[] }>(
	passages: T[],
	settings: ManabiSettings,
	fn: Diacritizer = routerDiacritize
): Promise<Outcome<{ passages: T[] }>> {
	const texts = passages.flatMap((p) => p.lines.map((l) => l.target));
	const r = await diacritizeTexts(texts, settings, fn);
	let k = 0;
	const pointed = passages.map((p) => ({
		...p,
		lines: p.lines.map((l) => ({ ...l, target: r.texts[k++] }))
	}));
	return { passages: pointed, changed: r.changed, failed: r.failed, error: r.error };
}
