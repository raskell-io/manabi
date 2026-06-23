<script lang="ts">
	import { settings } from '$lib/db/store';
	import { languageDir, stripNiqqud, type Language } from '$lib/db/types';

	let {
		text,
		language,
		size = 'md',
		muted = false,
		forceVowels = false
	}: {
		text: string;
		language: Language;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		muted?: boolean;
		/** Always keep Hebrew niqqud, ignoring the hide-vowels setting (e.g. editor preview). */
		forceVowels?: boolean;
	} = $props();

	const dir = $derived(languageDir(language));
	const langAttr = $derived(language === 'zh' ? 'zh-Hans' : language === 'ja' ? 'ja' : 'he');
	const display = $derived(
		language === 'he' && $settings.hideHebrewVowels && !forceVowels ? stripNiqqud(text) : text
	);
</script>

<span class="script {size}" class:muted {dir} lang={langAttr}>{display}</span>

<style>
	.script {
		font-family: var(--font-script);
		line-height: 1.35;
	}
	.muted {
		color: var(--color-text-muted);
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
