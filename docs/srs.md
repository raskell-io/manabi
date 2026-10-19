# SRS & review loop

Manabi's spaced repetition is **multi-dimensional**: every item carries five independent
SM-2 schedules, one per skill. This doc covers the scheduler, the due-queue builder, the
unlock rules, and exercise generation.

Source: [`src/lib/srs/schedule.ts`](../src/lib/srs/schedule.ts),
[`src/lib/srs/queue.ts`](../src/lib/srs/queue.ts),
[`src/lib/exercises/`](../src/lib/exercises/). All scheduler logic is **pure and unit-tested**
(`*.test.ts` next to each file).

## The five dimensions

```
recognition  — see the word, know the meaning           (the entry skill)
pronunciation— say it (record & self-compare)
listening    — hear it, identify it (or rebuild a heard sentence: dictation)
context      — understand it in a sentence (cloze)
recall       — produce it from the meaning (type it, or pick it)
```

Each is a separate `DimState` (interval, ease, repetitions, nextReview, lapses,
introduced). A word you recognize instantly might still be weak at recall, and the
scheduler treats those independently.

## The scheduler — `gradeDimension(prev, quality)`

A pure SM-2 step. Quality is `0–5`, surfaced in the UI as:

| Quality | UI | Meaning |
| --- | --- | --- |
| 0 | Again | total blackout |
| 3 | Hard | correct but hard |
| 4 | Good | correct |
| 5 | Easy | perfect |

`quality < 3` is a **lapse**. The algorithm:

```ts
if (q < 3) {                       // lapse: relearn
  repetitions = 0;
  interval = 1;                    // due tomorrow
  lapses += 1;
} else {
  repetitions += 1;
  interval = repetitions === 1 ? 1
           : repetitions === 2 ? 6
           : Math.round(prev.interval * prev.ease);
}
// ease moves on every grade, floored at MIN_EASE = 1.3:
ease = max(1.3, prev.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
nextReview = today + interval days;
introduced = true;
```

This is the classic SM-2 progression (1 day → 6 days → ×ease) with a 1.3 ease floor.
`isPass(q)` is `q >= 3`; `isDue(state, onIso)` is `nextReview <= onIso`. Dates are ISO
`YYYY-MM-DD` in local time, and the "today" argument is injectable so tests are
deterministic.

`gradeDimension` does **not** mutate its input — it returns the next state. The store's
`gradeItem(itemId, dimension, quality, …)` wraps it: it logs an `ExerciseAttempt` and writes
the new `DimState` back into `srsStates[itemId].dims[dimension]`.

## Unlock rules — `isUnlocked(dim, srs)`

New items do not dump all five skills on you at once. Dimensions unlock based on the
**recognition** dimension's progress:

| Dimension | Unlocks when |
| --- | --- |
| recognition | always (the entry point) |
| pronunciation | recognition has been introduced |
| listening | recognition has been introduced |
| context | recognition introduced **and** `repetitions >= 1` |
| recall | recognition introduced **and** `repetitions >= 2` |

So you first learn to recognize a word, then practice saying/hearing it, and only later are
you asked to use it in context or produce it from English. This mirrors how reading
fluency actually develops.

## The queue — `buildQueue(doc, settings, onIso?, opts?)`

Produces a `QueueSummary { dueReviews, newItems, tasks }` for the **active language**.
A task is `{ itemId, dimension, isNew }`. The algorithm:

1. Take all **published** items in the active language.
2. For each item with no SRS state (or recognition not yet introduced) → it is a
   **new item** candidate.
3. For each in-progress item, emit a review task for every dimension that is **unlocked**
   *and* **due** (`nextReview <= today`).
4. Sort review tasks **most-overdue first**.
5. Cap reviews at `settings.reviewCap`.
6. Introduce brand-new items, each via its `recognition` skill, up to `settings.newPerDay`
   **minus the items first studied today** (`DimState.introducedOn`, stamped by
   `gradeDimension` the first time a skill is graded) — so finishing today's batch does not
   immediately offer the next one.
7. Order the session **new items first, then reviews** (start by learning, then reinforce).

`reviewSummary` (a derived store) and `queueCounts` give the home screen its counts without
building the full task list.

### Scoped queues (lessons)

`opts.scope` (a `ReadonlySet` of item ids) restricts steps 1–7 to those items and keeps them
in the scope's order (so a lesson's new items come up in the order you arranged them).
Inside a scope the two caps — `reviewCap` and `newPerDay` — are **not applied**: a scope is
already a bounded, deliberately chosen set, so "review this lesson" means all of it.
Everything else (published-only, active-language, unlock rules, due dates) still holds.

In the store, `snapshotQueue(lesson?)` builds a scoped queue for a lesson (overriding
`settings.activeLanguage` with the lesson's language), and the `lessonCounts` derived store
gives the Lessons page its per-lesson `{ dueReviews, newItems, total }` badges.

## The review screen — `/review`

[`src/routes/review/+page.svelte`](../src/routes/review/+page.svelte) wraps the queue in a
**mode picker**:

| Mode | What it serves | Driven by |
| --- | --- | --- |
| Reading | recognition, recall, context (text-only) | the **SRS queue** (`snapshotQueue()`) — due-scheduled, unlock-gated |
| Listening | listening (hear → choose) | **every active word that has a clip** — no unlock, no due gating; capped + ranked by need |
| Speaking | pronunciation (record & compare) | **every active word that has a clip** — no unlock, no due gating; capped + ranked by need |
| Everything | all of the above | Reading queue + the audio practice pools |

**Reading** is the spaced-repetition core: it filters `snapshotQueue().tasks` (so it honors
the [unlock rules](#unlock-rules--isunlockeddim-srs) and due dates). **Listening and
Speaking** are deliberately *not* gated — they are practice over `audioPool` (active items
whose `target` is in the audio manifest, via `hasPrerecorded`). This keeps them from
mysteriously showing "0 cards" just because a word has not been reviewed for recognition
yet. Each session is still bounded and ordered by
[`srs/practice.ts`](../src/lib/srs/practice.ts) — `rankAudioPractice(items, dim, doc, cap)`:
never-practiced words first, then by *need* (Speaking: the latest speech-recognition score
when there is one; otherwise the skill's SM-2 ease mapped to 0–100), stalest first among
equals, capped at `reviewCap`; the picker shows "20 of 84 cards". Grading still advances each skill's SM-2 state, so progress
and the dashboard stay accurate. The page loads the active language's manifest on mount
([audio](./audio.md)).

**Scopes.** `/review?lesson=<id>` (a lesson card's **Review**) or
`/review?items=<id,…>&title=<label>` (**Drill these** on Progress, **Practice these** for
pronunciation, **Review these** on Items) restricts every mode to that set — resolved by
[`srs/scope.ts`](../src/lib/srs/scope.ts) (`resolveScope`, `scopeHref`, capped at 300 ids).
The Reading queue comes from `snapshotQueue(scope)` (caps lifted — see above) and the
Listening/Speaking pools are the scope's published items that have a clip. `&mode=speaking`
(or any mode) starts that mode immediately. A chip under the title names the scope and links
back to the whole-collection review; the query is read reactively, so switching never needs
a reload.

## Exercises

[`exercises/templates.ts`](../src/lib/exercises/templates.ts) defines the exercise shapes
and which dimension each trains (`EXERCISE_DIMENSION`).
[`exercises/generate.ts`](../src/lib/exercises/generate.ts) builds a runnable exercise:

```ts
buildExercise(item, dimension, pool, { audio, typed, rng })
```

`exerciseTypeFor(dimension, audio, typed)` picks the signature drill per dimension; the review
page sets `audio` for listening and pronunciation tasks, and `typed` is `settings.typedRecall`:

| Dimension | Exercise type | Fallback / variant |
| --- | --- | --- |
| recognition | `word-to-meaning` | — |
| pronunciation | `record-compare` | `word-to-reading` without audio |
| listening | `audio-to-word` | `dictation` about half the time when a short example exists; `reading-to-word` without audio |
| context | `cloze` | `meaning-to-word` when the item has no example |
| recall | `type-recall` (typed on) | `meaning-to-word` (typed off) |

- **MCQ** exercises (recognition, listening, recall) pick the correct answer plus
  distractors from `pool` — preferring items of the **same kind / level / tags / language**
  so wrong options are plausible, not random.
  - The **listening** drill (`audio-to-word`) hides the reading on each option (so the
    answer is decided by ear, not read), and reveals the word's reading + translation after
    you answer, to confirm what you heard.
- **Cloze** (context) blanks the target inside one of its example sentences; after you
  answer, the blank is **filled in place** (answer highlighted) with the sentence's
  reading/transliteration beneath it, the full sentence's clip **auto-plays** (the seed
  example sentences are prerecorded), and a replay button is shown.
- **Typed recall** (`type-recall`) shows the meaning and asks you to type the word, checked
  by [`exercises/answer.ts`](../src/lib/exercises/answer.ts) (`checkTyped`) — see
  [below](#typed-recall).
- **Dictation** (`dictation`, listening) plays one of the item's example sentences of 2–8
  words (split with `Intl.Segmenter`, punctuation dropped) and you rebuild it from shuffled
  word tiles; it is checked once every tile is placed, and the sentence, its reading and
  translation are then revealed and the sentence replays. `pickDictation` chooses it about
  half the time (via `rng`) when such an example exists.
- **Record-and-compare** (pronunciation) plays the native clip and records you; you
  self-rate `bad | okay | good`.
- `rng` is injectable, so distractor selection is deterministic in tests.

`ExerciseRunner.svelte` renders whatever `buildExercise` returns and reports a
`CompleteResult` back to the page, which calls `gradeItem` (MCQ/cloze) or
`recordPronunciationAttempt` (speaking).

### Typed recall

With `settings.typedRecall` on (the default), recall cards are typing cards. The learner may
type the word in its own script or romanized:

| Language | Accepted |
| --- | --- |
| zh | hanzi (Simplified, or the displayed Traditional form, passed as `alternatives`), or pinyin with tone marks or tone numbers (`mǎ` / `ma3`; `v` for ü) |
| ja | kanji / kana as written, the kana reading (katakana treated as hiragana), or romaji (the item's `transliteration`) |
| ko | Hangul or Revised Romanization |
| he | Hebrew with or without niqqud, or the `transliteration` |

`checkTyped` returns a `Verdict`: `exact`, `close` or `wrong`. **Close** counts as correct but
says "Almost!" and shows the answer: pinyin with the right letters but missing or wrong tones
("add the tones" / "check the tones"), or a small typo (Levenshtein distance 1 for 4–7
characters, 2 for 8+). **I don't know** reveals the answer and grades it as wrong.

**Audio feedback.** On mount, the runner auto-plays the word when it is on screen and
won't give the answer away (the recognition `script` prompt and listening `audio` prompt;
not recall/cloze/record-compare); recognition cards also get a replay button. Answering an
MCQ plays a short synthesized chime — a bright rising triad for correct, a soft descending
tone for wrong — from [`$lib/sounds.ts`](../src/lib/sounds.ts) (Web Audio, no asset files,
tweakable by editing the notes).

## Pronunciation scoring (ASR)

`record-compare` is self-rated (bad / okay / good → quality 1 / 3 / 5). When **Settings →
Pronunciation** (`asrScoring`) is on and a transcriber is available — an OpenAI key, or
on-device recognition (`localAsr`) — the `Recorder` also sends the take to the router's
`transcribe` task and scores the transcript with
[`scorePronunciation`](../src/lib/pronunciation.ts): both strings are normalized (NFKC,
lowercase, no spaces/punctuation, niqqud stripped, katakana → hiragana) and compared by
Levenshtein similarity against the item's `target` — and, for Japanese, also its kana
`reading`, since recognition may return 食べる or たべる for the same word. The result is shown
as "Heard … · N% match" with a **suggested** rating (≥85 good, ≥60 okay, else bad) highlighted;
the learner confirms or overrides, so recognition mistakes never grade silently. The
transcript and score are stored on the `PronunciationAttempt`.

For Chinese, transcript and word are both converted to the **displayed** script before
comparing (`displayText(…, $toZhScript)`), so a transcript in either script scores the same.
Known limit: Japanese homophone kanji can lower a correct take's score — the transcript is
shown precisely so the learner can judge.

### Who transcribes

The router tries **OpenAI first** (more accurate), then **on-device Whisper** when it is
switched on — so Whisper covers no key, offline, or a failed call
([AI workbench → router](./ai-workbench.md#other-router-tasks-hebrew-diacritization-annotation--transcription)).

On-device recognition ([`providers/asr-local.ts`](../src/lib/inference/providers/asr-local.ts))
runs transformers.js `automatic-speech-recognition` in **WASM** with
`onnx-community/whisper-base` (≈ 130 MB, ~3 s per take) or `whisper-small` (≈ 300 MB, ~10 s;
`settings.localAsrModel`). The model downloads on first use (or via **Download now** in
Settings, with progress from `localModelStatus`) and is cached by transformers.js, so it then
works offline. Details that matter:

- **Weights.** onnxruntime-web's WASM backend rejects Whisper's int8 decoders ("Missing
  required scale"), so base uses a **q8 encoder + fp16 decoder** and small uses q4 / q4.
- The recording is decoded to 16 kHz mono; the language is always set; the token budget is
  scaled to the clip length (`maxTokensFor`, 8–96 tokens).
- [`asr-text.ts`](../src/lib/inference/asr-text.ts) `cleanTranscript` drops known
  hallucinated subtitle lines ("thanks for watching", 谢谢观看, ご視聴ありがとうございました…).
- Chinese output is normalized to Simplified (opencc-js `t2cn`).
- **Hebrew needs `small`**; with base, Hebrew recordings fail locally (and use OpenAI only).
- WebGPU is untested; WASM only so far.

## Extending the scheduler

- **Tune the algorithm** (intervals, ease floor, lapse behavior): edit `gradeDimension` and
  update `schedule.test.ts`. Keep it pure.
- **Change unlock pacing**: edit `isUnlocked` and `queue.test.ts`.
- **Add an exercise type**: add it to the `ExerciseType` union + `EXERCISE_DIMENSION` in
  `types.ts`, build it in `generate.ts`, render it in `ExerciseRunner.svelte`. See the
  recipe in [development](./development.md#recipe-add-an-exercise-type).
- **Add a dimension**: extend the `Dimension` union and `DIMENSIONS`, add it to
  `freshSkillMemory`, define its unlock rule, and add an exercise that trains it. This
  touches the data model, so think about migration for existing documents.
