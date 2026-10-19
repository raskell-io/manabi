<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { ArrowLeft, Search } from 'lucide-svelte';
	import GlyphSheet from '$lib/components/GlyphSheet.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import StrokePad from '$lib/components/StrokePad.svelte';
	import { allItems, setActiveLanguage, settings } from '$lib/db/store';
	import type { Language } from '$lib/db/types';
	import { RADICALS, getRadical, radicalMembers, searchRadicals, type Radical } from '$lib/radicals';
	import { scriptSections, sectionGlyphs, type Glyph } from '$lib/scripts';
	import { isBundled, strokeLang, hanChars } from '$lib/strokes';
	import { readingOf, displayText, scriptLangTag, toZhScript, zhScript } from '$lib/chinese';

	const lang = $derived<Language>($settings.activeLanguage);
	const drawLang = $derived(strokeLang(lang));
	// The character set the counts come from (the Scripts page's leveled table).
	const charSet = $derived(lang === 'zh' ? 'HSK 1–3' : lang === 'yue' ? 'Cantonese starter' : 'JLPT N5–N3');
	const scriptLang = $derived(scriptLangTag(lang, $zhScript));
	// Characters as read: Traditional forms (語, filed under 言) when that script is picked.
	const shown = (text: string) => displayText(text, lang, $toZhScript);

	// The characters this page lists: the language's Scripts reference set
	// (HSK 1–3 hanzi / JLPT N5–N3 kanji) plus any character in your own items,
	// keyed by the displayed form.
	const reference = $derived.by(() => {
		const m = new Map<string, Glyph>();
		for (const s of scriptSections(lang)) if (s.kind === 'leveled') for (const g of sectionGlyphs(s)) m.set(shown(g.char), g);
		return m;
	});
	const mine = $derived(
		new Set($allItems.filter((it) => it.language === lang).flatMap((it) => hanChars(shown(it.target))))
	);
	const keep = (c: string) => reference.has(c) || mine.has(c);

	const counts = $derived(
		RADICALS.map((r) => radicalMembers(r.n, keep).reduce((n, g) => n + g.chars.length, 0))
	);

	let query = $state('');
	let order = $state<'strokes' | 'used'>('strokes');
	const filtered = $derived(searchRadicals(query));
	const groups = $derived.by(() => {
		if (order === 'used') {
			return [{ label: 'Most used first', list: [...filtered].sort((a, b) => counts[b.n - 1] - counts[a.n - 1] || a.n - b.n) }];
		}
		const by = new Map<number, Radical[]>();
		for (const r of filtered) by.set(r.strokes, [...(by.get(r.strokes) ?? []), r]);
		return [...by].map(([s, list]) => ({ label: `${s} ${s === 1 ? 'stroke' : 'strokes'}`, list }));
	});

	// ?r=<number> opens one radical.
	const selected = $derived.by(() => {
		const n = Number($page.url.searchParams.get('r'));
		return Number.isInteger(n) ? getRadical(n) : undefined;
	});
	const members = $derived(selected ? radicalMembers(selected.n, keep) : []);
	function open(r: Radical) {
		void goto(`/radicals?r=${r.n}`, { noScroll: false });
	}

	// Members open the glyph sheet (stroke order, tracing, add to reviews).
	let sheet = $state<Glyph | null>(null);
	function glyphFor(c: string): Glyph {
		const ref = reference.get(c);
		if (ref) return ref;
		const it = $allItems.find((i) => i.language === lang && shown(i.target) === c);
		return { char: it?.target ?? c, roman: it?.reading ?? '', gloss: it?.meaning };
	}
</script>

{#if !drawLang}
	<div class="empty">
		<Mascot size={96} mood="think" />
		<h1>Radicals</h1>
		<p>Radicals are the building blocks of Chinese characters and Japanese kanji. Switch language to explore them.</p>
		<div class="switch">
			<button class="btn3d" onclick={() => setActiveLanguage('zh')}>中文 Chinese</button>
			<button class="btn3d" onclick={() => setActiveLanguage('ja')}>日本語 Japanese</button>
		</div>
		{#if lang === 'he'}
			<p class="roots-hint">Hebrew builds words from roots instead — <a href="/roots">explore the roots</a>.</p>
		{/if}
	</div>
{:else if selected}
	{@const total = counts[selected.n - 1]}
	<a class="back" href="/radicals"><ArrowLeft size={16} /> All radicals</a>
	<section class="detail">
		<div class="hero">
			<span class="hero-char" lang={scriptLang}>{selected.char}</span>
			<div class="hero-meta">
				<span class="num">Radical {selected.n} · {selected.strokes} {selected.strokes === 1 ? 'stroke' : 'strokes'}</span>
				<h1>{selected.meaning}</h1>
				{#if lang === 'zh' && selected.pinyin}<span class="pinyin">{$readingOf(selected.pinyin, selected.char, lang)}</span>{/if}
				{#if selected.variants.length}
					<span class="variants">
						Also written
						{#each selected.variants as v (v)}<span class="variant" lang={scriptLang}>{v}</span>{/each}
					</span>
				{/if}
			</div>
		</div>
		{#if isBundled(drawLang, selected.char)}
			<div class="pad-wrap">
				{#key selected.n}<StrokePad char={selected.char} lang={drawLang} size={200} />{/key}
			</div>
		{/if}
	</section>

	<h2 class="members-h">{total} {total === 1 ? 'character' : 'characters'} built on {selected.char}</h2>
	{#if total === 0}
		<p class="muted">None in the {charSet} set or your items yet.</p>
	{/if}
	{#each members as g (g.residual)}
		<h3 class="residual">{g.residual === 0 ? 'The radical itself' : `+${g.residual} ${g.residual === 1 ? 'stroke' : 'strokes'}`}</h3>
		<div class="member-grid">
			{#each g.chars as c (c)}
				{@const gl = glyphFor(c)}
				<button class="member" class:mine={mine.has(c)} onclick={() => (sheet = gl)} title={gl.gloss ?? ''}>
					<span class="m-char" lang={scriptLang}>{c}</span>
					<span class="m-read">{$readingOf(gl.roman, c, lang)}</span>
				</button>
			{/each}
		</div>
	{/each}
	{#if mine.size}<p class="legend"><i></i> in your reviews</p>{/if}
{:else}
	<header class="head">
		<h1>Radicals</h1>
		<p class="muted">
			The 214 building blocks of {lang === 'ja' ? 'kanji' : 'hanzi'}. Spot the radical and you can often guess a character’s
			meaning and look it up. Numbers show how many {charSet} characters use each one.
		</p>
	</header>

	<div class="toolbar">
		<label class="search">
			<Search size={16} />
			<input type="search" placeholder={lang === 'zh' ? 'Search: 水, water, shui, 85' : 'Search: 水, water, 85'} bind:value={query} />
		</label>
		<div class="order" role="tablist" aria-label="Order">
			<button role="tab" class:on={order === 'strokes'} aria-selected={order === 'strokes'} onclick={() => (order = 'strokes')}>By strokes</button>
			<button role="tab" class:on={order === 'used'} aria-selected={order === 'used'} onclick={() => (order = 'used')}>Most used</button>
		</div>
	</div>

	{#if filtered.length === 0}
		<p class="muted">No radical matches “{query}”.</p>
	{/if}
	{#each groups as grp (grp.label)}
		<h2 class="group-h">{grp.label}</h2>
		<div class="grid">
			{#each grp.list as r (r.n)}
				{@const n = counts[r.n - 1]}
				<button class="tile" class:unused={n === 0} onclick={() => open(r)}>
					<span class="t-num">{r.n}</span>
					{#if n > 0}<span class="t-count">{n}</span>{/if}
					<span class="t-char" lang={scriptLang}>{r.char}{#if r.variants[0]}<small>{r.variants[0]}</small>{/if}</span>
					<span class="t-meaning">{r.meaning}</span>
				</button>
			{/each}
		</div>
	{/each}

	<p class="credits">Radical index from the Unicode Unihan database; stroke data from Make Me a Hanzi and AnimCJK.</p>
{/if}

{#if sheet}
	<GlyphSheet glyph={sheet} language={lang} onClose={() => (sheet = null)} />
{/if}

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
	.order {
		display: inline-flex;
		padding: 0.2rem;
		border-radius: 999px;
		background: var(--color-bg-elevated);
	}
	.order button {
		padding: 0.4rem 0.9rem;
		border: none;
		border-radius: 999px;
		background: transparent;
		color: var(--color-text-muted);
		font: inherit;
		font-size: 0.82rem;
		font-weight: 800;
	}
	.order button.on {
		background: var(--color-bg);
		color: var(--color-teal);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
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
		grid-template-columns: repeat(auto-fill, minmax(5.6rem, 1fr));
		gap: 0.55rem;
	}
	.tile {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		padding: 0.85rem 0.3rem 0.55rem;
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
	.tile.unused {
		opacity: 0.5;
	}
	.t-num {
		position: absolute;
		top: 0.3rem;
		left: 0.45rem;
		font-size: 0.65rem;
		font-weight: 800;
		color: var(--color-text-muted);
	}
	.t-count {
		position: absolute;
		top: 0.3rem;
		right: 0.35rem;
		padding: 0 0.35rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-teal) 15%, transparent);
		color: var(--color-teal);
		font-size: 0.65rem;
		font-weight: 900;
	}
	.t-char {
		font-family: var(--font-script);
		font-size: 1.9rem;
		line-height: 1.2;
	}
	.t-char small {
		margin-left: 0.15rem;
		font-size: 0.9rem;
		color: var(--color-text-muted);
	}
	.t-meaning {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.72rem;
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
		justify-content: space-between;
		gap: 1.25rem;
		margin: 0.75rem 0 1rem;
		padding: 1.25rem;
		border: 2px solid var(--color-border);
		border-radius: 1.25rem;
	}
	.hero {
		display: flex;
		align-items: center;
		gap: 1.1rem;
	}
	.hero-char {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 5.5rem;
		height: 5.5rem;
		border-radius: 1.25rem;
		background: var(--color-teal);
		color: #fff;
		font-family: var(--font-script);
		font-size: 3.4rem;
		box-shadow: 0 5px 0 color-mix(in srgb, var(--color-teal) 68%, #000);
		flex-shrink: 0;
	}
	.hero-meta {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.hero-meta h1 {
		margin: 0;
		text-transform: capitalize;
	}
	.num {
		font-size: 0.75rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-teal);
	}
	.pinyin {
		font-weight: 800;
		color: var(--color-text-muted);
	}
	.variants {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.25rem;
		color: var(--color-text-muted);
		font-size: 0.85rem;
		font-weight: 700;
	}
	.variant {
		padding: 0 0.45rem;
		border-radius: 0.5rem;
		background: var(--color-bg-elevated);
		color: var(--color-text);
		font-family: var(--font-script);
		font-size: 1.15rem;
	}
	.pad-wrap {
		flex: 0 1 15rem;
		display: flex;
		justify-content: center;
	}
	.members-h {
		margin: 1.25rem 0 0.25rem;
	}
	.residual {
		margin: 1rem 0 0.45rem;
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}
	.member-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(4.6rem, 1fr));
		gap: 0.5rem;
	}
	.member {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem 0.25rem 0.4rem;
		border: 2px solid var(--color-border);
		border-bottom-width: 4px;
		border-radius: 0.9rem;
		background: var(--color-bg);
		color: var(--color-text);
	}
	.member:hover {
		border-color: color-mix(in srgb, var(--color-teal) 55%, var(--color-border));
	}
	.member.mine::after,
	.legend i {
		content: '';
		position: absolute;
		top: 0.35rem;
		right: 0.35rem;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 999px;
		background: var(--color-success);
	}
	.m-char {
		font-family: var(--font-script);
		font-size: 1.7rem;
		line-height: 1.25;
	}
	.m-read {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--color-text-muted);
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
	.legend i {
		position: static;
		display: inline-block;
	}
	.credits {
		margin-top: 2rem;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	/* Korean / Hebrew */
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
		gap: 0.6rem;
	}
	.empty .roots-hint {
		margin: 1rem 0 0;
	}
	.roots-hint a {
		color: var(--color-teal);
		font-weight: 800;
	}
</style>
