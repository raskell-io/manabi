<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Check, MapPin, Plus, Search, Users } from 'lucide-svelte';
	import AudioButton from '$lib/components/AudioButton.svelte';
	import ScriptText from '$lib/components/ScriptText.svelte';
	import { allItems, settings, studyItems } from '$lib/db/store';
	import { stripNiqqud, type Language } from '$lib/db/types';
	import { displayReading } from '$lib/chinese';
	import { genderLabel, nameItem, nameSections, searchNames, type NameEntry, type NameGroup, type NameSection } from '$lib/names';

	const lang = $derived<Language>($settings.activeLanguage);
	const group = $derived<NameGroup>($page.url.searchParams.get('tab') === 'people' ? 'people' : 'places');
	function setGroup(g: NameGroup) {
		void goto(g === 'places' ? '/names' : '/names?tab=people', { replaceState: true, noScroll: true, keepFocus: true });
	}

	let query = $state('');
	// Searching covers both tabs, so a name is found wherever it lives.
	const sections = $derived(query.trim() ? searchNames(nameSections(lang), query) : nameSections(lang, group));
	const total = $derived(sections.reduce((n, s) => n + s.entries.length, 0));

	// Your items in this language, keyed loosely (Hebrew ignores vowel points).
	const key = (t: string) => (lang === 'he' ? stripNiqqud(t) : t);
	const mine = $derived(new Map($allItems.filter((it) => it.language === lang).map((it) => [key(it.target), it.id] as const)));
	const missing = (s: NameSection) => s.entries.filter((e) => !mine.has(key(e.t)));

	function add(s: NameSection, entries: NameEntry[]) {
		studyItems(
			lang,
			entries.map((e) => nameItem(lang, s, e))
		);
	}

	const BLURB: Record<Language, string> = {
		zh: 'Chinese writes foreign places by sound or by meaning, and people’s names family-first.',
		ja: 'Japan writes most foreign places in katakana, and its own places and people in kanji with readings you simply have to know.',
		ko: 'Korean writes most places by sound in Hangul; family names come first and a few cover most of the country.',
		he: 'Hebrew has its own names for many countries — some straight from the Bible — and given names that are often everyday words.'
	};
</script>

<header class="head">
	<h1>Names</h1>
	<p class="muted">
		Places and people turn up in every text and conversation, and they are hard to guess. {BLURB[lang]}
	</p>
</header>

<div class="toolbar">
	<div class="tabs" role="tablist" aria-label="Kind of name">
		<button role="tab" class:on={group === 'places' && !query} aria-selected={group === 'places'} onclick={() => setGroup('places')}>
			<MapPin size={15} /> Places
		</button>
		<button role="tab" class:on={group === 'people' && !query} aria-selected={group === 'people'} onclick={() => setGroup('people')}>
			<Users size={15} /> People
		</button>
	</div>
	<label class="search">
		<Search size={16} />
		<input type="search" placeholder="Search a name, reading or English" bind:value={query} />
	</label>
</div>

{#if total === 0}
	<p class="muted">No name matches “{query}”.</p>
{/if}

{#each sections as s (s.id)}
	{@const left = missing(s)}
	<section class="section">
		<div class="s-head">
			<div>
				<h2>{s.title}</h2>
				{#if s.note}<p class="s-note">{s.note}</p>{/if}
			</div>
			{#if left.length}
				<button class="btn3d ghost" onclick={() => add(s, left)}>
					<Plus size={16} /> Add {left.length === s.entries.length ? 'all' : left.length}
				</button>
			{:else}
				<span class="all-in"><Check size={16} /> In your reviews</span>
			{/if}
		</div>
		<div class="grid">
			{#each s.entries as e (e.t)}
				{@const id = mine.get(key(e.t))}
				<div class="card" class:mine={!!id}>
					<span class="c-script"><ScriptText text={e.t} language={lang} size="lg" /></span>
					<span class="c-read">{displayReading(e.r, e.t, lang, $settings.zhReading)}{#if e.tr && e.tr !== e.r} · {e.tr}{/if}</span>
					<span class="c-en">
						{e.m}
						{#if e.g}<span class="g g-{e.g}" title={genderLabel(e.g)}>{e.g === 'u' ? 'm/f' : e.g}</span>{/if}
					</span>
					{#if e.n}<span class="c-note">{e.n}</span>{/if}
					<span class="c-actions">
						<AudioButton text={e.t} language={lang} label="Play {e.m}" />
						{#if id}
							<a class="in" href="/items/{id}" title="In your reviews — open"><Check size={18} /></a>
						{:else}
							<button class="add" onclick={() => add(s, [e])} title="Add to reviews" aria-label="Add {e.m} to reviews"><Plus size={18} /></button>
						{/if}
					</span>
				</div>
			{/each}
		</div>
	</section>
{/each}

<p class="credits">Hand-picked: common countries, places and names, with literal meanings where they help you remember.</p>

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
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	.tabs {
		display: inline-flex;
		padding: 0.2rem;
		border-radius: 999px;
		background: var(--color-bg-elevated);
	}
	.tabs button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.45rem 1rem;
		border: none;
		border-radius: 999px;
		background: transparent;
		color: var(--color-text-muted);
		font: inherit;
		font-size: 0.85rem;
		font-weight: 800;
	}
	.tabs button.on {
		background: var(--color-bg);
		color: var(--color-teal);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
	}
	.search {
		flex: 1;
		min-width: 14rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
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
	.section {
		margin-top: 1.5rem;
	}
	.s-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.5rem 1rem;
		margin-bottom: 0.7rem;
	}
	.s-head h2 {
		margin: 0;
	}
	.s-note {
		margin: 0.2rem 0 0;
		max-width: 40rem;
		color: var(--color-text-muted);
		font-size: 0.88rem;
		font-weight: 600;
	}
	.s-head .btn3d {
		padding: 0.45rem 0.9rem;
		font-size: 0.8rem;
	}
	.all-in {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--color-success);
		font-size: 0.9rem;
		font-weight: 900;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr));
		gap: 0.6rem;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		padding: 0.75rem 0.85rem 0.6rem;
		border: 2px solid var(--color-border);
		border-bottom-width: 4px;
		border-radius: 1rem;
		background: var(--color-bg);
	}
	.card.mine {
		border-color: color-mix(in srgb, var(--color-success) 40%, var(--color-border));
	}
	.c-script {
		line-height: 1.3;
	}
	.c-read {
		color: var(--color-teal);
		font-size: 0.85rem;
		font-weight: 800;
	}
	.c-en {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-weight: 800;
	}
	.g {
		padding: 0 0.4rem;
		border-radius: 999px;
		font-size: 0.65rem;
		font-weight: 900;
		text-transform: uppercase;
	}
	.g-m {
		background: color-mix(in srgb, var(--color-sky) 15%, transparent);
		color: var(--color-sky);
	}
	.g-f {
		background: color-mix(in srgb, var(--color-pink) 15%, transparent);
		color: var(--color-pink);
	}
	.g-u {
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		color: var(--color-accent);
	}
	.c-note {
		color: var(--color-text-muted);
		font-size: 0.78rem;
		font-weight: 600;
	}
	.c-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.35rem;
		margin-top: auto;
		padding-top: 0.4rem;
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
	.credits {
		margin-top: 2rem;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}
	@media (max-width: 520px) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
