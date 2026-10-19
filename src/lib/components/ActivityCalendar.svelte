<script lang="ts">
	/**
	 * Practice per day, as a calendar: weeks in columns (Monday on top), one
	 * hue light → dark by how many answers that day (relative to the busiest
	 * day shown). Hover or tap a day for its count; a table view below.
	 */
	import { level, type DayCount } from '$lib/srs/stats';

	let { weeks }: { weeks: (DayCount | null)[][] } = $props();

	const days = $derived(weeks.flat().filter((d): d is DayCount => d !== null));
	const max = $derived(Math.max(0, ...days.map((d) => d.count)));
	const activeDays = $derived(days.filter((d) => d.count > 0).length);
	let active = $state<DayCount | null>(null);

	const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => {
		const [y, m, d] = iso.split('-').map(Number);
		return new Date(y, m - 1, d).toLocaleDateString(undefined, opts);
	};
	const plural = (n: number) => `${n} ${n === 1 ? 'answer' : 'answers'}`;
	// A month label above the first week that starts in it — dropped when the
	// next month's label follows within two weeks (a partial first month).
	const months = $derived.by(() => {
		const raw = weeks.map((w, i) => {
			const first = w.find((d) => d)?.date;
			const prev = weeks[i - 1]?.find((d) => d)?.date;
			return first && (!prev || first.slice(0, 7) !== prev.slice(0, 7)) ? fmt(first, { month: 'short' }) : '';
		});
		return raw.map((m, i) => (m && raw.slice(i + 1, i + 3).some(Boolean) ? '' : m));
	});
</script>

<figure class="calendar">
	<figcaption>
		<h2>Practice</h2>
		<p class="readout" aria-live="polite">
			{#if active}{fmt(active.date, { weekday: 'short', day: 'numeric', month: 'short' })} · <strong>{plural(active.count)}</strong
				>{:else}<strong>{activeDays}</strong> {activeDays === 1 ? 'day' : 'days'} practised in {weeks.length} weeks{/if}
		</p>
	</figcaption>
	<div class="wrap">
		<div class="weekdays" aria-hidden="true"><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span><span></span></div>
		<div class="grid-wrap">
			<div class="months" aria-hidden="true" style="grid-template-columns: repeat({weeks.length}, var(--cell))">
				{#each months as m, i (i)}<span>{m}</span>{/each}
			</div>
			<div class="grid" role="group" aria-label="Answers per day" style="grid-template-columns: repeat({weeks.length}, var(--cell))" onpointerleave={() => (active = null)}>
				{#each weeks as w, wi (wi)}
					{#each w as d, di (di)}
						{#if d}
							<button
								class="cell l{level(d.count, max)}"
								class:on={active?.date === d.date}
								style="grid-column: {wi + 1}; grid-row: {di + 1}"
								aria-label="{fmt(d.date, { weekday: 'long', day: 'numeric', month: 'long' })}: {plural(d.count)}"
								onpointerenter={() => (active = d)}
								onfocus={() => (active = d)}
								onclick={() => (active = d)}
							></button>
						{/if}
					{/each}
				{/each}
			</div>
		</div>
	</div>
	<div class="legend" aria-hidden="true">
		Less {#each [0, 1, 2, 3, 4] as l (l)}<span class="cell l{l}"></span>{/each} More
	</div>
	<details class="table-view">
		<summary>Show as a table</summary>
		<table>
			<thead><tr><th>Day</th><th>Answers</th></tr></thead>
			<tbody>
				{#each days.filter((d) => d.count > 0).reverse() as d (d.date)}<tr><td>{fmt(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}</td><td>{d.count}</td></tr>{:else}<tr
						><td colspan="2">No practice yet.</td></tr
					>{/each}
			</tbody>
		</table>
	</details>
</figure>

<style>
	.calendar {
		--cell: 13px;
		--gap: 3px;
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
	.wrap {
		display: flex;
		gap: 0.4rem;
		overflow-x: auto;
	}
	.weekdays {
		display: grid;
		grid-template-rows: repeat(7, var(--cell));
		gap: var(--gap);
		margin-top: calc(0.9rem + var(--gap));
		font-size: 0.62rem;
		line-height: var(--cell);
		color: var(--color-text-muted);
	}
	.months {
		display: grid;
		gap: var(--gap);
		height: 0.9rem;
		font-size: 0.62rem;
		color: var(--color-text-muted);
		white-space: nowrap;
	}
	.grid {
		display: grid;
		grid-template-rows: repeat(7, var(--cell));
		gap: var(--gap);
		margin-top: var(--gap);
	}
	.cell {
		display: inline-block;
		width: var(--cell);
		height: var(--cell);
		padding: 0;
		border: none;
		border-radius: 3px;
		cursor: default;
	}
	/* One hue, light → dark (color-mix with the surface, so dark mode steps the other way). */
	.l0 {
		background: color-mix(in srgb, var(--color-border) 70%, var(--color-bg));
	}
	.l1 {
		background: color-mix(in srgb, var(--color-accent) 25%, var(--color-bg));
	}
	.l2 {
		background: color-mix(in srgb, var(--color-accent) 48%, var(--color-bg));
	}
	.l3 {
		background: color-mix(in srgb, var(--color-accent) 72%, var(--color-bg));
	}
	.l4 {
		background: var(--color-accent);
	}
	.cell.on {
		outline: 2px solid var(--color-text);
		outline-offset: 1px;
	}
	.legend {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 3px;
		margin-top: 0.6rem;
		font-size: 0.68rem;
		color: var(--color-text-muted);
	}
	.legend .cell {
		width: 11px;
		height: 11px;
	}
	.table-view {
		margin-top: 0.6rem;
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
