<script lang="ts">
	import { GraduationCap, ArrowRight } from 'lucide-svelte';
	import { activeItems, languageCounts, reviewSummary, setActiveLanguage, settings } from '$lib/db/store';
	import { LANGUAGES, type Language } from '$lib/db/types';

	const langName = $derived(
		LANGUAGES.find((l) => l.code === $settings.activeLanguage)?.name ?? ''
	);
	const total = $derived($reviewSummary.dueReviews + $reviewSummary.newItems);
</script>

<header class="head">
	<h1><span class="logo">学</span> Manabi</h1>
	<p class="eyebrow">Pick a language to study</p>
</header>

<section class="langs">
	{#each LANGUAGES as l (l.code)}
		{@const c = $languageCounts[l.code]}
		{@const due = c.newItems + c.dueReviews}
		<button
			class="lang-card"
			class:active={$settings.activeLanguage === l.code}
			onclick={() => setActiveLanguage(l.code as Language)}
			aria-pressed={$settings.activeLanguage === l.code}
		>
			<span class="native" dir={l.dir}>{l.native}</span>
			<span class="name">{l.name}</span>
			{#if due > 0}
				<span class="badge">{due} due</span>
			{:else if c.published > 0}
				<span class="badge muted">All caught up</span>
			{:else}
				<span class="badge muted">No items yet</span>
			{/if}
		</button>
	{/each}
</section>

<section class="today">
	<h2>Today · {langName}</h2>
	<div class="plan">
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
	</div>

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
				Add items in <a href="/items">Items</a>, browse <a href="/vocab">Vocab</a>, or generate a
				batch in <a href="/workbench">Workbench</a>.
			</p>
		</div>
	{/if}
</section>

<section class="loop">
	<h2>The loop</h2>
	<ol>
		<li>Pick a language above</li>
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
	.head h1 {
		margin: 0;
		font-size: 1.9rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.head .logo {
		color: var(--color-accent);
	}
	.eyebrow {
		color: var(--color-text-muted);
		font-size: 0.95rem;
		margin: 0.35rem 0 0;
	}

	/* Language selector cards */
	.langs {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
		gap: 1rem;
		margin-bottom: 2.5rem;
	}
	.lang-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 1.5rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: 0.9rem;
		background: var(--color-bg-secondary);
		color: var(--color-text);
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			transform 0.15s ease;
	}
	.lang-card:hover {
		border-color: var(--color-accent);
		transform: translateY(-2px);
	}
	.lang-card.active {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 12%, var(--color-bg-secondary));
	}
	.lang-card .native {
		font-size: 2.25rem;
		font-weight: 700;
		line-height: 1.1;
	}
	.lang-card.active .native {
		color: var(--color-accent);
	}
	.lang-card .name {
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}
	.badge {
		margin-top: 0.25rem;
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 15%, transparent);
		padding: 0.15rem 0.6rem;
		border-radius: 999px;
	}
	.badge.muted {
		color: var(--color-text-muted);
		background: transparent;
	}

	/* Today's plan for the active language */
	.today h2 {
		font-size: 1.1rem;
		margin: 0 0 1rem;
	}
	.plan {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
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
