<script lang="ts">
	/**
	 * Home's glimpse of the learning path: every stage as a dot on a line
	 * (done, here, ahead), the current stage's name and progress, and a link
	 * to the full path.
	 */
	import { ArrowRight, Check } from 'lucide-svelte';
	import { pathData, settings } from '$lib/db/store';
	import { isPathId, pathState, suggestedPath } from '$lib/path';

	const lang = $derived($settings.activeLanguage);
	const chosen = $derived($settings.pathChoice?.[lang]);
	const trail = $derived(pathState(lang, $pathData, isPathId(chosen) ? chosen : suggestedPath(lang, $pathData)));
	const allDone = $derived(trail.doneCount === trail.countable);
	const cur = $derived(trail.stages[trail.current]);
	const curP = $derived(trail.progress[trail.current]);
</script>

<a class="strip" href="/path">
	<span class="top">
		<span class="kicker">Your path · {trail.path.title}</span>
		<span class="go">See it all <ArrowRight size={16} strokeWidth={3} /></span>
	</span>
	<span class="dots" aria-hidden="true">
		{#each trail.stages as st, i (st.id)}
			{@const p = trail.progress[i]}
			<span class="dot" class:done={p.done} class:here={i === trail.current && !allDone} data-kind={st.kind}>
				{#if p.done}<Check size={12} strokeWidth={4} />{:else if i === trail.current && !allDone}{i + 1}{/if}
			</span>
		{/each}
	</span>
	<span class="now">
		{#if allDone}
			<b>Whole path walked!</b> Keep reviewing and exploring.
		{:else}
			<b>Stage {trail.current + 1}: {cur.title}</b>
			{#if cur.kind !== 'explore' && curP.total > 0}<span class="pct">{Math.round(curP.pct * 100)}%</span>{/if}
		{/if}
	</span>
</a>

<style>
	.strip {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		margin: 0 0 1.25rem;
		padding: 0.85rem 1rem 0.9rem;
		border: 2px solid var(--color-border);
		border-bottom-width: 4px;
		border-radius: 1.25rem;
		background: var(--color-bg);
		color: var(--color-text);
		transition: border-color 0.15s ease;
	}
	.strip:hover {
		border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-border));
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.kicker {
		font-size: 0.75rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-accent);
	}
	.go {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		color: var(--color-text-muted);
		font-size: 0.8rem;
		font-weight: 800;
	}
	.dots {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.dots::before {
		content: '';
		position: absolute;
		left: 0.6rem;
		right: 0.6rem;
		top: 50%;
		height: 3px;
		translate: 0 -50%;
		border-radius: 3px;
		background: var(--color-border);
	}
	[data-kind='script'] {
		--c: var(--color-sky);
	}
	[data-kind='words'] {
		--c: var(--color-accent);
	}
	[data-kind='reading'] {
		--c: var(--color-teal);
	}
	[data-kind='skills'] {
		--c: var(--color-pink);
	}
	[data-kind='explore'] {
		--c: var(--color-sun);
	}
	.dot {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.2rem;
		height: 1.2rem;
		border-radius: 999px;
		background: var(--color-bg);
		border: 3px solid color-mix(in srgb, var(--c) 45%, var(--color-border));
		color: #fff;
		font-size: 0.8rem;
		font-weight: 900;
	}
	.dot.done {
		background: var(--color-success);
		border-color: var(--color-success);
	}
	.dot.here {
		width: 2rem;
		height: 2rem;
		background: var(--c);
		border-color: var(--c);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 22%, transparent);
	}
	.now {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.95rem;
		color: var(--color-text-muted);
	}
	.now b {
		color: var(--color-text);
	}
	.pct {
		padding: 0 0.45rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		color: var(--color-accent);
		font-size: 0.78rem;
		font-weight: 900;
	}
</style>
