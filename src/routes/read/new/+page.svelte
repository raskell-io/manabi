<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, Loader2, Sparkles, BookOpen } from 'lucide-svelte';
	import { createPassage, settings } from '$lib/db/store';
	import { LANGUAGES } from '$lib/db/types';
	import { dictionary } from '$lib/dictionary';
	import { linesFromText, splitSentences } from '$lib/own-text';
	import { annotate, canGenerate } from '$lib/inference/router';

	const lang = $derived($settings.activeLanguage);
	const langName = $derived(LANGUAGES.find((l) => l.code === lang)?.name ?? '');
	const aiAvailable = $derived(canGenerate($settings));

	let title = $state('');
	let text = $state('');
	let useAi = $state(true);
	let busy = $state(false);
	let error = $state('');

	const sentences = $derived(splitSentences(text));
	const MAX_LINES = 80;

	async function create() {
		if (!sentences.length || busy) return;
		busy = true;
		error = '';
		try {
			const lines = await linesFromText(lang, text, dictionary);
			const kept = lines.slice(0, MAX_LINES);
			if (useAi && aiAvailable) {
				const res = await annotate({ language: lang, lines: kept.map((l) => l.target) }, $settings);
				if (res.ok && res.value) {
					res.value.lines.forEach((a, i) => {
						if (a.reading) kept[i].reading = a.reading;
						kept[i].meaning = a.meaning;
						if (a.transliteration) kept[i].transliteration = a.transliteration;
					});
				} else {
					error = `Saved with dictionary readings only — the AI step failed (${res.error}).`;
				}
			}
			const id = createPassage({
				language: lang,
				kind: 'text',
				title: title.trim() || kept[0].target.slice(0, 24),
				level: 'Your text',
				tags: ['mine'],
				lines: kept
			});
			await goto(`/read/${id}`);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			busy = false;
		}
	}
</script>

<a class="back" href="/read"><ArrowLeft size={16} /> Read</a>

<header class="head">
	<h1>Read your own text</h1>
	<p class="muted">
		Paste a {langName} article, message or story. It becomes a text you can read like the others: tap any word for its meaning,
		reveal readings, and send words or lines to your reviews.
	</p>
</header>

<form
	class="form"
	onsubmit={(e) => {
		e.preventDefault();
		void create();
	}}
>
	<label>
		<span>Title</span>
		<input bind:value={title} placeholder="Optional" maxlength="80" />
	</label>
	<label>
		<span>Text</span>
		<textarea bind:value={text} rows="10" placeholder="Paste {langName} text here…" dir="auto" lang={lang}></textarea>
	</label>
	<p class="count muted">
		{sentences.length}
		{sentences.length === 1 ? 'sentence' : 'sentences'}{sentences.length > MAX_LINES ? ` — the first ${MAX_LINES} are kept` : ''}
	</p>

	{#if aiAvailable}
		<label class="check">
			<input type="checkbox" bind:checked={useAi} />
			<span><Sparkles size={14} /> Add readings and an English translation per line with AI (OpenAI)</span>
		</label>
	{:else}
		<p class="muted note">
			Readings come from the built-in dictionary{lang === 'he' ? ' (Hebrew needs the AI for readings)' : ''}. Add an OpenAI key in
			Settings to get line-by-line translations too.
		</p>
	{/if}

	{#if error}<p class="error" role="alert">{error}</p>{/if}

	<button class="btn3d" type="submit" disabled={!sentences.length || busy}>
		{#if busy}<Loader2 size={18} class="spin" /> Preparing…{:else}<BookOpen size={18} /> Start reading{/if}
	</button>
</form>

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--color-text-muted);
		margin-bottom: 1rem;
	}
	.head {
		margin-bottom: 1.25rem;
	}
	.muted {
		color: var(--color-text-muted);
	}
	.form {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		max-width: 44rem;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-weight: 800;
	}
	input,
	textarea {
		padding: 0.6rem 0.75rem;
		border: 2px solid var(--color-border);
		border-radius: 0.8rem;
		background: var(--color-bg);
		color: var(--color-text);
		font: inherit;
		font-weight: 500;
	}
	textarea {
		font-family: var(--font-script);
		font-size: 1.1rem;
		line-height: 1.6;
		resize: vertical;
	}
	.count {
		margin: -0.4rem 0 0;
		font-size: 0.85rem;
	}
	.check {
		flex-direction: row;
		align-items: flex-start;
		gap: 0.5rem;
		font-weight: 600;
	}
	.check span {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}
	.note {
		margin: 0;
		font-size: 0.9rem;
	}
	.error {
		margin: 0;
		color: var(--color-danger);
		font-weight: 700;
	}
	.form > :global(.btn3d) {
		align-self: flex-start;
	}
	.form :global(.spin) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
