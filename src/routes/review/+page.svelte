<script lang="ts">
	import { untrack } from 'svelte';
	import { fly } from 'svelte/transition';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import { X, BookOpen, Mic, Headphones, Layers, LayoutGrid, ListFilter, RotateCcw, Flame, Target, Timer, Zap, Sparkles } from 'lucide-svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import Confetti from '$lib/components/Confetti.svelte';
	import CountUp from '$lib/components/CountUp.svelte';
	import LessonIntro from '$lib/components/LessonIntro.svelte';
	import StreakCelebration from '$lib/components/StreakCelebration.svelte';
	import GoalCelebration from '$lib/components/GoalCelebration.svelte';
	import { playCombo, playComplete } from '$lib/sounds';
	import ExerciseRunner, { type CompleteResult } from '$lib/components/ExerciseRunner.svelte';
	import {
		activeItems,
		activeLanguage,
		getDoc,
		gradeItem,
		getItem,
		practiceTimes,
		recordPronunciationAttempt,
		recordXp,
		settings,
		snapshotQueue,
		xpSessions
	} from '$lib/db/store';
	import { buildExercise } from '$lib/exercises/generate';
	import { DIMENSIONS, DIMENSION_LABELS, todayIso, type Dimension, type LearningItem } from '$lib/db/types';
	import { xpSummary } from '$lib/srs/stats';
	import { parseMode, resolveScope, scopeHref, type Mode, type ReviewScope } from '$lib/srs/scope';
	import { computeStreak, formatDuration, lastSevenDays, type WeekDay } from '$lib/today';
	import { rankAudioPractice, type AudioDimension, type RankedPractice } from '$lib/srs/practice';
	import { loadAudioManifest, hasPrerecorded, type LangManifest } from '$lib/audio';
	import type { QueueTask } from '$lib/srs/queue';
	import type { Exercise } from '$lib/exercises/templates';
	import { maybeAutoSync } from '$lib/sync';
	import { immersive } from '$lib/ui';

	// Reading is the spaced-repetition core (text-only skills, due-scheduled).
	// Listening & Speaking are practice over ANY of your words that have a
	// recorded clip — no unlock and no due-date gating — but each session is
	// bounded (the review cap) and ordered by need (srs/practice.ts).
	const READING_DIMS = new Set<Dimension>(['recognition', 'recall', 'context']);

	// Optional scope (`?lesson=<id>` or `?items=…&title=…`, see srs/scope.ts):
	// every mode is restricted to those items and the daily caps are lifted.
	const search = $derived($page.url.search);
	let scope = $state.raw<ReviewScope | null>(null);
	let scopeError = $state<'lesson-missing' | 'no-items' | null>(null);

	let mode = $state<Mode | null>(null); // null → show the picker
	let allTasks = $state<QueueTask[]>([]);
	let manifests = $state<Record<string, LangManifest>>({});
	let tasks = $state<QueueTask[]>([]);
	let index = $state(0);
	let pool = $state<LearningItem[]>([]);
	let correct = $state(0);
	let wrong = $state(0);
	let done = $state(false);
	// Consecutive correct answers (shown as a flame once it reaches 3).
	let combo = $state(0);
	let bestCombo = $state(0);

	// The playful layer: an intro card, points (XP) per right answer with a
	// "+10" floating off the progress bar, a toast at combo milestones, and a
	// streak screen before the summary when the session extends the streak.
	let intro = $state(false);
	let xp = $state(0);
	let floaters = $state<{ id: number; n: number; at: number }[]>([]);
	let toast = $state<{ id: number; n: number } | null>(null);
	let streakBefore: { days: number; today: boolean } = { days: 0, today: false };
	let streak = $state<{ days: number; week: WeekDay[] } | null>(null);
	// Today's XP crossed the daily goal with this session: its screen comes next.
	let goalHit = $state<{ before: number; today: number; goal: number } | null>(null);
	let fx = 0;
	const XP_RIGHT = 10;
	const XP_COMBO_BONUS = 5; // per answer while on a run of 3+
	// Banked when the session ends; the summary shows the running total.
	const xpBank = $derived(xpSummary($xpSessions, todayIso()));
	const isMilestone = (n: number) => n === 3 || n === 5 || (n >= 10 && n % 10 === 0);

	function reward(gain: number, runLength: number, at: number) {
		xp += gain;
		const id = ++fx;
		floaters = [...floaters, { id, n: gain, at }];
		setTimeout(() => (floaters = floaters.filter((f) => f.id !== id)), 950);
		if (isMilestone(runLength)) {
			toast = { id, n: runLength };
			setTimeout(() => (toast?.id === id ? (toast = null) : null), 1700);
			setTimeout(playCombo, 120);
		}
	}

	// What happened in this session, for the summary screen.
	type Result = { dimension: Dimension; itemId: string; correct: boolean | null };
	let results = $state<Result[]>([]);
	let sessionStart = 0;
	let elapsedMs = $state(0);
	const reducedMotion =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const started = $derived(mode !== null);

	// A running session takes over the phone screen (the shell hides its bars).
	$effect(() => {
		immersive.set(started && !done);
		return () => immersive.set(false);
	});

	// Your words that have a prerecorded clip — the pool for audio practice.
	const audioPool = $derived(
		pool.filter((it) => hasPrerecorded(manifests[it.language] ?? {}, it.target))
	);

	function readingTasks(): QueueTask[] {
		return allTasks.filter((t) => READING_DIMS.has(t.dimension));
	}
	// The ranking reads the live document; `epoch` re-ranks after each session.
	let epoch = $state(0);
	function rank(dim: AudioDimension): RankedPractice {
		const doc = getDoc();
		return doc ? rankAudioPractice(audioPool, dim, doc, $settings.reviewCap) : { tasks: [], total: 0 };
	}
	const listening = $derived.by(() => {
		void epoch;
		return rank('listening');
	});
	const speaking = $derived.by(() => {
		void epoch;
		return rank('pronunciation');
	});
	function tasksFor(m: Mode): QueueTask[] {
		if (m === 'reading') return readingTasks();
		if (m === 'listening') return listening.tasks;
		if (m === 'speaking') return speaking.tasks;
		return [...readingTasks(), ...listening.tasks, ...speaking.tasks];
	}

	const readingCount = $derived(readingTasks().length);
	const listeningCount = $derived(listening.tasks.length);
	const speakingCount = $derived(speaking.tasks.length);
	const everythingCount = $derived(readingCount + listeningCount + speakingCount);
	function countLabel(n: number, total: number): string {
		return total > n ? `${n} of ${total} cards` : `${n} ${n === 1 ? 'card' : 'cards'}`;
	}

	// Session summary.
	const MODE_LABEL: Record<Mode, string> = { reading: 'Reading', listening: 'Listening', speaking: 'Speaking', everything: 'Everything' };
	const answered = $derived(results.filter((r) => r.correct !== null));
	const accuracy = $derived(
		answered.length ? Math.round((100 * answered.filter((r) => r.correct).length) / answered.length) : null
	);
	const bySkill = $derived(
		DIMENSIONS.map((dim) => {
			const rs = results.filter((r) => r.dimension === dim);
			const a = rs.filter((r) => r.correct !== null);
			return { dim, n: rs.length, answered: a.length, ok: a.filter((r) => r.correct).length };
		}).filter((s) => s.n > 0)
	);
	const missedIds = $derived([...new Set(results.filter((r) => r.correct === false).map((r) => r.itemId))]);
	// Other modes still worth doing right now (fresh counts — the queue is re-snapshotted when a session ends).
	const nextModes = $derived(
		done
			? (['reading', 'listening', 'speaking'] as Mode[])
					.filter((m) => m !== mode)
					.map((m) => ({ m, n: tasksFor(m).length }))
					.filter((x) => x.n > 0)
			: []
	);

	let current = $derived(tasks[index]);
	let item = $derived<LearningItem | undefined>(current ? getItem(current.itemId) : undefined);
	// Listening (hear→word) and pronunciation (record-compare) use audio; the
	// reading dimensions are text-only.
	const taskAudio = $derived(
		current?.dimension === 'listening' || current?.dimension === 'pronunciation'
	);
	let exercise = $derived<Exercise | null>(
		current && item ? buildExercise(item, current.dimension, pool, { audio: taskAudio, typed: $settings.typedRecall }) : null
	);

	function start(m: Mode) {
		mode = m;
		index = 0;
		correct = 0;
		wrong = 0;
		combo = 0;
		bestCombo = 0;
		results = [];
		sessionStart = Date.now();
		elapsedMs = 0;
		tasks = tasksFor(m);
		done = tasks.length === 0;
		xp = 0;
		floaters = [];
		toast = null;
		streak = null;
		goalHit = null;
		streakBefore = computeStreak(get(practiceTimes));
		intro = tasks.length > 0 && !reducedMotion;
	}

	function backToModes() {
		mode = null;
		done = false;
		intro = false;
		streak = null;
		goalHit = null;
		allTasks = snapshotQueue(scope ?? undefined).tasks;
		epoch += 1;
	}

	async function loadSession(query: string) {
		mode = null;
		done = false;
		scopeError = null;
		const params = new URLSearchParams(query);
		const doc = getDoc();
		const res = doc ? resolveScope(doc, params, get(activeLanguage)) : { ok: true as const, scope: null };
		if (!res.ok) {
			scopeError = res.reason;
			scope = null;
			pool = [];
			allTasks = [];
			return;
		}
		scope = res.scope;
		pool = scope
			? scope.itemIds
					.map((id) => getItem(id))
					.filter((it): it is LearningItem => !!it && it.status === 'published')
			: get(activeItems);
		allTasks = snapshotQueue(scope ?? undefined).tasks;
		epoch += 1;
		// Load the language's audio index so Listening/Speaking know which words
		// are playable (the pool is all one language).
		const lang = scope?.language ?? get(activeLanguage);
		manifests = { [lang]: await loadAudioManifest(lang) };
		// `?mode=` jumps straight into a mode (e.g. "Practice these" → Speaking).
		const m = parseMode(params);
		if (m && tasksFor(m).length > 0) start(m);
	}

	// (Re)load whenever the query changes: SvelteKit keeps this component
	// mounted across `/review` ↔ `/review?lesson=…` ↔ `/review?items=…` navigations.
	$effect(() => {
		const q = search;
		untrack(() => void loadSession(q));
	});

	function advance() {
		if (index + 1 >= tasks.length) {
			done = true;
			elapsedMs = Date.now() - sessionStart;
			// Fresh counts for "Next up" (what this session cleared is gone now).
			allTasks = snapshotQueue(scope ?? undefined).tasks;
			epoch += 1;
			const goal = get(settings).xpGoal;
			const before = xpSummary(get(xpSessions), todayIso()).today;
			if (goal > 0 && before < goal && before + xp >= goal) goalHit = { before, today: before + xp, goal };
			recordXp(xp, scope?.language ?? get(activeLanguage));
			void maybeAutoSync(); // push this session's progress (no-op unless configured)
			// First session of the day that counts: the streak screen comes first.
			const after = computeStreak(get(practiceTimes));
			if (results.length > 0 && !streakBefore.today && after.today) {
				streak = { days: after.days, week: lastSevenDays(get(practiceTimes)) };
			} else if (results.length > 0 && !goalHit) {
				playComplete();
			}
		} else {
			index += 1;
		}
	}

	function onComplete(result: CompleteResult) {
		if (!current || !item || !exercise) return;
		const ok = result.kind === 'mcq' ? result.quality >= 3 : result.rating !== 'bad';
		combo = ok ? combo + 1 : 0;
		bestCombo = Math.max(bestCombo, combo);
		if (ok) reward(XP_RIGHT + (combo >= 3 ? XP_COMBO_BONUS : 0), combo, ((index + 1) / tasks.length) * 100);
		results = [
			...results,
			{
				dimension: current.dimension,
				itemId: item.id,
				correct:
					result.kind === 'mcq'
						? result.quality >= 3
						: result.rating === 'good'
							? true
							: result.rating === 'bad'
								? false
								: null
			}
		];
		if (result.kind === 'mcq') {
			if (result.quality >= 3) correct += 1;
			else wrong += 1;
			gradeItem(item.id, current.dimension, result.quality, exercise.type, exercise.answer, result.chosen);
		} else {
			if (result.rating === 'good') correct += 1;
			else if (result.rating === 'bad') wrong += 1;
			recordPronunciationAttempt(item.id, result.audioRef, result.rating, result.asr);
		}
		advance();
	}
</script>

{#if !started}
	<div class="picker">
		<div class="picker-head">
			<Mascot size={72} mood={everythingCount === 0 ? 'sleep' : 'happy'} />
			<div>
				<h1>Review</h1>
				<p class="muted sub">{everythingCount === 0 ? 'Nothing waiting right now.' : 'Pick a way to practice.'}</p>
			</div>
		</div>
		{#if scope}
			<p class="scope">
				{#if scope.kind === 'lesson'}<LayoutGrid size={14} />{:else}<ListFilter size={14} />{/if}
				<span>{scope.kind === 'lesson' ? 'Lesson' : 'Selection'} · <strong>{scope.title}</strong> · {pool.length} {pool.length === 1 ? 'item' : 'items'}</span>
				<a href="/review">Review everything instead</a>
			</p>
		{/if}
		{#if scopeError === 'lesson-missing'}
			<p class="muted">That lesson no longer exists. <a href="/lessons">Back to lessons</a> or
				<a href="/review">review everything</a>.</p>
		{:else if scopeError === 'no-items'}
			<p class="muted">None of those items exist any more. <a href="/review">Review everything instead</a>.</p>
		{:else if everythingCount === 0 && scope}
			<p class="muted">Nothing to practice in this {scope.kind === 'lesson' ? 'lesson' : 'selection'} right now — nothing is due, and none of
				its words have audio. <a href="/review">Review everything instead</a>.</p>
		{:else if everythingCount === 0}
			<p class="muted">Nothing to practice yet. Add items in <a href="/items">Items</a>, browse
				<a href="/vocab">Vocab</a>, or generate a batch in the <a href="/workbench">Workbench</a>.</p>
		{:else}
			<div class="modes">
				<button class="mode-card" data-mode="reading" onclick={() => start('reading')} disabled={readingCount === 0}>
					<span class="m-ic"><BookOpen size={24} strokeWidth={2.4} /></span>
					<span class="m-title">Reading</span>
					<span class="m-desc">Recognition, recall &amp; context — text only.</span>
					<span class="m-count">{readingCount} {readingCount === 1 ? 'card' : 'cards'}</span>
				</button>
				<button class="mode-card" data-mode="listening" onclick={() => start('listening')} disabled={listeningCount === 0}>
					<span class="m-ic"><Headphones size={24} strokeWidth={2.4} /></span>
					<span class="m-title">Listening</span>
					<span class="m-desc">Hear the word and choose it. New and weakest words first.</span>
					<span class="m-count">{countLabel(listeningCount, listening.total)}</span>
				</button>
				<button class="mode-card" data-mode="speaking" onclick={() => start('speaking')} disabled={speakingCount === 0}>
					<span class="m-ic"><Mic size={24} strokeWidth={2.4} /></span>
					<span class="m-title">Speaking</span>
					<span class="m-desc">Record &amp; compare your pronunciation. New and lowest-scoring words first.</span>
					<span class="m-count">{countLabel(speakingCount, speaking.total)}</span>
				</button>
				<button class="mode-card" data-mode="everything" onclick={() => start('everything')} disabled={everythingCount === 0}>
					<span class="m-ic"><Layers size={24} strokeWidth={2.4} /></span>
					<span class="m-title">Everything</span>
					<span class="m-desc">All of the above that's due.</span>
					<span class="m-count">{everythingCount} {everythingCount === 1 ? 'card' : 'cards'}</span>
				</button>
			</div>
		{/if}
	</div>
{:else if done && streak}
	<StreakCelebration
		days={streak.days}
		week={streak.week}
		onContinue={() => {
			streak = null;
			if (!goalHit) playComplete();
		}}
	/>
{:else if done && goalHit}
	<GoalCelebration
		before={goalHit.before}
		today={goalHit.today}
		goal={goalHit.goal}
		onContinue={() => {
			goalHit = null;
			playComplete();
		}}
	/>
{:else if done}
	<div class="summary">
		{#if results.length > 0}<Confetti />{/if}
		<div class="sum-mascot">
			<Mascot
				size={120}
				mood={results.length === 0 ? 'sleep' : accuracy === null || accuracy >= 60 ? 'cheer' : 'happy'}
			/>
		</div>
		<h1>
			{#if results.length === 0}Nothing to do{:else if accuracy !== null && accuracy >= 90}Amazing work!{:else if accuracy !== null && accuracy < 60}Good effort!{:else}Session complete!{/if}
		</h1>
		{#if scope}<p class="muted scope-line">{scope.title}</p>{/if}
		{#if results.length === 0}
			<p class="muted">Nothing was due for this mode.</p>
		{:else}
			<div class="sum-grid">
				<div class="sum s-cards"><span class="lbl"><Zap size={13} strokeWidth={3} /> {results.length === 1 ? 'card' : 'cards'}</span><span class="num"><CountUp value={results.length} delay={350} /></span></div>
				<div class="sum s-acc"><span class="lbl"><Target size={13} strokeWidth={3} /> accuracy</span><span class="num">{#if accuracy === null}—{:else}<CountUp value={accuracy} delay={450} format={(n) => `${Math.round(n)}%`} />{/if}</span></div>
				<div class="sum s-time"><span class="lbl"><Timer size={13} strokeWidth={3} /> time</span><span class="num">{formatDuration(elapsedMs)}</span></div>
				<div class="sum s-xp"><span class="lbl"><Sparkles size={13} strokeWidth={3} /> XP</span><span class="num"><CountUp value={xp} delay={650} duration={900} /></span></div>
			</div>
			{#if xpBank.total > 0}
				<p class="xp-bank"><Sparkles size={14} strokeWidth={3} /> <CountUp value={xpBank.total} from={xpBank.total - xp} delay={900} duration={900} format={(n) => Math.round(n).toLocaleString()} /> XP in total · {xpBank.today} today</p>
			{/if}
			<ul class="skills">
				{#each bySkill as s (s.dim)}
					{@const pct = s.answered ? Math.round((100 * s.ok) / s.answered) : 0}
					<li>
						<span class="sk-name">{DIMENSION_LABELS[s.dim]}</span>
						<span class="sk-bar"><span class="sk-fill" class:low={s.answered && pct < 60} style="width: {s.answered ? pct : 100}%"></span></span>
						<span class="sk-count">{s.answered ? `${s.ok}/${s.answered}` : `${s.n}`}</span>
					</li>
				{/each}
			</ul>
			{#if bestCombo >= 3}
				<p class="best-combo"><Flame size={16} /> Best run: {bestCombo} in a row</p>
			{/if}
		{/if}

		<section class="nextup">
			<h2>Next up</h2>
			<div class="chips">
				{#if missedIds.length > 0}
					<a class="chip warn" href={scopeHref(missedIds, 'Missed this session', mode === 'speaking' ? 'speaking' : undefined)}>
						<RotateCcw size={15} /> Drill the {missedIds.length} missed
					</a>
				{/if}
				{#each nextModes as x (x.m)}
					<button class="chip" onclick={() => start(x.m)}>
						{#if x.m === 'reading'}<BookOpen size={15} />{:else if x.m === 'listening'}<Headphones size={15} />{:else}<Mic size={15} />{/if}
						{MODE_LABEL[x.m]} · {x.n}
					</button>
				{/each}
				{#if missedIds.length === 0 && nextModes.length === 0}
					<span class="muted">All caught up for now.</span>
				{/if}
			</div>
		</section>

		<div class="actions">
			<button class="btn3d ghost" onclick={backToModes}>Choose mode</button>
			<a class="btn3d" href={scope?.kind === 'lesson' ? '/lessons' : scope ? '/dashboard' : '/'}>Done</a>
		</div>
	</div>
{:else if current && item && exercise}
	<div class="session-head">
		<button class="quit" onclick={backToModes} aria-label="Quit session" title="Quit session"><X size={18} /></button>
		<div class="progress-wrap">
			<div class="progress">
				<div class="bar" class:hot={combo >= 3} style="width: {Math.max(4, (index / tasks.length) * 100)}%"></div>
			</div>
			{#each floaters as f (f.id)}<span class="xp-float" style="left: {Math.min(92, Math.max(6, f.at))}%" aria-hidden="true">+{f.n} XP</span>{/each}
		</div>
		{#if combo >= 3}
			{#key combo}
				<span class="combo" title="{combo} correct in a row"><Flame size={18} strokeWidth={2.6} />{combo}</span>
			{/key}
		{/if}
	</div>
	{#if toast}
		{#key toast.id}
			<div class="combo-toast" role="status"><Flame size={20} strokeWidth={2.8} /> {toast.n} in a row!</div>
		{/key}
	{/if}
	{#if intro}
		<LessonIntro mode={mode ?? 'reading'} count={tasks.length} title={scope?.title} onDone={() => (intro = false)} />
	{/if}
	<div class="meta">
		<span>{index + 1} / {tasks.length}{#if xp > 0}<span class="xp-total">{xp} XP</span>{/if}</span>
		<span class="meta-right">
			{#if scope}<span class="scope-tag">{scope.title}</span>{/if}
			<span class="dim">{DIMENSION_LABELS[current.dimension]}{current.isNew ? ' · new' : ''}</span>
		</span>
	</div>

	{#if !intro}
		{#key index}
			<div class="card" in:fly={{ x: 48, duration: reducedMotion ? 0 : 180 }}>
				<ExerciseRunner {exercise} {item} {onComplete} />
			</div>
		{/key}
	{/if}
{:else}
	<p class="muted">Loading…</p>
{/if}

<style>
	.session-head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}
	.quit {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 0.7rem;
		border: none;
		background: transparent;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}
	.quit:hover {
		color: var(--color-text);
		background: var(--color-bg-elevated);
	}
	.progress-wrap {
		position: relative;
		flex: 1;
	}
	.progress {
		height: 16px;
		background: var(--color-bg-elevated);
		border-radius: 999px;
		overflow: hidden;
	}
	.bar {
		position: relative;
		height: 100%;
		border-radius: 999px;
		background: var(--color-success);
		transition: width 0.45s cubic-bezier(0.3, 1.3, 0.5, 1);
	}
	/* On a run of 3+: the bar heats up (warm gradient, moving sheen). */
	.bar.hot {
		background: linear-gradient(90deg, var(--color-sun), var(--color-warning), var(--color-pink));
		background-size: 200% 100%;
		animation: sheen 1.6s linear infinite;
		box-shadow: 0 0 12px color-mix(in srgb, var(--color-warning) 55%, transparent);
	}
	@keyframes sheen {
		to {
			background-position: -200% 0;
		}
	}
	.xp-float {
		position: absolute;
		top: 1.1rem; /* starts just under the bar and rises across it */
		translate: -50% 0;
		font-size: 0.85rem;
		font-weight: 900;
		color: var(--color-sun);
		-webkit-text-stroke: 0.5px color-mix(in srgb, var(--color-warning) 70%, #000);
		pointer-events: none;
		animation: float-up 0.95s cubic-bezier(0.2, 0.8, 0.3, 1) forwards;
	}
	@keyframes float-up {
		0% {
			opacity: 0;
			transform: translateY(6px) scale(0.6);
		}
		20% {
			opacity: 1;
			transform: translateY(-4px) scale(1.15);
		}
		100% {
			opacity: 0;
			transform: translateY(-30px) scale(1);
		}
	}
	.combo-toast {
		position: fixed;
		top: calc(4.2rem + env(safe-area-inset-top));
		left: 50%;
		z-index: 40;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 1.1rem;
		border-radius: 999px;
		background: linear-gradient(90deg, var(--color-sun), var(--color-warning));
		color: #fff;
		font-weight: 900;
		font-size: 1.05rem;
		text-shadow: 0 1px 0 color-mix(in srgb, var(--color-warning) 60%, #000);
		box-shadow: 0 4px 0 color-mix(in srgb, var(--color-warning) 65%, #000), 0 10px 24px color-mix(in srgb, var(--color-warning) 35%, transparent);
		pointer-events: none;
		animation: toast 1.7s cubic-bezier(0.3, 1.4, 0.5, 1) forwards;
	}
	@keyframes toast {
		0% {
			opacity: 0;
			transform: translate(-50%, -20px) scale(0.5);
		}
		15% {
			opacity: 1;
			transform: translate(-50%, 0) scale(1.08);
		}
		25%,
		80% {
			opacity: 1;
			transform: translate(-50%, 0) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -10px) scale(0.95);
		}
	}
	.xp-total {
		margin-left: 0.6rem;
		font-weight: 800;
		color: var(--color-warning);
	}
	.bar::after {
		/* the glossy highlight stripe */
		content: '';
		position: absolute;
		left: 8px;
		right: 8px;
		top: 4px;
		height: 4px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.35);
	}
	.combo {
		display: inline-flex;
		align-items: center;
		gap: 0.15rem;
		font-weight: 900;
		color: var(--color-warning);
		animation: pop-in 0.35s cubic-bezier(0.3, 1.6, 0.5, 1);
	}
	.meta {
		display: flex;
		justify-content: space-between;
		color: var(--color-text-muted);
		font-size: 0.85rem;
		margin-bottom: 2rem;
	}
	.meta-right {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	.scope-tag {
		padding: 0.1rem 0.55rem;
		border-radius: 999px;
		background: var(--color-bg-elevated);
		font-size: 0.78rem;
	}
	.dim {
		text-transform: capitalize;
	}
	.card {
		display: flex;
		justify-content: center;
		padding-top: 1rem;
	}
	.summary {
		text-align: center;
		max-width: 28rem;
		margin: 1.5rem auto 0;
	}
	.sum-mascot {
		display: flex;
		justify-content: center;
		animation: pop-in 0.5s cubic-bezier(0.3, 1.4, 0.5, 1) both;
	}
	.summary h1 {
		font-size: 1.9rem;
		margin: 0.5rem 0 0.25rem;
		color: var(--color-accent);
	}
	.best-combo {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin: 0 0 1.25rem;
		color: var(--color-warning);
		font-weight: 800;
	}
	.scope-line {
		margin: 0 0 0.5rem;
	}
	.xp-bank {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin: 0 0 1rem;
		color: var(--color-text-muted);
		font-weight: 800;
		font-size: 0.9rem;
	}
	.sum-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.75rem;
		margin: 1.25rem 0 1rem;
	}
	.sum {
		--c: var(--color-accent);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 2px solid var(--c);
		border-radius: var(--radius);
		background: var(--c);
		animation: pop-in 0.45s cubic-bezier(0.3, 1.4, 0.5, 1) both;
	}
	.sum.s-acc {
		--c: var(--color-success);
		animation-delay: 0.1s;
	}
	.sum.s-time {
		--c: var(--color-sky);
		animation-delay: 0.2s;
	}
	.sum.s-xp {
		--c: var(--color-warning);
		animation-delay: 0.3s;
	}
	.sum {
		animation-delay: 0.15s;
	}
	.sum .lbl {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.25rem 0;
		font-size: 0.7rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #fff;
	}
	.sum .num {
		padding: 0.6rem 0.25rem;
		font-size: 1.45rem;
		font-weight: 900;
		color: var(--c);
		background: var(--color-bg);
		border-radius: calc(var(--radius) - 4px) calc(var(--radius) - 4px) calc(var(--radius) - 2px) calc(var(--radius) - 2px);
		line-height: 1.1;
	}
	.skills {
		list-style: none;
		padding: 0;
		margin: 0 0 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		text-align: left;
	}
	.skills li {
		display: grid;
		grid-template-columns: 7rem 1fr 3rem;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.85rem;
	}
	.sk-name {
		color: var(--color-text-muted);
	}
	.sk-bar {
		height: 10px;
		background: var(--color-bg-elevated);
		border-radius: 999px;
		overflow: hidden;
	}
	.sk-fill {
		display: block;
		height: 100%;
		background: var(--color-success);
		border-radius: 999px;
		transform-origin: left;
		animation: fill-in 0.7s 0.6s cubic-bezier(0.3, 1, 0.5, 1) both;
	}
	@keyframes fill-in {
		from {
			transform: scaleX(0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sk-fill,
		.bar.hot,
		.xp-float,
		.combo-toast,
		.sum {
			animation: none !important;
		}
	}
	.sk-fill.low {
		background: var(--color-warning);
	}
	.sk-count {
		text-align: right;
		font-weight: 600;
	}
	.nextup {
		margin: 0 0 1.5rem;
	}
	.nextup h2 {
		font-size: 1rem;
		margin: 0 0 0.6rem;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.9rem;
		border-radius: 999px;
		border: 2px solid var(--color-border);
		border-bottom-width: 4px;
		background: var(--color-bg);
		color: var(--color-text);
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
	}
	.chip:hover {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
	.chip.warn {
		border-color: color-mix(in srgb, var(--color-warning) 60%, var(--color-bg));
		color: var(--color-warning);
	}
	.muted {
		color: var(--color-text-muted);
	}
	.actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-top: 1.5rem;
	}
	.actions .btn3d {
		flex: 1;
	}

	/* Mode picker */
	.picker {
		max-width: 44rem;
	}
	.picker-head {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		margin-bottom: 0.5rem;
	}
	.picker h1 {
		margin: 0;
	}
	.picker .sub {
		margin: 0.1rem 0 0;
		font-weight: 700;
	}
	.picker .muted a {
		color: var(--color-accent);
	}
	.scope {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin: 0.25rem 0 0.75rem;
		padding: 0.4rem 0.8rem;
		border: 2px solid var(--color-border);
		border-radius: 999px;
		background: var(--color-bg-secondary);
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}
	.scope strong {
		color: var(--color-text);
	}
	.scope a {
		color: var(--color-accent);
	}
	.modes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		gap: 1rem;
		margin-top: 1.5rem;
	}
	.mode-card {
		--c: var(--color-accent);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.35rem;
		padding: 1.15rem 1.25rem 1.25rem;
		border: 2px solid var(--color-border);
		border-bottom-width: 5px;
		border-radius: 1.25rem;
		background: var(--color-bg);
		color: var(--color-text);
		text-align: left;
		transition:
			transform 0.08s ease,
			border-color 0.15s ease,
			background 0.15s ease;
	}
	.mode-card[data-mode='listening'] {
		--c: var(--color-sky);
	}
	.mode-card[data-mode='speaking'] {
		--c: var(--color-pink);
	}
	.mode-card[data-mode='everything'] {
		--c: var(--color-warning);
	}
	.mode-card:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--c) 55%, var(--color-border));
		background: color-mix(in srgb, var(--c) 5%, var(--color-bg));
	}
	.mode-card:hover:not(:disabled) .m-ic {
		transform: rotate(-8deg) scale(1.08);
	}
	.mode-card:active:not(:disabled) {
		transform: translateY(3px);
		border-bottom-width: 2px;
		margin-top: 3px;
	}
	.m-ic {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		border-radius: 0.9rem;
		background: var(--c);
		color: #fff;
		box-shadow: 0 3px 0 color-mix(in srgb, var(--c) 68%, #000);
		margin-bottom: 0.3rem;
		transition: transform 0.2s cubic-bezier(0.3, 1.6, 0.5, 1);
	}
	.mode-card:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.m-title {
		font-weight: 900;
		font-size: 1.15rem;
	}
	.m-desc {
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}
	.m-count {
		margin-top: 0.4rem;
		padding: 0.15rem 0.6rem;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 900;
		color: var(--c);
		background: color-mix(in srgb, var(--c) 13%, transparent);
	}
</style>
