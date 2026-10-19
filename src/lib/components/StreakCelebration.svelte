<script lang="ts">
	/**
	 * Shown once a day, when a finished session extends the streak: the flame
	 * grows, the day count ticks up, and today's dot fills in the week strip.
	 */
	import { onMount } from 'svelte';
	import { Flame, Check } from 'lucide-svelte';
	import CountUp from './CountUp.svelte';
	import { playStreak } from '$lib/sounds';
	import type { WeekDay } from '$lib/today';

	let { days, week, onContinue }: { days: number; week: WeekDay[]; onContinue: () => void } = $props();

	onMount(() => {
		const t = setTimeout(playStreak, 250);
		return () => clearTimeout(t);
	});
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onContinue();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="streak-screen" role="dialog" aria-label="{days}-day streak">
	<div class="flame">
		<span class="glow"></span>
		<Flame size={120} strokeWidth={1.6} />
	</div>
	<p class="days"><CountUp value={days} from={Math.max(0, days - 1)} delay={500} duration={500} /></p>
	<h1>{days === 1 ? 'You started a streak!' : 'day streak!'}</h1>
	<p class="sub">{days === 1 ? 'Come back tomorrow to keep it going.' : 'Practice every day to keep your flame burning.'}</p>
	<ol class="week" aria-label="This week">
		{#each week as d, i (d.iso)}
			<li class:done={d.done} class:today={d.isToday} style="animation-delay: {0.7 + i * 0.05}s">
				<span class="dot">{#if d.done}<Check size={14} strokeWidth={3.5} />{/if}</span>
				<span class="lbl">{d.label}</span>
			</li>
		{/each}
	</ol>
	<button class="btn3d wide" onclick={onContinue}>Continue <kbd>↵</kbd></button>
</div>

<style>
	.streak-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.3rem;
		max-width: 26rem;
		margin: 2rem auto 0;
	}
	.flame {
		position: relative;
		color: var(--color-warning);
		filter: drop-shadow(0 6px 0 color-mix(in srgb, var(--color-warning) 35%, transparent));
		animation: grow 0.7s cubic-bezier(0.3, 1.6, 0.5, 1) both;
	}
	.flame :global(svg) {
		fill: color-mix(in srgb, var(--color-sun) 70%, transparent);
		animation: flicker 1.4s ease-in-out 0.7s infinite;
		transform-origin: 50% 90%;
	}
	.glow {
		position: absolute;
		inset: 10%;
		border-radius: 50%;
		background: var(--color-sun);
		filter: blur(30px);
		opacity: 0.45;
		z-index: -1;
	}
	@keyframes grow {
		from {
			opacity: 0;
			transform: scale(0.2) translateY(40px);
		}
	}
	@keyframes flicker {
		0%,
		100% {
			transform: scale(1) rotate(0deg);
		}
		30% {
			transform: scale(1.04, 0.97) rotate(-2deg);
		}
		60% {
			transform: scale(0.98, 1.03) rotate(2deg);
		}
	}
	.days {
		margin: 0;
		font-size: 4.5rem;
		line-height: 1;
		font-weight: 900;
		color: var(--color-warning);
		animation: pop 0.45s 0.45s cubic-bezier(0.3, 1.7, 0.5, 1) both;
	}
	h1 {
		margin: 0;
		font-size: 1.6rem;
		animation: rise 0.4s 0.6s ease-out both;
	}
	.sub {
		margin: 0 0 1rem;
		color: var(--color-text-muted);
		animation: rise 0.4s 0.65s ease-out both;
	}
	.week {
		display: flex;
		gap: 0.55rem;
		margin: 0 0 1.5rem;
		padding: 0.8rem 1rem;
		list-style: none;
		border: 2px solid var(--color-border);
		border-radius: 1rem;
	}
	.week li {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		animation: rise 0.35s ease-out both;
	}
	.dot {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.9rem;
		height: 1.9rem;
		border-radius: 50%;
		background: var(--color-bg-elevated);
		color: #fff;
	}
	.done .dot {
		background: var(--color-warning);
	}
	.today .dot {
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-warning) 35%, transparent);
	}
	.today.done .dot {
		animation: fill 0.5s 1.2s cubic-bezier(0.3, 1.7, 0.5, 1) both;
	}
	@keyframes fill {
		from {
			background: var(--color-bg-elevated);
			transform: scale(0.6);
		}
	}
	.lbl {
		font-size: 0.72rem;
		font-weight: 800;
		color: var(--color-text-muted);
	}
	.today .lbl {
		color: var(--color-warning);
	}
	.wide {
		width: 100%;
		animation: rise 0.4s 1s ease-out both;
	}
	@keyframes pop {
		from {
			opacity: 0;
			transform: scale(0.4);
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.streak-screen *,
		.streak-screen :global(svg) {
			animation: none !important;
		}
	}
</style>
