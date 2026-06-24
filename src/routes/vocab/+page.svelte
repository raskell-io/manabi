<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { Plus, Check, Search, Loader2 } from 'lucide-svelte';
	import ScriptText from '$lib/components/ScriptText.svelte';
	import { addVocabWords, studyVocabWord, settings, type VocabWord } from '$lib/db/store';
	import { LANGUAGES, type Language } from '$lib/db/types';

	type LevelMeta = { level: string; file: string; count: number };
	type Manifest = Record<string, LevelMeta[]>;

	const lang = $derived<Language>($settings.activeLanguage);
	const langName = $derived(LANGUAGES.find((l) => l.code === lang)?.name ?? '');

	let manifest = $state<Manifest>({});
	let activeLevel = $state('');
	let words = $state<VocabWord[]>([]);
	let loading = $state(false);
	let query = $state('');
	let added = $state<Set<string>>(new Set());

	const levels = $derived<LevelMeta[]>(manifest[lang] ?? []);
	const meta = $derived(levels.find((l) => l.level === activeLevel));

	const DISPLAY_CAP = 600;
	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return words;
		return words.filter(
			(w) => w.t.includes(q) || w.r.toLowerCase().includes(q) || w.m.toLowerCase().includes(q)
		);
	});
	const shown = $derived(filtered.slice(0, DISPLAY_CAP));

	onMount(async () => {
		try {
			manifest = await (await fetch(`${base}/wordlists/index.json`)).json();
		} catch {
			/* offline / not generated */
		}
	});

	// When language changes, pick its first level.
	$effect(() => {
		if (levels.length && !levels.some((l) => l.level === activeLevel)) {
			selectLevel(levels[0].level);
		}
	});

	async function selectLevel(level: string) {
		activeLevel = level;
		query = '';
		const m = (manifest[lang] ?? []).find((l) => l.level === level);
		if (!m) return;
		loading = true;
		words = [];
		try {
			words = await (await fetch(`${base}/wordlists/${m.file}`)).json();
		} catch {
			words = [];
		} finally {
			loading = false;
		}
	}

	function add(w: VocabWord) {
		studyVocabWord(lang, w, `${lang.toUpperCase()} ${activeLevel}`);
		added = new Set(added).add(w.t);
	}

	function addLevel() {
		if (!meta) return;
		const label = lang === 'zh' ? `HSK ${activeLevel}` : activeLevel;
		if (!confirm(`Add all ${meta.count} ${label} words to your reviews?`)) return;
		const n = addVocabWords(lang, words, `${lang.toUpperCase()} ${activeLevel}`);
		added = new Set([...added, ...words.map((w) => w.t)]);
		alert(`Added ${n} new word${n === 1 ? '' : 's'} to your reviews.`);
	}
</script>

<header class="head">
	<h1>Vocabulary</h1>
	<p class="muted">
		{lang === 'zh' ? 'Full HSK 3.0' : 'JLPT N5–N1'} {langName} word lists. Use
		<strong>＋ Add</strong> to drop a word into your spaced-repetition reviews — or add a whole level at once.
	</p>
</header>

{#if levels.length === 0}
	<p class="muted">No word lists for {langName} yet.</p>
{:else}
	<div class="tabs" role="tablist">
		{#each levels as l (l.level)}
			<button class="tab" class:active={l.level === activeLevel} role="tab" aria-selected={l.level === activeLevel} onclick={() => selectLevel(l.level)}>
				{lang === 'zh' ? 'HSK ' : ''}{l.level} <span class="count">{l.count}</span>
			</button>
		{/each}
	</div>

	<div class="controls">
		<div class="search">
			<Search size={16} />
			<input placeholder="Search word, reading, meaning…" bind:value={query} />
		</div>
		{#if meta}<button class="add-all" onclick={addLevel}><Plus size={14} /> Add all {meta.count}</button>{/if}
	</div>

	{#if loading}
		<p class="muted loading"><Loader2 size={16} class="spin" /> Loading…</p>
	{:else}
		<p class="count-line">
			{filtered.length}{query ? ' matches' : ' words'}{filtered.length > DISPLAY_CAP ? ` · showing first ${DISPLAY_CAP}, search to narrow` : ''}
		</p>
		<ul class="list">
			{#each shown as w (w.t)}
				<li>
					<div class="word-col">
						{#if w.r}<span class="reading">{w.r}</span>{/if}
						<ScriptText text={w.t} language={lang} size="lg" />
					</div>
					<span class="meaning">{w.m}</span>
					<button class="study" class:done={added.has(w.t)} onclick={() => add(w)} title="Add this word to your spaced-repetition reviews">
						{#if added.has(w.t)}<Check size={15} /> Added{:else}<Plus size={15} /> Add{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<p class="credits">
		Chinese: HSK 3.0 word lists (complete-hsk-vocabulary). Japanese: JLPT N5–N1 vocab
		(open-anki-jlpt-decks, derived from JMdict / Tanos JLPT lists).
	</p>
{/if}

<style>
	.head {
		margin-bottom: 1rem;
	}
	h1 {
		margin: 0;
	}
	.muted {
		color: var(--color-text-muted);
		margin: 0.25rem 0 0;
	}
	.tabs {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		border-bottom: 1px solid var(--color-border);
		margin: 1rem 0;
	}
	.tab {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.9rem;
		border: none;
		border-bottom: 2px solid transparent;
		background: transparent;
		color: var(--color-text-muted);
		font-weight: 600;
		font-size: 0.92rem;
		margin-bottom: -1px;
	}
	.tab.active {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
	}
	.tab .count {
		font-size: 0.7rem;
		opacity: 0.7;
	}
	.controls {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	.search {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
		color: var(--color-text-muted);
	}
	.search input {
		flex: 1;
		border: none;
		background: transparent;
		color: var(--color-text);
		outline: none;
		font-size: 0.95rem;
	}
	.add-all {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.45rem 0.85rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-secondary);
		color: var(--color-text-muted);
		font-size: 0.82rem;
		white-space: nowrap;
	}
	.add-all:hover {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
	.count-line {
		color: var(--color-text-muted);
		font-size: 0.8rem;
		margin: 0 0 0.5rem;
	}
	.loading {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	:global(.loading .spin) {
		animation: spin 0.9s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.list li {
		display: grid;
		grid-template-columns: minmax(3rem, max-content) 1fr auto;
		gap: 1.25rem;
		align-items: center;
		padding: 0.6rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: 0.55rem;
		background: var(--color-bg-secondary);
	}
	.word-col {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.05rem;
		min-width: 0;
		line-height: 1.15;
	}
	.reading {
		color: var(--color-text-muted);
		font-size: 0.8rem;
	}
	.meaning {
		color: var(--color-text);
		font-size: 0.95rem;
		min-width: 0;
	}
	.study {
		justify-self: end;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.45rem 0.85rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-accent);
		font-size: 0.82rem;
		font-weight: 600;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.study:hover {
		border-color: var(--color-accent);
	}
	.study.done {
		color: var(--color-success);
		border-color: var(--color-success);
	}
	.credits {
		margin-top: 1.5rem;
		font-size: 0.72rem;
		color: var(--color-text-muted);
	}
	@media (max-width: 560px) {
		.list li {
			gap: 0.75rem;
			padding: 0.6rem 0.75rem;
		}
		.meaning {
			font-size: 0.88rem;
		}
		.study {
			padding: 0.4rem 0.6rem;
		}
	}
</style>
