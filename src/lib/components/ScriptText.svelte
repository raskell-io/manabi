<script lang="ts">
	import { rubyOf, scriptLangTag, toZhScript, zhScript } from '$lib/chinese';
	import { settings } from '$lib/db/store';
	import { languageDir, stripNiqqud, type Language } from '$lib/db/types';

	let {
		text,
		language,
		size = 'md',
		muted = false,
		forceVowels = false,
		reading
	}: {
		text: string;
		language: Language;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		muted?: boolean;
		/** Always keep Hebrew niqqud, ignoring the hide-vowels setting (e.g. editor preview). */
		forceVowels?: boolean;
		/** Chinese: the text's reading, shown above each character when that option is on. */
		reading?: string;
	} = $props();

	const ruby = $derived(language === 'zh' ? $rubyOf(text, reading) : null);

	const dir = $derived(languageDir(language));
	const langAttr = $derived(scriptLangTag(language, $zhScript));
	const display = $derived(
		language === 'he' && $settings.hideHebrewVowels && !forceVowels
			? stripNiqqud(text)
			: language === 'zh'
				? $toZhScript(text)
				: text
	);
</script>

{#if ruby}
	<span class="script {size}" class:muted {dir} lang={langAttr}
		>{#each ruby as g, i (i)}{#if g.rt}<ruby>{g.text}<rt>{g.rt}</rt></ruby>{:else}{g.text}{/if}{/each}</span
	>
{:else}
	<span class="script {size}" class:muted {dir} lang={langAttr}>{display}</span>
{/if}

<style>
	.script {
		font-family: var(--font-script);
		line-height: 1.35;
	}
	.muted {
		color: var(--color-text-muted);
	}
	rt {
		font-family: var(--font-sans, inherit);
		font-size: 0.5em;
		font-weight: 600;
		line-height: 1.1;
		color: var(--color-text-muted);
		letter-spacing: 0;
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
	.xl {
		font-size: 3.25rem;
		font-weight: 600;
	}
</style>
