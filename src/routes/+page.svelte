<script lang="ts">
	import { ArrowRight, BookOpen, Headphones, Mic, LayoutGrid, GraduationCap } from 'lucide-svelte';
	import {
		activeItems,
		getDoc,
		languageCounts,
		lessonCounts,
		lessons,
		reviewSummary,
		setActiveLanguage,
		settings
	} from '$lib/db/store';
	import { LANGUAGES, type Language } from '$lib/db/types';
	import { hasPrerecorded, loadAudioManifest, type LangManifest } from '$lib/audio';
	import { rankAudioPractice, type AudioDimension } from '$lib/srs/practice';
	import { pickNextSession, READING_DIMS } from '$lib/today';

	const langName = $derived(LANGUAGES.find((l) => l.code === $settings.activeLanguage)?.name ?? '');

	// The audio index decides which words Listening/Speaking can serve.
	let manifest = $state<LangManifest>({});
	let manifestLang = $state<Language | null>(null);
	$effect(() => {
		const lang = $settings.activeLanguage;
		void loadAudioManifest(lang).then((m) => {
			manifest = m;
			manifestLang = lang;
		});
	});
	const audioPool = $derived(
		manifestLang === $settings.activeLanguage
			? $activeItems.filter((it) => hasPrerecorded(manifest, it.target))
			: []
	);
	function rank(dim: AudioDimension) {
		const doc = getDoc();
		const r = doc ? rankAudioPractice(audioPool, dim, doc, $settings.reviewCap) : { tasks: [], total: 0 };
		return { count: r.tasks.length, total: r.total };
	}
	const reading = $derived($reviewSummary.tasks.filter((t) => READING_DIMS.has(t.dimension)).length);
	const listening = $derived(rank('listening'));
	const speaking = $derived(rank('pronunciation'));
	const next = $derived(pickNextSession({ reading, listening, speaking, published: $activeItems.length }));
	const also = $derived(
		[
			{ mode: 'reading', label: 'Reading', n: reading },
			{ mode: 'listening', label: 'Listening', n: listening.count },
			{ mode: 'speaking', label: 'Speaking', n: speaking.count }
		].filter((x) => x.n > 0 && x.mode !== next.mode)
	);

	// Lessons in this language with something new or due.
	const dueLessons = $derived(
		$lessons
			.filter((l) => l.language === $settings.activeLanguage)
			.map((l) => ({ l, c: $lessonCounts[l.id] }))
			.filter((x) => x.c && x.c.newItems + x.c.dueReviews > 0)
			.slice(0, 3)
	);

	const NEXT_ICON = { reading: BookOpen, listening: Headphones, speaking: Mic, everything: GraduationCap } as const;
</script>

<section class="langs" aria-label="Language">
	{#each LANGUAGES as l (l.code)}
		{@const c = $languageCounts[l.code]}
		{@const due = c.newItems + c.dueReviews}
		<button
			class="lang-chip"
			class:active={$settings.activeLanguage === l.code}
			onclick={() => setActiveLanguage(l.code as Language)}
			aria-pressed={$settings.activeLanguage === l.code}
			title={l.name}
		>
			<span class="native" dir={l.dir}>{l.native}</span>
			{#if due > 0}<span class="dot">{due}</span>{/if}
		</button>
	{/each}
</section>

<h1 class="today-h">Today · {langName}</h1>

<a class="next" class:idle={!next.mode} href={next.href} data-mode={next.mode ?? 'none'}>
	<span class="next-ic">
		{#if next.mode}
			{@const Icon = NEXT_ICON[next.mode]}
			<Icon size={26} />
		{:else}
			<LayoutGrid size={26} />
		{/if}
	</span>
	<span class="next-body">
		<span class="next-title">{next.title}</span>
		<span class="next-detail">{next.detail}</span>
	</span>
	<ArrowRight size={20} />
</a>

{#if also.length > 0}
	<p class="also">
		<span class="muted">Also today:</span>
		{#each also as x (x.mode)}
			<a href="/review?mode={x.mode}">{x.label} · {x.n}</a>
		{/each}
		<a href="/review" class="all"><GraduationCap size={14} /> All modes</a>
	</p>
{/if}

<div class="plan">
	<div class="stat">
		<span class="num">{$reviewSummary.newItems}</span>
		<span class="lbl">New today</span>
	</div>
	<div class="stat">
		<span class="num">{$reviewSummary.dueReviews}</span>
		<span class="lbl">Due reviews</span>
	</div>
	<div class="stat">
		<span class="num">{$activeItems.length}</span>
		<span class="lbl">Words studying</span>
	</div>
</div>

{#if dueLessons.length > 0}
	<section class="due-lessons">
		<h2>Lessons with something due</h2>
		<ul>
			{#each dueLessons as { l, c } (l.id)}
				<li>
					<span class="l-title">{l.title}</span>
					<span class="l-counts">
						{#if c.newItems}<span class="new">{c.newItems} new</span>{/if}
						{#if c.newItems && c.dueReviews} · {/if}
						{#if c.dueReviews}<span class="due">{c.dueReviews} due</span>{/if}
					</span>
					<a class="l-review" href="/review?lesson={l.id}">Review</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	/* Compact language switcher (the top-bar chip shows the active one too). */
	.langs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}
	.lang-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.85rem;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--color-bg-secondary);
		color: var(--color-text);
		font-family: var(--font-script);
		font-size: 1.05rem;
		font-weight: 600;
		cursor: pointer;
	}
	.lang-chip:hover {
		border-color: var(--color-accent);
	}
	.lang-chip.active {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 14%, var(--color-bg-secondary));
		color: var(--color-accent);
	}
	.lang-chip .dot {
		font-family: var(--font-sans);
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 16%, transparent);
		padding: 0.05rem 0.45rem;
		border-radius: 999px;
	}
	.lang-chip.active .dot {
		background: var(--color-accent);
		color: #fff;
	}

	.today-h {
		font-size: 1.35rem;
		margin: 0 0 0.85rem;
	}

	/* The one thing to tap. */
	.next {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.1rem 1.2rem;
		border-radius: 1rem;
		background: var(--color-accent);
		color: #fff;
		box-shadow: 0 8px 24px color-mix(in srgb, var(--color-accent) 35%, transparent);
		transition: transform 0.15s ease;
	}
	.next:hover {
		transform: translateY(-2px);
	}
	.next.idle {
		background: var(--color-bg-secondary);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		box-shadow: none;
	}
	.next-ic {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		border-radius: 0.85rem;
		background: rgba(255, 255, 255, 0.18);
		flex-shrink: 0;
	}
	.next.idle .next-ic {
		background: color-mix(in srgb, var(--color-accent) 14%, transparent);
		color: var(--color-accent);
	}
	.next-body {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 1;
		min-width: 0;
	}
	.next-title {
		font-size: 1.15rem;
		font-weight: 700;
	}
	.next-detail {
		font-size: 0.88rem;
		opacity: 0.9;
	}
	.also {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem 0.8rem;
		margin: 0.75rem 0 0;
		font-size: 0.88rem;
	}
	.also a {
		color: var(--color-accent);
		font-weight: 600;
	}
	.also .all {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--color-text-muted);
		font-weight: 500;
	}
	.muted {
		color: var(--color-text-muted);
	}

	.plan {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		margin: 1.5rem 0 0;
	}
	.stat {
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 0.9rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		background: var(--color-bg-secondary);
	}
	.num {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-accent);
		line-height: 1.1;
	}
	.lbl {
		color: var(--color-text-muted);
		font-size: 0.8rem;
	}

	.due-lessons {
		margin-top: 1.75rem;
	}
	.due-lessons h2 {
		font-size: 1.05rem;
		margin: 0 0 0.6rem;
	}
	.due-lessons ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.due-lessons li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.65rem 0.9rem;
		border: 1px solid var(--color-border);
		border-radius: 0.65rem;
		background: var(--color-bg-secondary);
	}
	.l-title {
		font-weight: 600;
		flex: 1;
		min-width: 0;
	}
	.l-counts {
		font-size: 0.82rem;
		color: var(--color-text-muted);
		white-space: nowrap;
	}
	.l-counts .new {
		color: var(--color-accent);
		font-weight: 600;
	}
	.l-counts .due {
		color: var(--color-warning);
		font-weight: 600;
	}
	.l-review {
		padding: 0.35rem 0.75rem;
		border-radius: 0.5rem;
		background: var(--color-accent);
		color: #fff;
		font-size: 0.82rem;
		font-weight: 600;
	}
</style>
