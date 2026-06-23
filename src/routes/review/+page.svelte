<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { Check, X } from 'lucide-svelte';
	import ExerciseRunner, { type CompleteResult } from '$lib/components/ExerciseRunner.svelte';
	import {
		activeItems,
		gradeItem,
		getItem,
		recordPronunciationAttempt,
		settings,
		snapshotQueue
	} from '$lib/db/store';
	import { buildExercise } from '$lib/exercises/generate';
	import { DIMENSION_LABELS, type LearningItem } from '$lib/db/types';
	import type { QueueTask } from '$lib/srs/queue';
	import type { Exercise } from '$lib/exercises/templates';

	let tasks = $state<QueueTask[]>([]);
	let index = $state(0);
	let pool: LearningItem[] = [];
	let correct = $state(0);
	let wrong = $state(0);
	let done = $state(false);

	let current = $derived(tasks[index]);
	let item = $derived<LearningItem | undefined>(current ? getItem(current.itemId) : undefined);
	let exercise = $derived<Exercise | null>(
		current && item
			? buildExercise(item, current.dimension, pool, { audio: $settings.localTtsEnabled })
			: null
	);

	onMount(() => {
		pool = get(activeItems);
		tasks = snapshotQueue().tasks;
		if (tasks.length === 0) done = true;
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

{#if done}
	<div class="summary">
		<h1>Session complete</h1>
		<div class="tally">
			<span class="ok"><Check size={20} /> {correct}</span>
			<span class="no"><X size={20} /> {wrong}</span>
		</div>
		{#if tasks.length === 0}
			<p class="muted">Nothing was due. Add items or generate a batch in the Workbench.</p>
		{/if}
		<div class="actions">
			<a class="btn" href="/">Home</a>
			<a class="btn primary" href="/review" onclick={() => location.reload()}>Again</a>
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
	}
</style>
