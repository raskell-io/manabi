<script lang="ts">
	/**
	 * "How Manabi works" — the three ideas behind the app, drawn rather than
	 * explained: the path, the five skills each word grows, and spaced reviews.
	 * Collapsible; the open/closed choice is remembered per device.
	 */
	import { onMount } from 'svelte';
	import { ChevronDown, Eye, Headphones, Mic, MessageSquareText, Brain, ArrowRight, Route } from 'lucide-svelte';
	import { settings } from '$lib/db/store';

	const KEY = 'manabi.howItWorks.closed';
	let open = $state(true);
	onMount(() => {
		try {
			open = localStorage.getItem(KEY) !== '1';
		} catch {
			/* storage unavailable: stay open */
		}
	});
	function toggle() {
		open = !open;
		try {
			localStorage.setItem(KEY, open ? '0' : '1');
		} catch {
			/* ignore */
		}
	}

	// Typical gaps between reviews of a word you keep getting right (SM-2 with default ease).
	const GAPS = [
		{ day: 0, label: 'Today' },
		{ day: 1, label: '1 day' },
		{ day: 6, label: '6 days' },
		{ day: 15, label: '2 weeks' },
		{ day: 38, label: '5 weeks' }
	];
</script>

<section class="how" class:open>
	<button class="how-head" onclick={toggle} aria-expanded={open}>
		<span class="how-title">How Manabi works</span>
		<span class="chev"><ChevronDown size={20} /></span>
	</button>

	{#if open}
		<div class="how-body">
			<div class="idea">
				<span class="num">1</span>
				<div>
					<h3><Route size={16} /> Follow the path</h3>
					<p>
						Each language has a path from its script to real conversations. Work from the top — or jump to any stage; nothing is
						locked. A stage is done once you know 80% of it.
					</p>
				</div>
			</div>

			<div class="idea">
				<span class="num">2</span>
				<div>
					<h3>Every word grows five skills</h3>
					<p>Each skill has its own schedule, and the harder ones open as you get to know the word.</p>
					<ol class="skills">
						<li class="sk sk-see">
							<span class="sk-ic"><Eye size={20} /></span>
							<b>See it</b>
							<small>Recognize it and pick its meaning</small>
						</li>
						<li class="arrow" aria-hidden="true"><ArrowRight size={16} /></li>
						<li class="sk sk-hear">
							<span class="sk-ic"><Headphones size={20} /><Mic size={20} /></span>
							<b>Hear & say it</b>
							<small>Pick what you hear; record yourself</small>
						</li>
						<li class="arrow" aria-hidden="true"><ArrowRight size={16} /></li>
						<li class="sk sk-use">
							<span class="sk-ic"><MessageSquareText size={20} /></span>
							<b>Use it</b>
							<small>Fill it into a sentence — after 1 good review</small>
						</li>
						<li class="arrow" aria-hidden="true"><ArrowRight size={16} /></li>
						<li class="sk sk-recall">
							<span class="sk-ic"><Brain size={20} /></span>
							<b>Recall it</b>
							<small>Produce it from its meaning — after 2</small>
						</li>
					</ol>
				</div>
			</div>

			<div class="idea">
				<span class="num">3</span>
				<div>
					<h3>A little every day</h3>
					<p>
						About {$settings.newPerDay} new words a day (change it in Settings). Each one comes back just before you would forget it, and
						the gaps grow every time you remember:
					</p>
					<div class="gaps" aria-label="Review gaps for a word you keep remembering">
						<span class="gap-line"></span>
						{#each GAPS as g, i (g.day)}
							<span class="gap" style="left: {(Math.sqrt(g.day) / Math.sqrt(38)) * 100}%">
								<span class="gap-dot" class:first={i === 0}></span>
								<span class="gap-l">{g.label}</span>
							</span>
						{/each}
					</div>
					<p class="small">Get it wrong and it simply comes back sooner. Nothing is lost.</p>
				</div>
			</div>
		</div>
	{/if}
</section>

<style>
	.how {
		border: 2px solid var(--color-border);
		border-bottom-width: 4px;
		border-radius: 1.25rem;
		background: var(--color-bg);
	}
	.how-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.9rem 1.1rem;
		border: none;
		background: transparent;
		color: var(--color-text);
		font: inherit;
		text-align: left;
	}
	.how-title {
		font-size: 1.05rem;
		font-weight: 900;
	}
	.chev {
		display: inline-flex;
		color: var(--color-text-muted);
		transition: transform 0.2s ease;
	}
	.open .chev {
		transform: rotate(180deg);
	}
	.how-body {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		padding: 0 1.1rem 1.2rem;
		animation: fade-down 0.25s ease;
	}
	@keyframes fade-down {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
	}
	.idea {
		display: flex;
		gap: 0.85rem;
	}
	.idea > div {
		flex: 1;
		min-width: 0;
	}
	.num {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 1.8rem;
		height: 1.8rem;
		border-radius: 999px;
		background: var(--color-accent);
		color: #fff;
		font-weight: 900;
		font-size: 0.9rem;
	}
	h3 {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin: 0.15rem 0 0.2rem;
		font-size: 1rem;
	}
	p {
		margin: 0;
		color: var(--color-text-muted);
		font-weight: 600;
		line-height: 1.45;
	}
	.small {
		margin-top: 0.4rem;
		font-size: 0.85rem;
	}
	.skills {
		display: flex;
		align-items: stretch;
		gap: 0.35rem;
		margin: 0.7rem 0 0;
		padding: 0;
		list-style: none;
	}
	.sk {
		--c: var(--color-accent);
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		padding: 0.6rem 0.4rem;
		border-radius: 1rem;
		background: color-mix(in srgb, var(--c) 10%, var(--color-bg));
		text-align: center;
	}
	.sk-hear {
		--c: var(--color-sky);
	}
	.sk-use {
		--c: var(--color-teal);
	}
	.sk-recall {
		--c: var(--color-pink);
	}
	.sk-ic {
		display: inline-flex;
		gap: 0.15rem;
		color: var(--c);
	}
	.sk b {
		font-size: 0.85rem;
	}
	.sk small {
		color: var(--color-text-muted);
		font-size: 0.7rem;
		font-weight: 700;
		line-height: 1.25;
	}
	.arrow {
		display: flex;
		align-items: center;
		color: var(--color-text-muted);
	}
	.gaps {
		position: relative;
		height: 2.6rem;
		margin: 0.8rem 1.6rem 0 0.6rem;
	}
	.gap-line {
		position: absolute;
		left: 0;
		right: 0;
		top: 0.45rem;
		height: 3px;
		border-radius: 3px;
		background: linear-gradient(90deg, var(--color-accent), var(--color-teal));
		opacity: 0.35;
	}
	.gap {
		position: absolute;
		top: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		translate: -50% 0;
	}
	.gap-dot {
		width: 1rem;
		height: 1rem;
		border-radius: 999px;
		background: var(--color-teal);
		border: 3px solid var(--color-bg);
		box-shadow: 0 0 0 2px var(--color-teal);
	}
	.gap-dot.first {
		background: var(--color-accent);
		box-shadow: 0 0 0 2px var(--color-accent);
	}
	.gap-l {
		margin-top: 0.2rem;
		font-size: 0.7rem;
		font-weight: 800;
		color: var(--color-text-muted);
		white-space: nowrap;
	}
	@media (max-width: 560px) {
		.skills {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.45rem;
		}
		.arrow {
			display: none;
		}
	}
</style>
