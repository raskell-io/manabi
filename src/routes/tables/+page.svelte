<script lang="ts">
	import { Eye, Plus, Check } from 'lucide-svelte';
	import { settings, studyScriptChar } from '$lib/db/store';
	import { scriptSections, sectionGlyphs, type Glyph, type ScriptSection } from '$lib/scripts';
	import { LANGUAGES, languageDir, type Language } from '$lib/db/types';

	const lang = $derived<Language>($settings.activeLanguage);
	const sections = $derived(scriptSections(lang));
	const langName = $derived(LANGUAGES.find((l) => l.code === lang)?.name ?? '');
	const dir = $derived(languageDir(lang));

	let hideReadings = $state(false);
	let added = $state<Set<string>>(new Set());

	function add(glyph: Glyph) {
		studyScriptChar(lang, glyph);
		added = new Set(added).add(glyph.char);
	}
	function addAll(section: ScriptSection) {
		const next = new Set(added);
		for (const glyph of sectionGlyphs(section)) {
			studyScriptChar(lang, glyph);
			next.add(glyph.char);
		}
		added = next;
	}
</script>

<header class="head">
	<div class="title-row">
		<h1>Tables</h1>
		<label class="toggle">
			<input type="checkbox" bind:checked={hideReadings} /> <Eye size={14} /> Hide readings
		</label>
	</div>
	<p class="muted">{langName} scripts. Tap any glyph to add it to your reviews.</p>
</header>

{#snippet cell(glyph: Glyph)}
	<button class="cell" class:added={added.has(glyph.char)} onclick={() => add(glyph)} title="Add to reviews">
		<span class="glyph" lang={lang === 'zh' ? 'zh-Hans' : lang} {dir}>{glyph.char}</span>
		{#if !hideReadings}
			<span class="roman">{glyph.roman}</span>
			{#if glyph.gloss}<span class="gloss">{glyph.gloss}</span>{/if}
		{/if}
		<span class="mark">{#if added.has(glyph.char)}<Check size={12} />{:else}<Plus size={12} />{/if}</span>
	</button>
{/snippet}

{#each sections as section (section.id)}
	<section class="block">
		<div class="block-head">
			<div>
				<h2>{section.title}</h2>
				{#if section.subtitle}<p class="sub">{section.subtitle}</p>{/if}
			</div>
			<button class="add-all" onclick={() => addAll(section)}><Plus size={14} /> Add all</button>
		</div>

		{#if section.layout === 'kana'}
			<div class="kana-grid">
				{#each section.rows ?? [] as row, r (r)}
					{#each row as c, ci (ci)}
						{#if c}{@render cell(c)}{:else}<div class="cell empty"></div>{/if}
					{/each}
				{/each}
			</div>
		{:else}
			<div class="wrap-grid" class:rtl={dir === 'rtl'}>
				{#each section.glyphs ?? [] as glyph (glyph.char)}{@render cell(glyph)}{/each}
			</div>
		{/if}
	</section>
{/each}

<style>
	.head {
		margin-bottom: 1.5rem;
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
	.block {
		margin-bottom: 2rem;
	}
	.block-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		margin-bottom: 0.75rem;
	}
	.block-head h2 {
		font-size: 1.15rem;
		margin: 0;
	}
	.sub {
		color: var(--color-text-muted);
		font-size: 0.85rem;
		margin: 0.15rem 0 0;
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
	.cell {
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
	.cell:hover {
		border-color: var(--color-accent);
	}
	.cell.added {
		border-color: var(--color-success);
		background: color-mix(in srgb, var(--color-success) 10%, var(--color-bg-secondary));
	}
	.cell.empty {
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
	.cell.added .mark {
		color: var(--color-success);
		opacity: 1;
	}

	/* Let the 5-column kana grid shrink to fit narrow phones. */
	@media (max-width: 480px) {
		.kana-grid {
			gap: 0.3rem;
		}
		.cell {
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
