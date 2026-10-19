<script lang="ts">
	/**
	 * The launch screen: Nabi flutters up, "manabi" bounces in letter by letter
	 * and "learning" appears in each of Manabi's scripts. The layout keeps it
	 * up while the database opens (and for a beat on a cold start), then sets
	 * `leaving`, and it lifts away over the app. Still under reduced motion.
	 */
	import Mascot from './Mascot.svelte';

	let { leaving = false, slow = false }: { leaving?: boolean; slow?: boolean } = $props();

	const LETTERS = [...'manabi'];
	const WORDS = [
		{ text: '学び', lang: 'ja' },
		{ text: '学习', lang: 'zh-Hans' },
		{ text: '배움', lang: 'ko' },
		{ text: 'לימוד', lang: 'he' }
	];
</script>

<div class="splash" class:leaving role="status" aria-label="Manabi is starting">
	<span class="blob b1"></span>
	<span class="blob b2"></span>
	<span class="blob b3"></span>

	<div class="stage">
		<span class="spark s1"></span>
		<span class="spark s2"></span>
		<span class="spark s3"></span>
		<span class="spark s4"></span>
		<div class="nabi"><Mascot size={128} mood="happy" /></div>
	</div>

	<p class="word" aria-label="manabi">
		{#each LETTERS as l, i (i)}<span style="animation-delay: {0.35 + i * 0.06}s">{l}</span>{/each}
	</p>

	<p class="tagline">
		{#each WORDS as w, i (w.text)}<span lang={w.lang} style="animation-delay: {0.85 + i * 0.12}s">{w.text}</span>{/each}
	</p>

	{#if slow}<p class="slow">Opening your words…</p>{/if}
</div>

<style>
	.splash {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		overflow: hidden;
		background: var(--color-bg);
		transition:
			opacity 0.45s ease,
			transform 0.45s cubic-bezier(0.5, 0, 0.75, 0);
	}
	.splash.leaving {
		opacity: 0;
		transform: scale(1.08);
		pointer-events: none;
	}
	.leaving .nabi {
		transform: translateY(-60px);
		transition: transform 0.45s cubic-bezier(0.5, 0, 0.75, 0);
	}

	/* Soft colour fields drifting behind. */
	.blob {
		position: absolute;
		width: 60vmax;
		height: 60vmax;
		border-radius: 50%;
		filter: blur(60px);
		opacity: 0.22;
		animation: drift 9s ease-in-out infinite alternate;
	}
	.b1 {
		background: var(--color-accent);
		top: -30vmax;
		left: -20vmax;
	}
	.b2 {
		background: var(--color-pink);
		bottom: -35vmax;
		right: -25vmax;
		animation-delay: -3s;
	}
	.b3 {
		background: var(--color-sun);
		bottom: -40vmax;
		left: -30vmax;
		opacity: 0.14;
		animation-delay: -6s;
	}
	@keyframes drift {
		to {
			transform: translate(6vmax, -4vmax) scale(1.08);
		}
	}

	.stage {
		position: relative;
	}
	.nabi {
		animation: fly-in 0.7s cubic-bezier(0.3, 1.4, 0.5, 1) both;
	}
	@keyframes fly-in {
		from {
			opacity: 0;
			transform: translateY(70px) scale(0.5) rotate(-12deg);
		}
	}
	.spark {
		position: absolute;
		width: 10px;
		height: 10px;
		background: var(--color-sun);
		clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
		opacity: 0;
		animation: twinkle 1.6s ease-in-out infinite;
	}
	.s1 {
		top: 8px;
		left: -14px;
		animation-delay: 0.6s;
	}
	.s2 {
		top: 30px;
		right: -18px;
		width: 14px;
		height: 14px;
		background: var(--color-pink);
		animation-delay: 0.9s;
	}
	.s3 {
		bottom: 22px;
		left: -24px;
		width: 8px;
		height: 8px;
		background: var(--color-sky);
		animation-delay: 1.2s;
	}
	.s4 {
		top: -6px;
		right: 18px;
		width: 8px;
		height: 8px;
		background: var(--color-accent);
		animation-delay: 1.5s;
	}
	@keyframes twinkle {
		0%,
		100% {
			opacity: 0;
			transform: scale(0.3) rotate(0deg);
		}
		50% {
			opacity: 1;
			transform: scale(1) rotate(45deg);
		}
	}

	.word {
		margin: 0;
		font-size: 2.6rem;
		font-weight: 900;
		letter-spacing: -0.03em;
		color: var(--color-accent);
	}
	.word span {
		display: inline-block;
		animation: letter 0.5s cubic-bezier(0.3, 1.8, 0.5, 1) both;
	}
	@keyframes letter {
		from {
			opacity: 0;
			transform: translateY(18px) scale(0.4);
		}
	}
	.tagline {
		display: flex;
		gap: 0.9rem;
		margin: 0;
		font-family: var(--font-script);
		font-size: 1.05rem;
		color: var(--color-text-muted);
	}
	.tagline span {
		animation: rise 0.45s ease-out both;
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}
	.slow {
		position: absolute;
		bottom: calc(2.5rem + env(safe-area-inset-bottom));
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text-muted);
		animation: rise 0.4s ease-out both;
	}

	@media (prefers-reduced-motion: reduce) {
		.splash *,
		.splash {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
