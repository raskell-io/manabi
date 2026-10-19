<script lang="ts">
	/** A number that counts up from `from` to `value` (ease-out), after `delay` ms. Instant under reduced motion. */
	import { onMount, untrack } from 'svelte';

	let {
		value,
		from = 0,
		delay = 0,
		duration = 700,
		format = (n: number) => String(Math.round(n))
	}: { value: number; from?: number; delay?: number; duration?: number; format?: (n: number) => string } = $props();

	let shown = $state(untrack(() => from));

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			shown = value;
			return;
		}
		let raf = 0;
		const start = performance.now() + delay;
		const tick = (now: number) => {
			const t = Math.min(1, Math.max(0, (now - start) / duration));
			shown = from + (value - from) * (1 - Math.pow(1 - t, 3));
			if (t < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});
</script>

<span class="count-up">{format(shown)}</span>

<style>
	.count-up {
		font-variant-numeric: tabular-nums;
	}
</style>
