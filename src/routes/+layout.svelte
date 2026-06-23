<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { Home, GraduationCap, Library, LayoutGrid, BarChart3, Sparkles, Settings as SettingsIcon } from 'lucide-svelte';
	import { initDB, settings, setActiveLanguage } from '$lib/db/store';
	import { LANGUAGES, type Language } from '$lib/db/types';

	let { children } = $props();
	let ready = $state(false);

	const NAV = [
		{ href: '/', label: 'Home', icon: Home },
		{ href: '/review', label: 'Review', icon: GraduationCap },
		{ href: '/items', label: 'Items', icon: Library },
		{ href: '/lessons', label: 'Lessons', icon: LayoutGrid },
		{ href: '/dashboard', label: 'Progress', icon: BarChart3 },
		{ href: '/workbench', label: 'Workbench', icon: Sparkles },
		{ href: '/settings', label: 'Settings', icon: SettingsIcon }
	];

	function applyTheme(theme: string) {
		const root = document.documentElement;
		root.classList.remove('light', 'dark');
		if (theme === 'light' || theme === 'dark') root.classList.add(theme);
	}

	$effect(() => {
		if (ready) applyTheme($settings.theme);
	});

	const activePath = $derived($page.url.pathname);
	function isActive(href: string): boolean {
		return href === '/' ? activePath === '/' : activePath.startsWith(href);
	}

	onMount(async () => {
		await initDB();
		ready = true;
	});
</script>

{#if !ready}
	<div class="boot">Loading Manabi…</div>
{:else}
	<div class="shell">
		<aside class="sidebar">
			<div class="brand">
				<span class="logo">学</span>
				<span class="name">Manabi</span>
			</div>

			<div class="lang-switch">
				{#each LANGUAGES as l (l.code)}
					<button
						class="lang"
						class:active={$settings.activeLanguage === l.code}
						onclick={() => setActiveLanguage(l.code as Language)}
						title={l.name}
					>
						{l.native}
					</button>
				{/each}
			</div>

			<nav>
				{#each NAV as item (item.href)}
					<a href={item.href} class="nav-link" class:active={isActive(item.href)}>
						<item.icon size={18} />
						<span>{item.label}</span>
					</a>
				{/each}
			</nav>
		</aside>

		<main class="content">
			{@render children?.()}
		</main>
	</div>
{/if}

<style>
	.boot {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100vh;
		color: var(--color-text-muted);
	}
	.shell {
		display: grid;
		grid-template-columns: 15rem 1fr;
		min-height: 100vh;
	}
	.sidebar {
		border-right: 1px solid var(--color-border);
		background: var(--color-bg-secondary);
		padding: 1.25rem 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		position: sticky;
		top: 0;
		height: 100vh;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0 0.5rem;
	}
	.logo {
		font-family: var(--font-script);
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--color-accent);
	}
	.name {
		font-weight: 700;
		font-size: 1.15rem;
	}
	.lang-switch {
		display: flex;
		gap: 0.4rem;
	}
	.lang {
		flex: 1;
		padding: 0.4rem 0;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text-muted);
		font-family: var(--font-script);
		font-size: 0.95rem;
	}
	.lang.active {
		border-color: var(--color-accent);
		color: var(--color-accent);
		font-weight: 700;
	}
	nav {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.6rem 0.75rem;
		border-radius: 0.5rem;
		color: var(--color-text-muted);
		font-size: 0.95rem;
	}
	.nav-link:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text);
	}
	.nav-link.active {
		background: var(--color-bg-elevated);
		color: var(--color-accent);
		font-weight: 600;
	}
	.content {
		padding: 2rem 2.5rem;
		max-width: 64rem;
		width: 100%;
	}
	@media (max-width: 720px) {
		.shell {
			grid-template-columns: 1fr;
		}
		.sidebar {
			position: static;
			height: auto;
			flex-direction: column;
		}
	}
</style>
