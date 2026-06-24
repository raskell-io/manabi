<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { Check, X, BookOpen, Mic, Headphones, Layers } from 'lucide-svelte';
	import ExerciseRunner, { type CompleteResult } from '$lib/components/ExerciseRunner.svelte';
	import {
		activeItems,
		activeLanguage,
		gradeItem,
		getItem,
		getSkillMemory,
		recordPronunciationAttempt,
		snapshotQueue
	} from '$lib/db/store';
	import { buildExercise } from '$lib/exercises/generate';
	import { DIMENSION_LABELS, type Dimension, type LearningItem } from '$lib/db/types';
	import { loadAudioManifest, hasPrerecorded, type LangManifest } from '$lib/audio';
	import type { QueueTask } from '$lib/srs/queue';
	import type { Exercise } from '$lib/exercises/templates';

	type Mode = 'reading' | 'listening' | 'speaking' | 'everything';

	// Reading is the spaced-repetition core (text-only skills, due-scheduled).
	// Listening & Speaking are dead-simple practice over ANY of your words that
	// have a recorded clip — always available, no unlock and no due-date gating.
	const READING_DIMS = new Set<Dimension>(['recognition', 'recall', 'context']);

	let mode = $state<Mode | null>(null); // null → show the picker
	let allTasks = $state<QueueTask[]>([]);
	let manifests = $state<Record<string, LangManifest>>({});
	let tasks = $state<QueueTask[]>([]);
	let index = $state(0);
	let pool = $state<LearningItem[]>([]);
	let correct = $state(0);
	let wrong = $state(0);
	let done = $state(false);

	const started = $derived(mode !== null);

	// Your words that have a prerecorded clip — the pool for audio practice.
	const audioPool = $derived(
		pool.filter((it) => hasPrerecorded(manifests[it.language] ?? {}, it.target))
	);

	function isNew(itemId: string, dim: Dimension): boolean {
		return !getSkillMemory(itemId)?.dims[dim]?.introduced;
	}
	function readingTasks(): QueueTask[] {
		return allTasks.filter((t) => READING_DIMS.has(t.dimension));
	}
	// Audio practice over every clip-having word, un-introduced ones first.
	function audioTasks(dim: Dimension): QueueTask[] {
		return audioPool
			.map((it) => ({ itemId: it.id, dimension: dim, isNew: isNew(it.id, dim) }))
			.sort((a, b) => Number(b.isNew) - Number(a.isNew));
	}
	function tasksFor(m: Mode): QueueTask[] {
		if (m === 'reading') return readingTasks();
		if (m === 'listening') return audioTasks('listening');
		if (m === 'speaking') return audioTasks('pronunciation');
		return [...readingTasks(), ...audioTasks('listening'), ...audioTasks('pronunciation')];
	}

	const readingCount = $derived(readingTasks().length);
	const listeningCount = $derived(audioPool.length);
	const speakingCount = $derived(audioPool.length);
	const everythingCount = $derived(readingCount + listeningCount + speakingCount);

	let current = $derived(tasks[index]);
	let item = $derived<LearningItem | undefined>(current ? getItem(current.itemId) : undefined);
	// Listening (hear→word) and pronunciation (record-compare) use audio; the
	// reading dimensions are text-only.
	const taskAudio = $derived(
		current?.dimension === 'listening' || current?.dimension === 'pronunciation'
	);
	let exercise = $derived<Exercise | null>(
		current && item ? buildExercise(item, current.dimension, pool, { audio: taskAudio }) : null
	);

	function start(m: Mode) {
		mode = m;
		index = 0;
		correct = 0;
		wrong = 0;
		tasks = tasksFor(m);
		done = tasks.length === 0;
	}

	function backToModes() {
		mode = null;
		done = false;
		allTasks = snapshotQueue().tasks;
	}

	onMount(async () => {
		pool = get(activeItems);
		allTasks = snapshotQueue().tasks;
		// Load the active language's audio index so Listening/Speaking know which
		// words are playable (the pool is all one language).
		const lang = get(activeLanguage);
		manifests = { [lang]: await loadAudioManifest(lang) };
	});

	function advance() {
		if (index + 1 >= tasks.length) {
			done = true;
		} else {
			index += 1;
		}
	}

	function onComplete(result: CompleteResult) {
		if (!current || !item || !exercise) return;
		if (result.kind === 'mcq') {
			if (result.quality >= 3) correct += 1;
			else wrong += 1;
			gradeItem(item.id, current.dimension, result.quality, exercise.type, exercise.answer, result.chosen);
		} else {
			if (result.rating === 'good') correct += 1;
			else if (result.rating === 'bad') wrong += 1;
			recordPronunciationAttempt(item.id, result.audioRef, result.rating);
		}
		advance();
	}
</script>

{#if !started}
	<div class="picker">
		<h1>Review</h1>
		{#if everythingCount === 0}
			<p class="muted">Nothing to practice yet. Add items in <a href="/items">Items</a>, browse
				<a href="/vocab">Vocab</a>, or generate a batch in the <a href="/workbench">Workbench</a>.</p>
		{:else}
			<p class="muted">What do you want to practice?</p>
			<div class="modes">
				<button class="mode-card" onclick={() => start('reading')} disabled={readingCount === 0}>
					<BookOpen size={22} />
					<span class="m-title">Reading</span>
					<span class="m-desc">Recognition, recall &amp; context — text only.</span>
					<span class="m-count">{readingCount} {readingCount === 1 ? 'card' : 'cards'}</span>
				</button>
				<button class="mode-card" onclick={() => start('listening')} disabled={listeningCount === 0}>
					<Headphones size={22} />
					<span class="m-title">Listening</span>
					<span class="m-desc">Hear the word and choose it.</span>
					<span class="m-count">{listeningCount} {listeningCount === 1 ? 'card' : 'cards'}</span>
				</button>
				<button class="mode-card" onclick={() => start('speaking')} disabled={speakingCount === 0}>
					<Mic size={22} />
					<span class="m-title">Speaking</span>
					<span class="m-desc">Record &amp; compare your pronunciation.</span>
					<span class="m-count">{speakingCount} {speakingCount === 1 ? 'card' : 'cards'}</span>
				</button>
				<button class="mode-card" onclick={() => start('everything')} disabled={everythingCount === 0}>
					<Layers size={22} />
					<span class="m-title">Everything</span>
					<span class="m-desc">All of the above that's due.</span>
					<span class="m-count">{everythingCount} {everythingCount === 1 ? 'card' : 'cards'}</span>
				</button>
			</div>
		{/if}
	</div>
{:else if done}
	<div class="summary">
		<h1>Session complete</h1>
		<div class="tally">
			<span class="ok"><Check size={20} /> {correct}</span>
			<span class="no"><X size={20} /> {wrong}</span>
		</div>
		{#if tasks.length === 0}
			<p class="muted">Nothing was due for this mode.</p>
		{/if}
		<div class="actions">
			<a class="btn" href="/">Home</a>
			<button class="btn primary" onclick={backToModes}>Choose mode</button>
		</div>
	</div>
{:else if current && item && exercise}
	<div class="progress">
		<div class="bar" style="width: {(index / tasks.length) * 100}%"></div>
	</div>
	<div class="meta">
		<span>{index + 1} / {tasks.length}</span>
		<span class="dim">{DIMENSION_LABELS[current.dimension]}{current.isNew ? ' · new' : ''}</span>
	</div>

	{#key index}
		<div class="card">
			<ExerciseRunner {exercise} {item} {onComplete} />
		</div>
	{/key}
{:else}
	<p class="muted">Loading…</p>
{/if}

<style>
	.progress {
		height: 6px;
		background: var(--color-bg-elevated);
		border-radius: 999px;
		overflow: hidden;
		margin-bottom: 0.75rem;
	}
	.bar {
		height: 100%;
		background: var(--color-accent);
		transition: width 0.25s ease;
	}
	.meta {
		display: flex;
		justify-content: space-between;
		color: var(--color-text-muted);
		font-size: 0.85rem;
		margin-bottom: 2rem;
	}
	.dim {
		text-transform: capitalize;
	}
	.card {
		display: flex;
		justify-content: center;
		padding-top: 1rem;
	}
	.summary {
		text-align: center;
		max-width: 28rem;
		margin: 4rem auto 0;
	}
	.summary h1 {
		font-size: 1.6rem;
	}
	.tally {
		display: flex;
		gap: 2rem;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: 700;
		margin: 1.5rem 0;
	}
	.tally .ok {
		color: var(--color-success);
		display: inline-flex;
		gap: 0.4rem;
		align-items: center;
	}
	.tally .no {
		color: var(--color-danger);
		display: inline-flex;
		gap: 0.4rem;
		align-items: center;
	}
	.muted {
		color: var(--color-text-muted);
	}
	.actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-top: 1.5rem;
	}
	.btn {
		padding: 0.6rem 1.5rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		color: var(--color-text);
	}
	.btn.primary {
		background: var(--color-accent);
		color: #fff;
		border-color: var(--color-accent);
		font: inherit;
		cursor: pointer;
	}

	/* Mode picker */
	.picker {
		max-width: 44rem;
	}
	.picker h1 {
		margin: 0 0 0.25rem;
	}
	.picker .muted a {
		color: var(--color-accent);
	}
	.modes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		gap: 1rem;
		margin-top: 1.5rem;
	}
	.mode-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.4rem;
		padding: 1.25rem;
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		background: var(--color-bg-secondary);
		color: var(--color-text);
		text-align: left;
	}
	.mode-card:hover:not(:disabled) {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
	.mode-card:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.m-title {
		font-weight: 700;
		font-size: 1.05rem;
		margin-top: 0.25rem;
	}
	.m-desc {
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}
	.m-count {
		margin-top: 0.4rem;
		font-size: 0.8rem;
		color: var(--color-accent);
		font-weight: 600;
	}
</style>
