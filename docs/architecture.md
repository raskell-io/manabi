# Architecture

Manabi is a single-page, local-first PWA. There is no backend: the browser holds all
state, computes the schedule, renders exercises, and (optionally) talks directly to OpenAI.
This document is the map; the subsystem docs are the territory.

## Why this stack

The stack mirrors its sibling project **kurumi** — a deliberate choice, because a
single-user, offline-first learner has exactly the same hard problems as a local-first
notes app: durable local state, a flashcard scheduler, and a human-in-the-loop AI queue.

| Layer | Choice | Why |
| --- | --- | --- |
| UI framework | **SvelteKit 2 + Svelte 5 runes** | Small, fast, no virtual DOM; runes (`$state`/`$derived`/`$effect`) give fine-grained reactivity |
| Styling | **Tailwind CSS 4** (via `@tailwindcss/vite`) + CSS variables | Utility classes plus a Catppuccin theme driven by CSS custom properties |
| State | **Automerge 3 CRDT** in one document | Conflict-free, serializable, sync-ready without a server |
| Persistence | **IndexedDB** via `idb-keyval` (+ a raw-IDB blob store for audio) | Durable, large-capacity, offline browser storage |
| Build/output | **`adapter-static`** (SPA) + **Vite 7** | Ships a static bundle any host can serve; no SSR runtime |
| PWA | **`@vite-pwa/sveltekit`** (Workbox) | Service worker, precaching, installability |
| On-device ML | **`@huggingface/transformers`** (MMS TTS) | Local text-to-speech *attempt* (see [audio](./audio.md): it is unreliable, so audio is prerecorded instead) |
| Tooling | **mise**, **vitest**, **svelte-check**, **TypeScript** | Reproducible Node 22, unit tests, strict typing |

Runtime: **Node 22** (pinned in `mise.toml` and `.nvmrc`). The build target is `esnext`
because top-level-await and WASM (Automerge) need a modern target.

## The big picture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser (SvelteKit SPA, ssr=false)                                    │
│                                                                        │
│  routes/                 components/            $lib/                   │
│  ─ / review read         ─ ExerciseRunner       ─ srs/   (SM-2 + queue) │
│    scripts vocab items   ─ AudioButton          ─ exercises/ (templates)│
│    lessons dashboard     ─ Recorder             ─ inference/ (AI router)│
│    workbench settings    ─ ScriptText           ─ audio.ts  (playback)  │
│         │                       │                      │               │
│         └───────────────────────┴──────────────────────┘               │
│                                 │                                      │
│                      $lib/db/store.ts  (the only writer)               │
│                      Automerge document + derived Svelte stores        │
│                                 │                                      │
│        ┌────────────────────────┴───────────────────────┐             │
│        ▼                                                 ▼             │
│  IndexedDB (idb-keyval)                         IndexedDB blob store   │
│  the serialized Automerge doc                   audio recordings/clips │
└──────────────────────────────────────────────────────────────────────┘
        │                                  │                  │
        ▼                                  ▼                  ▼
 static/audio/packs/*.webm        static/wordlists/*.json   api.openai.com
 + manifest-{lang}.json           (fetched on demand)       (optional, key in settings)
```

Three kinds of data live **outside** the Automerge document, fetched on demand and never
written into it (to keep the doc small and fast):

- **Audio** — prerecorded Opus sprite packs in `static/audio/packs/`, indexed by
  per-language manifests. See [audio](./audio.md).
- **Vocabulary lists** — per-level JSON in `static/wordlists/`. See [content](./content.md).
- **Script tables** — generated into `src/lib/scripts-data.ts` (bundled, but treated as
  static reference data, not user state).

Only items you actually start studying become `LearningItem`s in the document.

## Module map

```
src/
  app.html              HTML shell — PWA meta, icons, manifest link
  app.css               Catppuccin theme (CSS variables), light/dark
  routes/
    +layout.svelte      app shell: nav, language switch, theme, boot, SW registration
    +layout.ts          ssr=false, prerender=false (SPA)
    +page.svelte        home / today's plan
    review/             the core review loop (mode picker + ExerciseRunner)
    read/, read/[id]/   graded reading + sentence mining
    scripts/            kana/kanji/hanzi/alef-bet/tones reference tables
    vocab/              HSK/JLPT word browser
    items/, items/[id]/ item browser + editor
    lessons/, dashboard/, workbench/, settings/
  lib/
    db/
      types.ts          all entity types + the document shape + helpers
      store.ts          THE state owner: Automerge doc, CRUD, SRS ops, derived stores
      blob-store.ts     raw-IDB store for audio blobs (recordings + cached synth)
      seed.ts           built-in hand-verified seed content
      index.ts          re-exports
    srs/
      schedule.ts       gradeDimension() — pure SM-2
      queue.ts          buildQueue() + isUnlocked() — what is due, in what order
    exercises/
      templates.ts      Exercise shapes, which dimension each trains
      generate.ts       buildExercise() + distractor selection
    inference/
      router.ts         provider routing (TTS local-first; generation OpenAI-only)
      types.ts          provider interface + task types
      local-models.ts   local model registry
      providers/openai.ts, providers/tts-local.ts
    audio.ts            prerecorded-pack playback (seek a slice via HTTP Range)
    scripts.ts          Scripts-page data assembly + helpers
    scripts-data.ts     GENERATED kana/kanji/hanzi tables (do not hand-edit)
    components/         ScriptText, AudioButton, Recorder, ExerciseRunner
tools/                  offline data + audio generators (Node/Python, not shipped)
serve.mjs               dependency-free static server for local hosting
```

## Data flow: one review, end to end

1. `/review` calls `snapshotQueue()` in the store, which runs `buildQueue(doc, settings)`
   ([srs](./srs.md)) to produce an ordered list of `(itemId, dimension)` tasks.
2. For the current task, `buildExercise(item, dimension, pool, …)`
   ([exercises](./srs.md#exercises)) produces a concrete exercise (MCQ, cloze, or
   record-and-compare), pulling plausible distractors from the same-language item pool.
3. `ExerciseRunner` renders it. Audio prompts go through `AudioButton`, which plays a
   prerecorded clip by seeking into its pack ([audio](./audio.md)).
4. On answer, the page calls `gradeItem(itemId, dimension, quality, …)`. That logs an
   `ExerciseAttempt` and runs `gradeDimension()` to advance that one skill's SM-2 state.
5. `store.ts` applies the change with `Automerge.change(...)`, updates the in-memory Svelte
   store, and fires a non-blocking save to IndexedDB.
6. Derived stores (`reviewSummary`, `activeItems`, …) recompute, and the UI updates.

The key architectural rule: **`store.ts` is the only module that mutates the document.**
Everything else reads derived stores and calls store functions.

## The write path

Every mutation follows the same pattern (inherited from kurumi):

```ts
const next = Automerge.change(current, (d) => {
  d.learningItems[id] = stripUndefined(item);   // mutate the draft
});
docStore.set(next);                              // update reactive store
void saveDoc(next);                              // fire-and-forget persist
```

Two invariants make this safe and are easy to violate:

- **Automerge rejects `undefined`.** Every object written into the document must go
  through `stripUndefined()`. Optional fields (`transliteration`, `audioRef`) are *absent*,
  never `undefined`. See [data model](./data-model.md#the-undefined-gotcha).
- **`store.ts` owns the document.** Components never call `Automerge.change` themselves.

## Project invariants

These are enforced and should stay green:

- **`svelte-check` must report 0 errors / 0 warnings.** This is the type/quality gate
  (CI runs it). Inherited from kurumi.
- **No `undefined` written to the document.**
- **SPA only.** `ssr=false` and `prerender=false` in `+layout.ts`; dynamic routes rely on
  the SPA fallback. There is no server runtime.
- **Pure SRS.** `schedule.ts` and `queue.ts` are pure functions with injectable dates/RNG,
  so they are deterministically unit-testable.

## Where to go next

- Understand the data → [Data model & storage](./data-model.md)
- Understand the scheduler → [SRS & review loop](./srs.md)
- Understand the content → [Content pipeline](./content.md) and [Audio](./audio.md)
- Ship it → [PWA & deployment](./pwa-and-deployment.md)
- Change it → [Development & extending](./development.md)
