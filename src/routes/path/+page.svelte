<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { tick } from 'svelte';
	import { ArrowRight, Brain, Check, Compass, Crown, Headphones, Mic, BookOpen } from 'lucide-svelte';
	import HowItWorks from '$lib/components/HowItWorks.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import { choosePath, pathData, setActiveLanguage, settings, studyItems } from '$lib/db/store';
	import { LANGUAGES, type Language } from '$lib/db/types';
	import { displayText, scriptLangTag, toZhScript, zhScript } from '$lib/chinese';
	import { isPathId, pathsFor, pathState, stageItemIds, stagePreview, suggestedPath, type PathId, type PathStage, type StageProgress } from '$lib/path';
	import { scopeHref } from '$lib/srs/scope';

	const lang = $derived<Language>($settings.activeLanguage);
	const langName = $derived(LANGUAGES.find((l) => l.code === lang)?.name ?? '');

	// Which path: your pick for this language, else the suggestion (Refresher once Beginner is done).
	const chosen = $derived($settings.pathChoice?.[lang]);
	const pathId = $derived<PathId>(isPathId(chosen) ? chosen : suggestedPath(lang, $pathData));
	const trail = $derived(pathState(lang, $pathData, pathId));
	// Both paths' progress, for the picker.
	const overview = $derived(pathsFor(lang).map((p) => ({ p, s: pathState(lang, $pathData, p.id) })));

	// /path?path=refresher (the Beginner path's last stage) switches path.
	$effect(() => {
		const want = $page.url.searchParams.get('path');
		if (isPathId(want)) {
			choosePath(lang, want);
			void goto('/path', { replaceState: true, noScroll: true });
		}
	});
	function switchPath(id: PathId) {
		choosePath(lang, id);
		picked = null;
	}

	const allDone = $derived(trail.doneCount === trail.countable);

	// The open stage card: the current stage unless you tap another.
	let picked = $state<{ key: string; i: number } | null>(null);
	const open = $derived(picked && picked.key === `${lang}/${pathId}` ? picked.i : trail.current);
	async function pick(i: number) {
		picked = { key: `${lang}/${pathId}`, i: open === i ? -1 : i };
		await tick();
		document.getElementById(`stage-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}

	// Zig-zag: each stop's node sits this many rem off the centre line.
	const OFF = [0, -2.5, -3.5, -2.5, 0, 2.5, 3.5, 2.5];
	const off = (i: number) => OFF[i % OFF.length];
	const PX = 16; // rem → px for the connector curves

	const KIND_LABEL: Record<PathStage['kind'], string> = {
		script: 'Script',
		words: 'Words',
		reading: 'Reading',
		skills: 'Skills',
		explore: 'Explore'
	};

	function status(st: PathStage, p: StageProgress): string {
		if (st.kind === 'explore') return 'Open-ended';
		if (st.kind === 'skills') return p.total ? `${p.learned} of ${p.total} words` : 'Opens as you learn words';
		if (p.total === 0) return 'Nothing here yet';
		if (p.done) return `Done · ${p.learned}/${p.total}`;
		if (st.kind === 'reading') return p.learned ? `${p.learned} of ${p.total} read` : `${p.total} texts`;
		return p.learned || p.started ? `${Math.round(p.pct * 100)}% · ${p.learned} of ${p.total}` : `${p.total} to learn`;
	}

	function practise(st: PathStage, p: StageProgress) {
		let ids = p.nextItems.ids;
		if (p.nextItems.create.length) ids = [...ids, ...studyItems(lang, p.nextItems.create)];
		if (ids.length === 0) ids = stageItemIds(st, $pathData); // all learned: review the whole stage
		if (ids.length) void goto(scopeHref(ids, st.title));
	}

	const R = 41; // progress ring radius (viewBox 0 0 92 92)
	const C = 2 * Math.PI * R;
</script>

<header class="head">
	<div class="head-top">
		<!-- Nabi lives on the trail at "you are here"; up here only once the path is done. -->
		{#if allDone}<Mascot size={72} mood="cheer" />{/if}
		<div>
			<h1>Your {langName} path</h1>
			<p class="sub">
				{trail.path.title} · {trail.path.level} ·
				{#if allDone}
					all done — keep reviewing and exploring!
				{:else}
					stage {trail.current + 1} of {trail.stages.length}
				{/if}
			</p>
		</div>
	</div>
	<div class="langs" role="tablist" aria-label="Language">
		{#each LANGUAGES as l (l.code)}
			<button role="tab" class:on={l.code === lang} aria-selected={l.code === lang} onclick={() => setActiveLanguage(l.code)}>
				<span dir={l.dir}>{l.native}</span>
			</button>
		{/each}
	</div>
</header>

<div class="paths" role="tablist" aria-label="Path">
	{#each overview as { p, s: st } (p.id)}
		<button role="tab" class="path-card" class:on={p.id === pathId} aria-selected={p.id === pathId} onclick={() => switchPath(p.id)}>
			<span class="pc-top">
				<b>{p.title}</b>
				<span class="pc-level">{p.level}</span>
			</span>
			<span class="pc-blurb">{p.blurb}</span>
			<span class="pc-bar"><span style="width: {(st.doneCount / st.countable) * 100}%"></span></span>
			<span class="pc-done">{st.doneCount} of {st.countable} stages done</span>
		</button>
	{/each}
</div>

<HowItWorks />

<ol class="trail" aria-label="{langName} learning path">
	{#each trail.stages as st, i (`${pathId}/${st.id}`)}
		{@const p = trail.progress[i]}
		{@const x = off(i)}
		{@const here = i === trail.current && !allDone}
		{#if i > 0}
			{@const x0 = off(i - 1)}
			<li class="link" class:walked={trail.progress[i - 1].done} aria-hidden="true">
				<svg width="1" height="44" overflow="visible">
					<path d="M {x0 * PX} 0 C {x0 * PX} 24, {x * PX} 20, {x * PX} 44" />
				</svg>
			</li>
		{/if}
		<li class="stop" id="stage-{i}" data-kind={st.kind} class:done={p.done} class:here class:open={open === i} style="--x: {x}rem">
			<button class="node" onclick={() => pick(i)} aria-expanded={open === i} aria-label="{st.title}: {status(st, p)}">
				{#if st.kind !== 'explore'}
					<svg class="stage-ring" viewBox="0 0 92 92" aria-hidden="true">
						<circle cx="46" cy="46" r={R} class="ring-track" />
						<circle cx="46" cy="46" r={R} class="ring-fill" stroke-dasharray={C} stroke-dashoffset={C * (1 - p.pct)} />
					</svg>
				{/if}
				<span class="face" class:long={[...st.badge].length > 2}>
					{#if st.badge}
						<span class="badge" lang={scriptLangTag(lang, $zhScript)}>{displayText(st.badge, lang, $toZhScript)}</span>
					{:else if st.id === 'ears'}
						<Headphones size={30} strokeWidth={2.4} />
					{:else if st.id === 'recall'}
						<Brain size={30} strokeWidth={2.4} />
					{:else}
						<Compass size={30} strokeWidth={2.4} />
					{/if}
				</span>
				{#if p.done}<span class="tick"><Check size={14} strokeWidth={3.5} /></span>{/if}
			</button>
			<span class="label" class:left={x > 0}>
				<b>{st.title}</b>
				<small>{status(st, p)}</small>
			</span>
			{#if here}
				<span class="nabi" class:left={x > 0} aria-hidden="true"><Mascot size={46} mood="happy" /></span>
			{/if}
		</li>

		{#if open === i}
			{@const preview = stagePreview(st, $pathData)}
			<li class="panel" data-kind={st.kind}>
				<span class="kicker">Stage {i + 1} · {KIND_LABEL[st.kind]}{here ? ' · You are here' : ''}</span>
				<h2>{st.title}</h2>
				<p class="blurb">{st.blurb}</p>

				{#if st.kind !== 'explore' && p.total > 0}
					<div class="bar" role="progressbar" aria-valuenow={Math.round(p.pct * 100)} aria-valuemin={0} aria-valuemax={100}>
						<span class="bar-started" style="width: {((p.learned + p.started) / p.total) * 100}%"></span>
						<span class="bar-learned" style="width: {p.pct * 100}%"></span>
					</div>
					<p class="counts">
						{#if st.kind === 'reading'}
							<b>{p.learned}</b> of {p.total} texts read
						{:else if st.kind === 'skills'}
							<b>{p.learned}</b> of the {p.total} words you’ve started have passed this skill
						{:else}
							<b>{p.learned}</b> learned{#if p.started} · {p.started} in progress{/if} · {p.total - p.learned - p.started} new
						{/if}
						{#if p.done}<span class="done-chip"><Crown size={13} /> Done</span>{/if}
					</p>
				{/if}

				{#if preview.length}
					<div class="preview" class:titles={st.kind === 'reading'} dir={lang === 'he' && st.kind !== 'reading' ? 'rtl' : 'ltr'}>
						{#each preview as t (t)}<span lang={st.kind === 'reading' ? 'en' : scriptLangTag(lang, $zhScript)} dir="auto">{displayText(t, lang, $toZhScript)}</span>{/each}
					</div>
				{/if}

				<div class="actions">
					{#if st.kind === 'script' || st.kind === 'words'}
						{#if p.total > 0}
							{@const n = p.nextItems.ids.length + p.nextItems.create.length}
							<button class="btn3d" onclick={() => practise(st, p)}>
								{#if n}{p.learned || p.started ? 'Continue' : 'Start'} · next {n}{:else}Review this stage{/if}
								<ArrowRight size={18} />
							</button>
						{/if}
					{:else if st.kind === 'reading'}
						{#if p.nextPassage}
							<a class="btn3d" href="/read/{p.nextPassage.id}"><BookOpen size={18} /> Read “{p.nextPassage.title}”</a>
						{/if}
					{:else if st.id === 'ears'}
						{#if trail.itemIds.length}
							<a class="btn3d" href={scopeHref(trail.itemIds, `${trail.path.title}: listening`, 'listening')}><Headphones size={18} /> Listen</a>
							<a class="btn3d" href={scopeHref(trail.itemIds, `${trail.path.title}: speaking`, 'speaking')}><Mic size={18} /> Speak</a>
						{/if}
					{:else if st.id === 'recall'}
						{#if trail.itemIds.length}
							<a class="btn3d" href={scopeHref(trail.itemIds, `${trail.path.title}: review`, 'reading')}><Brain size={18} /> Review</a>
						{/if}
					{/if}
					{#each st.links as l (l.href)}
						<a class="btn3d ghost" href={l.href}>{l.label}</a>
					{/each}
				</div>
			</li>
		{/if}
	{/each}
</ol>

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem 1rem;
		margin-bottom: 1rem;
	}
	.head-top {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	h1 {
		margin: 0;
	}
	.sub {
		margin: 0.15rem 0 0;
		color: var(--color-text-muted);
		font-weight: 700;
	}
	.langs {
		display: inline-flex;
		padding: 0.2rem;
		border-radius: 999px;
		background: var(--color-bg-elevated);
	}
	.langs button {
		padding: 0.35rem 0.8rem;
		border: none;
		border-radius: 999px;
		background: transparent;
		color: var(--color-text-muted);
		font-family: var(--font-script);
		font-size: 0.95rem;
		font-weight: 700;
	}
	.langs button.on {
		background: var(--color-bg);
		color: var(--color-accent);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
	}

	/* --- Path picker ------------------------------------------------------- */
	.paths {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.6rem;
		margin-bottom: 1rem;
	}
	.path-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.8rem 0.95rem 0.85rem;
		border: 2px solid var(--color-border);
		border-bottom-width: 4px;
		border-radius: 1.1rem;
		background: var(--color-bg);
		color: var(--color-text);
		font: inherit;
		text-align: left;
	}
	.path-card:hover {
		border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-border));
	}
	.path-card.on {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 7%, var(--color-bg));
	}
	.pc-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.pc-top b {
		font-size: 1.05rem;
		font-weight: 900;
	}
	.on .pc-top b {
		color: var(--color-accent);
	}
	.pc-level {
		padding: 0.05rem 0.5rem;
		border-radius: 999px;
		background: var(--color-bg-elevated);
		color: var(--color-text-muted);
		font-size: 0.72rem;
		font-weight: 900;
		white-space: nowrap;
	}
	.pc-blurb {
		color: var(--color-text-muted);
		font-size: 0.82rem;
		font-weight: 600;
		line-height: 1.35;
	}
	.pc-bar {
		position: relative;
		height: 0.45rem;
		margin-top: auto;
		border-radius: 999px;
		background: var(--color-bg-elevated);
		overflow: hidden;
	}
	.pc-bar span {
		position: absolute;
		inset: 0 auto 0 0;
		border-radius: 999px;
		background: var(--color-success);
	}
	.pc-done {
		color: var(--color-text-muted);
		font-size: 0.72rem;
		font-weight: 800;
	}

	/* --- The trail --------------------------------------------------------- */
	.trail {
		position: relative;
		max-width: 34rem;
		margin: 1.75rem auto 3rem;
		padding: 0;
		list-style: none;
	}
	[data-kind='script'] {
		--c: var(--color-sky);
	}
	[data-kind='words'] {
		--c: var(--color-accent);
	}
	[data-kind='reading'] {
		--c: var(--color-teal);
	}
	[data-kind='skills'] {
		--c: var(--color-pink);
	}
	[data-kind='explore'] {
		--c: var(--color-sun);
	}
	.link {
		display: flex;
		justify-content: center;
		height: 44px;
	}
	.link svg {
		overflow: visible;
	}
	.link path {
		fill: none;
		stroke: var(--color-border);
		stroke-width: 6;
		stroke-linecap: round;
		stroke-dasharray: 0.1 13;
	}
	.link.walked path {
		stroke: color-mix(in srgb, var(--color-success) 60%, var(--color-border));
	}
	.stop {
		position: relative;
		height: 5.4rem;
	}
	.node {
		position: absolute;
		top: 0;
		left: calc(50% + var(--x));
		translate: -50% 0;
		width: 5.4rem;
		height: 5.4rem;
		padding: 0;
		border: none;
		border-radius: 999px;
		background: transparent;
		cursor: pointer;
	}
	.stage-ring {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		rotate: -90deg;
	}
	.ring-track {
		fill: none;
		stroke: color-mix(in srgb, var(--c) 14%, var(--color-bg-elevated));
		stroke-width: 6;
	}
	.ring-fill {
		fill: none;
		stroke: var(--c);
		stroke-width: 6;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.6s ease;
	}
	.done .ring-fill {
		stroke: var(--color-success);
	}
	.face {
		position: absolute;
		inset: 0.6rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		background: color-mix(in srgb, var(--c) 16%, var(--color-bg));
		color: var(--c);
		box-shadow: 0 5px 0 color-mix(in srgb, var(--c) 30%, var(--color-border));
		transition:
			transform 0.1s ease,
			box-shadow 0.1s ease;
	}
	.node:hover .face {
		transform: translateY(-1px);
	}
	.node:active .face {
		transform: translateY(4px);
		box-shadow: 0 1px 0 color-mix(in srgb, var(--c) 30%, var(--color-border));
	}
	.here .face,
	.open .face {
		background: var(--c);
		color: #fff;
		box-shadow: 0 5px 0 color-mix(in srgb, var(--c) 65%, #000);
	}
	.done .face {
		background: var(--color-success);
		color: #fff;
		box-shadow: 0 5px 0 color-mix(in srgb, var(--color-success) 65%, #000);
	}
	.here .face {
		animation: bob 2.4s ease-in-out infinite;
	}
	@keyframes bob {
		50% {
			transform: translateY(-4px);
		}
	}
	.badge {
		font-family: var(--font-script);
		font-size: 1.9rem;
		font-weight: 700;
		line-height: 1;
	}
	.face.long .badge {
		font-size: 1.15rem;
	}
	.tick {
		position: absolute;
		right: 0.1rem;
		bottom: 0.25rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 999px;
		background: var(--color-sun);
		color: #fff;
		border: 2px solid var(--color-bg);
	}
	.label {
		position: absolute;
		top: 50%;
		translate: 0 -50%;
		left: calc(50% + var(--x) + 3.3rem);
		right: 0;
		display: flex;
		flex-direction: column;
		max-width: 13rem;
		line-height: 1.25;
	}
	.label.left {
		left: auto;
		right: calc(50% - var(--x) + 3.3rem);
		text-align: right;
	}
	.label b {
		font-size: 1rem;
		font-weight: 900;
	}
	.label small {
		color: var(--color-text-muted);
		font-size: 0.78rem;
		font-weight: 700;
	}
	.done .label small {
		color: var(--color-success);
	}
	.nabi {
		position: absolute;
		top: 50%;
		translate: 0 -50%;
		right: calc(50% - var(--x) + 3rem);
		pointer-events: none;
	}
	.nabi.left {
		right: auto;
		left: calc(50% + var(--x) + 3rem);
	}
	/* --- The open stage ---------------------------------------------------- */
	.panel {
		margin: 1rem 0 0.25rem;
		padding: 1.1rem 1.15rem 1.2rem;
		border: 2px solid var(--color-border);
		border-top: 6px solid var(--c);
		border-radius: 1.25rem;
		background: var(--color-bg);
		box-shadow: var(--shadow-soft);
		animation: pop-in 0.3s cubic-bezier(0.3, 1.3, 0.5, 1);
	}
	.kicker {
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--c);
	}
	.panel h2 {
		margin: 0.15rem 0 0.3rem;
	}
	.blurb {
		margin: 0;
		color: var(--color-text-muted);
		font-weight: 600;
		line-height: 1.45;
	}
	.bar {
		position: relative;
		height: 0.85rem;
		margin: 0.9rem 0 0.4rem;
		border-radius: 999px;
		background: var(--color-bg-elevated);
		overflow: hidden;
	}
	.bar span {
		position: absolute;
		inset: 0 auto 0 0;
		border-radius: 999px;
		transition: width 0.5s ease;
	}
	.bar-started {
		background: color-mix(in srgb, var(--c) 30%, var(--color-bg-elevated));
	}
	.bar-learned {
		background: var(--c);
	}
	.counts {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		color: var(--color-text-muted);
		font-size: 0.85rem;
		font-weight: 700;
	}
	.counts b {
		color: var(--color-text);
	}
	.done-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0 0.5rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-sun) 22%, transparent);
		color: color-mix(in srgb, var(--color-sun) 60%, var(--color-text));
		font-weight: 900;
	}
	.preview {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: 0.85rem;
	}
	.preview span {
		padding: 0.15rem 0.55rem;
		border-radius: 0.6rem;
		background: color-mix(in srgb, var(--c) 9%, var(--color-bg));
		font-family: var(--font-script);
		font-size: 1.05rem;
	}
	.preview.titles span {
		font-family: inherit;
		font-size: 0.82rem;
		font-weight: 700;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	.actions .btn3d {
		padding: 0.6rem 1rem;
		font-size: 0.85rem;
	}
</style>
