<script lang="ts">
	import { Volume2, Loader2 } from 'lucide-svelte';
	import { get } from 'svelte/store';
	import { settings, updateItem } from '$lib/db/store';
	import { canSynthesize } from '$lib/inference/router';
	import { hasBlob, playRef, synthesizeToRef, loadAudioManifest, hasPrerecorded, playPrerecorded } from '$lib/audio';
	import type { Language } from '$lib/db/types';

	let {
		text,
		language,
		audioRef = undefined,
		itemId = undefined,
		label = 'Play',
		big = false
	}: {
		text: string;
		language: Language;
		/** Existing cached audio ref, if any. */
		audioRef?: string;
		/** When set, a freshly synthesized clip is persisted back onto the item. */
		itemId?: string;
		label?: string;
		/** The large speaker button used as an exercise prompt. */
		big?: boolean;
	} = $props();

	let busy = $state(false);
	let error = $state('');
	let prerecorded = $state(false);

	// Check whether a prerecorded clip exists for this exact text — the primary
	// audio path (works with no in-browser TTS). Re-checks when text/lang change.
	$effect(() => {
		const t = text;
		const l = language;
		prerecorded = false;
		loadAudioManifest(l).then((m) => {
			if (t === text && l === language) prerecorded = hasPrerecorded(m, t);
		});
	});

	const available = $derived(prerecorded || canSynthesize(get(settings)) || !!audioRef);

	async function play() {
		if (busy) return;
		error = '';
		busy = true;
		try {
			// 1. Prerecorded clip from an audio pack (best quality, no TTS needed).
			if (prerecorded && (await playPrerecorded(language, text))) {
				return;
			}
			// 2. A previously synthesized clip cached on this device.
			if (audioRef && (await hasBlob(audioRef))) {
				await playRef(audioRef);
				return;
			}
			// 3. Fall back to on-the-fly synthesis (cache + attach to the item).
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

<button class="audio-btn" class:big class:busy onclick={play} disabled={busy || !available} title={error || label} aria-label={label}>
	{#if busy}
		<Loader2 size={big ? 34 : 18} class="spin" />
	{:else}
		<Volume2 size={big ? 34 : 18} strokeWidth={big ? 2.6 : 2.2} />
	{/if}
</button>

<style>
	.audio-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.8rem;
		border: 2px solid var(--color-border);
		border-bottom-width: 4px;
		background: var(--color-bg);
		color: var(--color-sky);
		transition: transform 0.08s ease;
	}
	.audio-btn:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--color-sky) 55%, var(--color-border));
	}
	.audio-btn:active:not(:disabled) {
		transform: translateY(2px);
		border-bottom-width: 2px;
		margin-top: 2px;
	}
	/* Big: the Duolingo-style blue speaker that *is* the listening prompt. */
	.audio-btn.big {
		width: 5.5rem;
		height: 5.5rem;
		border-radius: 1.4rem;
		border: none;
		background: var(--color-sky);
		color: #fff;
		box-shadow: 0 5px 0 color-mix(in srgb, var(--color-sky) 68%, #000);
	}
	.audio-btn.big:active:not(:disabled) {
		transform: translateY(5px);
		box-shadow: none;
		margin-top: 0;
	}
	.audio-btn.big.busy {
		animation: pulse 1s ease-in-out infinite;
	}
	@keyframes pulse {
		50% {
			transform: scale(1.06);
		}
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
