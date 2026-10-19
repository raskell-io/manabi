<script lang="ts">
	/**
	 * Script text whose words can be tapped to look them up (LookupSheet). Like
	 * ScriptText it sets dir / lang and follows the Chinese script and Hebrew
	 * vowel settings; words come from Intl.Segmenter, and the lookup itself
	 * finds the longest dictionary word from there (so 学习 is one tap even if
	 * the segmenter split it).
	 */
	import LookupSheet from './LookupSheet.svelte';
	import { settings } from '$lib/db/store';
	import { languageDir, stripNiqqud, type Language } from '$lib/db/types';
	import { scriptLangTag, toZhScript, zhScript } from '$lib/chinese';
	import { dictionary } from '$lib/dictionary';
	import type { DictHit } from '$lib/lookup';

	let {
		text,
		language,
		size = 'md'
	}: {
		text: string;
		language: Language;
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	interface Segment {
		text: string;
		index: number;
		word: boolean;
	}

	const LOCALE: Record<Language, string> = { zh: 'zh-Hans', ja: 'ja', ko: 'ko', he: 'he' };

	const segments = $derived.by<Segment[]>(() => {
		if (typeof Intl.Segmenter === 'function') {
			const seg = new Intl.Segmenter(LOCALE[language], { granularity: 'word' });
			return [...seg.segment(text)].map((s) => ({ text: s.segment, index: s.index, word: !!s.isWordLike }));
		}
		// Old browsers: every character (CJK) or space-separated word is tappable.
		const parts = language === 'zh' || language === 'ja' ? [...text] : text.split(/(\s+)/);
		let i = 0;
		return parts.map((p) => {
			const s = { text: p, index: i, word: /\p{L}/u.test(p) };
			i += p.length;
			return s;
		});
	});

	function shown(t: string): string {
		if (language === 'he' && $settings.hideHebrewVowels) return stripNiqqud(t);
		return language === 'zh' ? $toZhScript(t) : t;
	}

	let open = $state(false);
	let loading = $state(false);
	let hit = $state<DictHit | null>(null);
	let tapped = $state('');
	let token = 0;

	async function tap(s: Segment) {
		const mine = ++token;
		open = true;
		loading = true;
		hit = null;
		tapped = s.text;
		const found = await dictionary.lookupAt(language, text, s.index).catch(() => null);
		if (mine !== token) return;
		hit = found;
		if (found) tapped = found.surface;
		loading = false;
	}

	function close() {
		token++;
		open = false;
		hit = null;
	}

	const inHit = (s: Segment) =>
		open && hit !== null && s.index < hit.start + hit.surface.length && s.index + s.text.length > hit.start;
</script>

<span class="tap {size}" dir={languageDir(language)} lang={scriptLangTag(language, $zhScript)}
	>{#each segments as s (s.index)}{#if s.word}<span
				role="button"
				tabindex="0"
				class="tok"
				class:hit={inHit(s)}
				onclick={() => tap(s)}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						void tap(s);
					}
				}}>{shown(s.text)}</span
			>{:else}{shown(s.text)}{/if}{/each}</span
>

{#if open}
	<LookupSheet {hit} surface={tapped} {language} {loading} onClose={close} />
{/if}

<style>
	.tap {
		font-family: var(--font-script);
		line-height: 1.5;
	}
	.sm {
		font-size: 1rem;
	}
	.md {
		font-size: 1.5rem;
	}
	.lg {
		font-size: 2.25rem;
	}
	/* Inline spans, not buttons: buttons are atomic boxes, which would let a line
	   start with "。" (no kinsoku across the box edge). */
	.tok {
		cursor: pointer;
		border-radius: 0.3em;
		text-decoration: underline dotted color-mix(in srgb, var(--color-text-muted) 45%, transparent);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.25em;
	}
	.tok:hover {
		background: color-mix(in srgb, var(--color-accent) 10%, transparent);
	}
	.tok.hit {
		background: color-mix(in srgb, var(--color-sun) 45%, transparent);
		text-decoration: none;
	}
</style>
