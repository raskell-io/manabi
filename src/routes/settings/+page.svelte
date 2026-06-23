<script lang="ts">
	import { settings, updateSettings } from '$lib/db/store';
	import { LANGUAGES, stripNiqqud, type Language } from '$lib/db/types';

	let s = $derived($settings);
	const MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini'];
	const THEMES: { value: 'system' | 'light' | 'dark'; label: string }[] = [
		{ value: 'system', label: 'System' },
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' }
	];
</script>

<h1>Settings</h1>

<section class="group">
	<h2>Language</h2>
	<div class="lang-row">
		{#each LANGUAGES as l (l.code)}
			<button
				class="lang"
				class:active={s.activeLanguage === l.code}
				onclick={() => updateSettings({ activeLanguage: l.code as Language })}
			>
				<span class="native">{l.native}</span>
				<span class="name">{l.name}</span>
			</button>
		{/each}
	</div>
</section>

<section class="group">
	<h2>Daily limits</h2>
	<label>
		<span>New items per day</span>
		<input type="number" min="0" max="50" value={s.newPerDay} onchange={(e) => updateSettings({ newPerDay: +e.currentTarget.value })} />
	</label>
	<label>
		<span>Max reviews per session</span>
		<input type="number" min="0" max="200" value={s.reviewCap} onchange={(e) => updateSettings({ reviewCap: +e.currentTarget.value })} />
	</label>
</section>

<section class="group">
	<h2>Audio</h2>
	<label class="check">
		<input type="checkbox" checked={s.localTtsEnabled} onchange={(e) => updateSettings({ localTtsEnabled: e.currentTarget.checked })} />
		<span>Synthesize pronunciation on-device (transformers.js MMS). When off, OpenAI TTS is used if a key is set.</span>
	</label>
</section>

<section class="group">
	<h2>Hebrew</h2>
	<label class="check">
		<input type="checkbox" checked={s.hideHebrewVowels} onchange={(e) => updateSettings({ hideHebrewVowels: e.currentTarget.checked })} />
		<span>Hide vowels (niqqud). Start with vowelled Hebrew, then turn this on to practice reading bare consonantal text — the way most real Hebrew is written.</span>
	</label>
	<p class="preview-row">
		<span class="muted">Preview:</span>
		<span class="he-preview">{s.hideHebrewVowels ? stripNiqqud('שָׁלוֹם') : 'שָׁלוֹם'}</span>
	</p>
</section>

<section class="group">
	<h2>AI content (OpenAI)</h2>
	<p class="muted">Used by the Workbench to generate items and as a remote TTS fallback. The key is stored locally in your browser and never leaves this device except in calls to OpenAI.</p>
	<label>
		<span>API key</span>
		<input type="password" placeholder="sk-…" value={s.openaiApiKey} onchange={(e) => updateSettings({ openaiApiKey: e.currentTarget.value })} />
	</label>
	<label>
		<span>Model</span>
		<select value={s.openaiModel} onchange={(e) => updateSettings({ openaiModel: e.currentTarget.value })}>
			{#each MODELS as m (m)}<option value={m}>{m}</option>{/each}
		</select>
	</label>
</section>

<section class="group">
	<h2>Theme</h2>
	<div class="theme-row">
		{#each THEMES as t (t.value)}
			<button class="theme" class:active={s.theme === t.value} onclick={() => updateSettings({ theme: t.value })}>
				{t.label}
			</button>
		{/each}
	</div>
</section>

<style>
	h1 {
		margin-bottom: 1.5rem;
	}
	.group {
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.25rem;
		margin-bottom: 1.25rem;
		background: var(--color-bg-secondary);
	}
	.group h2 {
		font-size: 1.05rem;
		margin: 0 0 0.85rem;
	}
	.muted {
		color: var(--color-text-muted);
		font-size: 0.88rem;
		margin: 0 0 0.85rem;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.85rem;
		color: var(--color-text-muted);
		margin-bottom: 0.85rem;
	}
	label:last-child {
		margin-bottom: 0;
	}
	label.check {
		flex-direction: row;
		align-items: flex-start;
		gap: 0.6rem;
	}
	.preview-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin: 0;
	}
	.he-preview {
		font-family: var(--font-script);
		font-size: 1.4rem;
		direction: rtl;
	}
	input,
	select {
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.95rem;
		font-family: inherit;
		max-width: 24rem;
	}
	.lang-row,
	.theme-row {
		display: flex;
		gap: 0.6rem;
	}
	.lang {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.7rem 1.1rem;
		border-radius: 0.6rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
	}
	.lang .native {
		font-family: var(--font-script);
		font-size: 1.2rem;
	}
	.lang .name {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}
	.lang.active {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
	.theme {
		padding: 0.55rem 1.2rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
	}
	.theme.active {
		border-color: var(--color-accent);
		color: var(--color-accent);
		font-weight: 600;
	}
</style>
