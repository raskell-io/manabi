<script lang="ts">
	import { goto } from '$app/navigation';
	import { Plus, Search } from 'lucide-svelte';
	import ScriptText from '$lib/components/ScriptText.svelte';
	import AudioButton from '$lib/components/AudioButton.svelte';
	import { allItems, createItem, settings } from '$lib/db/store';
	import { LANGUAGES } from '$lib/db/types';

	let query = $state('');
	let onlyActive = $state(true);

	const filtered = $derived(
		$allItems.filter((it) => {
			if (onlyActive && it.language !== $settings.activeLanguage) return false;
			if (!query.trim()) return true;
			const q = query.toLowerCase();
			return (
				it.target.toLowerCase().includes(q) ||
				it.reading.toLowerCase().includes(q) ||
				it.meaning.toLowerCase().includes(q) ||
				it.tags.some((t) => t.toLowerCase().includes(q))
			);
		})
	);

	function newItem() {
		const id = createItem({
			language: $settings.activeLanguage,
			target: '',
			reading: '',
			meaning: '',
			tags: [],
			level: 'A1',
			examples: [],
			status: 'draft'
		});
		goto(`/items/${id}`);
	}

	function langName(code: string): string {
		return LANGUAGES.find((l) => l.code === code)?.native ?? code;
	}
</script>

<header class="head">
	<h1>Items</h1>
	<button class="new" onclick={newItem}><Plus size={18} /> New item</button>
</header>

<div class="controls">
	<div class="search">
		<Search size={16} />
		<input placeholder="Search target, reading, meaning, tag…" bind:value={query} />
	</div>
	<label class="toggle">
		<input type="checkbox" bind:checked={onlyActive} />
		Active language only
	</label>
</div>

<p class="count">{filtered.length} items</p>

<ul class="list">
	{#each filtered as it (it.id)}
		<li>
			<a class="row" href="/items/{it.id}">
				<div class="lead">
					<ScriptText text={it.target || '—'} language={it.language} size="md" />
					<div class="sub">{it.reading}</div>
				</div>
				<div class="mid">
					<div class="meaning">{it.meaning || '(no meaning)'}</div>
					<div class="tags">
						<span class="lang">{langName(it.language)}</span>
						{#each it.tags.slice(0, 4) as t (t)}<span class="tag">{t}</span>{/each}
						{#if it.status === 'draft'}<span class="tag draft">draft</span>{/if}
					</div>
				</div>
			</a>
			<div class="audio">
				{#if it.target}
					<AudioButton text={it.target} language={it.language} audioRef={it.audioRef} itemId={it.id} />
				{/if}
			</div>
		</li>
	{:else}
		<li class="empty">No items match. Create one or generate a batch in the Workbench.</li>
	{/each}
</ul>

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	h1 {
		margin: 0;
	}
	.new {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 1rem;
		border-radius: 0.5rem;
		background: var(--color-accent);
		color: #fff;
		border: none;
		font-weight: 600;
	}
	.controls {
		display: flex;
		gap: 1rem;
		align-items: center;
		margin: 1.25rem 0 0.5rem;
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
	.toggle {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		white-space: nowrap;
	}
	.count {
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}
	.list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.list li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.row {
		flex: 1;
		display: grid;
		grid-template-columns: 11rem 1fr;
		gap: 1rem;
		align-items: center;
		padding: 0.75rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: 0.65rem;
		background: var(--color-bg-secondary);
	}
	.row:hover {
		border-color: var(--color-accent);
	}
	.sub {
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}
	.meaning {
		margin-bottom: 0.3rem;
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.tag,
	.lang {
		font-size: 0.72rem;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		background: var(--color-bg-elevated);
		color: var(--color-text-muted);
	}
	.lang {
		font-family: var(--font-script);
	}
	.tag.draft {
		color: var(--color-warning);
	}
	.empty {
		color: var(--color-text-muted);
		padding: 1.5rem;
		border: 1px dashed var(--color-border);
		border-radius: 0.65rem;
		display: block;
	}
</style>
