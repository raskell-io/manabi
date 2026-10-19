# Development & extending

How to set up, run, test, and extend Manabi. Read [Architecture](./architecture.md) first
for the lay of the land.

## Setup

Requires **Node 22** (pinned in `mise.toml` / `.nvmrc`). With [mise](https://mise.jdx.dev):

```
mise run setup        # npm install + svelte-kit sync
mise run dev          # vite dev → http://localhost:5173
```

Plain npm works too:

```
npm install
npm run dev
```

## Tasks

| mise | npm | What |
| --- | --- | --- |
| `mise run dev` | `npm run dev` | Dev server (HMR) |
| `mise run dev-host` | `vite dev --host` | Dev server exposed on the LAN (test on a phone) |
| `mise run build` | `npm run build` | Production build → `build/` |
| `mise run preview` | `npm run preview` | Serve the production build |
| `mise run check` | `npm run check` | `svelte-kit sync` + `svelte-check` (the type gate) |
| `mise run test` | `npm run test` | `vitest run` |
| — | `npm run test:e2e` | `vite build` + Playwright browser tests (`npx playwright test` reuses an existing build) |
| `mise run clean` | — | Remove `.svelte-kit`, `build`, vite cache |

The offline data/audio generators in `tools/` are run manually and separately
([content](./content.md), [audio](./audio.md)); they are not part of the app build.

## The gates

All must stay green; CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) runs them in
order — `npm run check`, `npm test`, `npm run build`, then the Playwright suite against that
build (uploading traces on failure).

- **`svelte-check` → 0 errors / 0 warnings.** This is a hard invariant. If you introduce a
  warning, fix it before moving on.
- **`vitest`** — unit tests for the pure logic:
  - `srs/schedule.test.ts` — SM-2 interval/ease/lapse progression
  - `srs/queue.test.ts` — due-queue ordering, caps, unlock gating
  - `exercises/generate.test.ts` — exercise + distractor generation
  - `exercises/answer.test.ts` — typed-recall checking
  - `srs/scope.test.ts`, `srs/practice.test.ts`, `srs/stats.test.ts`
  - `chinese.test.ts`, `zhuyin.test.ts` — script conversion, Zhuyin, ruby alignment of
    every shipped reading
  - `lookup.test.ts`, `own-text.test.ts` — dictionary lookup **against the real
    `static/dict` data**, own-text readings
  - `content-md.test.ts`, `sync.test.ts`, `db/merge.test.ts` — Markdown round-trip of all
    seed content, the sync round over fakes, the backup merge
  - `inference/asr-text.test.ts`, `pronunciation.test.ts`, `hebrew.test.ts`,
    `reminder.test.ts`, and the rest (`src/**/*.test.ts`)

  Tests target **pure functions** with injectable dates/RNG.
- **Playwright** (`e2e/`, [`playwright.config.ts`](../playwright.config.ts)) — browser tests
  against `vite preview` of the production build on port 4173, in two projects: **desktop**
  (1200×900) and **phone** (390×844, touch). Each test gets a fresh context, so a fresh
  IndexedDB with only the seed; the service worker is blocked so tests hit the network. The
  shared `test` in [`e2e/fixtures.ts`](../e2e/fixtures.ts) **fails any test that logs an
  uncaught page error or console error** (404s excepted) — the bug class `svelte-check` misses,
  such as an optional parameter left in a compiled `.svelte` script. Specs cover every page in
  every language (and that none is wider than a phone), a full review session, typed recall and
  dictation over several days with a fake clock, the drawing pad, radicals, roots, names,
  paths, Traditional / Zhuyin / ruby, dictionary lookup and own texts, settings (incl.
  on-device recognition), the Markdown sync against a faked GitHub, the progress charts and
  reminder, and one animated mascot per screen. External APIs (OpenAI, GitHub) are faked with
  `context.route()`.

  ```
  npm run test:e2e                  # build, then run both projects
  npx playwright test e2e/recall.spec.ts --project=phone   # with a build in place
  ```

  CI installs headless Chromium with `npx playwright install --with-deps --only-shell chromium`;
  do the same once locally.

## Conventions

- **Svelte 5 runes** (`$state`, `$derived`, `$effect`, `$props`, snippets, `{@render}`).
  No legacy `export let` / stores-in-components for new code.
- **`store.ts` is the only writer.** Components read derived stores and call store
  functions; they never call `Automerge.change`. See
  [data model](./data-model.md#persistence).
- **Never write `undefined` to the document.** Route writes through `stripUndefined`; omit
  optional fields. See [the gotcha](./data-model.md#the-undefined-gotcha).
- **All script text renders through `ScriptText.svelte`** (or `TapText.svelte` where words
  should be tappable), which sets `dir`/`lang` (RTL for Hebrew; `zh-Hans` / `zh-Hant-TW` /
  `zh-Hant-HK`), converts Chinese to the chosen script, shows ruby when a `reading` is passed,
  and respects the vowel-hiding setting. Do not hand-render `target` text; Chinese that must be
  rendered by hand goes through `displayText(…, $toZhScript)`, and readings through
  `$readingOf(reading, target, language)` ([data model](./data-model.md#chinese-script-and-readings)).
- **No optional function parameters in `.svelte` scripts** (`function f(x?: T)`): the compiler
  leaves the `?` in the output and the browser gets a syntax error that `svelte-check` does not
  catch (the e2e suite does). Use `x: T | undefined`.
- **One animated mascot per screen.** The nav logo is `<Mascot still />`; only the page's own
  Nabi animates.
- **SPA only** — `ssr = false`. No server-only code, no `+page.server.ts`.
- Generated files (`scripts-data.ts`, `radicals-data.ts`, `strokes-index.ts` +
  `static/strokes/`, `static/wordlists/`, `static/dict/`, `static/audio/`) are **not
  hand-edited** — rerun their generators.

## Repo layout (quick reference)

```
src/lib/db/        types · store · merge · blob-store · seed → data model
src/lib/srs/       schedule · queue · scope · practice · stats → scheduler + progress
src/lib/exercises/ templates · generate · answer             → exercises
src/lib/inference/ router · providers · asr-text · types     → AI, TTS, ASR
src/lib/audio.ts   prerecorded-pack playback                 → audio
src/lib/chinese.ts, zhuyin.ts                                → Chinese script + readings
src/lib/lookup.ts, dictionary.ts, deinflect-ja.ts, own-text.ts → dictionary, own texts
src/lib/sync.ts, content-md.ts                               → GitHub sync + Markdown
src/lib/scripts*   Scripts-page data (scripts-data is generated)
src/routes/        one folder per screen
e2e/               Playwright browser tests
tools/             offline generators (data, dictionaries, strokes, audio)
docs/              this documentation
serve.mjs          local static host (Range-aware)
```

## Extension recipes

### Recipe: add a learning screen (route)

1. Create `src/routes/<name>/+page.svelte`.
2. Read data via derived stores from `store.ts`; mutate via store functions only.
3. Add it to [`src/lib/nav.ts`](../src/lib/nav.ts) — `LIBRARY` for a reference screen (the
   five `PRIMARY` tabs are deliberately fixed); that drives the tab bar, sidebar and hub.
4. Render any target text with `ScriptText` / `TapText`. Run `svelte-check`.
5. Add it to the every-page check in `e2e/pages.spec.ts` and a spec for its behavior.

### Recipe: add an exercise type

1. Add the type to the `ExerciseType` union and map it to a dimension in
   `EXERCISE_DIMENSION` ([`types.ts`](../src/lib/db/types.ts)).
2. Build it in [`exercises/generate.ts`](../src/lib/exercises/generate.ts) (`buildExercise`),
   pulling distractors from the same-language pool; use the injectable `rng`.
3. Render it in [`ExerciseRunner.svelte`](../src/lib/components/ExerciseRunner.svelte) and
   return a `CompleteResult`.
4. Add a case to `generate.test.ts` and an e2e flow (see `e2e/recall.spec.ts` for driving
   a card through several days with a fake clock). See [SRS → exercises](./srs.md#exercises).
5. `ExerciseType` is stored on every `ExerciseAttempt`; adding one is additive, but keep the
   existing names.

### Recipe: add a content language

This is the largest change (it touches the data model, content, and audio):

1. Extend the `Language` union and `LANGUAGES` in `types.ts` (with `dir`), then satisfy every
   `Record<Language, …>` the type checker flags (seed, scripts, reading guide,
   `WHISPER_LANGUAGE` in `asr-text.ts`, the dictionary credit, content-md names, own-text
   handling …). Add a voice to `gen-audio.py`'s `VOICE` map; add an MMS voice to
   `tts-local.ts` only if an ONNX port of it exists on the Hugging Face hub.
2. Add seed items/passages in `seed.ts` (new stable ids).
3. Add the script tables (kana/letters) to `scripts.ts`; extend `gen-scripts-data.mjs` if
   the language has a character set to generate.
4. Add word lists (extend `gen-vocab-data.mjs`, regenerate `static/wordlists/`).
5. Regenerate audio (`dump-audio-texts.mjs` + `gen-audio.py`) — it picks up the new texts.
6. Add a dictionary: a builder in `tools/gen-dict.mjs` (and the language in `DICT_LANGUAGES`,
   `dict-shard.ts`), its licence in `static/dict/LICENSE.md`, and lookup rules in `lookup.ts`
   (with `lookup.test.ts` against the real data); decide how `own-text.ts` derives a reading.
7. Verify `ScriptText` / `TapText` handle the script's direction/fonts (`--font-script` in
   `app.css`; `TapText` needs an `Intl.Segmenter` locale).
8. Extend the e2e suite: the language chip in `e2e/fixtures.ts` (`useLanguage`) and the
   every-page / lookup specs, so each page is booted in the new language.

### Recipe: change the SRS algorithm

Edit `gradeDimension`/`isUnlocked`/`buildQueue` (all pure) and update the matching
`*.test.ts`. See [SRS → extending](./srs.md#extending-the-scheduler).

### Recipe: bump the document schema

Bump `SCHEMA_VERSION`, add an "ensure exists" line to `migrate()` for a new collection, and
update `createEmptyDocument()`. A new setting only needs its default in `defaultSettings()` —
`migrate()` fills in missing settings — plus the bump. Never destructively remove a field — existing users' documents
still contain it. See [data model → migrations](./data-model.md#migrations).

## Account / git notes

This is a `raskell-io` org repo. Remotes use the account-scoped SSH alias
`github-raffaelschneider`; commits use the `raffaelschneider` identity. Commit and push only
when asked. The OpenAI key is runtime-only and never committed.
