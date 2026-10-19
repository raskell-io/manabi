# Architecture

Manabi is a single-page, local-first PWA. There is no backend: the browser holds all
state, computes the schedule, renders exercises, and (optionally) talks directly to OpenAI.
(Optional on-device models — Korean TTS and Whisper speech recognition — run in the browser
too.) This document is the map; the subsystem docs are the territory.

## Why this stack

The stack mirrors its sibling project **kurumi** — a deliberate choice, because a
single-user, offline-first learner has exactly the same hard problems as a local-first
notes app: durable local state, a flashcard scheduler, and a human-in-the-loop AI queue.

| Layer | Choice | Why |
| --- | --- | --- |
| UI framework | **SvelteKit 2 + Svelte 5 runes** | Small, fast, no virtual DOM; runes (`$state`/`$derived`/`$effect`) give fine-grained reactivity |
| Styling | **Tailwind CSS 4** (via `@tailwindcss/vite`) + CSS variables | Utility classes plus the "Nabi" theme (white light default, deep-indigo dark) driven by CSS custom properties in `app.css` |
| State | **Automerge 3 CRDT** in one document | Conflict-free, serializable, sync-ready without a server |
| Persistence | **IndexedDB** via `idb-keyval` (+ a raw-IDB blob store for audio) | Durable, large-capacity, offline browser storage |
| Build/output | **`adapter-static`** (SPA) + **Vite 7** | Ships a static bundle any host can serve; no SSR runtime |
| PWA | **`@vite-pwa/sveltekit`** (Workbox) | Service worker, precaching, installability |
| On-device ML | **`@huggingface/transformers`** (MMS TTS, Whisper ASR) | Korean text-to-speech (the only MMS voice with an ONNX port; other languages use the [prerecorded audio](./audio.md)) and opt-in offline speech recognition for pronunciation scoring ([SRS](./srs.md#pronunciation-scoring-asr)) |
| Chinese script | **`opencc-js`** (lazily loaded) | Display conversion Simplified → Traditional (Taiwan / Hong Kong); content stays Simplified |
| Tooling | **mise**, **vitest**, **Playwright**, **svelte-check**, **TypeScript** | Reproducible Node 22, unit tests, browser tests, strict typing |

Runtime: **Node 22** (pinned in `mise.toml` and `.nvmrc`). The build target is `esnext`
because top-level-await and WASM (Automerge) need a modern target.

## The big picture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser (SvelteKit SPA, ssr=false)                                    │
│                                                                        │
│  routes/                 components/            $lib/                   │
│  ─ / path review read    ─ ExerciseRunner       ─ srs/   (SM-2 + queue) │
│    library scripts vocab ─ AudioButton          ─ exercises/ (templates)│
│    items lessons names … ─ Recorder             ─ inference/ (AI router)│
│    dashboard workbench   ─ ScriptText, TapText  ─ audio.ts  (playback)  │
│    settings              ─ LookupSheet          ─ chinese.ts, lookup.ts │
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
        │                         │                   │                  │
        ▼                         ▼                   ▼                  ▼
 static/audio/packs/*.webm  static/wordlists/*.json  api.openai.com   api.github.com
 + manifest-{lang}.json     static/dict/<lang>/*.json (optional key)  (optional sync)
                            static/strokes/ (on demand)  Hugging Face (opt-in models)
```

Several kinds of data live **outside** the Automerge document, fetched on demand and never
written into it (to keep the doc small and fast):

- **Audio** — prerecorded Opus sprite packs in `static/audio/packs/`, indexed by
  per-language manifests. See [audio](./audio.md).
- **Vocabulary lists** — per-level JSON in `static/wordlists/`. See [content](./content.md).
- **Dictionaries** — tap-a-word lookup shards in `static/dict/<lang>/<bucket>.json`, fetched
  as words are tapped and cached by the service worker. See [content](./content.md#dictionaries--toolsgen-dictmjs).
- **Stroke data** — `static/strokes/{zh,ja}/<hex>.json` for the drawing pad.
- **Script tables** — generated into `src/lib/scripts-data.ts` (and `radicals-data.ts`;
  bundled, but treated as static reference data, not user state).

Only items you actually start studying become `LearningItem`s in the document.

## Module map

```
src/
  app.html              HTML shell — PWA meta, icons, manifest link
  app.css               "Nabi" theme (CSS variables), light/dark, .btn3d controls
  routes/
    +layout.svelte      app shell: nav (still Mascot logo), theme, boot, Chinese script/reading setup, SW
    +layout.ts          ssr=false, prerender=false (SPA)
    +page.svelte        Home: today's Continue card, language chips, path strip
    path/               learning paths (Beginner / Refresher per language)
    review/             the core review loop (mode picker + ExerciseRunner; ?lesson= / ?items= scopes)
    read/, read/[id]/   graded reading: tappable words (TapText), sentence mining
    read/new/           "Read your own text" — paste text, it becomes a passage
    library/            hub for the reference screens below
    scripts/ radicals/ roots/ names/ vocab/
    items/, items/[id]/ item browser + editor (incl. Chinese Taiwan / HK forms)
    lessons/, dashboard/ (Progress: forecast, calendar, weak spots), workbench/, settings/
  lib/
    db/
      types.ts          all entity types + the document shape + helpers
      store.ts          THE state owner: Automerge doc, CRUD, SRS ops, derived stores
      merge.ts          semantic backup / sync merge (union by id, newest wins)
      blob-store.ts     raw-IDB store for audio blobs (recordings + cached synth)
      seed.ts           built-in hand-verified seed content (+ SEED_ZH_VARIANTS)
      index.ts          re-exports
    srs/
      schedule.ts       gradeDimension() — pure SM-2
      queue.ts          buildQueue() + isUnlocked() — what is due, in what order
      scope.ts          ?lesson= / ?items= review scopes
      practice.ts       capped, need-ranked Listening / Speaking pools
      stats.ts          reviewForecast() / activityCalendar() for Progress
    exercises/
      templates.ts      Exercise shapes, which dimension each trains
      generate.ts       buildExercise() + distractor selection, dictation pick
      answer.ts         checkTyped() — typed-recall answer checking
    inference/
      router.ts         provider routing (TTS local-first; transcription OpenAI → Whisper;
                        generation, annotation, diacritization OpenAI-only)
      types.ts          provider interface + task types
      local-models.ts   transformers.js pipeline loader + download status
      asr-text.ts       Whisper transcript clean-up, language names, token budget
      providers/openai.ts, providers/tts-local.ts (Korean MMS), providers/asr-local.ts (Whisper)
    audio.ts            prerecorded-pack playback (seek a slice via HTTP Range)
    chinese.ts          Simplified / Traditional display (opencc-js), zhVariants,
                        $toZhScript / $readingOf / $rubyOf stores
    zhuyin.ts           pinyin → Zhuyin, syllable split for ruby
    dictionary.ts       the app's lookup over static/dict (fetch + cache)
    lookup.ts           createLookup(): longest match, deinflection, particles, prefixes
    deinflect-ja.ts     Japanese deinflector (食べました → 食べる)
    dict-shard.ts       dictionary shard layout, shared with tools/gen-dict.mjs
    own-text.ts         pasted text → passage lines with offline readings
    content-md.ts       Markdown render / parse / apply for the sync repo
    sync.ts             GitHub Contents-API sync (runSync over SyncIO / ContentIO)
    pronunciation.ts    transcript scoring (normalize + Levenshtein)
    hebrew.ts           niqqud validation for AI diacritization
    reminder.ts         daily reminder as a repeating .ics event
    scripts.ts          Scripts-page data assembly + helpers
    scripts-data.ts     GENERATED kana/kanji/hanzi tables (do not hand-edit)
    radicals.ts, radicals-data.ts (GENERATED), roots.ts, roots-data.ts, names.ts, names-data.ts
    strokes.ts, strokes-index.ts (GENERATED)   drawing-pad data
    path.ts, today.ts, nav.ts, ui.ts, haptics.ts, install.ts, sounds.ts
    components/         ScriptText, TapText, LookupSheet, AudioButton, Recorder, ExerciseRunner,
                        StrokePad, GlyphSheet, ReviewForecast, ActivityCalendar, PathStrip,
                        HowItWorks, InstallHint, Mascot, Confetti
e2e/                    Playwright browser tests (desktop + phone)
tools/                  offline data + audio generators (Node/Python, not shipped)
serve.mjs               dependency-free static server for local hosting
```

## Data flow: one review, end to end

1. `/review` calls `snapshotQueue()` in the store, which runs `buildQueue(doc, settings)`
   ([srs](./srs.md)) to produce an ordered list of `(itemId, dimension)` tasks.
2. For the current task, `buildExercise(item, dimension, pool, …)`
   ([exercises](./srs.md#exercises)) produces a concrete exercise (MCQ, cloze, or
   record-and-compare, typed recall, or dictation), pulling plausible distractors from the
   same-language item pool.
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
- **No page or console errors.** The Playwright suite in `e2e/` fails any test that logs an
  uncaught page error or console error — the bug class `svelte-check` cannot see (see
  [development](./development.md#the-gates)).
- **Chinese is stored Simplified.** Traditional is a display conversion; render Chinese
  through `ScriptText` / `TapText`, or `displayText(…, $toZhScript)` and
  `$readingOf(reading, target, language)` when rendering by hand.

## Where to go next

- Understand the data → [Data model & storage](./data-model.md)
- Understand the scheduler → [SRS & review loop](./srs.md)
- Understand the content → [Content pipeline](./content.md) and [Audio](./audio.md)
- Ship it → [PWA & deployment](./pwa-and-deployment.md)
- Change it → [Development & extending](./development.md)
