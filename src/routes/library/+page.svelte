<script lang="ts">
	import { ChevronRight } from 'lucide-svelte';
	import { activeItems, contentDrafts, lessons, passageDrafts, settings } from '$lib/db/store';
	import { LANGUAGES } from '$lib/db/types';
	import { LIBRARY } from '$lib/nav';

	const langName = $derived(LANGUAGES.find((l) => l.code === $settings.activeLanguage)?.name ?? '');
	const lessonCount = $derived($lessons.filter((l) => l.language === $settings.activeLanguage).length);
	const pendingDrafts = $derived(
		$contentDrafts.filter((d) => d.status === 'pending' && d.language === $settings.activeLanguage).length +
			$passageDrafts.filter((d) => d.status === 'pending' && d.language === $settings.activeLanguage).length
	);

	function badge(href: string): string {
		if (href === '/items') return `${$activeItems.length} ${$activeItems.length === 1 ? 'item' : 'items'}`;
		if (href === '/lessons') return `${lessonCount} ${lessonCount === 1 ? 'lesson' : 'lessons'}`;
		if (href === '/workbench') return pendingDrafts ? `${pendingDrafts} to review` : '';
		return '';
	}
</script>

<h1>Library</h1>
<p class="muted">Your {langName} content and the tools that grow it.</p>

<section class="cards">
	{#each LIBRARY as item (item.href)}
		{@const b = badge(item.href)}
		<a class="card" href={item.href}>
			<span class="card-ic"><item.icon size={22} /></span>
			<span class="card-body">
				<span class="card-title">{item.label}{#if b}<span class="card-badge">{b}</span>{/if}</span>
				<span class="card-desc">{item.description}</span>
			</span>
			<span class="chev"><ChevronRight size={18} /></span>
		</a>
	{/each}
</section>

<style>
	h1 {
		margin: 0 0 0.25rem;
	}
	.muted {
		color: var(--color-text-muted);
		margin: 0 0 1.25rem;
	}
	.cards {
		display: grid;
		gap: 0.75rem;
	}
	.card {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 0.9rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: 0.85rem;
		background: var(--color-bg-secondary);
		color: var(--color-text);
	}
	.card:hover {
		border-color: var(--color-accent);
	}
	.card-ic {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.6rem;
		height: 2.6rem;
		border-radius: 0.7rem;
		background: color-mix(in srgb, var(--color-accent) 14%, transparent);
		color: var(--color-accent);
		flex-shrink: 0;
	}
	.card-body {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 1;
		min-width: 0;
	}
	.card-title {
		font-weight: 700;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.card-badge {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-accent);
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
	}
	.card-desc {
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}
	.chev {
		display: inline-flex;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}
</style>
