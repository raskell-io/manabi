<script lang="ts">
	/**
	 * The moment before a session: Nabi pops up with a pep line, the mode and
	 * how many cards are coming. It goes on by itself after a beat; a tap or a
	 * key skips it.
	 */
	import { onMount } from 'svelte';
	import { BookOpen, Headphones, Mic, Layers } from 'lucide-svelte';
	import Mascot from './Mascot.svelte';

	let {
		mode,
		count,
		title,
		onDone
	}: {
		mode: 'reading' | 'listening' | 'speaking' | 'everything';
		count: number;
		/** A lesson / selection name, when the session is scoped. */
		title: string | undefined;
		onDone: () => void;
	} = $props();

	const LABEL = { reading: 'Reading', listening: 'Listening', speaking: 'Speaking', everything: 'Everything' } as const;
	const ICON = { reading: BookOpen, listening: Headphones, speaking: Mic, everything: Layers } as const;
	const LINES = {
		reading: ["Let's read!", 'Eyes ready?', 'Word time!'],
		listening: ['Ears on!', 'Listen closely!', "Let's tune in!"],
		speaking: ['Your turn to talk!', 'Warm up that voice!', "Let's say it out loud!"],
		everything: ["Let's go!", 'All in!', 'Here we go!']
	} as const;
	const roll = Math.random();
	const line = $derived(LINES[mode][Math.floor(roll * LINES[mode].length)]);
	const Icon = $derived(ICON[mode]);

	let leaving = $state(false);
	function done() {
		if (leaving) return;
		leaving = true;
		setTimeout(onDone, 220);
	}
	onMount(() => {
		const t = setTimeout(done, 1700);
		return () => clearTimeout(t);
	});
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
			e.preventDefault();
			done();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<button class="intro {mode}" class:leaving onclick={done} aria-label="{LABEL[mode]}: {count} cards. Tap to start.">
	<span class="bubble">{line}</span>
	<span class="nabi"><Mascot size={128} mood="cheer" /></span>
	<span class="badge"><Icon size={26} strokeWidth={2.6} /></span>
	<span class="title">{LABEL[mode]}</span>
	<span class="count">{count} {count === 1 ? 'card' : 'cards'}{#if title} · {title}{/if}</span>
	<span class="hint">Tap to start</span>
</button>

<style>
	.intro {
		--tone: var(--color-accent);
		position: fixed;
		inset: 0;
		z-index: 70;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		border: none;
		background: radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--tone) 16%, var(--color-bg)), var(--color-bg) 70%);
		color: var(--color-text);
		font: inherit;
		cursor: pointer;
		animation: fade 0.2s ease both;
		transition:
			opacity 0.22s ease,
			transform 0.22s ease;
	}
	.intro.listening {
		--tone: var(--color-sky);
	}
	.intro.speaking {
		--tone: var(--color-pink);
	}
	.intro.leaving {
		opacity: 0;
		transform: scale(1.06);
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	.bubble {
		position: relative;
		padding: 0.55rem 1rem;
		border-radius: 1rem;
		border: 2px solid var(--color-border);
		background: var(--color-bg);
		font-weight: 900;
		font-size: 1.15rem;
		animation: pop 0.45s 0.25s cubic-bezier(0.3, 1.7, 0.5, 1) both;
	}
	.bubble::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: -9px;
		width: 14px;
		height: 14px;
		translate: -50% 0;
		rotate: 45deg;
		background: var(--color-bg);
		border-right: 2px solid var(--color-border);
		border-bottom: 2px solid var(--color-border);
	}
	.nabi {
		animation: rise 0.55s cubic-bezier(0.3, 1.5, 0.5, 1) both;
	}
	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3.2rem;
		height: 3.2rem;
		margin-top: 0.4rem;
		border-radius: 1rem;
		background: var(--tone);
		color: #fff;
		box-shadow: 0 4px 0 color-mix(in srgb, var(--tone) 70%, #000);
		animation: pop 0.4s 0.35s cubic-bezier(0.3, 1.7, 0.5, 1) both;
	}
	.title {
		font-size: 2rem;
		font-weight: 900;
		animation: rise 0.4s 0.45s ease-out both;
	}
	.count {
		color: var(--color-text-muted);
		font-weight: 700;
		animation: rise 0.4s 0.55s ease-out both;
	}
	.hint {
		position: absolute;
		bottom: calc(2rem + env(safe-area-inset-bottom));
		font-size: 0.8rem;
		color: var(--color-text-muted);
		animation: rise 0.4s 0.9s ease-out both;
	}
	@keyframes pop {
		from {
			opacity: 0;
			transform: scale(0.3);
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(24px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.intro,
		.intro * {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
