<script lang="ts">
	import { BookOpen, Layers, HardDrive, Sparkles, Route, CodeXml, ExternalLink } from 'lucide-svelte';
	import Mascot from '$lib/components/Mascot.svelte';

	const version = __APP_VERSION__;
	const commit = __BUILD_COMMIT__;
	const built = __BUILD_DATE__;
	const REPO = 'https://github.com/raskell-io/manabi';

	const PRINCIPLES = [
		{ icon: BookOpen, title: 'Reading first', text: 'Real script from day one — pinyin and Zhuyin, Jyutping, kana, Hangul, vowelled Hebrew — and real conversations and texts to read, with every word one tap from the dictionary.' },
		{ icon: Layers, title: 'Five skills per word', text: 'Recognising, hearing, saying, using and recalling a word are scheduled separately, so each comes back just before you would forget it.' },
		{ icon: HardDrive, title: 'Yours, on your device', text: 'No account. Everything lives in this browser and works offline; sync to your own GitHub repository if you like.' },
		{ icon: Sparkles, title: 'AI as a helper', text: 'With an OpenAI key, AI drafts new words and texts — you decide what to keep. Nothing it writes goes in unseen.' }
	];

	type Credit = { name: string; href: string; what: string; licence?: string };
	const CREDITS: { title: string; items: Credit[] }[] = [
		{
			title: 'Dictionaries & word lists',
			items: [
				{ name: 'CC-CEDICT', href: 'https://cc-cedict.org', what: 'Chinese dictionary (export by MDBG)', licence: 'CC BY-SA 4.0' },
				{ name: 'CC-Canto', href: 'https://cantonese.org', what: 'Cantonese dictionary and Jyutping readings for CC-CEDICT, by Pleco', licence: 'CC BY-SA 3.0' },
				{ name: 'JMdict & KANJIDIC2', href: 'https://www.edrdg.org/edrdg/licence.html', what: 'Japanese dictionary and kanji data, by the EDRDG (via jmdict-simplified and kanji-data)', licence: 'CC BY-SA 4.0' },
				{ name: 'English Wiktionary', href: 'https://kaikki.org', what: 'Korean and Hebrew dictionaries, extracted by Wiktextract / kaikki.org', licence: 'CC BY-SA 4.0 / GFDL' },
				{ name: 'words.hk', href: 'https://words.hk/faiman/analysis/', what: 'Cantonese word frequencies and Jyutping for the word lists', licence: 'Public domain' },
				{ name: 'complete-hsk-vocabulary', href: 'https://github.com/drkameleon/complete-hsk-vocabulary', what: 'HSK 3.0 word lists' },
				{ name: 'open-anki-jlpt-decks', href: 'https://github.com/jamsinclair/open-anki-jlpt-decks', what: 'JLPT word lists' }
			]
		},
		{
			title: 'Characters & scripts',
			items: [
				{ name: 'Make Me a Hanzi', href: 'https://github.com/skishore/makemeahanzi', what: 'Hanzi stroke order and definitions (via hanzi-writer-data)', licence: 'Arphic Public License' },
				{ name: 'AnimCJK', href: 'https://github.com/parsimonhi/animCJK', what: 'Kanji stroke order (via hanzi-writer-data-jp)', licence: 'LGPL 3.0+ / Arphic Public License' },
				{ name: 'Unicode Unihan & CJK Radicals', href: 'https://www.unicode.org/charts/unihan.html', what: 'The radical index', licence: 'Unicode License v3' },
				{ name: 'OpenCC', href: 'https://github.com/nk2028/opencc-js', what: 'Simplified ↔ Traditional Chinese conversion (opencc-js)', licence: 'MIT / Apache-2.0' }
			]
		},
		{
			title: 'Voices & models',
			items: [
				{ name: 'Microsoft neural voices', href: 'https://github.com/rany2/edge-tts', what: 'The recorded pronunciations (Xiaoxiao, HiuMaan, Nanami, SunHi, Hila), generated with edge-tts' },
				{ name: 'Whisper', href: 'https://github.com/openai/whisper', what: 'On-device speech recognition (ONNX weights by onnx-community)', licence: 'MIT' },
				{ name: 'whisper-small-cantonese', href: 'https://huggingface.co/alvanlii/whisper-small-cantonese', what: 'On-device Cantonese speech recognition, by Alvan Li (ONNX by onnx-community)', licence: 'Apache-2.0' },
				{ name: 'DictaBERT menaked', href: 'https://huggingface.co/dicta-il/dictabert-large-char-menaked', what: 'On-device Hebrew vowels, by Dicta (INT8 ONNX conversion by Tale Me)', licence: 'CC BY 4.0' },
				{ name: 'MMS', href: 'https://huggingface.co/facebook/mms-tts-kor', what: 'On-device Korean voice, by Meta', licence: 'CC BY-NC 4.0' }
			]
		},
		{
			title: 'Software',
			items: [
				{ name: 'Svelte & SvelteKit', href: 'https://svelte.dev', what: 'The app framework', licence: 'MIT' },
				{ name: 'Automerge', href: 'https://automerge.org', what: 'The local-first document behind your data', licence: 'MIT' },
				{ name: 'Transformers.js', href: 'https://github.com/huggingface/transformers.js', what: 'Running models in the browser (with ONNX Runtime Web, MIT)', licence: 'Apache-2.0' },
				{ name: 'Hanzi Writer', href: 'https://hanziwriter.org', what: 'Stroke animation and tracing', licence: 'MIT' },
				{ name: 'Tailwind CSS', href: 'https://tailwindcss.com', what: 'Styling', licence: 'MIT' },
				{ name: 'Lucide', href: 'https://lucide.dev', what: 'Icons', licence: 'ISC' },
				{ name: 'Nunito', href: 'https://fonts.google.com/specimen/Nunito', what: 'The typeface (via Fontsource)', licence: 'OFL 1.1' },
				{ name: 'idb-keyval', href: 'https://github.com/jakearchibald/idb-keyval', what: 'IndexedDB storage', licence: 'Apache-2.0' }
			]
		}
	];
</script>

<section class="hero">
	<div class="nabi"><Mascot size={104} mood="happy" /></div>
	<div class="hero-text">
		<h1>Manabi <span class="kanji" lang="ja">学び</span></h1>
		<p class="tagline">A local-first, reading-first way to learn Chinese, Cantonese, Japanese, Korean and Hebrew.</p>
		<p class="build" title="Version · commit · build date">v{version} · {commit} · {built}</p>
		<div class="links">
			<a class="btn3d" href="/path"><Route size={17} /> How Manabi works</a>
			<a class="btn3d ghost" href={REPO} target="_blank" rel="noopener"><CodeXml size={17} /> Source code</a>
		</div>
	</div>
</section>

<section class="principles" aria-label="What Manabi is">
	{#each PRINCIPLES as p (p.title)}
		{@const Icon = p.icon}
		<article class="principle">
			<span class="p-ic"><Icon size={20} strokeWidth={2.4} /></span>
			<h2>{p.title}</h2>
			<p>{p.text}</p>
		</article>
	{/each}
</section>

<section class="block">
	<h2>Your data</h2>
	<p>Your words, progress and recordings are stored in this browser (IndexedDB) and never leave it on their own. There are no accounts, no tracking and no analytics. Data goes out only when you ask for it:</p>
	<ul>
		<li><strong>OpenAI</strong> — when you add your own key: generating content, translations, voices and speech recognition.</li>
		<li><strong>GitHub</strong> — when you set up sync: a snapshot (and, if on, Markdown) in your own repository.</li>
		<li><strong>Downloads only</strong> — dictionary pieces and recordings from this site, on-device models from Hugging Face, and stroke data from jsDelivr when it isn't bundled.</li>
	</ul>
	<p>Export a backup any time in <a href="/settings">Settings</a>.</p>
</section>

<section class="block nabi-block">
	<h2>Meet Nabi</h2>
	<p>
		Nabi (나비) is Korean for <em>butterfly</em> — and hides in plain sight in the name: ma·<strong>nabi</strong>. Learning a new
		script is a small metamorphosis, so a butterfly cheers you on, naps when there's nothing due, and dances when you get a run
		of answers right.
	</p>
</section>

<section class="block credits">
	<h2>Credits & licences</h2>
	<p class="muted">Manabi stands on generous open data and open-source software. Dictionary data stays under its ShareAlike licences.</p>
	{#each CREDITS as group (group.title)}
		<h3>{group.title}</h3>
		<ul class="credit-list">
			{#each group.items as c (c.name)}
				<li>
					<a href={c.href} target="_blank" rel="noopener">{c.name}<ExternalLink size={12} /></a>
					<span class="what">{c.what}</span>
					{#if c.licence}<span class="licence">{c.licence}</span>{/if}
				</li>
			{/each}
		</ul>
	{/each}
	<p class="muted small">Seed words, example sentences, reading passages, names and Hebrew roots were written and checked by hand for Manabi.</p>
</section>

<style>
	.hero {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		margin-bottom: 1.75rem;
	}
	.nabi {
		flex-shrink: 0;
	}
	h1 {
		margin: 0;
		font-size: 2rem;
	}
	.kanji {
		font-family: var(--font-script);
		font-weight: 600;
		color: var(--color-accent);
	}
	.tagline {
		margin: 0.25rem 0 0.4rem;
		color: var(--color-text-muted);
		font-size: 1.05rem;
	}
	.build {
		display: inline-block;
		margin: 0 0 0.9rem;
		padding: 0.15rem 0.6rem;
		border-radius: 999px;
		background: var(--color-bg-elevated);
		color: var(--color-text-muted);
		font-size: 0.78rem;
		font-family: var(--font-mono);
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.links :global(.btn3d) {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}
	.principles {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.9rem;
		max-width: 46rem;
		margin-bottom: 1.75rem;
	}
	.principle {
		padding: 1rem 1.1rem;
		border: 2px solid var(--color-border);
		border-radius: 1.1rem;
		background: var(--color-bg);
	}
	.p-ic {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.3rem;
		height: 2.3rem;
		border-radius: 0.8rem;
		background: color-mix(in srgb, var(--color-accent) 12%, var(--color-bg));
		color: var(--color-accent);
	}
	.principle h2 {
		margin: 0.6rem 0 0.25rem;
		font-size: 1.02rem;
	}
	.principle p {
		margin: 0;
		font-size: 0.9rem;
		color: var(--color-text-muted);
		line-height: 1.5;
	}
	.block {
		max-width: 46rem;
		margin-bottom: 1.75rem;
		line-height: 1.6;
	}
	.block h2 {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
	}
	.block p {
		margin: 0 0 0.6rem;
	}
	.block ul {
		margin: 0 0 0.6rem;
		padding-left: 1.2rem;
		list-style: disc;
	}
	.block li {
		margin-bottom: 0.2rem;
	}
	.block a {
		color: var(--color-accent);
		font-weight: 700;
	}
	.muted {
		color: var(--color-text-muted);
	}
	.small {
		font-size: 0.85rem;
		margin-top: 0.8rem;
	}
	.credits h3 {
		margin: 1.1rem 0 0.4rem;
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
	}
	.credit-list {
		list-style: none;
		padding: 0 !important;
		margin: 0;
		border: 2px solid var(--color-border);
		border-radius: 1rem;
		overflow: hidden;
	}
	.credit-list li {
		display: grid;
		grid-template-columns: minmax(0, 12rem) minmax(0, 1fr) auto;
		gap: 0.25rem 0.9rem;
		align-items: baseline;
		padding: 0.55rem 0.9rem;
		font-size: 0.88rem;
		line-height: 1.4;
	}
	.credit-list li + li {
		border-top: 1px solid var(--color-border);
	}
	.credit-list a {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}
	.what {
		color: var(--color-text-muted);
	}
	.licence {
		justify-self: end;
		padding: 0.05rem 0.5rem;
		border-radius: 999px;
		background: var(--color-bg-elevated);
		font-size: 0.75rem;
		font-weight: 700;
		white-space: nowrap;
	}
	@media (max-width: 640px) {
		.principles {
			grid-template-columns: minmax(0, 1fr);
		}
		.hero {
			flex-direction: column;
			text-align: center;
		}
		.links {
			justify-content: center;
		}
		.credit-list li {
			grid-template-columns: minmax(0, 1fr) auto;
		}
		.what {
			grid-column: 1 / -1;
			grid-row: 2;
		}
	}
</style>
