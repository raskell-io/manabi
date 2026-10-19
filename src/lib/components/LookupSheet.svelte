<script lang="ts">
	/**
	 * Dictionary entry for a tapped word (TapText): headword, reading, glosses,
	 * how the tapped form relates to it (食べました → 食べる, polite · past), audio
	 * and "Add to reviews". A bottom sheet on phones, a centered card on wider
	 * screens — the same shape as the glyph sheet.
	 */
	import { X, Plus, Check, Loader2 } from 'lucide-svelte';
	import ScriptText from './ScriptText.svelte';
	import AudioButton from './AudioButton.svelte';
	import { allItems, settings, studyVocabWord } from '$lib/db/store';
	import type { Language } from '$lib/db/types';
	import { displayReading } from '$lib/chinese';
	import { DICT_CREDIT } from '$lib/dictionary';
	import type { DictHit } from '$lib/lookup';
	import type { DictEntry } from '$lib/dict-shard';

	let {
		hit,
		surface,
		language,
		loading = false,
		onClose
	}: {
		hit: DictHit | null;
		/** The tapped text, shown while loading or when nothing matches. */
		surface: string;
		language: Language;
		loading?: boolean;
		onClose: () => void;
	} = $props();

	const entries = $derived(hit?.entries.slice(0, 3) ?? []);
	const studied = $derived(new Map($allItems.filter((it) => it.language === language).map((it) => [it.target, it.id] as const)));

	function add(e: DictEntry) {
		studyVocabWord(language, { t: e.w, r: e.r, m: e.g.join('; ') }, 'dictionary');
	}

	function onKey(ev: KeyboardEvent) {
		if (ev.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={onKey} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onClose}></div>
<div class="sheet" role="dialog" aria-modal="true" aria-label="Dictionary: {surface}">
	<button class="close" onclick={onClose} aria-label="Close"><X size={20} /></button>

	{#if loading}
		<p class="state"><Loader2 size={18} class="spin" /> Looking up <ScriptText text={surface} {language} size="sm" />…</p>
	{:else if !entries.length}
		<p class="state">No dictionary entry for <ScriptText text={surface} {language} size="sm" />.</p>
	{:else}
		{#if hit && (hit.note || hit.surface !== entries[0].w)}
			<p class="tapped">
				<ScriptText text={hit.surface} {language} size="sm" />
				{#if hit.note}<span class="note">{hit.note}</span>{/if}
			</p>
		{/if}
		{#each entries as e, i (i)}
			<section class="entry">
				<div class="head">
					<span class="word"><ScriptText text={e.w} {language} size="lg" forceVowels /></span>
					<AudioButton text={e.w} {language} label="Play {e.w}" />
				</div>
				{#if e.r}<p class="reading">{displayReading(e.r, e.w, language, $settings.zhReading)}{#if e.p && language !== 'ja'}<span class="pos">{e.p}</span>{/if}</p>{/if}
				<ol class="glosses">
					{#each e.g as g, j (j)}<li>{g}</li>{/each}
				</ol>
				{#if studied.has(e.w)}
					<a class="in-reviews" href="/items/{studied.get(e.w)}"><Check size={16} /> In your reviews</a>
				{:else}
					<button class="btn3d add" onclick={() => add(e)}><Plus size={16} /> Add to reviews</button>
				{/if}
			</section>
		{/each}
	{/if}
	<p class="credit">Dictionary: {DICT_CREDIT[language]}</p>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(20, 16, 40, 0.45);
		z-index: 60;
		animation: fade 0.2s ease;
	}
	.sheet {
		position: fixed;
		z-index: 61;
		left: 50%;
		top: 50%;
		translate: -50% -50%;
		width: min(28rem, calc(100vw - 2rem));
		max-height: calc(100vh - 2rem);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		padding: 1.25rem 1.25rem 1.1rem;
		border-radius: 1.5rem;
		background: var(--color-bg);
		border: 2px solid var(--color-border);
		box-shadow: var(--shadow-soft);
		animation: pop-in 0.3s cubic-bezier(0.3, 1.3, 0.5, 1);
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	.close {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		display: inline-flex;
		padding: 0.35rem;
		border: none;
		border-radius: 0.7rem;
		background: transparent;
		color: var(--color-text-muted);
	}
	.close:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text);
	}
	.state {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0.4rem 2rem 0 0;
		color: var(--color-text-muted);
		font-weight: 700;
	}
	.state :global(.spin) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.tapped {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 0 2rem 0 0;
		color: var(--color-text-muted);
	}
	.note {
		font-size: 0.8rem;
		font-weight: 800;
		padding: 0.1rem 0.55rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-sky) 14%, var(--color-bg));
		color: color-mix(in srgb, var(--color-sky) 70%, var(--color-text));
	}
	.entry {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding-top: 0.2rem;
	}
	.entry + .entry {
		border-top: 2px solid var(--color-border);
		padding-top: 0.9rem;
	}
	.head {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding-right: 2rem;
	}
	.word {
		color: var(--color-accent);
	}
	.reading {
		margin: 0;
		font-weight: 900;
		font-size: 1.05rem;
	}
	.pos {
		margin-left: 0.5rem;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-text-muted);
	}
	.glosses {
		margin: 0;
		padding-left: 1.3rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.add {
		align-self: flex-start;
		margin-top: 0.3rem;
	}
	.in-reviews {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.3rem;
		color: var(--color-success);
		font-weight: 900;
	}
	.credit {
		margin: 0;
		font-size: 0.72rem;
		color: var(--color-text-muted);
	}

	@media (max-width: 520px) {
		.sheet {
			top: auto;
			bottom: 0;
			left: 0;
			translate: none;
			width: 100%;
			max-height: 85vh;
			border-radius: 1.5rem 1.5rem 0 0;
			border-bottom: none;
			padding-bottom: calc(1.1rem + env(safe-area-inset-bottom));
			animation: sheet-up 0.3s cubic-bezier(0.3, 1.1, 0.5, 1);
		}
		@keyframes sheet-up {
			from {
				transform: translateY(100%);
			}
		}
	}
</style>
