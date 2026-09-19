<script lang="ts">
	import { GraduationCap, Plus, Trash2 } from 'lucide-svelte';
	import ScriptText from '$lib/components/ScriptText.svelte';
	import {
		activeItems,
		createLesson,
		deleteLesson,
		getItem,
		lessonCounts,
		lessons,
		settings
	} from '$lib/db/store';

	let creating = $state(false);
	let title = $state('');
	let selected = $state<Set<string>>(new Set());

	const langLessons = $derived($lessons.filter((l) => l.language === $settings.activeLanguage));

	function toggle(id: string) {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selected = next;
	}

	function create() {
		if (!title.trim() || selected.size === 0) return;
		createLesson(title.trim(), $settings.activeLanguage, [...selected]);
		title = '';
		selected = new Set();
		creating = false;
	}
</script>

<header class="head">
	<h1>Lessons</h1>
	<button class="new" onclick={() => (creating = !creating)}><Plus size={18} /> New lesson</button>
</header>
<p class="muted">Curated bundles of items in the active language. <strong>Review</strong> a lesson to practice just its items — daily limits don't apply inside a lesson, you get all of it.</p>

{#if creating}
	<section class="builder">
		<input class="title" placeholder="Lesson title (e.g. Food & drink)" bind:value={title} />
		<p class="pick">Pick items ({selected.size} selected)</p>
		<div class="pool">
			{#each $activeItems as it (it.id)}
				<button class="pill" class:on={selected.has(it.id)} onclick={() => toggle(it.id)}>
					<ScriptText text={it.target} language={it.language} size="sm" />
					<span class="m">{it.meaning}</span>
				</button>
			{/each}
		</div>
		<div class="builder-actions">
			<button class="cancel" onclick={() => (creating = false)}>Cancel</button>
			<button class="save" onclick={create} disabled={!title.trim() || selected.size === 0}>Create lesson</button>
		</div>
	</section>
{/if}

<section class="grid">
	{#each langLessons as lesson (lesson.id)}
		{@const c = $lessonCounts[lesson.id] ?? { dueReviews: 0, newItems: 0, total: 0 }}
		<div class="lesson">
			<div class="l-head">
				<h3>{lesson.title}</h3>
				<button class="del" onclick={() => deleteLesson(lesson.id)} aria-label="Delete lesson"><Trash2 size={14} /></button>
			</div>
			<p class="l-count">{lesson.itemIds.length} items</p>
			<div class="l-items">
				{#each lesson.itemIds.slice(0, 8) as itemId (itemId)}
					{@const it = getItem(itemId)}
					{#if it}
						<a href="/items/{it.id}" class="chip">
							<ScriptText text={it.target} language={it.language} size="sm" />
						</a>
					{/if}
				{/each}
				{#if lesson.itemIds.length > 8}<span class="more">+{lesson.itemIds.length - 8}</span>{/if}
			</div>
			<div class="l-foot">
				<span class="l-due">
					{#if c.total === 0}
						No items left
					{:else if c.dueReviews + c.newItems === 0}
						Nothing due
					{:else}
						{#if c.newItems > 0}<span class="l-new">{c.newItems} new</span>{/if}
						{#if c.newItems > 0 && c.dueReviews > 0} · {/if}
						{#if c.dueReviews > 0}<span class="l-overdue">{c.dueReviews} due</span>{/if}
					{/if}
				</span>
				{#if c.total > 0}
					<a class="review" href="/review?lesson={lesson.id}"><GraduationCap size={15} /> Review</a>
				{:else}
					<span class="review off"><GraduationCap size={15} /> Review</span>
				{/if}
			</div>
		</div>
	{:else}
		<p class="muted empty">No lessons yet for this language.</p>
	{/each}
</section>

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	h1 {
		margin: 0;
	}
	.muted {
		color: var(--color-text-muted);
	}
	.new {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 1rem;
		border-radius: 0.5rem;
		background: var(--color-accent);
		color: #fff;
		border: none;
		font-weight: 600;
	}
	.builder {
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.25rem;
		margin: 1.25rem 0;
		background: var(--color-bg-secondary);
	}
	.title {
		width: 100%;
		max-width: 24rem;
		padding: 0.6rem 0.8rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 1rem;
	}
	.pick {
		color: var(--color-text-muted);
		font-size: 0.85rem;
		margin: 1rem 0 0.5rem;
	}
	.pool {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		max-height: 16rem;
		overflow-y: auto;
	}
	.pill {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.15rem;
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-bg);
		color: var(--color-text);
	}
	.pill.on {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 12%, var(--color-bg));
	}
	.pill .m {
		font-size: 0.78rem;
		color: var(--color-text-muted);
	}
	.builder-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1rem;
	}
	.cancel {
		padding: 0.55rem 1.2rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text);
	}
	.save {
		padding: 0.55rem 1.4rem;
		border-radius: 0.5rem;
		background: var(--color-accent);
		color: #fff;
		border: none;
		font-weight: 600;
	}
	.save:disabled {
		opacity: 0.5;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: 1rem;
		margin-top: 1.5rem;
	}
	.lesson {
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1rem 1.1rem;
		background: var(--color-bg-secondary);
	}
	.l-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.l-head h3 {
		margin: 0;
		font-size: 1.05rem;
	}
	.del {
		border: none;
		background: transparent;
		color: var(--color-danger);
		cursor: pointer;
	}
	.l-count {
		color: var(--color-text-muted);
		font-size: 0.82rem;
		margin: 0.25rem 0 0.75rem;
	}
	.l-items {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		align-items: center;
	}
	.chip {
		padding: 0.2rem 0.5rem;
		border-radius: 0.4rem;
		background: var(--color-bg-elevated);
	}
	.more {
		color: var(--color-text-muted);
		font-size: 0.82rem;
	}
	.l-foot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.9rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--color-border);
	}
	.l-due {
		font-size: 0.82rem;
		color: var(--color-text-muted);
	}
	.l-new {
		color: var(--color-accent);
		font-weight: 600;
	}
	.l-overdue {
		color: var(--color-warning);
		font-weight: 600;
	}
	.review {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.8rem;
		border-radius: 0.5rem;
		background: var(--color-accent);
		color: #fff;
		font-size: 0.85rem;
		font-weight: 600;
	}
	.review.off {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.empty {
		grid-column: 1 / -1;
	}
</style>
