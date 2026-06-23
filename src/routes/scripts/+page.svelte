<script lang="ts">
	import { Eye, Plus, Check } from 'lucide-svelte';
	import { settings, studyScriptChar } from '$lib/db/store';
	import { scriptSections, blockGlyphs, type Glyph, type ScriptSection } from '$lib/scripts';
	import { LANGUAGES, languageDir, type Language } from '$lib/db/types';

	const lang = $derived<Language>($settings.activeLanguage);
	const sections = $derived(scriptSections(lang));
	const langName = $derived(LANGUAGES.find((l) => l.code === lang)?.name ?? '');
	const dir = $derived(languageDir(lang));

	let activeId = $state('');
	let levelIdx = $state(0);
	let hideReadings = $state(false);
	let added = $state<Set<string>>(new Set());

	// Keep the active tab valid when the language changes; reset level on tab change.
	$effect(() => {
		if (!sections.some((s) => s.id === activeId)) activeId = sections[0]?.id ?? '';
	});
	$effect(() => {
		activeId;
		levelIdx = 0;
	});

	const active = $derived<ScriptSection | undefined>(sections.find((s) => s.id === activeId));

	const visibleGlyphs = $derived.by(() => {
		if (!active) return [];
		if (active.kind === 'kana') return (active.kana ?? []).flatMap(blockGlyphs);
		if (active.kind === 'leveled') return active.levels?.[levelIdx]?.glyphs ?? [];
		return active.glyphs ?? [];
	});

	function add(glyph: Glyph) {
		studyScriptChar(lang, glyph);
		added = new Set(added).add(glyph.char);
	}
	function addVisible() {
		const next = new Set(added);
		for (const glyph of visibleGlyphs) {
			studyScriptChar(lang, glyph);
			next.add(glyph.char);
		}
		added = next;
	}
</script>

<header class="head">
	<div class="title-row">
		<h1>Scripts</h1>
		<label class="toggle">
			<input type="checkbox" bind:checked={hideReadings} /> <Eye size={14} /> Hide readings
		</label>
	</div>
	<p class="muted">{langName} writing systems. Tap any glyph to add it to your reviews.</p>
</header>

{#snippet cell(glyph: Glyph)}
	<button class="glyph-cell" class:added={added.has(glyph.char)} onclick={() => add(glyph)} title="Add to reviews">
		<span class="glyph" lang={lang === 'zh' ? 'zh-Hans' : lang} {dir}>{glyph.char}</span>
		{#if !hideReadings}
			<span class="roman">{glyph.roman}</span>
			{#if glyph.gloss}<span class="gloss">{glyph.gloss}</span>{/if}
		{/if}
		<span class="mark">{#if added.has(glyph.char)}<Check size={12} />{:else}<Plus size={12} />{/if}</span>
	</button>
{/snippet}

<!-- Section tabs -->
<div class="tabs" role="tablist">
	{#each sections as s (s.id)}
		<button class="tab" class:active={s.id === activeId} role="tab" aria-selected={s.id === activeId} onclick={() => (activeId = s.id)}>
			{s.title}
		</button>
	{/each}
</div>

{#if active}
	<div class="section-head">
		<div>
			{#if active.subtitle}<p class="sub">{active.subtitle}</p>{/if}
		</div>
		<button class="add-all" onclick={addVisible}><Plus size={14} /> Add these</button>
	</div>

	{#if active.kind === 'kana'}
		{#each active.kana ?? [] as block, bi (bi)}
			{#if block.label}<h3 class="block-label">{block.label}</h3>{/if}
			<div class="kana-grid">
				{#each block.rows as row, r (r)}
					{#each row as c, ci (ci)}
						{#if c}{@render cell(c)}{:else}<div class="glyph-cell empty"></div>{/if}
					{/each}
				{/each}
			</div>
		{/each}
	{:else if active.kind === 'leveled'}
		<div class="subtabs" role="tablist">
			{#each active.levels ?? [] as lvl, i (lvl.label)}
				<button class="subtab" class:active={i === levelIdx} role="tab" aria-selected={i === levelIdx} onclick={() => (levelIdx = i)}>
					{lvl.label} <span class="count">{lvl.glyphs.length}</span>
				</button>
			{/each}
		</div>
		<div class="wrap-grid" class:rtl={dir === 'rtl'}>
			{#each active.levels?.[levelIdx]?.glyphs ?? [] as glyph (glyph.char)}{@render cell(glyph)}{/each}
		</div>
	{:else}
		<div class="wrap-grid" class:rtl={dir === 'rtl'}>
			{#each active.glyphs ?? [] as glyph (glyph.char)}{@render cell(glyph)}{/each}
		</div>
	{/if}
{/if}

<style>
	.head {
		margin-bottom: 1rem;
	}
	.title-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	h1 {
		margin: 0;
	}
	.muted {
		color: var(--color-text-muted);
		margin: 0.25rem 0 0;
	}
	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}
	.tabs {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 1rem;
	}
	.tab {
		padding: 0.55rem 1rem;
		border: none;
		border-bottom: 2px solid transparent;
		background: transparent;
		color: var(--color-text-muted);
		font-size: 0.95rem;
		font-weight: 600;
		margin-bottom: -1px;
	}
	.tab:hover {
		color: var(--color-text);
	}
	.tab.active {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
	}
	.section-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}
	.sub {
		color: var(--color-text-muted);
		font-size: 0.88rem;
		margin: 0;
	}
	.add-all {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.4rem 0.8rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-secondary);
		color: var(--color-text-muted);
		font-size: 0.82rem;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.add-all:hover {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
	.subtabs {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}
	.subtab {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.8rem;
		border-radius: 999px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-secondary);
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}
	.subtab.active {
		border-color: var(--color-accent);
		color: var(--color-accent);
		font-weight: 600;
	}
	.subtab .count {
		font-size: 0.7rem;
		opacity: 0.7;
	}
	.block-label {
		font-size: 0.9rem;
		color: var(--color-text-muted);
		font-weight: 600;
		margin: 1.25rem 0 0.5rem;
	}
	.block-label:first-of-type {
		margin-top: 0;
	}
	.kana-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.5rem;
		max-width: 34rem;
	}
	.wrap-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.wrap-grid.rtl {
		direction: rtl;
	}
	.glyph-cell {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.15rem;
		min-width: 4.25rem;
		min-height: 4.25rem;
		padding: 0.5rem 0.4rem;
		border: 1px solid var(--color-border);
		border-radius: 0.6rem;
		background: var(--color-bg-secondary);
		color: var(--color-text);
	}
	.glyph-cell:hover {
		border-color: var(--color-accent);
	}
	.glyph-cell.added {
		border-color: var(--color-success);
		background: color-mix(in srgb, var(--color-success) 10%, var(--color-bg-secondary));
	}
	.glyph-cell.empty {
		border: none;
		background: transparent;
		min-height: 0;
	}
	.glyph {
		font-family: var(--font-script);
		font-size: 1.9rem;
		line-height: 1.1;
	}
	.roman {
		font-size: 0.78rem;
		color: var(--color-text-muted);
		text-align: center;
		line-height: 1.15;
	}
	.gloss {
		font-size: 0.7rem;
		color: var(--color-text-muted);
		text-align: center;
		line-height: 1.1;
	}
	.mark {
		position: absolute;
		top: 0.25rem;
		right: 0.3rem;
		color: var(--color-text-muted);
		opacity: 0.5;
	}
	.glyph-cell.added .mark {
		color: var(--color-success);
		opacity: 1;
	}

	@media (max-width: 480px) {
		.kana-grid {
			gap: 0.3rem;
		}
		.glyph-cell {
			min-width: 0;
			min-height: 3.4rem;
			padding: 0.4rem 0.2rem;
		}
		.glyph {
			font-size: 1.5rem;
		}
		.gloss {
			display: none;
		}
	}
</style>
