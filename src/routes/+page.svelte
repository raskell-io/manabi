<script lang="ts">
	import { ArrowRight, BookOpen, Headphones, Mic, LayoutGrid, GraduationCap, Flame, Sparkles, Clock, BookA } from 'lucide-svelte';
	import Mascot, { type MascotMood } from '$lib/components/Mascot.svelte';
	import PathStrip from '$lib/components/PathStrip.svelte';
	import {
		activeItems,
		getDoc,
		languageCounts,
		lessonCounts,
		lessons,
		practiceTimes,
		reviewSummary,
		setActiveLanguage,
		settings
	} from '$lib/db/store';
	import { LANGUAGES, type Language } from '$lib/db/types';
	import { hasPrerecorded, loadAudioManifest, type LangManifest } from '$lib/audio';
	import { rankAudioPractice, type AudioDimension } from '$lib/srs/practice';
	import { computeStreak, greeting, lastSevenDays, pickNextSession, READING_DIMS } from '$lib/today';
	import { isoDate } from '$lib/db/types';

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

	// Streak, the week strip and today's ring.
	const streak = $derived(computeStreak($practiceTimes));
	const week = $derived(lastSevenDays($practiceTimes));
	const doneToday = $derived.by(() => {
		const today = isoDate(new Date());
		return $practiceTimes.filter((t) => isoDate(new Date(t)) === today).length;
	});
	const goal = $derived(doneToday + reading);
	const ringPct = $derived(goal === 0 ? 0 : doneToday / goal);
	const RING_C = 2 * Math.PI * 34;

	// What Nabi says.
	const hello = greeting(new Date().getHours());
	const nabi = $derived.by((): { mood: MascotMood; line: string } => {
		if ($activeItems.length === 0) return { mood: 'think', line: "Let's find your first words to learn!" };
		if (next.mode && streak.days > 0 && !streak.today)
			return { mood: 'happy', line: `Keep your ${streak.days}-day streak alive — one quick session?` };
		if (next.mode === 'reading') return { mood: 'happy', line: `${reading} ${reading === 1 ? 'card is' : 'cards are'} waiting for you.` };
		if (next.mode) return { mood: 'happy', line: 'Reading is done — want to train your ears?' };
		if (doneToday > 0) return { mood: 'cheer', line: `All caught up! ${doneToday} cards today. See you tomorrow!` };
		return { mood: 'sleep', line: 'Nothing due right now. Browse the Library for something new?' };
	});
</script>

<section class="hero">
	<div class="hero-mascot"><Mascot size={112} mood={nabi.mood} /></div>
	{#key nabi.line}
		<div class="bubble">
			<span class="bubble-hello">{hello}!</span>
			<span>{nabi.line}</span>
		</div>
	{/key}
</section>

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
			<Icon size={28} strokeWidth={2.4} />
		{:else}
			<LayoutGrid size={28} strokeWidth={2.4} />
		{/if}
	</span>
	<span class="next-body">
		<span class="next-title">{next.title}</span>
		<span class="next-detail">{next.detail}</span>
	</span>
	<span class="next-go"><ArrowRight size={22} strokeWidth={3} /></span>
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

<PathStrip />

<div class="progress-row">
	<div class="card ring-card">
		<svg class="goal-ring" viewBox="0 0 80 80" aria-hidden="true">
			<circle cx="40" cy="40" r="34" class="goal-track" />
			<circle
				cx="40"
				cy="40"
				r="34"
				class="goal-fill"
				stroke-dasharray={RING_C}
				stroke-dashoffset={RING_C * (1 - ringPct)}
			/>
		</svg>
		<div class="ring-text">
			<span class="ring-num">{doneToday}<small>/{goal}</small></span>
			<span class="lbl">cards today</span>
		</div>
	</div>
	<div class="card week-card">
		<div class="week-head">
			<span class="flame" class:lit={streak.today}><Flame size={22} /></span>
			<span><strong>{streak.days}</strong> day streak</span>
		</div>
		<div class="week">
			{#each week as d (d.iso)}
				<span class="day" class:done={d.done} class:today={d.isToday}>
					<span class="day-dot">{#if d.done}<Flame size={13} strokeWidth={2.6} />{/if}</span>
					<span class="day-l">{d.label}</span>
				</span>
			{/each}
		</div>
	</div>
</div>

<div class="plan">
	<div class="stat s-new">
		<span class="s-ic"><Sparkles size={18} /></span>
		<span class="num">{$reviewSummary.newItems}</span>
		<span class="lbl">New today</span>
	</div>
	<div class="stat s-due">
		<span class="s-ic"><Clock size={18} /></span>
		<span class="num">{$reviewSummary.dueReviews}</span>
		<span class="lbl">Due reviews</span>
	</div>
	<div class="stat s-words">
		<span class="s-ic"><BookA size={18} /></span>
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
					<a class="l-review btn3d" href="/review?lesson={l.id}">Review</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	/* Nabi + speech bubble */
	.hero {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		margin: 0 0 1.25rem;
	}
	.hero-mascot {
		flex-shrink: 0;
	}
	.bubble {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.85rem 1.05rem;
		border: 2px solid var(--color-border);
		border-radius: 1.1rem;
		background: var(--color-bg);
		font-weight: 700;
		line-height: 1.35;
		animation: pop-in 0.4s cubic-bezier(0.3, 1.4, 0.5, 1) both;
		transform-origin: left center;
	}
	.bubble::before {
		/* the tail, pointing at Nabi */
		content: '';
		position: absolute;
		left: -9px;
		top: 50%;
		width: 14px;
		height: 14px;
		background: var(--color-bg);
		border-left: 2px solid var(--color-border);
		border-bottom: 2px solid var(--color-border);
		transform: translateY(-50%) rotate(45deg);
	}
	.bubble-hello {
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-accent);
	}

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
		gap: 0.45rem;
		padding: 0.45rem 0.95rem;
		border: 2px solid var(--color-border);
		border-bottom-width: 4px;
		border-radius: 999px;
		background: var(--color-bg);
		color: var(--color-text);
		font-family: var(--font-script);
		font-size: 1.05rem;
		font-weight: 700;
		cursor: pointer;
		transition: transform 0.08s ease;
	}
	.lang-chip:hover {
		border-color: color-mix(in srgb, var(--color-accent) 50%, var(--color-border));
	}
	.lang-chip:active {
		transform: translateY(2px);
		border-bottom-width: 2px;
		margin-bottom: 2px;
	}
	.lang-chip.active {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg));
		color: var(--color-accent);
	}
	.lang-chip .dot {
		font-family: var(--font-sans);
		font-size: 0.72rem;
		font-weight: 900;
		color: #fff;
		background: var(--color-pink);
		padding: 0.05rem 0.45rem;
		border-radius: 999px;
	}
	.lang-chip.active .dot {
		background: var(--color-accent);
	}

	.today-h {
		font-size: 1.45rem;
		margin: 0 0 0.85rem;
	}

	/* The one thing to tap. */
	.next {
		--b: var(--color-accent);
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.15rem 1.2rem;
		border-radius: 1.25rem;
		background: linear-gradient(135deg, var(--b), color-mix(in srgb, var(--b) 70%, var(--color-pink)));
		color: #fff;
		box-shadow: 0 6px 0 color-mix(in srgb, var(--b) 68%, #000);
		margin-bottom: 6px;
		transition:
			transform 0.08s ease,
			box-shadow 0.08s ease;
	}
	.next[data-mode='listening'] {
		--b: var(--color-sky);
	}
	.next[data-mode='speaking'] {
		--b: var(--color-pink);
	}
	.next:hover .next-go {
		transform: translateX(3px);
	}
	.next:active {
		transform: translateY(6px);
		box-shadow: 0 0 0 transparent;
	}
	.next.idle {
		background: var(--color-bg);
		color: var(--color-text);
		border: 2px solid var(--color-border);
		box-shadow: 0 4px 0 var(--edge);
	}
	.next-ic {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3.3rem;
		height: 3.3rem;
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.22);
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
		font-size: 1.2rem;
		font-weight: 900;
	}
	.next-detail {
		font-size: 0.88rem;
		font-weight: 600;
		opacity: 0.92;
	}
	.next-go {
		display: inline-flex;
		transition: transform 0.15s ease;
	}
	.also {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem 0.8rem;
		margin: 0.9rem 0 0;
		font-size: 0.88rem;
	}
	.also a {
		color: var(--color-accent);
		font-weight: 800;
	}
	.also .all {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--color-text-muted);
		font-weight: 700;
	}
	.muted {
		color: var(--color-text-muted);
	}

	/* Daily ring + streak week */
	.card {
		border: 2px solid var(--color-border);
		border-radius: var(--radius);
		background: var(--color-bg);
	}
	.progress-row {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.75rem;
		margin: 1.5rem 0 0;
	}
	.ring-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem 0.75rem 0.75rem;
	}
	.goal-ring {
		width: 4.2rem;
		height: 4.2rem;
		transform: rotate(-90deg);
	}
	.goal-ring circle {
		fill: none;
		stroke-width: 9;
	}
	.goal-track {
		stroke: var(--color-bg-elevated);
	}
	.goal-fill {
		stroke: var(--color-success);
		stroke-linecap: round;
		transition: stroke-dashoffset 0.8s cubic-bezier(0.3, 1, 0.4, 1);
	}
	.ring-text {
		display: flex;
		flex-direction: column;
	}
	.ring-num {
		font-size: 1.5rem;
		font-weight: 900;
		line-height: 1.1;
	}
	.ring-num small {
		font-size: 0.95rem;
		color: var(--color-text-muted);
		font-weight: 800;
	}
	.week-card {
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		min-width: 0;
	}
	.week-head {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-weight: 700;
	}
	.week-head strong {
		font-weight: 900;
		font-size: 1.1rem;
	}
	.flame {
		display: inline-flex;
		color: var(--color-text-muted);
		opacity: 0.6;
	}
	.flame.lit {
		color: var(--color-warning);
		opacity: 1;
		animation: flicker 1.6s ease-in-out infinite;
	}
	@keyframes flicker {
		0%,
		100% {
			transform: scale(1) rotate(0deg);
		}
		50% {
			transform: scale(1.12) rotate(-4deg);
		}
	}
	.week {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		max-width: 24rem;
		gap: 0.25rem;
	}
	.day {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
	}
	.day-dot {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 999px;
		background: var(--color-bg-elevated);
		color: #fff;
	}
	.day.done .day-dot {
		background: linear-gradient(160deg, var(--color-sun), var(--color-warning));
		animation: pop-in 0.4s cubic-bezier(0.3, 1.4, 0.5, 1) both;
	}
	.day.today .day-dot {
		box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px color-mix(in srgb, var(--color-warning) 55%, transparent);
	}
	.day-l {
		font-size: 0.7rem;
		font-weight: 800;
		color: var(--color-text-muted);
	}
	.day.today .day-l {
		color: var(--color-warning);
	}

	.plan {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		margin: 0.75rem 0 0;
	}
	.stat {
		--c: var(--color-accent);
		border: 2px solid var(--color-border);
		border-radius: var(--radius);
		padding: 0.85rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		background: var(--color-bg);
	}
	.s-new {
		--c: var(--color-pink);
	}
	.s-due {
		--c: var(--color-warning);
	}
	.s-words {
		--c: var(--color-sky);
	}
	.s-ic {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 0.8rem;
		margin-bottom: 0.25rem;
		color: var(--c);
		background: color-mix(in srgb, var(--c) 14%, transparent);
	}
	.num {
		font-size: 1.75rem;
		font-weight: 900;
		color: var(--color-text);
		line-height: 1.1;
	}
	.lbl {
		color: var(--color-text-muted);
		font-size: 0.8rem;
		font-weight: 700;
	}

	.due-lessons {
		margin-top: 1.75rem;
	}
	.due-lessons h2 {
		font-size: 1.1rem;
		margin: 0 0 0.6rem;
	}
	.due-lessons ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.due-lessons li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.7rem 0.75rem 0.7rem 1rem;
		border: 2px solid var(--color-border);
		border-radius: var(--radius);
		background: var(--color-bg);
	}
	.l-title {
		font-weight: 800;
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
		font-weight: 800;
	}
	.l-counts .due {
		color: var(--color-warning);
		font-weight: 800;
	}
	.l-review {
		padding: 0.45rem 0.85rem;
		font-size: 0.75rem;
		border-radius: 0.7rem;
	}

	@media (max-width: 520px) {
		.hero-mascot :global(svg) {
			width: 88px;
			height: 88px;
		}
		.progress-row {
			grid-template-columns: 1fr;
		}
		.plan {
			gap: 0.5rem;
		}
		.stat {
			padding: 0.7rem 0.75rem;
		}
		.num {
			font-size: 1.45rem;
		}
	}
</style>
