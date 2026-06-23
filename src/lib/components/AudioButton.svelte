<script lang="ts">
	import { Volume2, Loader2 } from 'lucide-svelte';
	import { get } from 'svelte/store';
	import { settings, updateItem } from '$lib/db/store';
	import { canSynthesize } from '$lib/inference/router';
	import { hasBlob, playRef, synthesizeToRef } from '$lib/audio';
	import type { Language } from '$lib/db/types';

	let {
		text,
		language,
		audioRef = undefined,
		itemId = undefined,
		label = 'Play'
	}: {
		text: string;
		language: Language;
		/** Existing cached audio ref, if any. */
		audioRef?: string;
		/** When set, a freshly synthesized clip is persisted back onto the item. */
		itemId?: string;
		label?: string;
	} = $props();

	let busy = $state(false);
	let error = $state('');

	const available = $derived(canSynthesize(get(settings)) || !!audioRef);

	async function play() {
		if (busy) return;
		error = '';
		busy = true;
		try {
			// Cached clip first.
			if (audioRef && (await hasBlob(audioRef))) {
				await playRef(audioRef);
				return;
			}
			// Otherwise synthesize, cache, and (optionally) attach to the item.
			const ref = await synthesizeToRef(text, language, get(settings));
			if (!ref) {
				error = 'No audio';
				return;
			}
			audioRef = ref;
			if (itemId) updateItem(itemId, { audioRef: ref });
			await playRef(ref);
		} catch {
			error = 'Audio failed';
		} finally {
			busy = false;
		}
	}
</script>

<button class="audio-btn" onclick={play} disabled={busy || !available} title={error || label} aria-label={label}>
	{#if busy}
		<Loader2 size={18} class="spin" />
	{:else}
		<Volume2 size={18} />
	{/if}
</button>

<style>
	.audio-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-secondary);
		color: var(--color-accent);
	}
	.audio-btn:hover:not(:disabled) {
		border-color: var(--color-accent);
	}
	.audio-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	:global(.audio-btn .spin) {
		animation: spin 0.9s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
