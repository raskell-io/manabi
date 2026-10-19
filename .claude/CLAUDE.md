# Manabi (学び)

A local-first, reading-first language learning PWA for Chinese (zh), Japanese (ja),
Korean (ko), and Hebrew (he). Trains reading and speaking. Handwriting exists only as optional
practice (stroke-order animation + tracing on the drawing pad) and is **never an SRS skill**. Same
stack as kurumi: SvelteKit 2 + Svelte 5 runes, Tailwind 4, Automerge over IndexedDB,
transformers.js + OpenAI behind an inference router, adapter-static PWA.

## Principles
1. **Items, not lessons.** `LearningItem` is the atomic unit; lessons are bundles.
2. **Five skills, tracked separately.** recognition · pronunciation · listening ·
   context · recall — each has its own SM-2 schedule; recall/context unlock later.
3. **Reading-first.** pinyin tone marks, kana, Hangul + Revised Romanization, vowelled
   (niqqud) Hebrew + RTL. Adding a language = `Language` + `LANGUAGES` in types.ts, then
   every `Record<Language, …>` (seed, scripts, reading guide, gen-audio VOICE; an MMS voice in tts-local.ts only if an ONNX port exists).
4. **Human-in-the-loop AI.** Workbench generates *drafts*; user approves to publish.
5. **Local-first.** All state in IndexedDB. svelte-check must be 0/0.

## Architecture
- One Automerge doc (`schemaVersion` 1) persisted to IndexedDB via idb-keyval.
  Collections: `learningItems`, `lessons`, `srsStates` (keyed by itemId),
  `exerciseAttempts`, `pronunciationAttempts`, `contentDrafts`, `settings`,
  optional `passageReads` (passage id → first read to the end; unioned on merge).
- Persistence pattern (from kurumi): `Automerge.change` → `docStore.set` →
  fire-and-forget `saveDoc`; a page-hide stash in localStorage covers a write still
  in flight (merged back by `initDB` — same history, so `Automerge.merge` is safe
  there). **Automerge rejects `undefined`** — all inserts go through `stripUndefined()`.
- Audio blobs (synthesized + recordings) live in a separate raw-IDB blob store.
- Backup: `exportBackup()` = history-free Automerge snapshot (API key blanked);
  `importBackup()` merges **semantically** via `db/merge.ts` (union by id, newest
  wins, never deletes). Raw `Automerge.merge` is unsafe here — devices don't share
  a root change, so root maps would conflict and one side would be dropped.

## Project structure
```
src/lib/
  db/         types.ts · store.ts (doc + CRUD + SRS ops) · merge.ts (backup merge) · blob-store.ts · seed.ts
  srs/        schedule.ts (SM-2 gradeDimension) · queue.ts (buildQueue, unlock rules) · scope.ts (?lesson= / ?items= review scopes) · practice.ts (capped, need-ranked Listening/Speaking)
  exercises/  templates.ts (Exercise shape) · generate.ts (buildExercise + distractors)
  inference/  types.ts · router.ts · local-models.ts · providers/{tts-local,openai}.ts
  audio.ts    synthesize → blob cache → play
  sync.ts     GitHub Contents-API sync of the backup snapshot (runSync pure over SyncIO); with settings.syncMarkdown also content/<lang>/{items,passages}.md (content-md.ts: render/parse, per-section hash → only hand-edited sections apply back, never deletes)
  strokes.ts  drawing-pad data: bundled static/strokes/{zh,ja}/<hex>.json (strokes-index.ts) else pinned jsDelivr CDN
  chinese.ts  Chinese script option (settings.zhScript: Simplified · Traditional TW/HK): content stays Simplified, display converts via lazily loaded opencc-js (`toZhScript`, `scriptLangTag`; awaited at boot); an item's own `zhVariants` (Taiwan / HK form, Taiwan reading) win over conversion; readings via the `$readingOf(reading, target, language)` store (pinyin or Zhuyin, zhuyin.ts); `$rubyOf` puts syllables above characters (settings.zhRuby; ScriptText / TapText `reading` prop)
  radicals.ts 214 Kangxi radicals + radicalOf / radicalMembers / searchRadicals over generated radicals-data.ts
  roots.ts    Hebrew roots: rootOfWord / searchRoots / splitByRoot (highlight) over hand-curated roots-data.ts
  path.ts     learning paths: per language a Beginner and a Refresher path (pathsFor), each ordered stages (script · words · reading · skills · explore) over existing content; progress derived (pathState / stageProgress), never stored; the pick lives in settings.pathChoice (else suggestedPath)
  dictionary.ts tap-a-word lookup: lookup.ts (longest match zh/ja + deinflect-ja.ts; ko particles/endings + form map; he prefixes + form map) over static/dict shards (dict-shard.ts layout, built by tools/gen-dict.mjs from CC-CEDICT / JMdict / Wiktionary; CC BY-SA, see static/dict/LICENSE.md), fetched lazily + SW-cached
  own-text.ts "Read your own text": splitSentences, offline readings (pinyin / kana / romanizeHangul), AI readings + translations via router `annotate`
  names.ts    place & people names per language (countries · home · world · family · given) over hand-curated names-data.ts
  components/ TapText (tappable words → LookupSheet) · PathStrip (Home's path glimpse) · HowItWorks · ScriptText · AudioButton · Recorder · ExerciseRunner · StrokePad (Hanzi Writer: Watch/Trace) · GlyphSheet · Mascot (Nabi 나비, the animated SVG butterfly; moods happy/cheer/sad/think/sleep; `still` for the nav logo — one animated Nabi per screen) · Confetti
src/routes/   / · path · review[?lesson=id | ?items=ids&title=…][&mode=…] · read[/new | /[id]] · library (hub) · scripts · radicals[?r=n] · roots[?r=id] · names[?tab=people] · vocab · items[/[id]] · lessons · dashboard · workbench · settings
  nav.ts      PRIMARY (5 tabs: Home Review Read Library Progress) + LIBRARY; drives the phone tab bar, sidebar and hub
  ui.ts       `immersive` store — a running review session hides the phone bars (focus mode)
  srs/stats.ts reviewForecast (due skill reviews per coming day) · activityCalendar (answers per day, Monday-first weeks) → dashboard ReviewForecast / ActivityCalendar
  reminder.ts daily practice reminder as a repeating .ics event (no server for push)
  today.ts    pickNextSession (Home's Continue card: reading → listening → speaking → library) · formatDuration
  haptics.ts  tapCorrect / tapWrong (navigator.vibrate; Android only, iOS ignores)
  install.ts  PWA install hint: captured beforeinstallprompt (Chromium) or iOS Share-sheet steps; Home only, ≥5 attempts, dismiss once
```

## Key modules
- `srs/schedule.ts` — `gradeDimension(state, quality 0-5)` SM-2; <3 is a lapse.
- `srs/queue.ts` — `buildQueue` (new items gated by `newPerDay` minus those with
  `recognition.introducedOn === today`, reviews by `reviewCap`;
  `{ scope }` = a lesson's item-id set → scope order, both caps lifted);
  `isUnlocked` gates context behind 1 recognition rep, recall behind 2.
- `exercises/generate.ts` — `buildExercise(item, dimension, pool, {audio, typed, rng})`;
  distractors prefer same kind/level/tags. `rng` injectable for deterministic tests.
  Recall is a typing card when `settings.typedRecall` (checked by `exercises/answer.ts`:
  script or romanized, pinyin tones, "close" for a slip); listening is a dictation
  (rebuild a 2–8 word example from tiles) about half the time when one exists.
- `inference/router.ts` — TTS is local-first (MMS, Korean only) then OpenAI; transcription
  is OpenAI first, then on-device Whisper (`providers/asr-local.ts`, opt-in `settings.localAsr`,
  WASM; int8 decoders fail in onnxruntime-web, so base = q8 encoder + fp16 decoder; Chinese
  normalized to Simplified; `asr-text.ts` drops hallucinated stock phrases) —
  `lib/pronunciation.ts` scores it and the learner confirms. Generation, line annotation and
  Hebrew diacritization (`lib/hebrew.ts` — accepts a result only if the letters are unchanged)
  are OpenAI-only.
- `db/store.ts` — `gradeItem`, `recordPronunciationAttempt`, `approveDraft`, derived
  stores (`activeItems`, `reviewSummary`, `lessonCounts`, `skillMemories`, …),
  `snapshotQueue(scope?)` for a stable per-session review order.

## Conventions
- Svelte 5 runes (`$state`, `$derived`, `$props`, `$effect`). SPA: `ssr=false` in
  root `+layout.ts`; dynamic routes use the 404.html fallback.
- Look & feel: white light theme is the default (`theme: 'light'`), deep-indigo dark theme; all colours are
  CSS vars in `app.css` (+ `--color-pink/sun/sky`, `--edge`). Chunky 3D controls via the global `.btn3d`
  (`.success/.danger/.ghost`) — 2px borders, 4px bottom edge. Font: Nunito (self-hosted via @fontsource).
  Don't name scoped classes after Tailwind utilities (`ring`, `shadow`, …) — Tailwind generates them.
- Script text always rendered via `ScriptText` (sets `dir`/`lang` — RTL for Hebrew; converts Chinese
  to the chosen script). Chinese rendered by hand must go through `displayText(…, $toZhScript)`, and readings
  through `$readingOf(reading, target, language)`.
- Optional fields (`transliteration`, `audioRef`) may be absent; never write `undefined`.
- In `.svelte` `<script lang="ts">`, never declare optional *function parameters*
  (`function f(x?: T)`): the compiler strips the type but leaves the `?`, so the browser
  gets a syntax error that svelte-check does not catch. Use `x: T | undefined`.

## Development
```
mise run dev | build | test
npx svelte-check   # 0/0 invariant (CI gate)
```
Vitest covers SRS scheduling, queue building, and exercise generation (`src/**/*.test.ts`).
Browser tests live in `e2e/` (Playwright, desktop + phone projects, against `vite preview` of
the build; every test fails on a page or console error): `npm run test:e2e`, or
`npx playwright test` with a build in place. CI runs both.

## Deferred (future milestones)
Lessons in the Markdown round-trip (items and passages ship; isomorphic-git is out because
GitHub's git-over-HTTP has no CORS); an on-device model for
Hebrew diacritization (OpenAI-only today); WebGPU for on-device Whisper (WASM only so far).
