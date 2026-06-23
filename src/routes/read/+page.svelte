<script lang="ts">
	import { MessageSquare, FileText } from 'lucide-svelte';
	import { passages, settings } from '$lib/db/store';
	import { LANGUAGES, type Passage } from '$lib/db/types';

	const conversations = $derived($passages.filter((p) => p.kind === 'conversation'));
	const texts = $derived($passages.filter((p) => p.kind === 'text'));
	const langName = $derived(LANGUAGES.find((l) => l.code === $settings.activeLanguage)?.name ?? '');
</script>

<header class="head">
	<h1>Read</h1>
	<p class="muted">Natural {langName} conversations and short texts. Tap any line for the reading and translation, or send a line to your reviews.</p>
</header>

{#snippet card(p: Passage)}
	<a class="card" href="/read/{p.id}">
		<div class="card-top">
			<span class="title">{p.title}</span>
			<span class="level">{p.level}</span>
		</div>
		{#if p.intro}<p class="intro">{p.intro}</p>{/if}
		<div class="meta">
			<span>{p.lines.length} lines</span>
			{#each p.tags.slice(0, 3) as t (t)}<span class="tag">{t}</span>{/each}
		</div>
	</a>
{/snippet}

<section class="group">
	<h2><MessageSquare size={18} /> Conversations</h2>
	{#if conversations.length === 0}
		<p class="muted empty">Nothing here yet for {langName}.</p>
	{:else}
		<div class="grid">
			{#each conversations as p (p.id)}{@render card(p)}{/each}
		</div>
	{/if}
</section>

<section class="group">
	<h2><FileText size={18} /> Texts</h2>
	{#if texts.length === 0}
		<p class="muted empty">Nothing here yet for {langName}.</p>
	{:else}
		<div class="grid">
			{#each texts as p (p.id)}{@render card(p)}{/each}
		</div>
	{/if}
</section>

<style>
	.head {
		margin-bottom: 1.5rem;
	}
	h1 {
		margin: 0 0 0.25rem;
	}
	.muted {
		color: var(--color-text-muted);
	}
	.group {
		margin-bottom: 2rem;
	}
	.group h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.15rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
		gap: 1rem;
	}
	.card {
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1rem 1.1rem;
		background: var(--color-bg-secondary);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.card:hover {
		border-color: var(--color-accent);
	}
	.card-top {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
	}
	.title {
		font-weight: 600;
	}
	.level {
		font-size: 0.72rem;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		background: var(--color-bg-elevated);
		color: var(--color-text-muted);
		white-space: nowrap;
	}
	.intro {
		color: var(--color-text-muted);
		font-size: 0.9rem;
		margin: 0;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
		color: var(--color-text-muted);
		font-size: 0.78rem;
	}
	.tag {
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		background: var(--color-bg-elevated);
	}
	.empty {
		font-size: 0.9rem;
	}
</style>
