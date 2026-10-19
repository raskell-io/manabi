<script lang="ts">
	import { CalendarPlus, Download, Info, RefreshCw, Upload } from 'lucide-svelte';
	import { isTime, reminderIcs } from '$lib/reminder';
	import ScriptText from '$lib/components/ScriptText.svelte';
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
	import { LANGUAGES, stripNiqqud, todayIso, XP_GOALS, type Language } from '$lib/db/types';
	import type { MergeSummary } from '$lib/db/merge';
	import { isSyncConfigured, syncNow, syncState, type SyncState } from '$lib/sync';
	import { localModelStatus } from '$lib/inference/local-models';
	import { ASR_MODELS, asrDevice, hasWebGpu, loadAsr, type AsrModel } from '$lib/inference/providers/asr-local';
	import { loadNiqqud, NIQQUD_STATUS_KEY } from '$lib/inference/providers/niqqud-local';
	import { readingOf, toZhScript, zhLangTag, zhScript, ZH_READINGS, ZH_SCRIPTS } from '$lib/chinese';

	let s = $derived($settings);

	// --- On-device speech recognition ---
	const ASR_SIZES = [
		{ value: 'base', label: 'Base', note: '≈ 130 MB · a few seconds per take' },
		{ value: 'small', label: 'Small', note: '≈ 300 MB · slower, more accurate, incl. Hebrew' }
	] as const;
	const statusOf = (task: string, id: string) => $localModelStatus[`${task}:${id}`] ?? { state: 'idle' as const };
	const sizeModel = $derived(ASR_MODELS[s.localAsrModel]);
	const asrStatus = $derived(statusOf('asr', sizeModel.id));
	const yueStatus = $derived(statusOf('asr', ASR_MODELS.cantonese.id));
	const niqqudStatus = $derived($localModelStatus[NIQQUD_STATUS_KEY] ?? { state: 'idle' as const });
	/** "Loaded for this session (GPU)" — where a loaded model runs. */
	const ranOn = (m: AsrModel) => ($asrDevice[m.id] === 'webgpu' ? ' on the GPU' : $asrDevice[m.id] === 'wasm' ? ' on the CPU' : '');
	// Whether this browser offers WebGPU (checked once, lazily).
	let gpuAvailable = $state<boolean | null>(null);
	$effect(() => {
		if (s.localAsr && gpuAvailable === null) void hasWebGpu().then((ok) => (gpuAvailable = ok));
	});

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

	// --- Reminder ---
	function downloadReminder() {
		const ics = reminderIcs(s.reminderTime, location.origin + '/');
		const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
		const a = document.createElement('a');
		a.href = url;
		a.download = 'manabi-reminder.ics';
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
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
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' },
		{ value: 'system', label: 'System' }
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
	<p class="muted" id="goal">Daily goal — the XP ring on Home. A right answer earns 10 XP, a run of three or more 15.</p>
	<div class="lang-row goal-row">
		{#each XP_GOALS as g (g.xp)}
			<button class="lang" class:active={s.xpGoal === g.xp} onclick={() => updateSettings({ xpGoal: g.xp })}>
				<span class="native">{g.xp} XP</span>
				<span class="name">{g.label}</span>
			</button>
		{/each}
	</div>
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
	<label class="check">
		<input type="checkbox" checked={s.typedRecall} onchange={(e) => updateSettings({ typedRecall: e.currentTarget.checked })} />
		<span>Type the word on recall cards — in its script or romanized (pinyin with tones, kana or romaji, Hangul or romanization). When off, you pick it from four.</span>
	</label>
</section>

<section class="group">
	<h2>Audio</h2>
	<label class="check">
		<input type="checkbox" checked={s.localTtsEnabled} onchange={(e) => updateSettings({ localTtsEnabled: e.currentTarget.checked })} />
		<span>Synthesize pronunciation on-device (transformers.js MMS) — Korean only for now; the other languages use the bundled recordings. Otherwise OpenAI TTS is used if a key is set.</span>
	</label>
</section>

<section class="group">
	<h2>Pronunciation</h2>
	<label class="check">
		<input type="checkbox" checked={s.asrScoring} onchange={(e) => updateSettings({ asrScoring: e.currentTarget.checked })} />
		<span>Score recordings with speech recognition. After you record, Manabi transcribes the take, compares it with the word and suggests a rating — you still confirm it. Uses OpenAI when a key is set below, otherwise on-device recognition if it's on.</span>
	</label>
	<label class="check">
		<input type="checkbox" checked={s.localAsr} onchange={(e) => updateSettings({ localAsr: e.currentTarget.checked })} />
		<span>Recognize speech on this device (Whisper) — works offline and without a key. Less accurate than OpenAI, especially for single words.</span>
	</label>
	{#if s.localAsr}
		<div class="lang-row asr-models">
			{#each ASR_SIZES as m (m.value)}
				<button class="lang" class:active={s.localAsrModel === m.value} onclick={() => updateSettings({ localAsrModel: m.value })}>
					<span class="native">{m.label}</span>
					<span class="name">{m.note}</span>
				</button>
			{/each}
		</div>
		<div class="backup-row">
			<button class="action" onclick={() => void loadAsr(s, undefined).catch(() => {})} disabled={asrStatus.state === 'loading' || asrStatus.state === 'ready'}>
				<Download size={16} /> {asrStatus.state === 'ready' ? 'Ready' : 'Download now'}
			</button>
			<span class="sync-status" class:error={asrStatus.state === 'error'} role="status">
				{#if asrStatus.state === 'loading'}Downloading… {Math.round(asrStatus.progress)}%{:else if asrStatus.state === 'error'}{asrStatus.error}{:else if asrStatus.state === 'ready'}Loaded for this session{ranOn(sizeModel)}.{:else}Downloads on first use, then works offline.{/if}
			</span>
		</div>
		{#if s.localAsrModel === 'base'}<p class="muted">Hebrew needs the larger model; with Base, Hebrew recordings use OpenAI only.</p>{/if}
		<label class="check">
			<input type="checkbox" checked={s.localAsrGpu} onchange={(e) => updateSettings({ localAsrGpu: e.currentTarget.checked })} />
			<span>
				Run it on the graphics card (WebGPU) when the browser can — several times faster; falls back to the CPU otherwise.
				{#if gpuAvailable === false}<em class="muted">This browser has no WebGPU, so it runs on the CPU.</em>{:else if gpuAvailable}<em class="muted">WebGPU is available here.</em>{/if}
			</span>
		</label>
		<label class="check">
			<input type="checkbox" checked={s.localAsrCantonese} onchange={(e) => updateSettings({ localAsrCantonese: e.currentTarget.checked })} />
			<span>Cantonese: use a Whisper trained on Hong Kong Cantonese (≈ 300 MB). It writes what you say — <span lang="zh-Hant-HK">係, 嘅, 咗</span> — where the general model writes standard Chinese.</span>
		</label>
		{#if s.localAsrCantonese}
			<div class="backup-row asr-yue">
				<button class="action" onclick={() => void loadAsr(s, 'yue').catch(() => {})} disabled={yueStatus.state === 'loading' || yueStatus.state === 'ready'}>
					<Download size={16} /> {yueStatus.state === 'ready' ? 'Ready' : 'Download now'}
				</button>
				<span class="sync-status" class:error={yueStatus.state === 'error'} role="status">
					{#if yueStatus.state === 'loading'}Downloading… {Math.round(yueStatus.progress)}%{:else if yueStatus.state === 'error'}{yueStatus.error}{:else if yueStatus.state === 'ready'}Loaded for this session{ranOn(ASR_MODELS.cantonese)}.{:else}Downloads on the first Cantonese recording.{/if}
				</span>
			</div>
		{/if}
	{/if}
</section>

<section class="group">
	<h2>Chinese</h2>
	<p class="muted">Which characters to read. Words, progress and audio are shared — switching only changes how Chinese is written, never what you have learned.</p>
	<div class="lang-row">
		{#each ZH_SCRIPTS as z (z.value)}
			<button class="lang" class:active={s.zhScript === z.value} onclick={() => updateSettings({ zhScript: z.value })}>
				<span class="native" lang={zhLangTag(z.value)}>{z.native}</span>
				<span class="name">{z.label}</span>
			</button>
		{/each}
	</div>
	<p class="muted reading-aid">Reading aid shown with words and sentences.</p>
	<div class="lang-row">
		{#each ZH_READINGS as z (z.value)}
			<button class="lang" class:active={s.zhReading === z.value} onclick={() => updateSettings({ zhReading: z.value })}>
				<span class="native">{z.native}</span>
				<span class="name">{z.label}</span>
			</button>
		{/each}
	</div>
	<label class="check ruby-toggle">
		<input type="checkbox" checked={s.zhRuby} onchange={(e) => updateSettings({ zhRuby: e.currentTarget.checked })} />
		<span>Show the reading above each character (on words and sentences whose reading is known) — also Jyutping for Cantonese, which is always written in Hong Kong characters.</span>
	</label>
	<p class="preview-row">
		<span class="muted">Preview:</span>
		<span class="zh-preview-block">
			<span class="zh-preview-script"><ScriptText text="我们说汉语。" language="zh" size="sm" reading="Wǒmen shuō Hànyǔ." /> <span class="zh-preview" lang={zhLangTag($zhScript)}>{$toZhScript('头发、面条、这里')}</span></span>
			<span class="zh-preview-reading">{$readingOf('Wǒmen shuō Hànyǔ.', '汉', 'zh')}</span>
		</span>
	</p>
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
	<label class="check">
		<input type="checkbox" checked={s.localNiqqud} onchange={(e) => updateSettings({ localNiqqud: e.currentTarget.checked })} />
		<span>Add vowels on this device — Dicta’s Hebrew model (≈ 320 MB) points words and texts that come without niqqud, offline and without a key. Otherwise OpenAI does it when a key is set.</span>
	</label>
	{#if s.localNiqqud}
		<div class="backup-row niqqud-model">
			<button class="action" onclick={() => void loadNiqqud().catch(() => {})} disabled={niqqudStatus.state === 'loading' || niqqudStatus.state === 'ready'}>
				<Download size={16} /> {niqqudStatus.state === 'ready' ? 'Ready' : 'Download now'}
			</button>
			<span class="sync-status" class:error={niqqudStatus.state === 'error'} role="status">
				{#if niqqudStatus.state === 'loading'}{niqqudStatus.phase === 'initializing' ? 'Starting…' : `Downloading… ${Math.round(niqqudStatus.progress)}%`}{:else if niqqudStatus.state === 'error'}{niqqudStatus.error}{:else if niqqudStatus.state === 'ready'}Loaded for this session.{:else}Downloads on first use, then works offline.{/if}
			</span>
		</div>
	{/if}
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
	<label class="check">
		<input type="checkbox" checked={s.syncMarkdown} onchange={(e) => updateSettings({ syncMarkdown: e.currentTarget.checked })} />
		<span>Also keep your items and texts as Markdown in the repository (<code>content/&lt;language&gt;/items.md</code>, <code>passages.md</code>). Edit them on GitHub — fix a meaning, add an example or a new word — and the change comes back on the next sync. Progress stays in the snapshot only.</span>
	</label>
	<div class="backup-row">
		<button class="action" onclick={() => void syncNow()} disabled={!syncConfigured || $syncState.status === 'syncing'}><RefreshCw size={16} /> Sync now</button>
		<span class="sync-status" class:error={$syncState.status === 'error'} role="status">{syncStatusText($syncState)}</span>
	</div>
</section>

<section class="group">
	<h2>Daily reminder</h2>
	<p class="muted">Manabi has no server to send notifications, so the reminder lives in your calendar: a daily event at this time that opens Manabi.</p>
	<div class="backup-row">
		<label class="time">
			<span>Time</span>
			<input type="time" value={s.reminderTime} onchange={(e) => isTime(e.currentTarget.value) && updateSettings({ reminderTime: e.currentTarget.value })} />
		</label>
		<button class="action" onclick={downloadReminder}><CalendarPlus size={16} /> Add to my calendar</button>
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

<p class="about-link"><a href="/about"><Info size={16} /> About Manabi · credits &amp; licences</a></p>

<style>
	.about-link {
		margin: 1.5rem 0 0;
	}
	.about-link a {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--color-text-muted);
		font-weight: 700;
	}
	.about-link a:hover {
		color: var(--color-accent);
	}
	h1 {
		margin-bottom: 1.5rem;
	}
	.group {
		border: 2px solid var(--color-border);
		border-radius: 1rem;
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
	.reading-aid {
		margin-top: 1.1rem;
	}
	.goal-row {
		margin-bottom: 1rem;
	}
	.zh-preview-block {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.zh-preview {
		font-family: var(--font-script);
		font-size: 1.25rem;
	}
	.zh-preview-reading {
		color: var(--color-text-muted);
	}
	input,
	select {
		padding: 0.55rem 0.7rem;
		border: 2px solid var(--color-border);
		border-radius: 0.7rem;
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.95rem;
		font-family: inherit;
		max-width: 24rem;
	}
	.lang-row,
	.theme-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.lang {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.7rem 1.1rem;
		border-radius: 0.8rem;
		border: 2px solid var(--color-border);
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
		border-radius: 0.7rem;
		border: 2px solid var(--color-border);
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
	label.time {
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
	}
	label.time input {
		width: auto;
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
		border-radius: 0.7rem;
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
