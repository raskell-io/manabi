<script lang="ts">
	import { onMount } from 'svelte';
	import { Check, X } from 'lucide-svelte';
	import AudioButton from './AudioButton.svelte';
	import Mascot from './Mascot.svelte';
	import Recorder from './Recorder.svelte';
	import ScriptText from './ScriptText.svelte';
	import { settings } from '$lib/db/store';
	import { displayReading, scriptLangTag, toZhScript, zhScript } from '$lib/chinese';
	import { playPrerecorded } from '$lib/audio';
	import { playCorrect, playWrong } from '$lib/sounds';
	import { tapCorrect, tapWrong } from '$lib/haptics';
	import type { Exercise, Choice } from '$lib/exercises/templates';
	import { languageDir, stripNiqqud, type LearningItem, type SelfRating } from '$lib/db/types';
	import type { AsrResult } from '$lib/pronunciation';

	export type CompleteResult =
		| { kind: 'mcq'; quality: number; chosen: string }
		| { kind: 'record'; rating: SelfRating; audioRef: string; asr?: AsrResult };

	let {
		exercise,
		item,
		onComplete
	}: {
		exercise: Exercise;
		item: LearningItem;
		onComplete: (result: CompleteResult) => void;
	} = $props();

	let selected = $state.raw<Choice | null>(null); // raw: compared by identity against `exercise.choices`
	let cheer = $state('');
	const answered = $derived(selected !== null);

	// Respect the Hebrew "hide vowels" setting and the Chinese script in text we
	// render by hand (ScriptText does both automatically, but here we split the
	// sentence to highlight the word).
	function shown(t: string): string {
		if (exercise.language === 'he' && $settings.hideHebrewVowels) return stripNiqqud(t);
		return exercise.language === 'zh' ? $toZhScript(t) : t;
	}

	// Readings (prompt, choices, cloze, reveal) as pinyin or Zhuyin.
	const rd = (reading: string) => displayReading(reading, item.target, exercise.language, $settings.zhReading);

	// Split the full cloze sentence around the answer so we can fill the blank in
	// place and highlight the inserted word once answered. The sentence is shown
	// whole where possible, so phrase-level conversion sees its full context.
	const clozeParts = $derived.by(() => {
		const full = exercise.clozeFull;
		if (!full) return null;
		const i = full.indexOf(item.target);
		if (i < 0) return null;
		const whole = shown(full);
		const word = shown(item.target);
		const j = whole.indexOf(word);
		if (j >= 0) return { before: whole.slice(0, j), word, after: whole.slice(j + word.length) };
		return { before: shown(full.slice(0, i)), word, after: shown(full.slice(i + item.target.length)) };
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

	const PRAISE = ['Nice!', 'Great job!', 'Awesome!', 'You got it!', 'Excellent!', 'Spot on!', 'Perfect!'];
	const COMFORT = ['Not quite', 'Almost!', 'So close', 'Keep going'];
	const pick = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)];

	function choose(c: Choice) {
		if (answered) return;
		selected = c;
		cheer = c.correct ? pick(PRAISE) : pick(COMFORT);
		if (c.correct) {
			playCorrect();
			tapCorrect();
		} else {
			playWrong();
			tapWrong();
		}
		// Cloze: play the full sentence once answered (after the chime rings).
		if (exercise.type === 'cloze' && exercise.clozeFull) {
			const lang = exercise.language;
			const text = exercise.clozeFull;
			setTimeout(() => void playPrerecorded(lang, text), 350);
		}
	}

	function finish(quality: number) {
		if (!selected) return;
		onComplete({ kind: 'mcq', quality, chosen: selected.label });
	}

	// (`asr: T | undefined`, not `asr?: T` — the Svelte compiler leaves the `?` in place.)
	function onRate(rating: SelfRating, audioRef: string, asr: AsrResult | undefined) {
		onComplete(asr ? { kind: 'record', rating, audioRef, asr } : { kind: 'record', rating, audioRef });
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
				<div class="reading">{rd(exercise.promptReading)}</div>
			{/if}
			<AudioButton text={item.target} language={item.language} itemId={item.id} label="Play word" />
		{:else if exercise.promptMode === 'reading'}
			<div class="big-reading">{rd(exercise.promptReading ?? '')}</div>
			{#if exercise.promptMeaning}<div class="reading">{exercise.promptMeaning}</div>{/if}
		{:else if exercise.promptMode === 'meaning'}
			<div class="big-meaning">{exercise.promptMeaning}</div>
		{:else if exercise.promptMode === 'audio'}
			<div class="audio-prompt">
				<AudioButton text={item.target} language={item.language} itemId={item.id} label="Play audio" big />
				<span class="hint">Tap to listen</span>
			</div>
		{:else if exercise.promptMode === 'cloze'}
			{#if answered && exercise.clozeFull}
				<!-- Answered: complete the sentence in place, with the reading beneath it. -->
				<p class="cloze-sentence" dir={languageDir(exercise.language)} lang={scriptLangTag(exercise.language, $zhScript)}>
					{#if clozeParts}{clozeParts.before}<strong>{clozeParts.word}</strong>{clozeParts.after}{:else}{shown(exercise.clozeFull ?? '')}{/if}
				</p>
				{#if exercise.clozeReading}<div class="reading">{rd(exercise.clozeReading)}</div>{/if}
				{#if exercise.clozeTranslit}<div class="translit">{exercise.clozeTranslit}</div>{/if}
				<AudioButton text={exercise.clozeFull} language={exercise.language} label="Play sentence" />
			{:else}
				<ScriptText text={exercise.clozeText ?? ''} language={exercise.language} size="lg" />
			{/if}
			{#if exercise.clozeMeaning}<div class="meaning-line">“{exercise.clozeMeaning}”</div>{/if}
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
							{exercise.type === 'word-to-reading' ? rd(c.label) : c.label}
						{/if}
					</span>
					{#if c.sublabel}<span class="choice-sub">{rd(c.sublabel)}</span>{/if}
					{#if answered && c.correct}<Check size={18} class="ic ok" />{/if}
					{#if answered && selected === c && !c.correct}<X size={18} class="ic no" />{/if}
				</button>
			{/each}
		</div>

		{#if answered}
			<div class="grade" class:ok={selected?.correct} class:no={!selected?.correct}>
				<div class="fb-head">
					<Mascot size={76} mood={selected?.correct ? 'cheer' : 'sad'} />
					<div class="fb-text">
						<p class="feedback">
							{#if selected?.correct}<Check size={22} strokeWidth={3.2} />{:else}<X size={22} strokeWidth={3.2} />{/if}
							{cheer}
						</p>
						{#if !selected?.correct}
							<p class="answer-line">
								Answer: <ScriptText text={exercise.type === 'word-to-reading' ? rd(exercise.answer) : exercise.answer} language={exercise.language} size="sm" />
							</p>
						{/if}
						<!-- Listening: confirm what the word was by revealing its reading + meaning. -->
						{#if exercise.type === 'audio-to-word'}
							<p class="reveal">
								{#if item.reading}<span class="reveal-reading">{rd(item.reading)}</span>{/if}
								<span class="reveal-meaning">{item.meaning}</span>
							</p>
						{/if}
					</div>
				</div>

				{#if selected?.correct}
					{#if $settings.gradeButtons}
						<div class="grade-row">
							<button class="btn3d ghost g" onclick={() => finish(3)}>Hard <kbd>1</kbd></button>
							<button class="btn3d success g" onclick={() => finish(4)}>Good <kbd>2</kbd></button>
							<button class="btn3d easy g" onclick={() => finish(5)}>Easy <kbd>3</kbd></button>
						</div>
					{:else}
						<div class="grade-row">
							<button class="btn3d success g wide" onclick={() => finish(4)}>Continue <kbd>↵</kbd></button>
						</div>
					{/if}
				{:else}
					<div class="grade-row">
						<button class="btn3d danger g wide" onclick={() => finish(0)}>Got it <kbd>↵</kbd></button>
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
		align-self: flex-start;
		font-size: 1.35rem;
		font-weight: 900;
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
		font-weight: 800;
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
		gap: 0.2rem;
		align-items: flex-start;
		justify-content: center;
		padding: 0.9rem 1.1rem;
		border-radius: var(--radius);
		border: 2px solid var(--color-border);
		border-bottom-width: 4px;
		background: var(--color-bg);
		color: var(--color-text);
		text-align: left;
		min-height: 4rem;
		font-weight: 700;
		transition:
			transform 0.08s ease,
			border-color 0.15s ease,
			background 0.15s ease;
		-webkit-tap-highlight-color: transparent;
	}
	.choice:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-border));
		background: color-mix(in srgb, var(--color-accent) 5%, var(--color-bg));
	}
	.choice:active:not(:disabled) {
		transform: translateY(2px);
		border-bottom-width: 2px;
		margin-top: 2px;
	}
	.choice:disabled {
		cursor: default;
	}
	.choice.correct {
		border-color: var(--color-success);
		background: color-mix(in srgb, var(--color-success) 12%, var(--color-bg));
		color: color-mix(in srgb, var(--color-success) 70%, var(--color-text));
		animation: pop-in 0.35s cubic-bezier(0.3, 1.4, 0.5, 1);
	}
	.choice.wrong {
		border-color: var(--color-danger);
		background: color-mix(in srgb, var(--color-danger) 10%, var(--color-bg));
		color: color-mix(in srgb, var(--color-danger) 70%, var(--color-text));
		animation: shake 0.4s ease;
	}
	.choices:has(.correct) .choice:not(.correct):not(.wrong) {
		opacity: 0.55;
	}
	.choice-main {
		font-size: 1.1rem;
	}
	.choice-sub {
		color: var(--color-text-muted);
		font-size: 0.85rem;
		font-weight: 600;
	}
	.choice .kbd {
		position: absolute;
		top: 0.45rem;
		right: 0.55rem;
		font-size: 0.7rem;
		font-weight: 800;
		color: var(--color-text-muted);
		border: 2px solid var(--color-border);
		border-radius: 0.4rem;
		padding: 0 0.3rem;
		line-height: 1.3;
	}
	.g kbd {
		font-family: inherit;
		font-size: 0.68rem;
		opacity: 0.7;
		border: 1.5px solid currentColor;
		border-radius: 0.3rem;
		padding: 0 0.25rem;
		margin-left: 0.2rem;
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

	/* Feedback banner (sticks to the bottom of long cards). */
	.grade {
		--fb: var(--color-success);
		position: sticky;
		bottom: 0.75rem;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		padding: 0.9rem 1rem 1rem;
		border-radius: 1.25rem;
		background: color-mix(in srgb, var(--fb) 13%, var(--color-bg));
		border: 2px solid color-mix(in srgb, var(--fb) 35%, var(--color-bg));
		animation: slide-up 0.3s cubic-bezier(0.3, 1.3, 0.5, 1);
		z-index: 2;
	}
	.grade.no {
		--fb: var(--color-danger);
	}
	@keyframes slide-up {
		from {
			transform: translateY(24px);
			opacity: 0;
		}
	}
	.fb-head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-align: left;
	}
	.fb-text {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}
	.feedback {
		margin: 0;
		display: flex;
		gap: 0.35rem;
		align-items: center;
		font-size: 1.35rem;
		font-weight: 900;
		color: var(--fb);
	}
	.answer-line {
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: baseline;
		font-weight: 800;
		color: var(--fb);
	}
	.reveal {
		display: flex;
		flex-wrap: wrap;
		gap: 0.1rem 0.6rem;
		align-items: baseline;
		margin: 0;
	}
	.reveal-reading {
		color: var(--color-text-muted);
		font-size: 0.9rem;
		font-weight: 700;
	}
	.reveal-meaning {
		font-weight: 800;
		font-size: 1.05rem;
	}
	.cloze-sentence {
		margin: 0;
		font-family: var(--font-script);
		font-size: 2.25rem;
		line-height: 1.35;
	}
	.cloze-sentence strong {
		color: var(--color-accent);
		font-weight: 700;
	}
	.translit {
		color: var(--color-text-muted);
		font-size: 0.9rem;
		font-style: italic;
	}
	.meaning-line {
		color: var(--color-text-muted);
		font-style: italic;
	}
	.grade-row {
		display: flex;
		gap: 0.6rem;
		justify-content: stretch;
	}
	.g {
		flex: 1;
		padding: 0.75rem 0.5rem;
	}
	.g.easy {
		--b: var(--color-sky);
	}
	@media (max-width: 520px) {
		.choices {
			gap: 0.6rem;
		}
		.choice {
			padding: 0.8rem 0.9rem;
		}
	}
</style>
