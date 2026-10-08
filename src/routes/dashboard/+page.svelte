<script lang="ts">
	import { GraduationCap, Mic } from 'lucide-svelte';
	import ScriptText from '$lib/components/ScriptText.svelte';
	import { exerciseAttempts, getItem, pronunciationAttempts, settings, skillMemories } from '$lib/db/store';
	import { DIMENSIONS, DIMENSION_LABELS, type Dimension } from '$lib/db/types';
	import { scopeHref } from '$lib/srs/scope';
	import { suggestRating, summarizePronunciation } from '$lib/pronunciation';

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

	// Pronunciation: takes, scores and the weakest words (latest scored take per item).
	const pron = $derived(
		summarizePronunciation($pronunciationAttempts, (id) => getItem(id)?.language, $settings.activeLanguage)
	);
	const weakTakes = $derived(
		pron.weakest
			.map((w) => ({ ...w, item: getItem(w.itemId) }))
			.filter((w) => !!w.item)
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
	<div class="sec-head">
		<h2>Needs work</h2>
		{#if weakItems.length > 0}
			<a class="drill" href={scopeHref(weakItems.map((w) => w.item!.id), 'Needs work')}><GraduationCap size={15} /> Drill these</a>
		{/if}
	</div>
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

<section class="weak pron">
	<div class="sec-head">
		<h2>Pronunciation</h2>
		{#if weakTakes.length > 0}
			<a class="drill" href={scopeHref(weakTakes.map((w) => w.itemId), 'Pronunciation practice', 'speaking')}><Mic size={15} /> Practice these</a>
		{/if}
	</div>
	{#if pron.takes === 0}
		<p class="muted">No recordings yet — pick <strong>Speaking</strong> in Review to record yourself.</p>
	{:else}
		<p class="pron-stats">
			{pron.takes} {pron.takes === 1 ? 'take' : 'takes'} · {pron.scored} scored{#if pron.avgScore !== null}{' · '}average match <strong>{pron.avgScore}%</strong>{/if}
		</p>
		{#if pron.scored === 0}
			<p class="muted">Turn on speech-recognition scoring in Settings → Pronunciation to see match scores here.</p>
		{:else}
			<ul>
				{#each weakTakes as w (w.itemId)}
					<li>
						<a href="/items/{w.itemId}">
							<ScriptText text={w.item!.target} language={w.item!.language} size="sm" />
							<span class="meaning">{w.item!.meaning}</span>
							{#if w.transcript}<span class="heard">heard <ScriptText text={w.transcript} language={w.item!.language} size="sm" /></span>{/if}
						</a>
						<span class="score {suggestRating(w.score)}">{w.score}%</span>
					</li>
				{/each}
			</ul>
		{/if}
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
		margin: 0;
	}
	.sec-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin: 0 0 0.85rem;
	}
	.drill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.8rem;
		border-radius: 0.5rem;
		background: var(--color-accent);
		color: #fff;
		font-size: 0.85rem;
		font-weight: 600;
	}
	.pron {
		margin-top: 2.5rem;
	}
	.pron-stats {
		margin: 0 0 0.75rem;
		color: var(--color-text-muted);
	}
	.pron-stats strong {
		color: var(--color-text);
	}
	.heard {
		color: var(--color-text-muted);
		font-size: 0.85rem;
		display: inline-flex;
		gap: 0.3rem;
		align-items: baseline;
	}
	.score {
		font-weight: 700;
		font-size: 0.9rem;
	}
	.score.good {
		color: var(--color-success);
	}
	.score.okay {
		color: var(--color-warning);
	}
	.score.bad {
		color: var(--color-danger);
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
