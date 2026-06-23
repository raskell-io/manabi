<script lang="ts">
	import { Mic, Square, Play } from 'lucide-svelte';
	import { storeBlob } from '$lib/db/blob-store';
	import { playRef } from '$lib/audio';
	import AudioButton from './AudioButton.svelte';
	import ScriptText from './ScriptText.svelte';
	import type { Language, SelfRating } from '$lib/db/types';

	let {
		text,
		reading,
		language,
		itemId,
		onRate
	}: {
		text: string;
		reading: string;
		language: Language;
		itemId: string;
		onRate: (rating: SelfRating, audioRef: string) => void;
	} = $props();

	let recording = $state(false);
	let recordedRef = $state<string | null>(null);
	let error = $state('');
	let recorder: MediaRecorder | null = null;
	let chunks: Blob[] = [];

	async function start() {
		error = '';
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			chunks = [];
			recorder = new MediaRecorder(stream);
			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) chunks.push(e.data);
			};
			recorder.onstop = async () => {
				stream.getTracks().forEach((t) => t.stop());
				const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
				recordedRef = await storeBlob(blob, blob.type);
			};
			recorder.start();
			recording = true;
		} catch {
			error = 'Microphone unavailable';
		}
	}

	function stop() {
		recorder?.stop();
		recording = false;
	}

	function playRecording() {
		if (recordedRef) void playRef(recordedRef);
	}

	function rate(r: SelfRating) {
		if (recordedRef) onRate(r, recordedRef);
	}
</script>

<div class="recorder">
	<div class="prompt">
		<ScriptText {text} {language} size="lg" />
		<div class="reading">{reading}</div>
	</div>

	<div class="controls">
		<div class="native">
			<span class="hint">Native</span>
			<AudioButton {text} {language} {itemId} />
		</div>

		<div class="yours">
			<span class="hint">You</span>
			{#if !recording}
				<button class="rec" onclick={start} aria-label="Record">
					<Mic size={18} /> Record
				</button>
			{:else}
				<button class="rec stop" onclick={stop} aria-label="Stop">
					<Square size={16} /> Stop
				</button>
			{/if}
			{#if recordedRef}
				<button class="play" onclick={playRecording} aria-label="Play your recording">
					<Play size={16} /> Playback
				</button>
			{/if}
		</div>
	</div>

	{#if error}<p class="error">{error}</p>{/if}

	{#if recordedRef}
		<div class="rate">
			<p class="hint">How close were you?</p>
			<div class="rate-row">
				<button class="bad" onclick={() => rate('bad')}>Bad</button>
				<button class="okay" onclick={() => rate('okay')}>Okay</button>
				<button class="good" onclick={() => rate('good')}>Good</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.recorder {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		align-items: center;
	}
	.prompt {
		text-align: center;
	}
	.reading {
		color: var(--color-text-muted);
		margin-top: 0.25rem;
	}
	.controls {
		display: flex;
		gap: 2rem;
	}
	.native,
	.yours {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.hint {
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}
	button.rec,
	button.play {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.85rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-secondary);
		color: var(--color-text);
	}
	button.rec.stop {
		border-color: var(--color-danger);
		color: var(--color-danger);
	}
	.rate {
		text-align: center;
	}
	.rate-row {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}
	.rate-row button {
		padding: 0.5rem 1.25rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-secondary);
		color: var(--color-text);
		font-weight: 600;
	}
	.rate-row .bad:hover {
		border-color: var(--color-danger);
		color: var(--color-danger);
	}
	.rate-row .okay:hover {
		border-color: var(--color-warning);
		color: var(--color-warning);
	}
	.rate-row .good:hover {
		border-color: var(--color-success);
		color: var(--color-success);
	}
	.error {
		color: var(--color-danger);
		font-size: 0.85rem;
	}
</style>
