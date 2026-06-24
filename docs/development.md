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
| `mise run clean` | — | Remove `.svelte-kit`, `build`, vite cache |

The offline data/audio generators in `tools/` are run manually and separately
([content](./content.md), [audio](./audio.md)); they are not part of the app build.

## The two gates

Both must stay green; CI enforces them.

- **`svelte-check` → 0 errors / 0 warnings.** This is a hard invariant. If you introduce a
  warning, fix it before moving on.
- **`vitest`** — unit tests for the pure logic:
  - `srs/schedule.test.ts` — SM-2 interval/ease/lapse progression
  - `srs/queue.test.ts` — due-queue ordering, caps, unlock gating
  - `exercises/generate.test.ts` — exercise + distractor generation
  - `db/seed.test.ts`, `db/niqqud.test.ts`, `scripts.test.ts`,
    `inference/passages.test.ts`

  Tests target **pure functions** with injectable dates/RNG. There is no in-repo browser
  test; smoke-test the UI by driving the dev (or `serve.mjs`) server with a headless
  browser.

## Conventions

- **Svelte 5 runes** (`$state`, `$derived`, `$effect`, `$props`, snippets, `{@render}`).
  No legacy `export let` / stores-in-components for new code.
- **`store.ts` is the only writer.** Components read derived stores and call store
  functions; they never call `Automerge.change`. See
  [data model](./data-model.md#persistence).
- **Never write `undefined` to the document.** Route writes through `stripUndefined`; omit
  optional fields. See [the gotcha](./data-model.md#the-undefined-gotcha).
- **All script text renders through `ScriptText.svelte`**, which sets `dir`/`lang` (RTL for
  Hebrew) and respects the vowel-hiding setting. Do not hand-render `target` text.
- **SPA only** — `ssr = false`. No server-only code, no `+page.server.ts`.
- Generated files (`scripts-data.ts`, `static/wordlists/`, `static/audio/`) are **not
  hand-edited** — rerun their generators.

## Repo layout (quick reference)

```
src/lib/db/        types · store · blob-store · seed         → data model
src/lib/srs/       schedule · queue                          → scheduler
src/lib/exercises/ templates · generate                      → exercises
src/lib/inference/ router · providers · types                → AI
src/lib/audio.ts   prerecorded-pack playback                 → audio
src/lib/scripts*   Scripts-page data (scripts-data is generated)
src/routes/        one folder per screen
tools/             offline generators (data + audio)
docs/              this documentation
serve.mjs          local static host (Range-aware)
```

## Extension recipes

### Recipe: add a learning screen (route)

1. Create `src/routes/<name>/+page.svelte`.
2. Read data via derived stores from `store.ts`; mutate via store functions only.
3. Add it to the `NAV` array in [`+layout.svelte`](../src/routes/+layout.svelte).
4. Render any target text with `ScriptText`. Run `svelte-check`.

### Recipe: add an exercise type

1. Add the type to the `ExerciseType` union and map it to a dimension in
   `EXERCISE_DIMENSION` ([`types.ts`](../src/lib/db/types.ts)).
2. Build it in [`exercises/generate.ts`](../src/lib/exercises/generate.ts) (`buildExercise`),
   pulling distractors from the same-language pool; use the injectable `rng`.
3. Render it in [`ExerciseRunner.svelte`](../src/lib/components/ExerciseRunner.svelte) and
   return a `CompleteResult`.
4. Add a case to `generate.test.ts`. See [SRS → exercises](./srs.md#exercises).

### Recipe: add a content language

This is the largest change (it touches the data model, content, and audio):

1. Extend the `Language` union and `LANGUAGES` in `types.ts` (with `dir`). Add a voice to
   `gen-audio.py`'s `VOICE` map.
2. Add seed items/passages in `seed.ts` (new stable ids).
3. Add the script tables (kana/letters) to `scripts.ts`; extend `gen-scripts-data.mjs` if
   the language has a character set to generate.
4. Add word lists (extend `gen-vocab-data.mjs`, regenerate `static/wordlists/`).
5. Regenerate audio (`dump-audio-texts.mjs` + `gen-audio.py`) — it picks up the new texts.
6. Verify `ScriptText` handles the script's direction/fonts (`--font-script` in
   `app.css`).

### Recipe: change the SRS algorithm

Edit `gradeDimension`/`isUnlocked`/`buildQueue` (all pure) and update the matching
`*.test.ts`. See [SRS → extending](./srs.md#extending-the-scheduler).

### Recipe: bump the document schema

Bump `SCHEMA_VERSION`, add an "ensure exists" line to `migrate()`, and update
`createEmptyDocument()`. Never destructively remove a field — existing users' documents
still contain it. See [data model → migrations](./data-model.md#migrations).

## Account / git notes

This is a `raskell-io` org repo. Remotes use the account-scoped SSH alias
`github-raffaelschneider`; commits use the `raffaelschneider` identity. Commit and push only
when asked. The OpenAI key is runtime-only and never committed.
