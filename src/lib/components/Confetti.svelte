<script lang="ts">
	/** A one-shot burst of CSS confetti over the whole viewport (non-interactive). */
	const COLORS = ['#6c4cf5', '#ff5c9d', '#ffb800', '#1aa3f0', '#2fb457', '#ff9f43'];
	const bits = Array.from({ length: 60 }, (_, i) => ({
		left: Math.random() * 100,
		delay: Math.random() * 0.5,
		dur: 1.8 + Math.random() * 1.4,
		drift: (Math.random() - 0.5) * 160,
		spin: (Math.random() - 0.5) * 1080,
		w: 6 + Math.random() * 6,
		round: i % 3 === 0,
		color: COLORS[i % COLORS.length]
	}));
</script>

<div class="confetti" aria-hidden="true">
	{#each bits as b, i (i)}
		<span
			class:round={b.round}
			style="left:{b.left}%; width:{b.w}px; height:{b.round ? b.w : b.w * 1.6}px; background:{b.color}; animation-delay:{b.delay}s; animation-duration:{b.dur}s; --drift:{b.drift}px; --spin:{b.spin}deg"
		></span>
	{/each}
</div>

<style>
	.confetti {
		position: fixed;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		z-index: 50;
	}
	span {
		position: absolute;
		top: -24px;
		border-radius: 2px;
		opacity: 0;
		animation: fall linear forwards;
	}
	span.round {
		border-radius: 999px;
	}
	@keyframes fall {
		0% {
			opacity: 1;
			transform: translate(0, 0) rotate(0deg);
		}
		85% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(var(--drift), 105vh) rotate(var(--spin));
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.confetti {
			display: none;
		}
	}
</style>
