<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Trash2, Plus, Sparkles, Play } from 'lucide-svelte';
	import ScriptText from '$lib/components/ScriptText.svelte';
	import AudioButton from '$lib/components/AudioButton.svelte';
	import StrokePad from '$lib/components/StrokePad.svelte';
	import { hanChars, strokeLang } from '$lib/strokes';
	import { radicalOf } from '$lib/radicals';
	import { rootLabel, rootOfWord, splitByRoot } from '$lib/roots';
	import { deleteItem, getItem, pronunciationAttempts, settings, updateItem } from '$lib/db/store';
	import { playRef } from '$lib/audio';
	import { suggestRating } from '$lib/pronunciation';
	import { LANGUAGES, needsNiqqud, type ExampleSentence, type ItemKind, type ItemStatus, type Language, type LearningItem } from '$lib/db/types';
	import { canDiacritize } from '$lib/inference/router';
	import { diacritizeItem } from '$lib/hebrew';

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

	// "Write it": stroke order + tracing for each hanzi/kanji in the (saved) target.
	const writeLang = $derived(item ? strokeLang(item.language) : null);
	const writeChars = $derived(item && writeLang ? hanChars(item.target) : []);
	let writeIdx = $state(0);
	const writeChar = $derived(writeChars[Math.min(writeIdx, writeChars.length - 1)]);
	const writeRadical = $derived(writeChar ? radicalOf(writeChar) : undefined);

	// Hebrew: the root this word grows from, and its word family (Roots page).
	const root = $derived(item?.language === 'he' ? rootOfWord(item.target) : undefined);

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

	// Hebrew: offer to add niqqud to any bare target / example (AI; the learner reviews, then saves).
	const bareHebrew = $derived(
		!!form && form.language === 'he' && (needsNiqqud(form.target) || form.examples.some((e) => needsNiqqud(e.target)))
	);
	let vowelBusy = $state(false);
	let vowelMsg = $state('');
	async function addVowels() {
		if (!form) return;
		vowelBusy = true;
		vowelMsg = '';
		try {
			const r = await diacritizeItem(form, $settings);
			form.target = r.item.target;
			form.examples = r.item.examples;
			vowelMsg = r.error
				? `Couldn't add vowels: ${r.error}`
				: r.failed
					? `Vowelled ${r.changed}; ${r.failed} left unchanged because the model altered the letters.`
					: `Vowelled ${r.changed} ${r.changed === 1 ? 'text' : 'texts'} — check them, then Save.`;
		} finally {
			vowelBusy = false;
		}
	}

	// The last few recordings of this word (playable here only if the blob is on this device).
	const takes = $derived($pronunciationAttempts.filter((a) => a.itemId === id).slice(0, 5));

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

	{#if bareHebrew || vowelMsg}
		<div class="vowel-row">
			{#if bareHebrew && canDiacritize($settings)}
				<button class="vowel" onclick={addVowels} disabled={vowelBusy}>
					<Sparkles size={14} /> {vowelBusy ? 'Adding vowels…' : 'Add vowels (AI)'}
				</button>
			{:else if bareHebrew}
				<span class="muted">This Hebrew has no vowel points. Add an OpenAI key in Settings to point it automatically.</span>
			{/if}
			{#if vowelMsg}<span class="muted">{vowelMsg}</span>{/if}
		</div>
	{/if}

	{#if writeLang && writeChar}
		<section class="write">
			<div class="write-head">
				<h2>Write it</h2>
				{#if writeChars.length > 1}
					<div class="write-chars" role="tablist" aria-label="Character">
						{#each writeChars as c, i (c)}
							<button role="tab" class:on={c === writeChar} aria-selected={c === writeChar} lang={item?.language === 'zh' ? 'zh-Hans' : 'ja'} onclick={() => (writeIdx = i)}>{c}</button>
						{/each}
					</div>
				{/if}
				{#if writeRadical}
					<a class="write-radical" href="/radicals?r={writeRadical.radical.n}">Radical {writeRadical.radical.char} · {writeRadical.radical.meaning}</a>
				{/if}
			</div>
			{#key writeChar}<StrokePad char={writeChar} lang={writeLang} size={220} />{/key}
		</section>
	{/if}

	{#if root && item}
		<section class="root">
			<div class="write-head">
				<h2>Root</h2>
				<a class="root-chip" href="/roots?r={root.root.id}">
					<span dir="rtl" lang="he">{rootLabel(root.root)}</span> · {root.root.meaning}
				</a>
			</div>
			<p class="root-word" dir="rtl" lang="he">
				{#each splitByRoot(item.target, root.root) as c, i (i)}<span class:hl={c.root}>{c.text}</span>{/each}
			</p>
			<div class="family">
				{#each root.root.words.filter((w) => w !== root.word) as w (w.t)}
					<a class="kin" href="/roots?r={root.root.id}" title={w.r}>
						<span class="kin-t" dir="rtl" lang="he">{w.t}</span>
						<span class="kin-m">{w.m}</span>
					</a>
				{/each}
			</div>
		</section>
	{/if}

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

	{#if takes.length > 0}
		<section class="takes">
			<h2>Recent takes</h2>
			<ul>
				{#each takes as a (a.id)}
					<li>
						<button class="play-take" onclick={() => void playRef(a.audioRef)} aria-label="Play this take"><Play size={14} /></button>
						<span class="take-date">{new Date(a.at).toLocaleDateString()}</span>
						<span class="take-rating {a.selfRating}">{a.selfRating}</span>
						{#if typeof a.score === 'number'}
							<span class="take-score {suggestRating(a.score)}">{a.score}%</span>
							{#if a.transcript}<span class="take-heard">heard <ScriptText text={a.transcript} language={form.language as Language} size="sm" /></span>{/if}
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

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
		border-radius: 0.7rem;
		border: 2px solid var(--color-border);
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
		border: 2px solid var(--color-border);
		border-radius: 0.7rem;
		background: var(--color-bg-secondary);
		color: var(--color-text);
		font-size: 0.95rem;
		font-family: inherit;
	}
	.script-input {
		font-family: var(--font-script);
		font-size: 1.1rem;
	}
	.write {
		margin: 0 0 1.5rem;
		padding: 1rem 1rem 1.25rem;
		border: 2px solid var(--color-border);
		border-radius: 1.25rem;
	}
	.write-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem 1rem;
		margin-bottom: 0.75rem;
	}
	.write-head h2 {
		margin: 0;
	}
	.write-chars {
		display: inline-flex;
		gap: 0.3rem;
	}
	.write-chars button {
		min-width: 2.4rem;
		padding: 0.15rem 0.5rem;
		border: 2px solid var(--color-border);
		border-radius: 0.7rem;
		background: var(--color-bg);
		color: var(--color-text);
		font-family: var(--font-script);
		font-size: 1.2rem;
	}
	.write-chars button.on {
		border-color: var(--color-accent);
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg));
	}
	.root {
		margin: 0 0 1.5rem;
		padding: 1rem 1rem 1.1rem;
		border: 2px solid var(--color-border);
		border-radius: 1.25rem;
	}
	.root .write-head {
		margin-bottom: 0.25rem;
	}
	.root-chip {
		margin-left: auto;
		padding: 0.15rem 0.7rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-teal) 12%, var(--color-bg));
		color: var(--color-teal);
		font-size: 0.85rem;
		font-weight: 800;
	}
	.root-chip span {
		font-family: var(--font-script);
		font-size: 1.05rem;
	}
	.root-word {
		margin: 0 0 0.6rem;
		font-family: var(--font-script);
		font-size: 2rem;
		text-align: center;
	}
	.root-word .hl {
		color: var(--color-pink);
		font-weight: 700;
	}
	.family {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.kin {
		display: inline-flex;
		align-items: baseline;
		gap: 0.4rem;
		padding: 0.2rem 0.65rem;
		border: 2px solid var(--color-border);
		border-radius: 0.8rem;
		color: var(--color-text);
	}
	.kin:hover {
		border-color: color-mix(in srgb, var(--color-teal) 55%, var(--color-border));
	}
	.kin-t {
		font-family: var(--font-script);
		font-size: 1.15rem;
	}
	.kin-m {
		color: var(--color-text-muted);
		font-size: 0.78rem;
		font-weight: 700;
	}
	.write-radical {
		margin-left: auto;
		font-size: 0.8rem;
		font-weight: 800;
		color: var(--color-teal);
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
		border-radius: 0.7rem;
		border: 2px solid var(--color-border);
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
		border: 2px solid var(--color-border);
		background: transparent;
		color: var(--color-danger);
		border-radius: 0.7rem;
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
		border-radius: 0.7rem;
		background: var(--color-accent);
		color: #fff;
		border: none;
		font-weight: 600;
	}
	.vowel-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		margin: 0 0 1rem;
	}
	.vowel {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.45rem 0.9rem;
		border-radius: 0.7rem;
		border: 1px solid var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg));
		color: var(--color-accent);
		font-weight: 600;
		font-size: 0.88rem;
	}
	.vowel:disabled {
		opacity: 0.6;
	}
	.takes {
		margin: 1.5rem 0 0;
	}
	.takes h2 {
		font-size: 1.05rem;
		margin: 0 0 0.6rem;
	}
	.takes ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.takes li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		border: 2px solid var(--color-border);
		border-radius: 0.7rem;
		padding: 0.45rem 0.75rem;
		background: var(--color-bg-secondary);
		font-size: 0.9rem;
	}
	.play-take {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.9rem;
		height: 1.9rem;
		border-radius: 0.45rem;
		border: 2px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-accent);
	}
	.take-date {
		color: var(--color-text-muted);
	}
	.take-rating {
		text-transform: capitalize;
		font-weight: 600;
	}
	.take-rating.good,
	.take-score.good {
		color: var(--color-success);
	}
	.take-rating.okay,
	.take-score.okay {
		color: var(--color-warning);
	}
	.take-rating.bad,
	.take-score.bad {
		color: var(--color-danger);
	}
	.take-score {
		font-weight: 700;
	}
	.take-heard {
		color: var(--color-text-muted);
		display: inline-flex;
		gap: 0.3rem;
		align-items: baseline;
	}
</style>
