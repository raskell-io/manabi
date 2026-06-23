<script lang="ts">
	import { Sparkles, Loader2, Check, X, Trash2 } from 'lucide-svelte';
	import ScriptText from '$lib/components/ScriptText.svelte';
	import { addDrafts, approveDraft, contentDrafts, deleteDraft, getDoc, rejectDraft, settings } from '$lib/db/store';
	import { canGenerate, generateItems } from '$lib/inference/router';
	import { type ItemKind } from '$lib/db/types';

	let kind = $state<ItemKind>('word');
	let level = $state('A1');
	let topic = $state('');
	let count = $state(10);
	let generating = $state(false);
	let error = $state('');
	let notice = $state('');

	const able = $derived(canGenerate($settings));
	const pending = $derived($contentDrafts.filter((d) => d.status === 'pending'));
	const decided = $derived($contentDrafts.filter((d) => d.status !== 'pending').slice(0, 20));

	let focus = $state(0);
	$effect(() => {
		if (focus >= pending.length) focus = Math.max(0, pending.length - 1);
	});

	async function generate() {
		if (!able || generating) return;
		error = '';
		notice = '';
		generating = true;
		try {
			const doc = getDoc();
			const existing = doc
				? Object.values(doc.learningItems)
						.filter((it) => it.language === $settings.activeLanguage)
						.map((it) => it.target)
				: [];
			const res = await generateItems(
				{ language: $settings.activeLanguage, kind, level, topic: topic.trim() || undefined, count, existingTargets: existing },
				$settings
			);
			if (!res.ok || !res.value) {
				error = res.error ?? 'Generation failed';
				return;
			}
			if (res.value.items.length === 0) {
				error = 'Model returned no usable items. Try again or adjust the prompt.';
				return;
			}
			const prompt = `${kind} · ${level}${topic ? ' · ' + topic : ''}`;
			const n = addDrafts($settings.activeLanguage, kind, res.value.items, prompt);
			notice = `Generated ${n} draft${n === 1 ? '' : 's'} for review.`;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Generation failed';
		} finally {
			generating = false;
		}
	}

	function handleKey(e: KeyboardEvent) {
		if (pending.length === 0) return;
		const tag = (e.target as HTMLElement)?.tagName;
		if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
		const d = pending[focus];
		switch (e.key) {
			case 'j':
			case 'ArrowDown':
				focus = Math.min(pending.length - 1, focus + 1);
				e.preventDefault();
				break;
			case 'k':
			case 'ArrowUp':
				focus = Math.max(0, focus - 1);
				e.preventDefault();
				break;
			case 'a':
				if (d) approveDraft(d.id);
				break;
			case 'r':
				if (d) rejectDraft(d.id);
				break;
			case 'd':
				if (d) deleteDraft(d.id);
				break;
		}
	}
</script>

<svelte:window onkeydown={handleKey} />

<h1>Content Workbench</h1>
<p class="muted">Generate draft items with AI, then review before they enter your study pool. Nothing is published without your approval.</p>

{#if !able}
	<div class="warn">Set an OpenAI API key in <a href="/settings">Settings</a> to generate content.</div>
{/if}

<section class="gen">
	<div class="row">
		<label>
			<span>Kind</span>
			<select bind:value={kind}>
				<option value="word">word</option>
				<option value="phrase">phrase</option>
				<option value="sentence">sentence</option>
				<option value="grammar">grammar</option>
			</select>
		</label>
		<label>
			<span>Level</span>
			<input bind:value={level} placeholder="A1 / HSK1 / N5" />
		</label>
		<label>
			<span>Count</span>
			<input type="number" min="1" max="30" bind:value={count} />
		</label>
		<label class="grow">
			<span>Topic (optional)</span>
			<input bind:value={topic} placeholder="food, travel, daily routine…" />
		</label>
	</div>
	<button class="generate" onclick={generate} disabled={!able || generating}>
		{#if generating}<Loader2 size={18} class="spin" /> Generating…{:else}<Sparkles size={18} /> Generate{/if}
	</button>
	{#if error}<p class="error">{error}</p>{/if}
	{#if notice}<p class="notice">{notice}</p>{/if}
</section>

<section class="queue">
	<div class="q-head">
		<h2>Review queue · {pending.length}</h2>
		{#if pending.length > 0}<span class="keys">j/k move · a approve · r reject · d delete</span>{/if}
	</div>

	{#each pending as d, i (d.id)}
		<div class="draft" class:focused={i === focus}>
			<div class="d-main">
				<div class="d-lead">
					<ScriptText text={d.item.target} language={d.language} size="md" />
					<span class="reading">{d.item.reading}{d.item.transliteration ? ' · ' + d.item.transliteration : ''}</span>
				</div>
				<div class="d-meaning">{d.item.meaning}</div>
				{#if d.item.examples[0]}
					<div class="d-ex">
						<ScriptText text={d.item.examples[0].target} language={d.language} size="sm" />
						<span class="ex-meaning">{d.item.examples[0].meaning}</span>
					</div>
				{/if}
				<div class="d-tags">
					<span class="tag">{d.kind}</span>
					<span class="tag">{d.item.level}</span>
					{#each d.item.tags as t (t)}<span class="tag">{t}</span>{/each}
				</div>
			</div>
			<div class="d-actions">
				<button class="ok" onclick={() => approveDraft(d.id)} aria-label="Approve"><Check size={16} /></button>
				<button class="no" onclick={() => rejectDraft(d.id)} aria-label="Reject"><X size={16} /></button>
				<button class="del" onclick={() => deleteDraft(d.id)} aria-label="Delete"><Trash2 size={14} /></button>
			</div>
		</div>
	{:else}
		<p class="muted">No drafts pending. Generate a batch above.</p>
	{/each}
</section>

{#if decided.length > 0}
	<section class="history">
		<h2>Recent decisions</h2>
		<ul>
			{#each decided as d (d.id)}
				<li>
					<ScriptText text={d.item.target} language={d.language} size="sm" />
					<span class="d-meaning">{d.item.meaning}</span>
					<span class="status {d.status}">{d.status}</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	h1 {
		margin-bottom: 0.25rem;
	}
	.muted {
		color: var(--color-text-muted);
	}
	.warn,
	.notice,
	.error {
		border-radius: 0.5rem;
		padding: 0.6rem 0.9rem;
		margin: 1rem 0;
		font-size: 0.9rem;
	}
	.warn {
		background: color-mix(in srgb, var(--color-warning) 15%, var(--color-bg));
		border: 1px solid var(--color-warning);
	}
	.warn a {
		color: var(--color-accent);
	}
	.notice {
		color: var(--color-success);
	}
	.error {
		color: var(--color-danger);
	}
	.gen {
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.25rem;
		margin: 1.25rem 0 2rem;
		background: var(--color-bg-secondary);
	}
	.row {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}
	label.grow {
		flex: 1;
		min-width: 12rem;
	}
	input,
	select {
		padding: 0.5rem 0.65rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-bg);
		color: var(--color-text);
		font-family: inherit;
		font-size: 0.95rem;
	}
	.generate {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.6rem 1.4rem;
		border-radius: 0.5rem;
		background: var(--color-accent);
		color: #fff;
		border: none;
		font-weight: 600;
	}
	.generate:disabled {
		opacity: 0.5;
	}
	:global(.generate .spin) {
		animation: spin 0.9s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.q-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.q-head h2 {
		font-size: 1.1rem;
	}
	.keys {
		font-size: 0.78rem;
		color: var(--color-text-muted);
	}
	.draft {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 0.65rem;
		padding: 0.9rem 1rem;
		margin-bottom: 0.5rem;
		background: var(--color-bg-secondary);
	}
	.draft.focused {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 1px var(--color-accent);
	}
	.d-lead {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
	}
	.reading {
		color: var(--color-text-muted);
		font-size: 0.88rem;
	}
	.d-meaning {
		margin: 0.3rem 0;
	}
	.d-ex {
		display: flex;
		gap: 0.6rem;
		align-items: baseline;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		margin-bottom: 0.4rem;
	}
	.ex-meaning {
		font-style: italic;
	}
	.d-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.tag {
		font-size: 0.72rem;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		background: var(--color-bg-elevated);
		color: var(--color-text-muted);
	}
	.d-actions {
		display: flex;
		gap: 0.4rem;
		align-items: flex-start;
	}
	.d-actions button {
		width: 2.1rem;
		height: 2.1rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	.d-actions .ok {
		color: var(--color-success);
	}
	.d-actions .no {
		color: var(--color-warning);
	}
	.d-actions .del {
		color: var(--color-danger);
	}
	.history {
		margin-top: 2rem;
	}
	.history h2 {
		font-size: 1.05rem;
	}
	.history ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.history li {
		display: flex;
		gap: 0.75rem;
		align-items: baseline;
		padding: 0.4rem 0;
		border-bottom: 1px solid var(--color-border);
	}
	.status {
		margin-left: auto;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.status.approved {
		color: var(--color-success);
	}
	.status.rejected {
		color: var(--color-danger);
	}
</style>
