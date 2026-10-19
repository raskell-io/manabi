<script lang="ts">
	/**
	 * Detail sheet for one character (Scripts page, Radicals page): reading,
	 * meaning, its radical, the stroke-order / tracing pad, and "Add to reviews".
	 * A bottom sheet on phones, a centered card on wider screens.
	 */
	import { X, Plus, Check } from 'lucide-svelte';
	import ScriptText from './ScriptText.svelte';
	import StrokePad from './StrokePad.svelte';
	import { allItems, studyScriptChar } from '$lib/db/store';
	import type { Language } from '$lib/db/types';
	import { isHan, strokeLang } from '$lib/strokes';
	import { radicalOf } from '$lib/radicals';
	import { displayText, scriptLangTag, toZhScript, zhScript } from '$lib/chinese';

	let {
		glyph,
		language,
		onClose
	}: {
		glyph: { char: string; roman: string; gloss?: string };
		language: Language;
		onClose: () => void;
	} = $props();

	// The character as read (Traditional when picked); `glyph.char` stays the stored form.
	const shownChar = $derived(displayText(glyph.char, language, $toZhScript));
	const drawLang = $derived(isHan(shownChar) ? strokeLang(language) : null);
	const rad = $derived(isHan(shownChar) ? radicalOf(shownChar) : undefined);
	const studying = $derived($allItems.some((it) => it.language === language && it.target === glyph.char));

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={onKey} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onClose}></div>
<div class="sheet" role="dialog" aria-modal="true" aria-label="{shownChar} details">
	<button class="close" onclick={onClose} aria-label="Close"><X size={20} /></button>

	<header>
		<span class="big"><ScriptText text={glyph.char} {language} size="xl" /></span>
		<div class="meta">
			<span class="roman">{glyph.roman}</span>
			{#if glyph.gloss}<span class="gloss">{glyph.gloss}</span>{/if}
			{#if rad}
				<a class="radical" href="/radicals?r={rad.radical.n}" onclick={onClose}>
					<span class="r-char" lang={scriptLangTag(language, $zhScript)}>{rad.radical.char}</span>
					Radical {rad.radical.n} · {rad.radical.meaning}{rad.residual ? ` · +${rad.residual}` : ''}
				</a>
			{/if}
		</div>
	</header>

	{#if drawLang}
		{#key shownChar}
			<StrokePad char={shownChar} lang={drawLang} size={240} />
		{/key}
	{/if}

	<div class="foot">
		{#if studying}
			<span class="in-reviews"><Check size={18} /> In your reviews</span>
		{:else}
			<button class="btn3d wide" onclick={() => studyScriptChar(language, glyph)}><Plus size={18} /> Add to reviews</button>
		{/if}
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(20, 16, 40, 0.45);
		z-index: 60;
		animation: fade 0.2s ease;
	}
	.sheet {
		position: fixed;
		z-index: 61;
		left: 50%;
		top: 50%;
		translate: -50% -50%; /* separate from transform, which pop-in animates */
		width: min(26rem, calc(100vw - 2rem));
		max-height: calc(100vh - 2rem);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.25rem 1.25rem 1.4rem;
		border-radius: 1.5rem;
		background: var(--color-bg);
		border: 2px solid var(--color-border);
		box-shadow: var(--shadow-soft);
		animation: pop-in 0.3s cubic-bezier(0.3, 1.3, 0.5, 1);
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	.close {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		display: inline-flex;
		padding: 0.35rem;
		border: none;
		border-radius: 0.7rem;
		background: transparent;
		color: var(--color-text-muted);
	}
	.close:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text);
	}
	header {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding-right: 2rem;
	}
	.big {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 4.5rem;
		height: 4.5rem;
		padding: 0 0.5rem;
		border-radius: 1rem;
		background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg));
		color: var(--color-accent);
	}
	.meta {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}
	.roman {
		font-weight: 900;
		font-size: 1.1rem;
	}
	.gloss {
		color: var(--color-text-muted);
		font-weight: 600;
	}
	.radical {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		align-self: flex-start;
		margin-top: 0.2rem;
		padding: 0.15rem 0.6rem 0.15rem 0.2rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-pink) 12%, var(--color-bg));
		color: color-mix(in srgb, var(--color-pink) 75%, var(--color-text));
		font-size: 0.78rem;
		font-weight: 800;
	}
	.r-char {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 999px;
		background: var(--color-pink);
		color: #fff;
		font-family: var(--font-script);
		font-size: 0.9rem;
	}
	.foot {
		display: flex;
		justify-content: center;
	}
	.foot .wide {
		width: 100%;
	}
	.in-reviews {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--color-success);
		font-weight: 900;
	}

	@media (max-width: 520px) {
		.sheet {
			top: auto;
			bottom: 0;
			left: 0;
			translate: none;
			width: 100%;
			max-height: 92vh;
			border-radius: 1.5rem 1.5rem 0 0;
			border-bottom: none;
			padding-bottom: calc(1.4rem + env(safe-area-inset-bottom));
			animation: sheet-up 0.3s cubic-bezier(0.3, 1.1, 0.5, 1);
		}
		@keyframes sheet-up {
			from {
				transform: translateY(100%);
			}
		}
	}
</style>
