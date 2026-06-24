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

> **Full documentation lives in [`docs/`](./docs/)** — a [user guide](./docs/user-guide.md)
> plus dev-centric deep dives on [architecture](./docs/architecture.md), the
> [data model](./docs/data-model.md), the [SRS engine](./docs/srs.md), the
> [content](./docs/content.md) and [audio](./docs/audio.md) pipelines, the
> [AI workbench](./docs/ai-workbench.md), [PWA & deployment](./docs/pwa-and-deployment.md),
> and [extending the app](./docs/development.md).

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

## Data & attribution

The **Scripts** page's full kanji/hanzi sets are generated from open data via
`tools/gen-scripts-data.mjs` (regenerate with `node tools/gen-scripts-data.mjs`):

- Kanji readings & meanings — **KANJIDIC2** © EDRDG (CC BY-SA 4.0), with Tanos
  JLPT levels, via [`davidluzgouveia/kanji-data`](https://github.com/davidluzgouveia/kanji-data).
- HSK 3.0 word lists — [`drkameleon/complete-hsk-vocabulary`](https://github.com/drkameleon/complete-hsk-vocabulary).
- Hanzi pinyin & definitions — [`skishore/makemeahanzi`](https://github.com/skishore/makemeahanzi) (Unihan-derived).

**Audio** is fully prerecorded (so playback needs no in-browser TTS) by
`tools/dump-audio-texts.mjs` (collects _every_ spoken text — seed content, the full
vocab word lists, and the Scripts-page glyphs, ~20k unique) →
`tools/gen-audio.py` (synthesizes via **edge-tts**: zh-CN / ja-JP / he-IL neural
voices). Cloudflare Pages caps a deployment at 20k files, so clips are **bundled into
Opus sprite packs** (`static/audio/packs/*.webm`, ~350 files, ~70 MB) rather than one
file each; per-language manifests (`static/audio/manifest-{zh,ja,he}.json`) map text →
`{ pack, start, dur }`. The play button seeks the pack with an HTTP Range request and
pauses at the clip's end, falling back to on-device TTS only if a clip is missing.

The **Vocabulary** browser (`/vocab`) serves full word lists as static per-level
files in `static/wordlists/`, generated by `tools/gen-vocab-data.mjs`:

- Chinese — full **HSK 3.0** lists (levels 1–6 + the 7–9 band), via
  [`drkameleon/complete-hsk-vocabulary`](https://github.com/drkameleon/complete-hsk-vocabulary).
- Japanese — **JLPT N5–N1** vocab, via
  [`jamsinclair/open-anki-jlpt-decks`](https://github.com/jamsinclair/open-anki-jlpt-decks)
  (derived from JMdict / Tanos JLPT lists).

## Deploy

Manabi deploys as a static SPA to **Cloudflare Pages** via Git integration:
connect the (public) repo once in the Cloudflare dashboard and it rebuilds on
every push to `main` — no secrets, no deploy workflow. `.github/workflows/ci.yml`
runs `svelte-check` + tests + build as a quality gate. See [DEPLOY.md](DEPLOY.md)
for the one-time dashboard setup and the optional `manabi.raskell.io` domain.

## AI content workbench

Set an OpenAI API key in **Settings**, then open **Workbench** to generate batches of
items into a review queue. Approve (`a`), reject (`r`), or delete (`d`) drafts with the
keyboard. Approved drafts become published items and enter the SRS pool. A small
hand-verified seed ships built-in so the app is usable before you generate anything.

## Status

MVP: M1 (data model + item browser) · M2 (SRS + review loop) · M3 (audio) · AI workbench.
Deferred: git sync, vowel-hiding for Hebrew, ASR-based pronunciation scoring.
