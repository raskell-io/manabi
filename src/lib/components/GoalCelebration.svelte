<script lang="ts">
	/**
	 * Shown when a finished session takes today's XP past the daily goal: the
	 * ring fills from where the day stood, the XP ticks up, and it locks in gold.
	 */
	import { onMount } from 'svelte';
	import { Trophy } from 'lucide-svelte';
	import CountUp from './CountUp.svelte';
	import { playGoal } from '$lib/sounds';

	let { before, today, goal, onContinue }: { before: number; today: number; goal: number; onContinue: () => void } = $props();

	const R = 52;
	const C = 2 * Math.PI * R;
	let filled = $state(false);

	onMount(() => {
		const fill = setTimeout(() => (filled = true), 150);
		const sound = setTimeout(playGoal, 700);
		return () => {
			clearTimeout(fill);
			clearTimeout(sound);
		};
	});
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onContinue();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="goal-screen" role="dialog" aria-label="Daily goal reached">
	<div class="ring-wrap">
		<svg viewBox="0 0 120 120" aria-hidden="true">
			<circle cx="60" cy="60" r={R} class="track" />
			<circle
				cx="60"
				cy="60"
				r={R}
				class="fill"
				stroke-dasharray={C}
				stroke-dashoffset={filled ? 0 : C * (1 - Math.min(1, before / goal))}
			/>
		</svg>
		<span class="trophy"><Trophy size={52} strokeWidth={2.2} /></span>
	</div>
	<p class="xp"><CountUp value={today} from={before} delay={250} duration={700} /> <small>/ {goal} XP</small></p>
	<h1>Daily goal reached!</h1>
	<p class="sub">{today >= goal * 2 ? 'Double your goal — impressive.' : 'That’s today’s practice done. Anything more is a bonus.'}</p>
	<button class="btn3d wide" onclick={onContinue}>Continue <kbd>↵</kbd></button>
</div>

<style>
	.goal-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.3rem;
		max-width: 26rem;
		margin: 2rem auto 0;
	}
	.ring-wrap {
		position: relative;
		width: 9.5rem;
		height: 9.5rem;
		animation: pop 0.5s cubic-bezier(0.3, 1.6, 0.5, 1) both;
	}
	svg {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}
	circle {
		fill: none;
		stroke-width: 12;
	}
	.track {
		stroke: var(--color-bg-elevated);
	}
	.fill {
		stroke: var(--color-sun);
		stroke-linecap: round;
		transition: stroke-dashoffset 0.9s cubic-bezier(0.3, 1, 0.4, 1) 0.25s;
	}
	.trophy {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-warning);
		animation: pop 0.45s 1.1s cubic-bezier(0.3, 1.8, 0.5, 1) both;
	}
	.xp {
		margin: 0.6rem 0 0;
		font-size: 2.6rem;
		font-weight: 900;
		line-height: 1;
		color: var(--color-warning);
	}
	.xp small {
		font-size: 1rem;
		color: var(--color-text-muted);
		font-weight: 800;
	}
	h1 {
		margin: 0.3rem 0 0;
		font-size: 1.6rem;
		animation: rise 0.4s 0.5s ease-out both;
	}
	.sub {
		margin: 0 0 1.5rem;
		color: var(--color-text-muted);
		animation: rise 0.4s 0.6s ease-out both;
	}
	.wide {
		width: 100%;
		animation: rise 0.4s 0.9s ease-out both;
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
		.goal-screen *,
		.fill {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
