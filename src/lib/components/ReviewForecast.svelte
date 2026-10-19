<script lang="ts">
	/**
	 * Reviews due on each of the next 14 days (one series, so no legend: the
	 * title names it). Columns grow from one baseline; today and the busiest
	 * day are labelled; hover or tap a day for its count; a table view below.
	 */
	import type { DayCount } from '$lib/srs/stats';

	let { days }: { days: DayCount[] } = $props();

	const max = $derived(Math.max(1, ...days.map((d) => d.count)));
	const peak = $derived(days.reduce((best, d, i) => (d.count > days[best].count ? i : best), 0));
	const week = $derived(days.slice(0, 7).reduce((n, d) => n + d.count, 0));
	let active = $state<number | null>(null);

	const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => {
		const [y, m, d] = iso.split('-').map(Number);
		return new Date(y, m - 1, d).toLocaleDateString(undefined, opts);
	};
	const label = (i: number) => (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : fmt(days[i].date, { weekday: 'short', day: 'numeric', month: 'short' }));
	const plural = (n: number) => `${n} ${n === 1 ? 'review' : 'reviews'}`;
</script>

<figure class="forecast">
	<figcaption>
		<h2>Coming up</h2>
		<p class="readout" aria-live="polite">
			{#if active !== null}{label(active)} · <strong>{plural(days[active].count)}</strong>{:else}<strong>{plural(week)}</strong> in the next 7 days{/if}
		</p>
	</figcaption>
	<div class="plot" role="group" aria-label="Reviews due per day" onpointerleave={() => (active = null)}>
		{#each days as d, i (d.date)}
			<button
				class="day"
				class:on={active === i}
				aria-label="{label(i)}: {plural(d.count)}"
				onpointerenter={() => (active = i)}
				onfocus={() => (active = i)}
				onclick={() => (active = i)}
			>
				<span class="slot">
					{#if (i === 0 || i === peak) && d.count > 0}<span class="value">{d.count}</span>{/if}
					<span class="col" style="height: {(d.count / max) * 100}%"></span>
				</span>
				<span class="tick" class:today={i === 0}>{i === 0 ? 'Today' : fmt(d.date, { day: 'numeric' })}</span>
			</button>
		{/each}
	</div>
	<details class="table-view">
		<summary>Show as a table</summary>
		<table>
			<thead><tr><th>Day</th><th>Reviews due</th></tr></thead>
			<tbody>
				{#each days as d, i (d.date)}<tr><td>{label(i)}</td><td>{d.count}</td></tr>{/each}
			</tbody>
		</table>
	</details>
</figure>

<style>
	.forecast {
		margin: 0;
		padding: 1.1rem 1.1rem 0.9rem;
		border: 2px solid var(--color-border);
		border-radius: 1.2rem;
		background: var(--color-bg);
	}
	figcaption {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		margin-bottom: 0.75rem;
	}
	h2 {
		margin: 0;
		font-size: 1.05rem;
	}
	.readout {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}
	.readout strong {
		color: var(--color-text);
	}
	.plot {
		display: grid;
		grid-template-columns: repeat(14, minmax(0, 1fr));
		height: 8.5rem;
		border-bottom: 1px solid var(--color-border);
	}
	.day {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 0;
		padding: 0;
		border: none;
		background: none;
		color: inherit;
		font: inherit;
		cursor: default;
	}
	.slot {
		position: relative;
		flex: 1;
		width: 100%;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		border-radius: 0.4rem;
	}
	.day.on .slot {
		background: color-mix(in srgb, var(--color-accent) 7%, transparent);
	}
	.col {
		width: min(24px, 62%);
		min-height: 0;
		background: var(--color-accent);
		border-radius: 4px 4px 0 0;
	}
	.value {
		font-size: 0.72rem;
		font-weight: 800;
		color: var(--color-text);
		margin-bottom: 2px;
		font-variant-numeric: tabular-nums;
	}
	.tick {
		height: 0;
		overflow: visible;
		transform: translateY(0.35rem);
		font-size: 0.68rem;
		color: var(--color-text-muted);
		white-space: nowrap;
	}
	.tick.today {
		font-weight: 800;
		color: var(--color-text);
	}
	.table-view {
		margin-top: 1.6rem;
		font-size: 0.82rem;
		color: var(--color-text-muted);
	}
	.table-view table {
		margin-top: 0.4rem;
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;
	}
	.table-view td,
	.table-view th {
		padding: 0.15rem 1rem 0.15rem 0;
		text-align: left;
	}
</style>
