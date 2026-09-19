<script lang="ts">
	import { Mic, Square, Play, Loader2 } from 'lucide-svelte';
	import { storeBlob } from '$lib/db/blob-store';
	import { playRef } from '$lib/audio';
	import { settings } from '$lib/db/store';
	import { canTranscribe, transcribe } from '$lib/inference/router';
	import { scorePronunciation, suggestRating, type AsrResult } from '$lib/pronunciation';
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
		onRate: (rating: SelfRating, audioRef: string, asr?: AsrResult) => void;
	} = $props();

	let recording = $state(false);
	let recordedRef = $state<string | null>(null);
	let error = $state('');
	let recorder: MediaRecorder | null = null;
	let chunks: Blob[] = [];

	// Speech-recognition scoring — optional (OpenAI key + the Pronunciation
	// setting). It only *suggests* a rating; the learner still confirms.
	let scoring = $state(false);
	let asr = $state<(AsrResult & { suggested: SelfRating }) | null>(null);
	let asrError = $state('');
	let take = 0; // so a slow transcription of an earlier take never lands on a newer one

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
				asr = null;
				asrError = '';
				if (canTranscribe($settings)) void score(blob, ++take);
			};
			recorder.start();
			recording = true;
		} catch {
			error = 'Microphone unavailable';
		}
	}

	async function score(blob: Blob, id: number) {
		scoring = true;
		try {
			const res = await transcribe({ audio: blob, language }, $settings);
			if (id !== take) return;
			if (res.ok && res.value) {
				const { score } = scorePronunciation(res.value.text, { target: text, reading, language });
				asr = { transcript: res.value.text, score, suggested: suggestRating(score) };
			} else {
				asrError = res.error ?? 'could not transcribe';
			}
		} finally {
			if (id === take) scoring = false;
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
		if (!recordedRef) return;
		onRate(r, recordedRef, asr ? { transcript: asr.transcript, score: asr.score } : undefined);
	}

	const LABEL: Record<SelfRating, string> = { bad: 'Bad', okay: 'Okay', good: 'Good' };
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

	{#if scoring}
		<p class="hint asr-wait" role="status"><span class="spin"><Loader2 size={14} /></span> Listening to your take…</p>
	{:else if asr}
		<div class="asr {asr.suggested}" role="status">
			<span class="asr-label">Heard</span>
			{#if asr.transcript}
				<ScriptText text={asr.transcript} {language} size="md" />
			{:else}
				<span class="asr-none">nothing</span>
			{/if}
			<span class="asr-score">{asr.score}% match</span>
		</div>
	{:else if asrError}
		<p class="hint">Couldn't score this take ({asrError}) — rate it yourself.</p>
	{/if}

	{#if recordedRef}
		<div class="rate">
			<p class="hint">{asr ? `Suggested: ${LABEL[asr.suggested]} — confirm or adjust` : 'How close were you?'}</p>
			<div class="rate-row">
				<button class="bad" class:suggested={asr?.suggested === 'bad'} onclick={() => rate('bad')}>Bad</button>
				<button class="okay" class:suggested={asr?.suggested === 'okay'} onclick={() => rate('okay')}>Okay</button>
				<button class="good" class:suggested={asr?.suggested === 'good'} onclick={() => rate('good')}>Good</button>
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
	.asr-wait {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
	}
	.spin {
		display: inline-flex;
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.asr {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.7rem;
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: 0.6rem;
		background: var(--color-bg-secondary);
	}
	.asr.good {
		border-color: var(--color-success);
	}
	.asr.okay {
		border-color: var(--color-warning);
	}
	.asr.bad {
		border-color: var(--color-danger);
	}
	.asr-label,
	.asr-none {
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}
	.asr-score {
		font-weight: 600;
		font-size: 0.9rem;
	}
	.asr.good .asr-score {
		color: var(--color-success);
	}
	.asr.okay .asr-score {
		color: var(--color-warning);
	}
	.asr.bad .asr-score {
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
	.rate-row .suggested {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 30%, transparent);
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
