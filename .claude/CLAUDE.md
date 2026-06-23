# Manabi (学び)

A local-first, reading-first language learning PWA for Chinese (zh), Japanese (ja),
and Hebrew (he). Trains reading and speaking — explicitly **no handwriting**. Same
stack as kurumi: SvelteKit 2 + Svelte 5 runes, Tailwind 4, Automerge over IndexedDB,
transformers.js + OpenAI behind an inference router, adapter-static PWA.

## Principles
1. **Items, not lessons.** `LearningItem` is the atomic unit; lessons are bundles.
2. **Five skills, tracked separately.** recognition · pronunciation · listening ·
   context · recall — each has its own SM-2 schedule; recall/context unlock later.
3. **Reading-first.** pinyin tone marks, kana, vowelled (niqqud) Hebrew + RTL.
4. **Human-in-the-loop AI.** Workbench generates *drafts*; user approves to publish.
5. **Local-first.** All state in IndexedDB. svelte-check must be 0/0.

## Architecture
- One Automerge doc (`schemaVersion` 1) persisted to IndexedDB via idb-keyval.
  Collections: `learningItems`, `lessons`, `srsStates` (keyed by itemId),
  `exerciseAttempts`, `pronunciationAttempts`, `contentDrafts`, `settings`.
- Persistence pattern (from kurumi): `Automerge.change` → `docStore.set` →
  fire-and-forget `saveDoc`. **Automerge rejects `undefined`** — all inserts go
  through `stripUndefined()`.
- Audio blobs (synthesized + recordings) live in a separate raw-IDB blob store.

## Project structure
```
src/lib/
  db/         types.ts · store.ts (doc + CRUD + SRS ops) · blob-store.ts · seed.ts
  srs/        schedule.ts (SM-2 gradeDimension) · queue.ts (buildQueue, unlock rules)
  exercises/  templates.ts (Exercise shape) · generate.ts (buildExercise + distractors)
  inference/  types.ts · router.ts · local-models.ts · providers/{tts-local,openai}.ts
  audio.ts    synthesize → blob cache → play
  components/ ScriptText · AudioButton · Recorder · ExerciseRunner
src/routes/   / · review · items[/[id]] · lessons · dashboard · workbench · settings
```

## Key modules
- `srs/schedule.ts` — `gradeDimension(state, quality 0-5)` SM-2; <3 is a lapse.
- `srs/queue.ts` — `buildQueue` (new items gated by `newPerDay`, reviews by `reviewCap`);
  `isUnlocked` gates context behind 1 recognition rep, recall behind 2.
- `exercises/generate.ts` — `buildExercise(item, dimension, pool, {audio, rng})`;
  distractors prefer same kind/level/tags. `rng` injectable for deterministic tests.
- `inference/router.ts` — TTS is local-first (MMS) then OpenAI; generation is OpenAI-only.
- `db/store.ts` — `gradeItem`, `recordPronunciationAttempt`, `approveDraft`, derived
  stores (`activeItems`, `reviewSummary`, `skillMemories`, …), `snapshotQueue()` for a
  stable per-session review order.

## Conventions
- Svelte 5 runes (`$state`, `$derived`, `$props`, `$effect`). SPA: `ssr=false` in
  root `+layout.ts`; dynamic routes use the 404.html fallback.
- Script text always rendered via `ScriptText` (sets `dir`/`lang` — RTL for Hebrew).
- Optional fields (`transliteration`, `audioRef`) may be absent; never write `undefined`.

## Development
```
mise run dev | build | test
npx svelte-check   # 0/0 invariant (CI gate)
```
Vitest covers SRS scheduling, queue building, and exercise generation. There is no
in-repo browser test; smoke-test by driving the dev server with a headless browser.

## Deferred (future milestones)
Git sync (isomorphic-git markdown round-trip), Hebrew vowel-hiding toggle +
diacritization, ASR-based pronunciation scoring, lesson-scoped review.
