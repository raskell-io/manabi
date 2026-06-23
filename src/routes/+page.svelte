<script lang="ts">
	import { GraduationCap, ArrowRight } from 'lucide-svelte';
	import { activeItems, reviewSummary, settings } from '$lib/db/store';
	import { LANGUAGES } from '$lib/db/types';

	const langName = $derived(
		LANGUAGES.find((l) => l.code === $settings.activeLanguage)?.name ?? ''
	);
	const total = $derived($reviewSummary.dueReviews + $reviewSummary.newItems);
</script>

<header class="head">
	<p class="eyebrow">Learning {langName}</p>
	<h1>Today's plan</h1>
</header>

<section class="plan">
	<div class="stat">
		<span class="num">{$reviewSummary.newItems}</span>
		<span class="lbl">New items</span>
	</div>
	<div class="stat">
		<span class="num">{$reviewSummary.dueReviews}</span>
		<span class="lbl">Due reviews</span>
	</div>
	<div class="stat">
		<span class="num">{$activeItems.length}</span>
		<span class="lbl">Published items</span>
	</div>
</section>

{#if total > 0}
	<a class="cta" href="/review">
		<GraduationCap size={20} />
		<span>Start review · {total} {total === 1 ? 'card' : 'cards'}</span>
		<ArrowRight size={18} />
	</a>
{:else}
	<div class="empty">
		<p>Nothing due right now. 🎉</p>
		<p class="muted">
			Add items in <a href="/items">Items</a> or generate a batch in
			<a href="/workbench">Workbench</a>.
		</p>
	</div>
{/if}

<section class="loop">
	<h2>The loop</h2>
	<ol>
		<li>Pick a language (sidebar)</li>
		<li>Learn a few new items</li>
		<li>Review what's due — recognition, pronunciation, listening, context, recall</li>
		<li>Record yourself and self-rate</li>
		<li>Watch your weak areas in <a href="/dashboard">Progress</a></li>
	</ol>
</section>

<style>
	.head {
		margin-bottom: 1.5rem;
	}
	.eyebrow {
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: 0.8rem;
		margin: 0 0 0.25rem;
	}
	h1 {
		margin: 0;
		font-size: 1.9rem;
	}
	.plan {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-bottom: 1.5rem;
	}
	.stat {
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		background: var(--color-bg-secondary);
	}
	.num {
		font-size: 2.25rem;
		font-weight: 700;
		color: var(--color-accent);
	}
	.lbl {
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}
	.cta {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.9rem 1.5rem;
		border-radius: 0.75rem;
		background: var(--color-accent);
		color: #fff;
		font-weight: 600;
		font-size: 1.05rem;
	}
	.cta:hover {
		background: var(--color-accent-hover);
	}
	.empty {
		border: 1px dashed var(--color-border);
		border-radius: 0.75rem;
		padding: 1.5rem;
	}
	.empty p {
		margin: 0.25rem 0;
	}
	.muted {
		color: var(--color-text-muted);
	}
	.muted a,
	.empty a {
		color: var(--color-accent);
	}
	.loop {
		margin-top: 2.5rem;
	}
	.loop h2 {
		font-size: 1.1rem;
	}
	.loop ol {
		color: var(--color-text-muted);
		line-height: 1.8;
		padding-left: 1.2rem;
	}
	.loop a {
		color: var(--color-accent);
	}
</style>
