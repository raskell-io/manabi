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
listening    — hear it, identify it
context      — understand it in a sentence (cloze)
recall       — produce it from the meaning
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

## The queue — `buildQueue(doc, settings, onIso?)`

Produces a `QueueSummary { dueReviews, newItems, tasks }` for the **active language**.
A task is `{ itemId, dimension, isNew }`. The algorithm:

1. Take all **published** items in the active language.
2. For each item with no SRS state (or recognition not yet introduced) → it is a
   **new item** candidate.
3. For each in-progress item, emit a review task for every dimension that is **unlocked**
   *and* **due** (`nextReview <= today`).
4. Sort review tasks **most-overdue first**.
5. Cap reviews at `settings.reviewCap`.
6. Introduce up to `settings.newPerDay` brand-new items, each via its `recognition` skill.
7. Order the session **new items first, then reviews** (start by learning, then reinforce).

`reviewSummary` (a derived store) and `queueCounts` give the home screen its counts without
building the full task list.

## The review screen — `/review`

[`src/routes/review/+page.svelte`](../src/routes/review/+page.svelte) wraps the queue in a
**mode picker**:

| Mode | What it serves | Driven by |
| --- | --- | --- |
| Reading | recognition, recall, context (text-only) | the **SRS queue** (`snapshotQueue()`) — due-scheduled, unlock-gated |
| Listening | listening (hear → choose) | **every active word that has a clip** — no unlock, no due gating |
| Speaking | pronunciation (record & compare) | **every active word that has a clip** — no unlock, no due gating |
| Everything | all of the above | Reading queue + the audio practice pools |

**Reading** is the spaced-repetition core: it filters `snapshotQueue().tasks` (so it honors
the [unlock rules](#unlock-rules--isunlockeddim-srs) and due dates). **Listening and
Speaking** are deliberately *not* gated — they are simple practice over `audioPool` (active
items whose `target` is in the audio manifest, via `hasPrerecorded`), un-introduced words
first. This keeps them from mysteriously showing "0 cards" just because a word has not been
reviewed for recognition yet. Grading still advances each skill's SM-2 state, so progress
and the dashboard stay accurate. The page loads the active language's manifest on mount
([audio](./audio.md)).

## Exercises

[`exercises/templates.ts`](../src/lib/exercises/templates.ts) defines the exercise shapes
and which dimension each trains (`EXERCISE_DIMENSION`).
[`exercises/generate.ts`](../src/lib/exercises/generate.ts) builds a runnable exercise:

```ts
buildExercise(item, dimension, pool, { audio, rng })
```

- **MCQ** exercises (recognition, listening, recall) pick the correct answer plus
  distractors from `pool` — preferring items of the **same kind / level / tags / language**
  so wrong options are plausible, not random.
  - The **listening** drill (`audio-to-word`) hides the reading on each option (so the
    answer is decided by ear, not read), and reveals the word's reading + translation after
    you answer, to confirm what you heard.
- **Cloze** (context) blanks the target inside one of its example sentences; after you
  answer, it reveals the full sentence with the answer filled in and highlighted, plus the
  sentence's reading/transliteration.
- **Record-and-compare** (pronunciation) plays the native clip and records you; you
  self-rate `bad | okay | good`.
- `rng` is injectable, so distractor selection is deterministic in tests.

`ExerciseRunner.svelte` renders whatever `buildExercise` returns and reports a
`CompleteResult` back to the page, which calls `gradeItem` (MCQ/cloze) or
`recordPronunciationAttempt` (speaking).

**Audio feedback.** On mount, the runner auto-plays the word when it is on screen and
won't give the answer away (the recognition `script` prompt and listening `audio` prompt;
not recall/cloze/record-compare); recognition cards also get a replay button. Answering an
MCQ plays a short synthesized chime — a bright rising triad for correct, a soft descending
tone for wrong — from [`$lib/sounds.ts`](../src/lib/sounds.ts) (Web Audio, no asset files,
tweakable by editing the notes).

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
