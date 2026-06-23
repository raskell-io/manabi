<div align="center">

<h1>学 Manabi</h1>

<p><em>A local-first, reading-first language learning app.</em><br>
<em>Recognize. Pronounce. Understand. Recall. No handwriting, no mascot guilt.</em></p>

</div>

---

Manabi (学び, *"learning"* in Japanese) is a personal, local-first PWA for learning
to **read and speak** Chinese, Japanese, and Hebrew — not to handwrite them. It trains
five skills independently (recognition, pronunciation, listening, context, recall) with
a multi-dimensional spaced-repetition engine, synthesizes pronunciation on-device, lets
you record-and-compare, and grows its content through an AI workbench with a
human-in-the-loop review queue.

Built on the same stack as [kurumi](../kurumi): **SvelteKit 2 + Svelte 5 runes, Tailwind
CSS 4, Automerge CRDTs over IndexedDB, transformers.js, OpenAI fallback, adapter-static
PWA**. No server, no database — your data lives in your browser.

## Core ideas

- **Items, not lessons.** The atomic unit is a `LearningItem` (word / phrase / sentence /
  grammar). Lessons are just curated bundles.
- **Five skills, tracked separately.** You might *recognize* a word but fail to *pronounce*
  it. Each skill gets its own SM-2 schedule; the hardest (recall, context) unlock later.
- **Reading-first.** Pinyin tone marks, kana/furigana, vowelled (niqqud) Hebrew with RTL.
- **Human-in-the-loop AI.** The workbench generates draft items; nothing is published
  without your approval.
- **Local-first.** Everything works offline in IndexedDB. (Git sync is a future milestone.)

## Learning modes

| Mode | Exercise |
|------|----------|
| Recognition | see word → choose meaning / choose pronunciation |
| Listening | hear audio → choose word |
| Context | cloze — fill the blank in a sentence |
| Recall | see English → choose the word |
| Pronunciation | listen to native (synthesized) audio, record yourself, self-rate |

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | SvelteKit 2 + Svelte 5 runes |
| Styling | Tailwind CSS 4 + CSS variables |
| Data | Automerge CRDTs in IndexedDB (idb-keyval + raw-IDB blob store) |
| SRS | Multi-dimensional SM-2 (`$lib/srs`) |
| Local audio | transformers.js — Facebook MMS TTS, one model per language |
| Remote AI | OpenAI (item generation via JSON mode, TTS fallback) |
| PWA | @vite-pwa/sveltekit · adapter-static |

## Development

```bash
mise run setup     # or: npm install && npx svelte-kit sync
mise run dev       # dev server
mise run build     # production build → build/
npm run test       # vitest (SRS + exercise generation)
npx svelte-check   # type + a11y + css — must be 0/0
```

**Invariant:** `npx svelte-check` returns `0 errors and 0 warnings`.

## Self-host locally

The app is a static SPA (`adapter-static`), so any static host works. `serve.mjs`
is a tiny dependency-free server that serves `build/` with the SPA fallback:

```bash
npm run build
PORT=4317 node serve.mjs      # → http://127.0.0.1:4317
```

On macOS, run it as a persistent login service with launchd:

```bash
# create ~/Library/LaunchAgents/io.raskell.manabi.plist pointing node at serve.mjs
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/io.raskell.manabi.plist
launchctl print  gui/$(id -u)/io.raskell.manabi   # status
launchctl bootout gui/$(id -u)/io.raskell.manabi   # stop & remove
```

The service has `KeepAlive` (auto-restarts) and `RunAtLoad` (starts on login).
Logs go to `~/Library/Logs/manabi.{out,err}.log`. To reach it from other devices
(e.g. install the PWA on a phone), set `HOST=0.0.0.0` and use your machine's LAN IP.

## Deploy

Manabi deploys as a static SPA to **Cloudflare Pages**. CI/CD is wired up
(`.github/workflows/`): every push to `main` runs `svelte-check` + tests + build,
then deploys `build/` to Pages. See [DEPLOY.md](DEPLOY.md) for the one-time setup
(create the `manabi` Pages project, add `CLOUDFLARE_API_TOKEN` /
`CLOUDFLARE_ACCOUNT_ID` repo secrets, optional `manabi.raskell.io` custom domain).

## AI content workbench

Set an OpenAI API key in **Settings**, then open **Workbench** to generate batches of
items into a review queue. Approve (`a`), reject (`r`), or delete (`d`) drafts with the
keyboard. Approved drafts become published items and enter the SRS pool. A small
hand-verified seed ships built-in so the app is usable before you generate anything.

## Status

MVP: M1 (data model + item browser) · M2 (SRS + review loop) · M3 (audio) · AI workbench.
Deferred: git sync, vowel-hiding for Hebrew, ASR-based pronunciation scoring.
