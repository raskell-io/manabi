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

	// Each tool gets its own colour, like a set of crayons.
	const TINT: Record<string, string> = {
		'/scripts': 'var(--color-accent)',
		'/radicals': 'var(--color-teal)',
		'/vocab': 'var(--color-sky)',
		'/items': 'var(--color-success)',
		'/lessons': 'var(--color-warning)',
		'/workbench': 'var(--color-pink)'
	};
</script>

<h1>Library</h1>
<p class="muted">Your {langName} content and the tools that grow it.</p>

<section class="cards">
	{#each LIBRARY as item (item.href)}
		{@const b = badge(item.href)}
		<a class="card" href={item.href} style="--c: {TINT[item.href] ?? 'var(--color-accent)'}">
			<span class="card-ic"><item.icon size={24} strokeWidth={2.4} /></span>
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
		grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
		gap: 0.85rem;
	}
	.card {
		display: flex;
		align-items: center;
		gap: 0.95rem;
		padding: 1rem 1.05rem;
		border: 2px solid var(--color-border);
		border-bottom-width: 5px;
		border-radius: 1.2rem;
		background: var(--color-bg);
		color: var(--color-text);
		transition:
			transform 0.08s ease,
			border-color 0.15s ease;
	}
	.card:hover {
		border-color: color-mix(in srgb, var(--c) 50%, var(--color-border));
	}
	.card:hover .card-ic {
		transform: rotate(-8deg) scale(1.08);
	}
	.card:active {
		transform: translateY(3px);
		border-bottom-width: 2px;
		margin-top: 3px;
	}
	.card-ic {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		border-radius: 0.95rem;
		background: var(--c);
		color: #fff;
		box-shadow: 0 3px 0 color-mix(in srgb, var(--c) 68%, #000);
		flex-shrink: 0;
		transition: transform 0.2s cubic-bezier(0.3, 1.6, 0.5, 1);
	}
	.card-body {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 1;
		min-width: 0;
	}
	.card-title {
		font-weight: 900;
		font-size: 1.05rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.card-badge {
		font-size: 0.75rem;
		font-weight: 600;
		font-weight: 800;
		color: var(--c);
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--c) 13%, transparent);
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
