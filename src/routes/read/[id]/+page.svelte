<script lang="ts">
	import { page } from '$app/stores';
	import { ArrowLeft, Plus, Check, Eye, Languages } from 'lucide-svelte';
	import ScriptText from '$lib/components/ScriptText.svelte';
	import AudioButton from '$lib/components/AudioButton.svelte';
	import { getPassage, studyPassageLine } from '$lib/db/store';
	import { PASSAGE_KIND_LABELS, type Passage } from '$lib/db/types';

	const id = $derived($page.params.id);
	const passage = $derived<Passage | undefined>(id ? getPassage(id) : undefined);

	let showReadings = $state(false);
	let showTranslation = $state(false);
	let revealed = $state<Set<number>>(new Set());
	let mined = $state<Set<number>>(new Set());

	// Map each speaker to an alternating side for conversation layout.
	const speakerSide = $derived.by(() => {
		const map = new Map<string, number>();
		if (!passage) return map;
		for (const line of passage.lines) {
			const s = line.speaker ?? '';
			if (!map.has(s)) map.set(s, map.size % 2);
		}
		return map;
	});

	function toggleReveal(i: number) {
		const next = new Set(revealed);
		if (next.has(i)) next.delete(i);
		else next.add(i);
		revealed = next;
	}

	function showReadingFor(i: number): boolean {
		return showReadings || revealed.has(i);
	}
	function showMeaningFor(i: number): boolean {
		return showTranslation || revealed.has(i);
	}

	function mine(i: number) {
		if (!passage) return;
		studyPassageLine(passage.language, passage.lines[i]);
		mined = new Set(mined).add(i);
	}

	function mineAll() {
		if (!passage) return;
		const next = new Set(mined);
		passage.lines.forEach((line, i) => {
			studyPassageLine(passage.language, line);
			next.add(i);
		});
		mined = next;
	}
</script>

<a class="back" href="/read"><ArrowLeft size={16} /> Read</a>

{#if !passage}
	<p class="muted">Passage not found.</p>
{:else}
	<header class="head">
		<div class="title-row">
			<h1>{passage.title}</h1>
			<span class="kind">{PASSAGE_KIND_LABELS[passage.kind]} · {passage.level}</span>
		</div>
		{#if passage.intro}<p class="intro">{passage.intro}</p>{/if}
		<div class="controls">
			<button class:on={showReadings} onclick={() => (showReadings = !showReadings)}>
				<Eye size={15} /> Readings
			</button>
			<button class:on={showTranslation} onclick={() => (showTranslation = !showTranslation)}>
				<Languages size={15} /> Translation
			</button>
			<button class="mine-all" onclick={mineAll}><Plus size={15} /> Study all lines</button>
		</div>
	</header>

	<div class="lines" class:conversation={passage.kind === 'conversation'}>
		{#each passage.lines as line, i (i)}
			<div class="line side-{speakerSide.get(line.speaker ?? '') ?? 0}">
				{#if line.speaker}<span class="speaker">{line.speaker}</span>{/if}
				<div class="bubble">
					<div class="line-main">
						<button class="script-btn" onclick={() => toggleReveal(i)} title="Tap to reveal">
							<ScriptText text={line.target} language={passage.language} size="md" />
						</button>
						<div class="line-actions">
							<AudioButton text={line.target} language={passage.language} label="Play line" />
							<button class="study" class:done={mined.has(i)} onclick={() => mine(i)} title="Send to reviews">
								{#if mined.has(i)}<Check size={15} />{:else}<Plus size={15} />{/if}
							</button>
						</div>
					</div>
					{#if showReadingFor(i)}<div class="reading">{line.reading}</div>{/if}
					{#if showMeaningFor(i)}<div class="meaning">{line.meaning}</div>{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--color-text-muted);
		margin-bottom: 1rem;
	}
	.muted {
		color: var(--color-text-muted);
	}
	.head {
		margin-bottom: 1.5rem;
	}
	.title-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
	}
	h1 {
		margin: 0;
		font-size: 1.5rem;
	}
	.kind {
		font-size: 0.78rem;
		color: var(--color-text-muted);
		white-space: nowrap;
	}
	.intro {
		color: var(--color-text-muted);
		margin: 0.5rem 0 0;
	}
	.controls {
		display: flex;
		gap: 0.6rem;
		margin-top: 1rem;
		flex-wrap: wrap;
	}
	.controls button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.8rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-secondary);
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}
	.controls button.on {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
	.controls .mine-all {
		margin-left: auto;
	}
	.lines {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-width: 42rem;
	}
	.line {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.speaker {
		font-size: 0.78rem;
		color: var(--color-text-muted);
		font-weight: 600;
	}
	.bubble {
		border: 1px solid var(--color-border);
		border-radius: 0.65rem;
		padding: 0.7rem 0.9rem;
		background: var(--color-bg-secondary);
	}
	/* Conversation: alternate sides for the two main speakers. */
	.conversation .side-1 {
		align-items: flex-end;
	}
	.conversation .side-1 .bubble {
		background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg-secondary));
	}
	.conversation .line {
		max-width: 85%;
	}
	.conversation .side-1 {
		margin-left: auto;
	}
	.line-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.script-btn {
		border: none;
		background: transparent;
		padding: 0;
		text-align: inherit;
		color: inherit;
		flex: 1;
		min-width: 0;
	}
	.line-actions {
		display: flex;
		gap: 0.35rem;
		flex-shrink: 0;
	}
	.study {
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-accent);
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	.study.done {
		color: var(--color-success);
		border-color: var(--color-success);
	}
	.reading {
		color: var(--color-text-muted);
		font-size: 0.9rem;
		margin-top: 0.4rem;
	}
	.meaning {
		margin-top: 0.2rem;
	}
</style>
