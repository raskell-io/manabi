<script lang="ts">
	import { Download, RefreshCw, Upload } from 'lucide-svelte';
	import {
		allItems,
		exerciseAttempts,
		exportBackup,
		importBackup,
		lessons,
		settings,
		skillMemories,
		updateSettings
	} from '$lib/db/store';
	import { LANGUAGES, stripNiqqud, todayIso, type Language } from '$lib/db/types';
	import type { MergeSummary } from '$lib/db/merge';
	import { isSyncConfigured, syncNow, syncState, type SyncState } from '$lib/sync';

	let s = $derived($settings);

	// --- Sync ---
	const syncConfigured = $derived(isSyncConfigured(s));

	function ago(ts: number): string {
		const mins = Math.round((Date.now() - ts) / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins} min ago`;
		const hrs = Math.round(mins / 60);
		if (hrs < 24) return `${hrs} h ago`;
		return `on ${new Date(ts).toLocaleDateString()}`;
	}

	function syncStatusText(st: SyncState): string {
		switch (st.status) {
			case 'syncing':
				return 'Syncing…';
			case 'offline':
				return 'Offline — will sync when back online.';
			case 'error':
				return st.error ?? 'Sync failed.';
			case 'ok': {
				const parts = st.lastPulled ? mergeParts(st.lastPulled) : [];
				const pulled = parts.length ? `pulled ${parts.join(', ')}` : 'nothing new';
				return `Synced ${st.lastSyncAt ? ago(st.lastSyncAt) : ''} · ${pulled}${st.lastPushed ? ' · pushed' : ''}.`;
			}
			default:
				if (!syncConfigured) return 'Not configured.';
				return st.lastSyncAt ? `Last synced ${ago(st.lastSyncAt)}.` : 'Not synced yet.';
		}
	}

	// --- Backup ---
	let fileInput = $state<HTMLInputElement | null>(null);
	let backupMsg = $state<{ kind: 'ok' | 'error'; text: string } | null>(null);

	function downloadBackup() {
		try {
			const bytes = exportBackup();
			const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/octet-stream' }));
			const a = document.createElement('a');
			a.href = url;
			a.download = `manabi-${todayIso()}.manabi`;
			a.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
			backupMsg = { kind: 'ok', text: `Exported ${formatBytes(bytes.byteLength)} — keep the file somewhere safe.` };
		} catch (err) {
			backupMsg = { kind: 'error', text: err instanceof Error ? err.message : String(err) };
		}
	}

	async function importFile(input: HTMLInputElement) {
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		try {
			const bytes = new Uint8Array(await file.arrayBuffer());
			backupMsg = { kind: 'ok', text: describeMerge(importBackup(bytes)) };
		} catch (err) {
			backupMsg = { kind: 'error', text: err instanceof Error ? err.message : String(err) };
		}
	}

	function mergeParts(m: MergeSummary): string[] {
		const parts: string[] = [];
		const pair = (label: string, c: { added: number; updated: number }) => {
			const bits: string[] = [];
			if (c.added) bits.push(`${c.added} added`);
			if (c.updated) bits.push(`${c.updated} updated`);
			if (bits.length) parts.push(`${label}: ${bits.join(', ')}`);
		};
		pair('items', m.items);
		pair('progress', m.srs);
		pair('lessons', m.lessons);
		pair('passages', m.passages);
		pair('drafts', m.drafts);
		if (m.attempts) parts.push(`${m.attempts} attempts`);
		return parts;
	}

	function describeMerge(m: MergeSummary): string {
		const parts = mergeParts(m);
		return parts.length
			? `Merged — ${parts.join(' · ')}.`
			: 'Nothing new to merge — this device already has everything in that backup.';
	}

	function formatBytes(n: number): string {
		return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
	}
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
	<h2>Review</h2>
	<label class="check">
		<input type="checkbox" checked={s.gradeButtons} onchange={(e) => updateSettings({ gradeButtons: e.currentTarget.checked })} />
		<span>Self-rate difficulty after a correct answer (Hard / Good / Easy). When off, a correct answer just advances (graded “Good”) for a faster review.</span>
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
	<h2>Pronunciation</h2>
	<label class="check">
		<input type="checkbox" checked={s.asrScoring} onchange={(e) => updateSettings({ asrScoring: e.currentTarget.checked })} />
		<span>Score recordings with speech recognition (OpenAI transcription; needs the key below). After you record, Manabi transcribes the take, compares it with the word and suggests a rating — you still confirm it.</span>
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
	<h2>Backup</h2>
	<p class="muted">Everything lives in this browser. Export a backup to keep it safe or to move it to another device. Importing <strong>merges</strong>: nothing is deleted, and progress from both devices is combined — for each skill, the more recent review wins. Recordings and your OpenAI key are not included.</p>
	<p class="stats">This device: {$allItems.length} items · {$skillMemories.length} with progress · {$exerciseAttempts.length} attempts · {$lessons.length} lessons</p>
	<div class="backup-row">
		<button class="action" onclick={downloadBackup}><Download size={16} /> Export backup</button>
		<button class="action secondary" onclick={() => fileInput?.click()}><Upload size={16} /> Import &amp; merge…</button>
		<input class="file" type="file" bind:this={fileInput} onchange={(e) => void importFile(e.currentTarget)} />
	</div>
	{#if backupMsg}
		<p class="backup-msg" class:error={backupMsg.kind === 'error'} role="status">{backupMsg.text}</p>
	{/if}
</section>

<section class="group">
	<h2>Sync (GitHub)</h2>
	<p class="muted">Keeps your devices in step automatically by storing the backup snapshot in a <strong>private</strong> GitHub repository — no server involved. Create an empty private repo, then a fine-grained personal access token with <em>Contents: read &amp; write</em> for just that repo. Every sync pulls, merges (never deletes) and pushes only if something changed.</p>
	<label>
		<span>Repository (owner/repo)</span>
		<input placeholder="you/manabi-sync" value={s.githubSyncRepo} onchange={(e) => updateSettings({ githubSyncRepo: e.currentTarget.value.trim() })} />
	</label>
	<label>
		<span>Token</span>
		<input type="password" placeholder="github_pat_…" value={s.githubSyncToken} onchange={(e) => updateSettings({ githubSyncToken: e.currentTarget.value.trim() })} />
	</label>
	<label class="check">
		<input type="checkbox" checked={s.syncAuto} onchange={(e) => updateSettings({ syncAuto: e.currentTarget.checked })} />
		<span>Sync automatically — on start, after each review session, and when the device comes back online.</span>
	</label>
	<div class="backup-row">
		<button class="action" onclick={() => void syncNow()} disabled={!syncConfigured || $syncState.status === 'syncing'}><RefreshCw size={16} /> Sync now</button>
		<span class="sync-status" class:error={$syncState.status === 'error'} role="status">{syncStatusText($syncState)}</span>
	</div>
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
	.stats {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		margin: 0 0 0.85rem;
	}
	.backup-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
	}
	.sync-status {
		font-size: 0.88rem;
		color: var(--color-text-muted);
	}
	.sync-status.error {
		color: var(--color-danger);
	}
	.action:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.action {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 1rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-accent);
		background: var(--color-accent);
		color: #fff;
		font-weight: 600;
	}
	.action.secondary {
		background: var(--color-bg);
		color: var(--color-text);
		border-color: var(--color-border);
	}
	.file {
		display: none;
	}
	.backup-msg {
		margin: 0.85rem 0 0;
		font-size: 0.88rem;
		color: var(--color-success);
	}
	.backup-msg.error {
		color: var(--color-danger);
	}
</style>
