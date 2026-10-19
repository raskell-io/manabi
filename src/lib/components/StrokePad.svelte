<script lang="ts">
	/**
	 * Drawing pad for one hanzi/kanji, built on Hanzi Writer.
	 *  - Watch: animated stroke order (play, or step one stroke at a time); the
	 *    radical's strokes are tinted when the data marks them.
	 *  - Trace: write it yourself on the pad; each stroke is checked, a hint
	 *    flashes after two misses, and the outline can be hidden for recall.
	 * Practice only — nothing here is graded into the SRS.
	 */
	import { onDestroy, onMount, untrack } from 'svelte';
	import { Play, StepForward, RotateCcw, Eye, EyeOff, Lightbulb, PenLine, Clapperboard } from 'lucide-svelte';
	import type HanziWriter from 'hanzi-writer';
	import Mascot from './Mascot.svelte';
	import { loadStrokes, NoStrokeData, type StrokeLang } from '$lib/strokes';
	import { playCorrect } from '$lib/sounds';
	import { tapCorrect, tapWrong } from '$lib/haptics';

	let { char, lang, size = 260 }: { char: string; lang: StrokeLang; size?: number } = $props();

	let host = $state<HTMLDivElement>();
	let writer: HanziWriter | null = null;
	let status = $state<'loading' | 'ready' | 'error' | 'missing'>('loading');
	let mode = $state<'watch' | 'trace'>('watch');
	let total = $state(0);
	let step = $state(0); // strokes shown (watch) / strokes written (trace)
	let hasRadical = $state(false);
	let mistakes = $state(0);
	let done = $state(false);
	let outline = $state(true);
	let busy = false;

	function cssVar(name: string, fallback: string): string {
		const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
		return v || fallback;
	}

	async function mount(c: string) {
		if (!host) return;
		status = 'loading';
		done = false;
		step = 0;
		mistakes = 0;
		writer?.cancelQuiz();
		host.innerHTML = '';
		writer = null;
		try {
			const [{ default: HW }, data] = await Promise.all([import('hanzi-writer'), loadStrokes(lang, c)]);
			if (c !== char || !host) return; // the character changed while loading
			total = data.strokes.length;
			hasRadical = !!data.radStrokes?.length && data.radStrokes.length < total;
			writer = HW.create(host, c, {
				width: size,
				height: size,
				padding: 14,
				charDataLoader: (_c, onLoad) => onLoad(data),
				strokeColor: cssVar('--color-text', '#25213f'),
				radicalColor: hasRadical ? cssVar('--color-pink', '#ff5c9d') : null,
				outlineColor: cssVar('--color-border', '#e6e3f0'),
				highlightColor: cssVar('--color-sky', '#1aa3f0'),
				drawingColor: cssVar('--color-accent', '#6c4cf5'),
				drawingWidth: 14,
				strokeAnimationSpeed: 1.2,
				delayBetweenStrokes: 220,
				showCharacter: mode === 'watch',
				showOutline: true
			});
			status = 'ready';
			if (mode === 'trace') startTrace();
			else play();
		} catch (err) {
			if (c === char) status = err instanceof NoStrokeData ? 'missing' : 'error';
		}
	}

	onMount(() => void mount(char));
	// Re-mount when the character (or data set) changes.
	$effect(() => {
		const c = char;
		void lang;
		untrack(() => {
			if (writer || status === 'error' || status === 'missing') void mount(c);
		});
	});
	onDestroy(() => writer?.cancelQuiz());

	// --- Watch ---------------------------------------------------------------
	async function play() {
		if (!writer) return;
		step = 0;
		await writer.hideCharacter();
		step = total;
		await writer.animateCharacter();
	}
	async function nextStroke() {
		if (!writer || busy) return;
		busy = true;
		try {
			if (step >= total) {
				await writer.hideCharacter();
				step = 0;
			}
			await writer.animateStroke(step);
			step += 1;
		} finally {
			busy = false;
		}
	}

	// --- Trace ---------------------------------------------------------------
	function startTrace() {
		if (!writer) return;
		done = false;
		step = 0;
		mistakes = 0;
		writer.hideCharacter();
		if (outline) writer.showOutline();
		else writer.hideOutline();
		void writer.quiz({
			showHintAfterMisses: 2,
			leniency: 1.15,
			onCorrectStroke: (d) => {
				step = d.strokeNum + 1;
			},
			onMistake: () => {
				mistakes += 1;
				tapWrong();
			},
			onComplete: (s) => {
				done = true;
				mistakes = s.totalMistakes;
				playCorrect();
				tapCorrect();
			}
		});
	}
	function hint() {
		if (writer && !done && step < total) void writer.highlightStroke(step);
	}
	function toggleOutline() {
		outline = !outline;
		if (!writer) return;
		if (outline) writer.showOutline();
		else writer.hideOutline();
	}

	function setMode(m: 'watch' | 'trace') {
		if (m === mode) return;
		mode = m;
		if (!writer) return;
		writer.cancelQuiz();
		if (m === 'trace') startTrace();
		else {
			writer.showOutline();
			void play();
		}
	}
</script>

<div class="pad" style="--size: {size}px">
	<div class="modes" role="tablist" aria-label="Drawing mode">
		<button role="tab" class:on={mode === 'watch'} aria-selected={mode === 'watch'} onclick={() => setMode('watch')}>
			<Clapperboard size={15} /> Watch
		</button>
		<button role="tab" class:on={mode === 'trace'} aria-selected={mode === 'trace'} onclick={() => setMode('trace')}>
			<PenLine size={15} /> Trace
		</button>
	</div>

	<div class="board" class:tracing={mode === 'trace'}>
		<!-- 米字格 practice grid -->
		<svg class="grid" viewBox="0 0 100 100" aria-hidden="true">
			<rect x="1" y="1" width="98" height="98" rx="6" />
			<path d="M50 1V99M1 50H99M1 1L99 99M99 1L1 99" />
		</svg>
		<div class="host" bind:this={host} aria-label="Stroke order of {char}"></div>
		{#if status === 'loading'}
			<span class="state">Loading strokes…</span>
		{:else if status === 'error'}
			<span class="state">Couldn’t load the strokes for {char} — you may be offline.</span>
		{:else if status === 'missing'}
			<span class="state">The open stroke-order data has no {char} (it misses some Cantonese characters).</span>
		{/if}
		{#if done}
			<div class="done">
				<Mascot size={56} mood="cheer" />
				<span>{mistakes === 0 ? 'Perfect!' : mistakes <= 2 ? 'Nicely done!' : 'Got it!'}</span>
			</div>
		{/if}
	</div>

	{#if status === 'ready'}
		<div class="info">
			{#if mode === 'watch'}
				<span>Stroke {Math.min(step, total)} / {total}</span>
				{#if hasRadical}<span class="radical-key"><i></i> radical</span>{/if}
			{:else}
				<span>{done ? `${total} strokes` : `Stroke ${Math.min(step + 1, total)} / ${total}`}</span>
				<span class:warn={mistakes > 0}>{mistakes} {mistakes === 1 ? 'miss' : 'misses'}</span>
			{/if}
		</div>

		<div class="controls">
			{#if mode === 'watch'}
				<button class="btn3d ghost" onclick={play}><Play size={16} /> Play</button>
				<button class="btn3d ghost" onclick={nextStroke}><StepForward size={16} /> Step</button>
			{:else}
				<button class="btn3d ghost" onclick={startTrace}><RotateCcw size={16} /> Restart</button>
				<button class="btn3d ghost" onclick={hint} disabled={done}><Lightbulb size={16} /> Hint</button>
				<button class="btn3d ghost" onclick={toggleOutline} title={outline ? 'Hide the outline (write from memory)' : 'Show the outline'}>
					{#if outline}<EyeOff size={16} /> Memory{:else}<Eye size={16} /> Outline{/if}
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.pad {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
	}
	.modes {
		display: inline-flex;
		padding: 0.2rem;
		border-radius: 999px;
		background: var(--color-bg-elevated);
	}
	.modes button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 1rem;
		border: none;
		border-radius: 999px;
		background: transparent;
		color: var(--color-text-muted);
		font: inherit;
		font-size: 0.85rem;
		font-weight: 800;
	}
	.modes button.on {
		background: var(--color-bg);
		color: var(--color-accent);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
	}
	.board {
		position: relative;
		width: var(--size);
		height: var(--size);
		max-width: 100%;
		border-radius: 1.1rem;
		background: var(--color-bg);
		touch-action: none; /* the pad owns pointer gestures while tracing */
	}
	.board.tracing {
		cursor: crosshair;
	}
	.grid {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	.grid rect {
		fill: none;
		stroke: var(--color-border);
		stroke-width: 1.2;
	}
	.grid path {
		fill: none;
		stroke: var(--color-border);
		stroke-width: 0.5;
		stroke-dasharray: 2 2;
	}
	.host {
		position: relative;
		width: 100%;
		height: 100%;
	}
	.host :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}
	.state {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		text-align: center;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		font-weight: 700;
	}
	.done {
		position: absolute;
		left: 50%;
		bottom: -0.6rem;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.1rem 0.9rem 0.1rem 0.2rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-success) 14%, var(--color-bg));
		border: 2px solid color-mix(in srgb, var(--color-success) 40%, var(--color-bg));
		color: var(--color-success);
		font-weight: 900;
		white-space: nowrap;
		animation: pop-in 0.4s cubic-bezier(0.3, 1.4, 0.5, 1);
	}
	.info {
		display: flex;
		gap: 1rem;
		color: var(--color-text-muted);
		font-size: 0.82rem;
		font-weight: 800;
	}
	.info .warn {
		color: var(--color-warning);
	}
	.radical-key {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}
	.radical-key i {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 3px;
		background: var(--color-pink);
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
	}
	.controls .btn3d {
		padding: 0.5rem 0.85rem;
		font-size: 0.78rem;
	}
</style>
