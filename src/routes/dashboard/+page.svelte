<script lang="ts">
	import ScriptText from '$lib/components/ScriptText.svelte';
	import { exerciseAttempts, getItem, settings, skillMemories } from '$lib/db/store';
	import { DIMENSIONS, DIMENSION_LABELS, type Dimension } from '$lib/db/types';

	// Per-dimension accuracy for the active language.
	const byDimension = $derived(
		DIMENSIONS.map((dim) => {
			const attempts = $exerciseAttempts.filter(
				(a) => a.language === $settings.activeLanguage && a.dimension === dim
			);
			const total = attempts.length;
			const correct = attempts.filter((a) => a.correct).length;
			return {
				dim,
				total,
				correct,
				accuracy: total ? Math.round((correct / total) * 100) : null
			};
		})
	);

	// Weakest items: most total lapses across dimensions, then lowest avg ease.
	const weakItems = $derived(
		$skillMemories
			.map((sm) => {
				const item = getItem(sm.itemId);
				const dims = Object.values(sm.dims);
				const lapses = dims.reduce((n, d) => n + d.lapses, 0);
				const avgEase = dims.reduce((n, d) => n + d.ease, 0) / dims.length;
				return { item, lapses, avgEase };
			})
			.filter((w) => w.item && w.item.language === $settings.activeLanguage)
			.filter((w) => w.lapses > 0)
			.sort((a, b) => b.lapses - a.lapses || a.avgEase - b.avgEase)
			.slice(0, 12)
	);

	function barColor(acc: number | null): string {
		if (acc === null) return 'var(--color-border)';
		if (acc >= 80) return 'var(--color-success)';
		if (acc >= 60) return 'var(--color-warning)';
		return 'var(--color-danger)';
	}
</script>

<h1>Progress</h1>
<p class="muted">Accuracy by skill for {$settings.activeLanguage.toUpperCase()}, across all attempts.</p>

<section class="dims">
	{#each byDimension as d (d.dim)}
		<div class="dim-card">
			<div class="dim-top">
				<span class="dim-name">{DIMENSION_LABELS[d.dim as Dimension]}</span>
				<span class="dim-acc">{d.accuracy === null ? '—' : d.accuracy + '%'}</span>
			</div>
			<div class="track">
				<div class="fill" style="width: {d.accuracy ?? 0}%; background: {barColor(d.accuracy)}"></div>
			</div>
			<span class="dim-count">{d.correct}/{d.total} correct</span>
		</div>
	{/each}
</section>

<section class="weak">
	<h2>Needs work</h2>
	{#if weakItems.length === 0}
		<p class="muted">No lapses yet — keep reviewing and weak items will surface here.</p>
	{:else}
		<ul>
			{#each weakItems as w (w.item!.id)}
				<li>
					<a href="/items/{w.item!.id}">
						<ScriptText text={w.item!.target} language={w.item!.language} size="sm" />
						<span class="meaning">{w.item!.meaning}</span>
					</a>
					<span class="lapses">{w.lapses} lapse{w.lapses === 1 ? '' : 's'}</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	h1 {
		margin-bottom: 0.25rem;
	}
	.muted {
		color: var(--color-text-muted);
	}
	.dims {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		gap: 1rem;
		margin: 1.5rem 0 2.5rem;
	}
	.dim-card {
		border: 1px solid var(--color-border);
		border-radius: 0.65rem;
		padding: 1rem;
		background: var(--color-bg-secondary);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.dim-top {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.dim-name {
		font-weight: 600;
	}
	.dim-acc {
		font-size: 1.1rem;
		font-weight: 700;
	}
	.track {
		height: 8px;
		background: var(--color-bg-elevated);
		border-radius: 999px;
		overflow: hidden;
	}
	.fill {
		height: 100%;
		border-radius: 999px;
	}
	.dim-count {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}
	.weak h2 {
		font-size: 1.15rem;
	}
	.weak ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.weak li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		padding: 0.6rem 0.9rem;
		background: var(--color-bg-secondary);
	}
	.weak li a {
		display: flex;
		gap: 0.75rem;
		align-items: baseline;
	}
	.meaning {
		color: var(--color-text-muted);
	}
	.lapses {
		color: var(--color-danger);
		font-size: 0.85rem;
	}
</style>
