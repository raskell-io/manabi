<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { ArrowLeft, Check, Plus, Search } from 'lucide-svelte';
	import AudioButton from '$lib/components/AudioButton.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import { allItems, setActiveLanguage, settings, studyRootWords } from '$lib/db/store';
	import { ROOTS, consonants, getRoot, rootLabel, rootLetters, searchRoots, splitByRoot, type HebrewRoot, type RootWord } from '$lib/roots';

	const isHebrew = $derived($settings.activeLanguage === 'he');

	// Your Hebrew items by consonants, so a word counts as "yours" however it's vowelled.
	const mine = $derived(
		new Map($allItems.filter((it) => it.language === 'he').map((it) => [consonants(it.target), it.id] as const))
	);
	const mineIn = (r: HebrewRoot) => r.words.filter((w) => mine.has(consonants(w.t))).length;

	let query = $state('');
	const filtered = $derived(searchRoots(query));
	const yours = $derived(query ? [] : filtered.filter((r) => mineIn(r) > 0));

	// ?r=<id> opens one root.
	const selected = $derived(getRoot($page.url.searchParams.get('r') ?? ''));
	const missing = $derived(selected ? selected.words.filter((w) => !mine.has(consonants(w.t))) : []);
	function open(r: HebrewRoot) {
		void goto(`/roots?r=${r.id}`, { noScroll: false });
	}

	const POS: Record<RootWord['pos'], string> = { verb: 'verb', noun: 'noun', adj: 'adjective', phrase: 'phrase', other: 'word' };
</script>

{#if !isHebrew}
	<div class="empty">
		<Mascot size={96} mood="think" />
		<h1>Roots</h1>
		<p>
			Most Hebrew words grow from a root of three letters — <bdi lang="he">כ־ת־ב</bdi> gives “writes”, “letter” and “address”.
			Switch to Hebrew to explore them.
		</p>
		<div class="switch">
			<button class="btn3d" onclick={() => setActiveLanguage('he')}>עברית Hebrew</button>
			<a class="btn3d ghost" href="/radicals">Radicals (中文 · 日本語)</a>
		</div>
	</div>
{:else if selected}
	{@const letters = rootLetters(selected)}
	<a class="back" href="/roots"><ArrowLeft size={16} /> All roots</a>
	<section class="detail">
		<div class="letters" dir="rtl" lang="he">
			{#each letters as l, i (i)}<span class="letter">{l}</span>{/each}
		</div>
		<div class="hero-meta">
			<span class="kicker">Root · שֹׁרֶשׁ</span>
			<h1>{selected.meaning}</h1>
			{#if selected.note}<p class="note">{selected.note}</p>{/if}
		</div>
	</section>

	<div class="words-head">
		<h2>{selected.words.length} words from <bdi lang="he">{rootLabel(selected)}</bdi></h2>
		{#if missing.length}
			<button class="btn3d" onclick={() => studyRootWords(selected.id, missing)}>
				<Plus size={16} /> Add {missing.length === selected.words.length ? 'all' : `${missing.length} more`} to reviews
			</button>
		{:else}
			<span class="all-in"><Check size={16} /> All in your reviews</span>
		{/if}
	</div>

	<ul class="words">
		{#each selected.words as w (w.t)}
			{@const id = mine.get(consonants(w.t))}
			<li class="word" class:mine={!!id}>
				<span class="w-text" dir="rtl" lang="he">
					{#each splitByRoot(w.t, selected) as c, i (i)}<span class:hl={c.root}>{c.text}</span>{/each}
				</span>
				<span class="w-meta">
					<span class="w-gloss">{w.m}</span>
					<span class="w-read">{w.r} · <span class="pos">{POS[w.pos]}</span></span>
				</span>
				<span class="w-actions">
					<AudioButton text={w.t} language="he" label="Play {w.r}" />
					{#if id}
						<a class="in" href="/items/{id}" title="In your reviews — open"><Check size={18} /></a>
					{:else}
						<button class="add" onclick={() => studyRootWords(selected.id, [w])} title="Add to reviews" aria-label="Add {w.r} to reviews">
							<Plus size={18} />
						</button>
					{/if}
				</span>
			</li>
		{/each}
	</ul>
	<p class="legend"><span class="hl-key">כ</span> root letters</p>
{:else}
	<header class="head">
		<h1>Roots</h1>
		<p class="muted">
			Most Hebrew words are built from a root of three consonants, poured into patterns of vowels: <bdi lang="he">כּוֹתֵב</bdi> “writes”,
			<bdi lang="he">מִכְתָּב</bdi> “letter”, <bdi lang="he">כְּתֹבֶת</bdi> “address” all come from <bdi lang="he">כ־ת־ב</bdi>. Learn a root and
			a family of words opens up.
		</p>
	</header>

	<label class="search">
		<Search size={16} />
		<input type="search" placeholder="Search: כתב, writing, michtav" bind:value={query} />
	</label>

	{#if filtered.length === 0}
		<p class="muted">No root matches “{query}”.</p>
	{/if}
	{#if yours.length}
		<h2 class="group-h">In your words</h2>
		<div class="grid">
			{#each yours as r (r.id)}{@render tile(r)}{/each}
		</div>
	{/if}
	{#if filtered.length}
		<h2 class="group-h">{query ? 'Matches' : `All ${ROOTS.length} roots`}</h2>
		<div class="grid">
			{#each filtered as r (r.id)}{@render tile(r)}{/each}
		</div>
	{/if}

	<p class="credits">Roots and words are hand-picked everyday vocabulary, vowelled. Verbs are shown in the present tense, masculine.</p>
{/if}

{#snippet tile(r: HebrewRoot)}
	{@const n = mineIn(r)}
	<button class="tile" onclick={() => open(r)}>
		<span class="t-count" title="{r.words.length} words">{r.words.length}</span>
		{#if n}<span class="t-mine" title="{n} in your reviews">{n}</span>{/if}
		<span class="t-root" dir="rtl" lang="he">{rootLabel(r)}</span>
		<span class="t-meaning">{r.meaning}</span>
	</button>
{/snippet}

<style>
	.head h1 {
		margin: 0;
	}
	.muted {
		color: var(--color-text-muted);
	}
	.head .muted {
		margin: 0.3rem 0 1rem;
		max-width: 42rem;
	}
	.search {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		max-width: 28rem;
		padding: 0 0.85rem;
		border: 2px solid var(--color-border);
		border-radius: 999px;
		color: var(--color-text-muted);
	}
	.search:focus-within {
		border-color: var(--color-accent);
	}
	.search input {
		flex: 1;
		min-width: 0;
		padding: 0.6rem 0;
		border: none;
		outline: none;
		background: transparent;
		color: var(--color-text);
		font-size: 0.95rem;
	}
	.group-h {
		margin: 1.25rem 0 0.5rem;
		font-size: 0.8rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
		gap: 0.55rem;
	}
	.tile {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		padding: 1rem 0.4rem 0.6rem;
		border: 2px solid var(--color-border);
		border-bottom-width: 4px;
		border-radius: 1rem;
		background: var(--color-bg);
		color: var(--color-text);
		transition:
			transform 0.08s ease,
			border-color 0.15s ease;
	}
	.tile:hover {
		border-color: color-mix(in srgb, var(--color-teal) 55%, var(--color-border));
	}
	.tile:active {
		transform: translateY(2px);
		border-bottom-width: 2px;
		margin-top: 2px;
	}
	.t-count,
	.t-mine {
		position: absolute;
		top: 0.3rem;
		padding: 0 0.35rem;
		border-radius: 999px;
		font-size: 0.65rem;
		font-weight: 900;
	}
	.t-count {
		left: 0.35rem;
		background: color-mix(in srgb, var(--color-teal) 15%, transparent);
		color: var(--color-teal);
	}
	.t-mine {
		right: 0.35rem;
		background: color-mix(in srgb, var(--color-success) 15%, transparent);
		color: var(--color-success);
	}
	.t-root {
		font-family: var(--font-script);
		font-size: 1.6rem;
		line-height: 1.3;
		white-space: nowrap;
	}
	.t-meaning {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.74rem;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	/* Detail */
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--color-text-muted);
		font-weight: 800;
		font-size: 0.9rem;
	}
	.back:hover {
		color: var(--color-teal);
	}
	.detail {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1.25rem;
		margin: 0.75rem 0 1rem;
		padding: 1.25rem;
		border: 2px solid var(--color-border);
		border-radius: 1.25rem;
	}
	.letters {
		display: flex;
		gap: 0.45rem;
	}
	.letter {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3.6rem;
		height: 4rem;
		border-radius: 1rem;
		background: var(--color-teal);
		color: #fff;
		font-family: var(--font-script);
		font-size: 2.4rem;
		box-shadow: 0 5px 0 color-mix(in srgb, var(--color-teal) 68%, #000);
	}
	.hero-meta {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 12rem;
		flex: 1;
	}
	.hero-meta h1 {
		margin: 0;
		text-transform: capitalize;
	}
	.kicker {
		font-size: 0.75rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-teal);
	}
	.note {
		margin: 0.25rem 0 0;
		color: var(--color-text-muted);
		font-weight: 600;
	}
	.words-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin: 1.25rem 0 0.75rem;
	}
	.words-head h2 {
		margin: 0;
	}
	.words-head .btn3d {
		padding: 0.55rem 1rem;
		font-size: 0.85rem;
	}
	.all-in {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--color-success);
		font-weight: 900;
	}
	.words {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.word {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.65rem 0.85rem;
		border: 2px solid var(--color-border);
		border-radius: 1rem;
	}
	.word.mine {
		border-color: color-mix(in srgb, var(--color-success) 40%, var(--color-border));
	}
	.w-text {
		min-width: 6.5rem;
		font-family: var(--font-script);
		font-size: 1.7rem;
		line-height: 1.5;
		text-align: right;
		white-space: nowrap;
	}
	.hl,
	.hl-key {
		color: var(--color-pink);
		font-weight: 700;
	}
	.w-meta {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.w-gloss {
		font-weight: 800;
	}
	.w-read {
		color: var(--color-text-muted);
		font-size: 0.85rem;
		font-weight: 700;
	}
	.pos {
		font-weight: 600;
		font-style: italic;
	}
	.w-actions {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.add,
	.in {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 0.75rem;
	}
	.add {
		border: 2px solid var(--color-border);
		border-bottom-width: 3px;
		background: var(--color-bg);
		color: var(--color-accent);
	}
	.add:hover {
		border-color: var(--color-accent);
	}
	.in {
		background: color-mix(in srgb, var(--color-success) 14%, transparent);
		color: var(--color-success);
	}
	.legend {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 1rem;
		color: var(--color-text-muted);
		font-size: 0.8rem;
		font-weight: 700;
	}
	.hl-key {
		font-family: var(--font-script);
		font-size: 1.1rem;
	}
	.credits {
		margin-top: 2rem;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}
	@media (max-width: 520px) {
		.word {
			gap: 0.65rem;
			padding: 0.6rem 0.7rem;
		}
		.w-text {
			min-width: 0;
			font-size: 1.45rem;
		}
	}

	/* Not Hebrew */
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.5rem;
		max-width: 28rem;
		margin: 3rem auto 0;
	}
	.empty h1 {
		margin: 0.5rem 0 0;
	}
	.empty p {
		color: var(--color-text-muted);
		margin: 0 0 0.75rem;
	}
	.switch {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.6rem;
	}
</style>
