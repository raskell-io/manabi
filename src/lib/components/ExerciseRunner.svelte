<script lang="ts">
	import { onMount } from 'svelte';
	import { Check, X } from 'lucide-svelte';
	import AudioButton from './AudioButton.svelte';
	import Recorder from './Recorder.svelte';
	import ScriptText from './ScriptText.svelte';
	import { settings } from '$lib/db/store';
	import { playPrerecorded } from '$lib/audio';
	import { playCorrect, playWrong } from '$lib/sounds';
	import type { Exercise, Choice } from '$lib/exercises/templates';
	import { languageDir, type LearningItem, type SelfRating } from '$lib/db/types';

	export type CompleteResult =
		| { kind: 'mcq'; quality: number; chosen: string }
		| { kind: 'record'; rating: SelfRating; audioRef: string };

	let {
		exercise,
		item,
		onComplete
	}: {
		exercise: Exercise;
		item: LearningItem;
		onComplete: (result: CompleteResult) => void;
	} = $props();

	let selected = $state<Choice | null>(null);
	const answered = $derived(selected !== null);

	// Split the full cloze sentence around the answer so we can highlight the
	// inserted word in the post-answer reveal.
	const clozeParts = $derived.by(() => {
		const full = exercise.clozeFull;
		if (!full) return null;
		const i = full.indexOf(item.target);
		if (i < 0) return null;
		return { before: full.slice(0, i), word: item.target, after: full.slice(i + item.target.length) };
	});

	// Auto-play the word when it appears (the script prompt of a reading card, or
	// a listening card) — but not when it would give the answer away (recall /
	// cloze / record-compare). Runs once per card (keyed remount in the parent).
	onMount(() => {
		const autoPlay =
			exercise.type !== 'record-compare' &&
			(exercise.promptMode === 'script' || exercise.promptMode === 'audio');
		if (autoPlay) void playPrerecorded(item.language, item.target);
	});

	function choose(c: Choice) {
		if (answered) return;
		selected = c;
		if (c.correct) playCorrect();
		else playWrong();
	}

	function finish(quality: number) {
		if (!selected) return;
		onComplete({ kind: 'mcq', quality, chosen: selected.label });
	}

	function onRate(rating: SelfRating, audioRef: string) {
		onComplete({ kind: 'record', rating, audioRef });
	}

	// Keyboard control: number keys pick a choice; once answered, grade keys
	// advance (1=Hard/Continue, 2/Enter=Good, 3=Easy). Record-compare is mouse-driven.
	function handleKey(e: KeyboardEvent) {
		if (!exercise.choices) return;
		const tag = (e.target as HTMLElement)?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

		if (!answered) {
			const n = Number(e.key);
			if (Number.isInteger(n) && n >= 1 && n <= exercise.choices.length) {
				choose(exercise.choices[n - 1]);
				e.preventDefault();
			}
			return;
		}
		const advance = e.key === 'Enter' || e.key === ' ';
		if (selected?.correct) {
			// With grade buttons off, a correct answer always advances as "Good".
			if (!$settings.gradeButtons) {
				if (advance || e.key === '1') finish(4);
				else return;
			} else if (e.key === '1') finish(3);
			else if (e.key === '3') finish(5);
			else if (e.key === '2' || advance) finish(4);
			else return;
		} else if (e.key === '1' || advance) {
			finish(0);
		} else {
			return;
		}
		e.preventDefault();
	}
</script>

<svelte:window onkeydown={handleKey} />

<div class="exercise">
	<p class="instruction">{exercise.instruction}</p>

	<!-- Prompt -->
	<div class="prompt">
		{#if exercise.type === 'record-compare'}
			<Recorder
				text={item.target}
				reading={item.reading}
				language={item.language}
				itemId={item.id}
				{onRate}
			/>
		{:else if exercise.promptMode === 'script'}
			<ScriptText text={exercise.promptScript ?? ''} language={exercise.language} size="xl" />
			{#if exercise.promptReading}
				<div class="reading">{exercise.promptReading}</div>
			{/if}
			<AudioButton text={item.target} language={item.language} itemId={item.id} label="Play word" />
		{:else if exercise.promptMode === 'reading'}
			<div class="big-reading">{exercise.promptReading}</div>
			{#if exercise.promptMeaning}<div class="reading">{exercise.promptMeaning}</div>{/if}
		{:else if exercise.promptMode === 'meaning'}
			<div class="big-meaning">{exercise.promptMeaning}</div>
		{:else if exercise.promptMode === 'audio'}
			<div class="audio-prompt">
				<AudioButton text={item.target} language={item.language} itemId={item.id} label="Play audio" />
				<span class="hint">Tap to listen</span>
			</div>
		{:else if exercise.promptMode === 'cloze'}
			<ScriptText text={exercise.clozeText ?? ''} language={exercise.language} size="lg" />
			{#if exercise.clozeMeaning}<div class="reading">“{exercise.clozeMeaning}”</div>{/if}
		{/if}
	</div>

	<!-- Choices (MCQ) -->
	{#if exercise.choices}
		<div class="choices">
			{#each exercise.choices as c, i (c.key)}
				<button
					class="choice"
					class:correct={answered && c.correct}
					class:wrong={answered && selected === c && !c.correct}
					disabled={answered}
					onclick={() => choose(c)}
				>
					{#if !answered}<span class="kbd">{i + 1}</span>{/if}
					<span class="choice-main">
						{#if exercise.promptMode === 'reading' || exercise.promptMode === 'meaning' || exercise.promptMode === 'audio' || exercise.promptMode === 'cloze'}
							<ScriptText text={c.label} language={exercise.language} size="md" />
						{:else}
							{c.label}
						{/if}
					</span>
					{#if c.sublabel}<span class="choice-sub">{c.sublabel}</span>{/if}
					{#if answered && c.correct}<Check size={18} class="ic ok" />{/if}
					{#if answered && selected === c && !c.correct}<X size={18} class="ic no" />{/if}
				</button>
			{/each}
		</div>

		{#if answered}
			<div class="grade">
				{#if selected?.correct}
					<p class="feedback ok">Correct</p>
				{:else}
					<p class="feedback no">
						Answer: <ScriptText text={exercise.answer} language={exercise.language} size="sm" />
					</p>
				{/if}

				<!-- Listening: confirm what the word was by revealing its reading + meaning. -->
				{#if exercise.type === 'audio-to-word'}
					<p class="reveal">
						{#if item.reading}<span class="reveal-reading">{item.reading}</span>{/if}
						<span class="reveal-meaning">{item.meaning}</span>
					</p>
				{/if}

				<!-- Cloze: reveal the full sentence with the answer filled in + its reading. -->
				{#if exercise.type === 'cloze' && exercise.clozeFull}
					<div class="cloze-reveal">
						<p class="cloze-sentence" dir={languageDir(exercise.language)} lang={exercise.language}>
							{#if clozeParts}{clozeParts.before}<strong>{clozeParts.word}</strong>{clozeParts.after}{:else}{exercise.clozeFull}{/if}
						</p>
						{#if exercise.clozeReading}<span class="reveal-reading">{exercise.clozeReading}</span>{/if}
						{#if exercise.clozeTranslit}<span class="reveal-translit">{exercise.clozeTranslit}</span>{/if}
					</div>
				{/if}

				{#if selected?.correct}
					{#if $settings.gradeButtons}
						<div class="grade-row">
							<button class="g hard" onclick={() => finish(3)}>Hard <kbd>1</kbd></button>
							<button class="g good" onclick={() => finish(4)}>Good <kbd>2</kbd></button>
							<button class="g easy" onclick={() => finish(5)}>Easy <kbd>3</kbd></button>
						</div>
					{:else}
						<div class="grade-row">
							<button class="g good" onclick={() => finish(4)}>Next <kbd>↵</kbd></button>
						</div>
					{/if}
				{:else}
					<div class="grade-row">
						<button class="g again" onclick={() => finish(0)}>Continue <kbd>↵</kbd></button>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.exercise {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		align-items: center;
		width: 100%;
		max-width: 34rem;
		margin: 0 auto;
	}
	.instruction {
		color: var(--color-text-muted);
		font-size: 0.95rem;
		margin: 0;
	}
	.prompt {
		text-align: center;
		min-height: 4rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: center;
	}
	.reading {
		color: var(--color-text-muted);
	}
	.big-reading,
	.big-meaning {
		font-size: 2rem;
		font-weight: 600;
	}
	.audio-prompt {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: center;
	}
	.hint {
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}
	.choices {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		width: 100%;
	}
	.choice {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		align-items: flex-start;
		padding: 0.85rem 1rem;
		border-radius: 0.65rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-secondary);
		color: var(--color-text);
		text-align: left;
		min-height: 3.5rem;
	}
	.choice:hover:not(:disabled) {
		border-color: var(--color-accent);
	}
	.choice.correct {
		border-color: var(--color-success);
		background: color-mix(in srgb, var(--color-success) 12%, var(--color-bg-secondary));
	}
	.choice.wrong {
		border-color: var(--color-danger);
		background: color-mix(in srgb, var(--color-danger) 12%, var(--color-bg-secondary));
	}
	.choice-main {
		font-size: 1.05rem;
	}
	.choice-sub {
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}
	.choice .kbd {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		font-size: 0.7rem;
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
		border-radius: 0.3rem;
		padding: 0 0.3rem;
		line-height: 1.3;
	}
	.g kbd {
		font-size: 0.7rem;
		opacity: 0.6;
		border: 1px solid currentColor;
		border-radius: 0.25rem;
		padding: 0 0.25rem;
		margin-left: 0.15rem;
	}
	:global(.choice .ic) {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
	}
	:global(.choice .ic.ok) {
		color: var(--color-success);
	}
	:global(.choice .ic.no) {
		color: var(--color-danger);
	}
	.grade {
		text-align: center;
		width: 100%;
	}
	.feedback {
		font-weight: 600;
		display: flex;
		gap: 0.4rem;
		justify-content: center;
		align-items: center;
	}
	.feedback.ok {
		color: var(--color-success);
	}
	.feedback.no {
		color: var(--color-danger);
	}
	.reveal {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		align-items: center;
		margin: 0.6rem 0 0;
	}
	.reveal-reading {
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}
	.reveal-meaning {
		font-weight: 600;
		font-size: 1.05rem;
	}
	.cloze-reveal {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		align-items: center;
		margin: 0.6rem 0 0;
	}
	.cloze-sentence {
		margin: 0;
		font-family: var(--font-script);
		font-size: 1.25rem;
		line-height: 1.5;
	}
	.cloze-sentence strong {
		color: var(--color-accent);
		font-weight: 700;
	}
	.reveal-translit {
		color: var(--color-text-muted);
		font-size: 0.85rem;
		font-style: italic;
	}
	.grade-row {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		margin-top: 0.5rem;
	}
	.g {
		padding: 0.6rem 1.5rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-secondary);
		color: var(--color-text);
		font-weight: 600;
	}
	.g.hard:hover {
		border-color: var(--color-warning);
		color: var(--color-warning);
	}
	.g.good:hover,
	.g.again:hover {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
	.g.easy:hover {
		border-color: var(--color-success);
		color: var(--color-success);
	}
</style>
