<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Trash2, Plus } from 'lucide-svelte';
	import ScriptText from '$lib/components/ScriptText.svelte';
	import AudioButton from '$lib/components/AudioButton.svelte';
	import { deleteItem, getItem, updateItem } from '$lib/db/store';
	import { LANGUAGES, type ExampleSentence, type ItemKind, type ItemStatus, type Language, type LearningItem } from '$lib/db/types';

	const id = $derived($page.params.id);
	const item = $derived<LearningItem | undefined>(id ? getItem(id) : undefined);

	// Editable working copy, seeded once from the item.
	let form = $state<LearningItem | null>(null);
	let loadedId = '';
	$effect(() => {
		if (item && item.id !== loadedId) {
			loadedId = item.id;
			form = JSON.parse(JSON.stringify(item));
		}
	});

	let tagsText = $state('');
	$effect(() => {
		if (form) tagsText = form.tags.join(', ');
	});

	function save() {
		if (!form || !id) return;
		updateItem(id, {
			target: form.target,
			reading: form.reading,
			transliteration: form.transliteration,
			meaning: form.meaning,
			level: form.level,
			kind: form.kind,
			status: form.status,
			tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
			examples: form.examples
		});
	}

	function remove() {
		if (!id) return;
		if (confirm('Delete this item permanently?')) {
			deleteItem(id);
			goto('/items');
		}
	}

	function addExample() {
		if (!form) return;
		form.examples = [...form.examples, { target: '', reading: '', meaning: '' } as ExampleSentence];
	}
	function removeExample(i: number) {
		if (!form) return;
		form.examples = form.examples.filter((_, idx) => idx !== i);
	}

	const KINDS: ItemKind[] = ['word', 'phrase', 'sentence', 'grammar', 'character'];
	const STATUSES: ItemStatus[] = ['published', 'draft'];
	function langName(code: string): string {
		return LANGUAGES.find((l) => l.code === code)?.name ?? code;
	}
</script>

<a class="back" href="/items"><ArrowLeft size={16} /> Items</a>

{#if !form}
	<p class="muted">Item not found.</p>
{:else}
	<header class="head">
		<div class="preview">
			<ScriptText text={form.target || '—'} language={form.language as Language} size="lg" forceVowels />
			<span class="muted">{form.reading}</span>
			{#if form.target}
				<AudioButton text={form.target} language={form.language as Language} audioRef={form.audioRef} itemId={form.id} />
			{/if}
		</div>
		<button class="danger" onclick={remove}><Trash2 size={16} /> Delete</button>
	</header>

	<div class="grid">
		<label>
			<span>Target ({langName(form.language)} script)</span>
			<input bind:value={form.target} class="script-input" dir={form.language === 'he' ? 'rtl' : 'ltr'} />
		</label>
		<label>
			<span>Reading</span>
			<input bind:value={form.reading} placeholder="pinyin / kana / transliteration" />
		</label>
		<label>
			<span>Transliteration (optional)</span>
			<input bind:value={form.transliteration} placeholder="latin form" />
		</label>
		<label>
			<span>Meaning</span>
			<input bind:value={form.meaning} placeholder="English gloss" />
		</label>
		<label>
			<span>Level</span>
			<input bind:value={form.level} placeholder="A1 / HSK1 / N5" />
		</label>
		<label>
			<span>Kind</span>
			<select bind:value={form.kind}>
				{#each KINDS as k (k)}<option value={k}>{k}</option>{/each}
			</select>
		</label>
		<label>
			<span>Status</span>
			<select bind:value={form.status}>
				{#each STATUSES as s (s)}<option value={s}>{s}</option>{/each}
			</select>
		</label>
		<label class="wide">
			<span>Tags (comma-separated)</span>
			<input bind:value={tagsText} placeholder="time, daily, HSK1" />
		</label>
	</div>

	<section class="examples">
		<div class="ex-head">
			<h2>Example sentences</h2>
			<button class="add" onclick={addExample}><Plus size={14} /> Add</button>
		</div>
		{#each form.examples as ex, i (i)}
			<div class="ex">
				<input bind:value={ex.target} class="script-input" dir={form.language === 'he' ? 'rtl' : 'ltr'} placeholder="sentence (script)" />
				<input bind:value={ex.reading} placeholder="reading" />
				<input bind:value={ex.meaning} placeholder="meaning" />
				<button class="ex-del" onclick={() => removeExample(i)} aria-label="Remove example"><Trash2 size={14} /></button>
			</div>
		{:else}
			<p class="muted">No examples yet.</p>
		{/each}
	</section>

	<div class="save-bar">
		<button class="save" onclick={save}>Save</button>
	</div>
{/if}

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--color-text-muted);
		margin-bottom: 1rem;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}
	.preview {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.muted {
		color: var(--color-text-muted);
	}
	.danger {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.85rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-danger);
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}
	label.wide {
		grid-column: 1 / -1;
	}
	input,
	select {
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-bg-secondary);
		color: var(--color-text);
		font-size: 0.95rem;
		font-family: inherit;
	}
	.script-input {
		font-family: var(--font-script);
		font-size: 1.1rem;
	}
	.examples {
		margin-top: 2rem;
	}
	.ex-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.ex-head h2 {
		font-size: 1.1rem;
	}
	.add {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.7rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-secondary);
		color: var(--color-text);
	}
	.ex {
		display: grid;
		grid-template-columns: 1.3fr 1fr 1fr auto;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		align-items: center;
	}
	.ex-del {
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-danger);
		border-radius: 0.5rem;
		padding: 0.5rem;
	}
	.save-bar {
		position: sticky;
		bottom: 0;
		padding: 1rem 0;
		margin-top: 1.5rem;
		background: linear-gradient(transparent, var(--color-bg) 40%);
	}
	.save {
		padding: 0.65rem 2rem;
		border-radius: 0.5rem;
		background: var(--color-accent);
		color: #fff;
		border: none;
		font-weight: 600;
	}
</style>
