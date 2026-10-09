<script lang="ts">
	import { Download, Share, SquarePlus, X } from 'lucide-svelte';
	import { exerciseAttempts } from '$lib/db/store';
	import {
		decideInstallHint,
		dismissInstallHint,
		installPrompt,
		isIOS,
		isStandalone,
		promptInstall,
		wasInstallHintDismissed
	} from '$lib/install';

	let dismissed = $state(wasInstallHintDismissed());
	let showHow = $state(false);
	const kind = $derived(
		decideInstallHint({
			standalone: isStandalone(),
			ios: isIOS(),
			hasPrompt: $installPrompt !== null,
			dismissed,
			attempts: $exerciseAttempts.length
		})
	);

	async function install() {
		const ev = $installPrompt;
		if (!ev) return;
		if (await promptInstall(ev)) dismissed = true;
	}
	function dismiss() {
		dismissInstallHint();
		dismissed = true;
	}
</script>

{#if kind}
	<div class="hint" role="status">
		<span class="ic"><Download size={15} /></span>
		{#if kind === 'prompt'}
			<span class="txt">Install Manabi — works offline.</span>
			<button class="act" onclick={install}>Install</button>
		{:else if !showHow}
			<span class="txt">Install Manabi as an app.</span>
			<button class="act" onclick={() => (showHow = true)}>How</button>
		{:else}
			<span class="txt">Tap <span class="k"><Share size={13} /> Share</span> → <span class="k"><SquarePlus size={13} /> Add to Home Screen</span></span>
		{/if}
		<button class="close" onclick={dismiss} aria-label="Dismiss"><X size={15} /></button>
	</div>
{/if}

<style>
	.hint {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.3rem 0.4rem 0.3rem 0.7rem;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--color-bg-elevated);
		color: var(--color-text);
		font-size: 0.82rem;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
	}
	.ic {
		display: inline-flex;
		color: var(--color-accent);
		flex-shrink: 0;
	}
	.txt {
		flex: 1;
		min-width: 0;
		line-height: 1.25;
	}
	.k {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-weight: 600;
		white-space: nowrap;
	}
	.act {
		flex-shrink: 0;
		padding: 0.25rem 0.7rem;
		border-radius: 999px;
		background: var(--color-accent);
		color: #fff;
		font-size: 0.8rem;
		font-weight: 600;
	}
	.close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.8rem;
		height: 1.8rem;
		border-radius: 999px;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}
	.close:hover {
		color: var(--color-text);
		background: var(--color-bg-secondary);
	}
</style>
