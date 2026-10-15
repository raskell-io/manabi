<script lang="ts" module>
	/**
	 * Nabi (나비, "butterfly") — Manabi's mascot, hiding in plain sight inside
	 * the name: ma·NABI. A slender pastel butterfly, because learning a script is a
	 * small metamorphosis.
	 *
	 * Pure SVG + CSS: the wings flap (scaleX about the body), the body floats,
	 * the eyes blink and the antennae wiggle. `mood` swaps the face and the
	 * tempo. Everything is still under prefers-reduced-motion.
	 */
	export type MascotMood = 'happy' | 'cheer' | 'sad' | 'think' | 'sleep';
</script>

<script lang="ts">
	let {
		mood = 'happy',
		size = 96,
		label = 'Nabi the butterfly'
	}: { mood?: MascotMood; size?: number; label?: string } = $props();

	// Unique gradient ids per instance (several mascots can share a page).
	const uid = `nabi-${Math.random().toString(36).slice(2, 8)}`;

	// Forewing + hindwing on the left (the right wing mirrors them), with a soft
	// inner glow on each; a slender lavender body and a round head carry the face.
	const FORE = 'M58 54 C 46 32, 26 14, 14 20 C 4 26, 8 44, 20 52 C 30 58, 44 60, 58 60 Z';
	const HIND = 'M58 63 C 44 62, 28 70, 26 84 C 25 96, 38 100, 46 92 C 53 85, 57 74, 58 66 Z';
	const FORE_GLOW = 'M52 55 C 42 40, 28 28, 20 30 C 14 33, 17 43, 25 49 C 33 54, 42 56, 52 56 Z';
	const HIND_GLOW = 'M52 66 C 42 67, 34 74, 33 82 C 33 89, 40 90, 44 85 C 48 80, 51 73, 52 68 Z';
	const BODY = 'M60 50 C 64 50, 64.5 58, 63.5 70 C 62.5 84, 61 96, 60 99 C 59 96, 57.5 84, 56.5 70 C 55.5 58, 56 50, 60 50 Z';
</script>

{#snippet wing()}
	<path d={FORE} fill="url(#{uid}-fore)" />
	<path d={HIND} fill="url(#{uid}-hind)" />
	<path d={FORE_GLOW} fill="#fff" opacity="0.35" />
	<path d={HIND_GLOW} fill="#fff" opacity="0.3" />
{/snippet}

<svg
	class="nabi mood-{mood}"
	width={size}
	height={size}
	viewBox="0 0 120 120"
	role="img"
	aria-label={label}
>
	<defs>
		<linearGradient id="{uid}-fore" x1="1" y1="1" x2="0" y2="0">
			<stop offset="0" stop-color="#ff7eb6" />
			<stop offset="1" stop-color="#ffc2dc" />
		</linearGradient>
		<linearGradient id="{uid}-hind" x1="1" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#ffa36c" />
			<stop offset="1" stop-color="#ffe08a" />
		</linearGradient>
	</defs>

	<ellipse class="ground" cx="60" cy="113" rx="20" ry="3" />

	<g class="float">
		<!-- Wings (behind the body) -->
		<g class="wing wing-l">{@render wing()}</g>
		<g class="wing wing-r">
			<g transform="matrix(-1 0 0 1 120 0)">{@render wing()}</g>
		</g>

		<!-- Antennae -->
		<g class="antenna antenna-l">
			<path d="M57 33 C 54 24, 49 18, 43 15" />
			<circle cx="43" cy="15" r="2.4" />
		</g>
		<g class="antenna antenna-r">
			<path d="M63 33 C 66 24, 71 18, 77 15" />
			<circle cx="77" cy="15" r="2.4" />
		</g>

		<!-- Body + head -->
		<path d={BODY} fill="#7c5cff" />
		<circle cx="60" cy="42" r="10" fill="#8f74ff" />

		<!-- Face -->
		<g class="eyes">
			{#if mood === 'sleep' || mood === 'cheer'}
				<!-- Closed / happy-squint eyes -->
				<path
					class="line"
					d={mood === 'cheer'
						? 'M53.8 42 Q56 38.6 58.2 42 M61.8 42 Q64 38.6 66.2 42'
						: 'M53.8 40.5 Q56 43 58.2 40.5 M61.8 40.5 Q64 43 66.2 40.5'}
				/>
			{:else}
				<g class="blink">
					<g class="pupils">
						<ellipse cx="56" cy="41" rx="1.9" ry="2.5" fill="#1f1a3d" />
						<ellipse cx="64" cy="41" rx="1.9" ry="2.5" fill="#1f1a3d" />
						<circle cx="56.6" cy="40.2" r="0.7" fill="#fff" />
						<circle cx="64.6" cy="40.2" r="0.7" fill="#fff" />
					</g>
				</g>
				{#if mood === 'sad'}
					<path class="line thin" d="M53.5 37.5 L57.5 36.2 M66.5 37.5 L62.5 36.2" />
				{/if}
			{/if}
		</g>
		<ellipse cx="52.8" cy="44.5" rx="2" ry="1.3" fill="#ff7eb6" opacity="0.55" />
		<ellipse cx="67.2" cy="44.5" rx="2" ry="1.3" fill="#ff7eb6" opacity="0.55" />

		{#if mood === 'cheer'}
			<path d="M57 45 Q60 49.5 63 45 Z" fill="#1f1a3d" />
		{:else if mood === 'sad'}
			<path class="line" d="M57.6 47 Q60 44.8 62.4 47" />
		{:else if mood === 'think'}
			<path class="line" d="M57.8 46 L62.2 45.4" />
		{:else if mood === 'sleep'}
			<ellipse cx="60" cy="46" rx="1.3" ry="1" fill="#1f1a3d" />
		{:else}
			<path class="line" d="M57.6 45 Q60 47 62.4 45" />
		{/if}

		{#if mood === 'sleep'}
			<text class="zzz" x="76" y="34">z</text>
			<text class="zzz z2" x="84" y="24">z</text>
		{/if}
		{#if mood === 'cheer'}
			<g class="sparkles">
				<path d="M100 10 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z" fill="#ffd84d" />
				<path d="M16 6 l1.8 4 4 1.8 -4 1.8 -1.8 4 -1.8 -4 -4 -1.8 4 -1.8z" fill="#ff7eb6" />
				<circle cx="110" cy="60" r="2.2" fill="#7c5cff" />
			</g>
		{/if}
	</g>
</svg>

<style>
	.nabi {
		display: block;
		overflow: visible;
		flex-shrink: 0;
	}
	.ground {
		fill: var(--color-text);
		opacity: 0.08;
		transform-origin: 60px 113px;
		animation: shadow 2.6s ease-in-out infinite;
	}
	.float {
		animation: float 2.6s ease-in-out infinite;
	}
	.wing-l {
		transform-origin: 59px 60px;
		animation: flap-l 1.1s ease-in-out infinite;
	}
	.wing-r {
		transform-origin: 61px 60px;
		animation: flap-r 1.1s ease-in-out infinite;
	}
	.antenna path {
		fill: none;
		stroke: #5b3fd6;
		stroke-width: 1.6;
		stroke-linecap: round;
	}
	.antenna circle {
		fill: #5b3fd6;
	}
	.antenna-l {
		transform-origin: 57px 33px;
		animation: wiggle-l 2.6s ease-in-out infinite;
	}
	.antenna-r {
		transform-origin: 63px 33px;
		animation: wiggle-r 2.6s ease-in-out infinite;
	}
	.blink {
		transform-origin: 60px 41px;
		animation: blink 4.2s infinite;
	}
	.line {
		fill: none;
		stroke: #1f1a3d;
		stroke-width: 1.4;
		stroke-linecap: round;
	}
	.line.thin {
		stroke-width: 1.1;
	}
	.zzz {
		font: 800 12px var(--font-sans);
		fill: var(--color-accent);
		animation: zzz 2.4s ease-in-out infinite;
	}
	.zzz.z2 {
		font-size: 10px;
		animation-delay: 0.8s;
	}
	.sparkles {
		transform-origin: 60px 60px;
		animation: sparkle 0.9s ease-in-out infinite alternate;
	}

	/* Mood tempo */
	.mood-cheer .float {
		animation: hop 0.7s cubic-bezier(0.3, 0, 0.4, 1) infinite;
	}
	.mood-cheer .ground {
		animation: shadow-hop 0.7s cubic-bezier(0.3, 0, 0.4, 1) infinite;
	}
	.mood-cheer .wing-l,
	.mood-cheer .wing-r {
		animation-duration: 0.35s;
	}
	.mood-sad .wing-l {
		animation: droop-l 3s ease-in-out infinite;
	}
	.mood-sad .wing-r {
		animation: droop-r 3s ease-in-out infinite;
	}
	.mood-sad .float {
		animation-duration: 4s;
	}
	.mood-sleep .wing-l,
	.mood-sleep .wing-r {
		animation-duration: 3.2s;
	}
	.mood-sleep .float {
		animation-duration: 4.4s;
	}
	.mood-think .pupils {
		transform: translate(1px, -1.2px);
	}
	.mood-think .antenna-l,
	.mood-think .antenna-r {
		animation-duration: 1.2s;
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-5px);
		}
	}
	@keyframes shadow {
		0%,
		100% {
			transform: scaleX(1);
			opacity: 0.08;
		}
		50% {
			transform: scaleX(0.82);
			opacity: 0.05;
		}
	}
	@keyframes hop {
		0%,
		100% {
			transform: translateY(0);
		}
		45% {
			transform: translateY(-12px);
		}
	}
	@keyframes shadow-hop {
		0%,
		100% {
			transform: scaleX(1);
		}
		45% {
			transform: scaleX(0.6);
		}
	}
	@keyframes flap-l {
		0%,
		100% {
			transform: scaleX(1) rotate(0deg);
		}
		50% {
			transform: scaleX(0.55) rotate(3deg);
		}
	}
	@keyframes flap-r {
		0%,
		100% {
			transform: scaleX(1) rotate(0deg);
		}
		50% {
			transform: scaleX(0.55) rotate(-3deg);
		}
	}
	@keyframes droop-l {
		0%,
		100% {
			transform: rotate(-14deg) scaleX(0.9);
		}
		50% {
			transform: rotate(-10deg) scaleX(0.84);
		}
	}
	@keyframes droop-r {
		0%,
		100% {
			transform: rotate(14deg) scaleX(0.9);
		}
		50% {
			transform: rotate(10deg) scaleX(0.84);
		}
	}
	@keyframes wiggle-l {
		0%,
		100% {
			transform: rotate(0deg);
		}
		50% {
			transform: rotate(-9deg);
		}
	}
	@keyframes wiggle-r {
		0%,
		100% {
			transform: rotate(0deg);
		}
		50% {
			transform: rotate(9deg);
		}
	}
	@keyframes blink {
		0%,
		92%,
		100% {
			transform: scaleY(1);
		}
		95% {
			transform: scaleY(0.1);
		}
	}
	@keyframes zzz {
		0% {
			opacity: 0;
			transform: translate(0, 4px);
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(4px, -6px);
		}
	}
	@keyframes sparkle {
		from {
			transform: scale(0.85);
			opacity: 0.6;
		}
		to {
			transform: scale(1.08);
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.nabi *,
		.nabi {
			animation: none !important;
		}
	}
</style>
