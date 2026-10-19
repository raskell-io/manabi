# Data model & storage

All of Manabi's user state is a single **Automerge CRDT document** persisted to IndexedDB.
This doc describes every entity, how persistence works, how migrations and seeding work,
and the gotchas that keep it correct.

Source of truth: [`src/lib/db/types.ts`](../src/lib/db/types.ts) (shapes) and
[`src/lib/db/store.ts`](../src/lib/db/store.ts) (all reads/writes).

## The document

`SCHEMA_VERSION = 13` (see [the history](#schema-history)). The document is a set of keyed maps (objects keyed by id) plus
settings:

```ts
interface ManabiDocument {
  schemaVersion: number;
  learningItems:        Record<string, LearningItem>;
  lessons:              Record<string, Lesson>;
  passages:             Record<string, Passage>;
  srsStates:            Record<string, SkillMemory>;        // keyed by itemId
  exerciseAttempts:     Record<string, ExerciseAttempt>;
  pronunciationAttempts:Record<string, PronunciationAttempt>;
  contentDrafts:        Record<string, ContentDraft>;       // AI vocab drafts
  passageDrafts:        Record<string, PassageDraft>;        // AI reading drafts
  seededIds:            Record<string, boolean>;             // which seeds were applied
  passageReads?:        Record<string, number>;              // passage id → first read to the end (ms)
  xpSessions?:          Record<string, XpSession>;           // points per finished review session
  settings:             ManabiSettings;
}
```

Keyed maps (not arrays) are used everywhere because CRDT merges of independent
insert/update/delete by id are clean and order-independent.

### What is NOT in the document

To keep the doc small and fast, the large data sets live outside it and are fetched on
demand:

- **Audio** (`static/audio/packs/*.webm` + manifests) — see [audio](./audio.md).
- **Vocabulary lists** (`static/wordlists/*.json`) — see [content](./content.md).
- **Dictionaries** (`static/dict/<lang>/<bucket>.json`) — see
  [content](./content.md#dictionaries--toolsgen-dictmjs).
- **Traditional Chinese** — never stored: Chinese text is stored Simplified and converted for
  display ([below](#chinese-script-and-readings)). (Cantonese is the exception: `yue` text is
  stored in Hong Kong Traditional as written.)
- **Script tables** (`src/lib/scripts-data.ts`) — generated reference data.

Only when you *start studying* a word/glyph does a `LearningItem` get created in the doc.

## Entities

### LearningItem — the atomic unit

```ts
interface LearningItem {
  id: string;
  language: 'zh' | 'yue' | 'ja' | 'ko' | 'he';
  kind: 'word' | 'phrase' | 'sentence' | 'grammar' | 'character';
  target: string;          // the script: 今天 / 多謝 / 食べる / שָׁלוֹם
  reading: string;         // pinyin / Jyutping / kana / vowelled Hebrew
  transliteration?: string;// optional latin form (esp. Hebrew)
  meaning: string;         // English gloss
  tags: string[];          // ['time','HSK1','A1'] — HSK/JLPT/CEFR are metadata, not structure
  level: string;           // 'A1' | 'HSK1' | 'N4' ...
  examples: ExampleSentence[];
  audioRef?: string;       // blob ref of a (device-cached) synthesized clip
  zhVariants?: ZhVariants; // Chinese only: the item's own Taiwan / Hong Kong form + Taiwan reading
  status: 'published' | 'draft';
  createdAt: number; updatedAt: number;
}
```

Levels and exam tiers (HSK/JLPT/CEFR) are **tags/metadata**, not a hierarchy — items are
the unit, lessons are optional bundles. An `ExampleSentence` has the same
`target`/`reading`/`transliteration`/`meaning` shape plus an optional `audioRef`.

`zhVariants` (`{ tw?, hk?, twReading? }`, type in [`chinese.ts`](../src/lib/chinese.ts)) is for
the cases character conversion cannot handle: a character with several Traditional forms on
its own (干 → 乾 / 幹), or Taiwan vocabulary and readings (网络 → 網路 *wǎnglù*). It is edited on
the item page and round-trips through the sync Markdown (`- tw` / `- hk` / `- twreading`).
Seed words that need it are listed in `SEED_ZH_VARIANTS` ([`seed.ts`](../src/lib/db/seed.ts)).

### Passage — graded reading material

```ts
interface Passage {
  id; language; kind: 'conversation' | 'text';
  title; level; tags; intro?;
  lines: PassageLine[];     // speaker-tagged, each with target/reading/meaning
  createdAt; updatedAt;
}
```

Powers the `/read` screen. A line can be **mined** into a `sentence` `LearningItem`.
"Read your own text" (`/read/new`) creates a passage with `kind: 'text'`, `level: 'Your text'`
and the tag `mine`; its lines have dictionary readings and, without AI, an empty `meaning`
(such lines cannot be mined). `passageReads[id]` records when a passage was first read to the
end (it drives the learning path).

### SkillMemory + DimState — the SRS state

`srsStates[itemId]` holds one `SkillMemory`, which holds a `DimState` per skill:

```ts
interface SkillMemory { itemId; dims: Record<Dimension, DimState>; createdAt; updatedAt; }

interface DimState {
  interval: number;        // days until next review
  ease: number;            // SM-2 easiness factor (default 2.5, floor 1.3)
  repetitions: number;     // successful reviews in a row
  nextReview: string;      // ISO YYYY-MM-DD
  lastReviewed: string | null;
  lapses: number;          // total times forgotten
  introduced: boolean;     // has this skill been studied at all?
  introducedOn?: string;   // ISO date it was first studied — counts against newPerDay
}
```

The five `Dimension`s are `recognition | pronunciation | listening | recall | context`.
See [SRS](./srs.md) for how these advance.

### Attempts, lessons, drafts

- `ExerciseAttempt` — one logged answer (item, dimension, exercise type, correct, quality,
  chosen vs expected, timestamp). `exerciseType` is one of `word-to-meaning`,
  `word-to-reading`, `reading-to-word`, `audio-to-word`, `cloze`, `meaning-to-word`,
  `type-recall`, `dictation`, `record-compare` (see [SRS → exercises](./srs.md#exercises)).
- `PronunciationAttempt` — a recording ref + a `bad | okay | good` self-rating, plus the
  optional `transcript` and 0–100 `score` from speech recognition.
- `Lesson` — `{ title, language, itemIds[] }`, a named bundle.
- `XpSession` — `{ at, xp, language }`: the points of one finished review session (10 per right
  answer, +5 while on a run of three or more), written by `recordXp` when the summary appears.
  Keyed by a random id in the optional `xpSessions` map; `xpSummary` in
  [`srs/stats.ts`](../src/lib/srs/stats.ts) totals them (all time, today, last 7 days) for the
  session summary and Progress.
- `ContentDraft` / `PassageDraft` — AI-generated candidates awaiting approval; see
  [AI workbench](./ai-workbench.md).

### Settings

```ts
interface ManabiSettings {
  activeLanguage; newPerDay; reviewCap;
  openaiApiKey; openaiModel;          // AI features; key stays on-device
  githubSyncRepo; githubSyncToken;    // GitHub sync ('' = off); token stays on-device
  syncAuto;                           // sync on start, after a session, when back online
  syncMarkdown;                       // also keep items + passages as Markdown in the repo
  localTtsEnabled;                    // on-device TTS (Korean MMS only)
  asrScoring;                         // score recordings with speech recognition
  localAsr; localAsrModel;            // on-device Whisper (opt-in), 'base' | 'small'
  hideHebrewVowels;
  zhScript;                           // 'simplified' | 'traditional-tw' | 'traditional-hk'
  zhReading;                          // 'pinyin' | 'zhuyin'
  zhRuby;                             // Chinese / Cantonese: reading above each character
  gradeButtons; typedRecall;
  theme: 'system' | 'light' | 'dark';
  reminderTime;                       // 'HH:MM' for the daily calendar reminder
  pathChoice;                         // learning path picked per language
}
```

Defaults (`defaultSettings()`): `newPerDay: 5`, `reviewCap: 40`, `openaiModel: 'gpt-4o'`,
`activeLanguage: 'zh'`, `syncAuto` and `syncMarkdown` on, `localTtsEnabled` and `asrScoring`
on, `localAsr` off with `localAsrModel: 'base'`, `zhScript: 'simplified'`,
`zhReading: 'pinyin'`, `zhRuby` off, `gradeButtons` and `typedRecall` on, `theme: 'light'`,
`reminderTime: '19:00'`, `pathChoice: {}`.

### Chinese script and readings

Chinese `target`s and examples are always stored **Simplified** and readings as tone-marked
**pinyin**; `zhScript`, `zhReading` and `zhRuby` only change the display, so SRS progress,
audio (keyed by the Simplified text) and seeds are shared whichever script is read.
[`chinese.ts`](../src/lib/chinese.ts) holds this state outside the document as Svelte stores,
fed by the root layout from settings and items:

- `$toZhScript` — Simplified → the rendered script via opencc-js (`cn2t`, phrase-level, loaded
  lazily and awaited at boot so there is no flash of Simplified); an item's own `zhVariants`
  form wins over conversion. Characters only, never vocabulary.
- `$readingOf(reading, target, language)` — the Taiwan reading when reading Taiwan
  Traditional, as Zhuyin when picked ([`zhuyin.ts`](../src/lib/zhuyin.ts)); non-hanzi targets
  (the bopomofo chart, the tone drill) keep their pinyin.
- `$rubyOf(text, reading, language)` — one syllable per hanzi for ruby above the characters when
  `zhRuby` is on and the syllables line up (`readingSyllables` / `rubySegments`), else `null`.
  For Cantonese it draws the Jyutping as is (`jyutpingRuby` in
  [`cantonese.ts`](../src/lib/cantonese.ts)); other languages get `null`.
  `ScriptText` and `TapText` take a `reading` prop for this.

Cantonese (`yue`) sits outside the script options: it is stored in **Hong Kong Traditional** with
**Jyutping** readings (tone digits, one syllable per character), `displayText` leaves it alone,
and `scriptLangTag('yue')` is always `zh-Hant-HK`. Only `zhRuby` applies to it. See
[Cantonese](./cantonese.md).

## Persistence

`store.ts` owns one in-memory `Automerge.Doc<ManabiDocument>` and a Svelte
`writable` (`docStore`) wrapping it. The storage key is a single `idb-keyval` entry holding
`Automerge.save(doc)` (a `Uint8Array`).

Every mutation goes through one private helper:

```ts
function updateDoc(changeFn: (doc: ManabiDocument) => void): void {
  doc = Automerge.change(doc, changeFn);   // new immutable doc
  docStore.set(doc);                       // update reactive store synchronously
  void saveDoc();                          // fire-and-forget persist to IndexedDB
}
```

Persistence is **fire-and-forget**: the UI updates from the in-memory doc immediately;
the IndexedDB write happens in the background. This keeps interactions instant.

The one gap that leaves — a change made a moment before the tab closes or navigates, whose
write has not landed — is covered by a **page-hide stash**: `saveDoc` numbers its writes, and
on `pagehide` / `visibilitychange → hidden` with a write still in flight the whole document
is written to `localStorage` (`manabi-doc-pending`, synchronous). On the next `initDB` that
snapshot is `Automerge.merge`d into the stored document — safe because it shares the same
history (the opposite of the backup situation in [Backup & merge](#backup--merge)) — and
cleared once the merged document is saved.

### Derived stores

Reads are exposed as derived Svelte stores so components stay declarative:
`settings`, `activeLanguage`, `allItems`, `activeItems` (active language, published),
`lessons`, `passages`, `passageReads`, `pathData`, `contentDrafts`, `passageDrafts`,
`exerciseAttempts`, `pronunciationAttempts`, `practiceTimes` (every answer and recording, any
language — feeds the streak and the practice calendar), `xpSessions` (every banked session, any
language), `skillMemories`, `reviewSummary` (the
due counts), `languageCounts` and `lessonCounts`. `snapshotQueue()` returns a stable queue
for a review session.

### Store API (write side)

CRUD and domain operations all live in `store.ts`, e.g. `createItem`, `updateItem`,
`deleteItem`, `gradeItem`, `recordPronunciationAttempt`, `createLesson`, `createPassage`,
`deletePassage`, `markPassageRead`, `recordXp`, `studyScriptChar`, `studyVocabWord` (also used by the
dictionary sheet's **Add to reviews**), `addVocabWords` (bulk = one change), `studyPassageLine`
(sentence mining), the draft operations (`addDrafts`, `approveDraft`, …), and the sync
Markdown hooks `renderContentFile` / `applyContentFile` ([sync](./sync.md#markdown-round-trip)). Components
**never** call `Automerge.change` directly.

## The `undefined` gotcha

**Automerge throws on `undefined` values.** Several fields are optional
(`transliteration`, `audioRef`, `intro`). They must be *absent*, never set to `undefined`.

Every write into the document passes through `stripUndefined()`, which deeply removes
undefined-valued keys:

```ts
d.learningItems[id] = stripUndefined(item);
```

If you add a new store write, route it through `stripUndefined` for any object that may
carry optional fields. Forgetting this is the single most common runtime error.

## Backup & merge

`exportBackup()` (store) serializes a **history-free Automerge snapshot** of the current
state — `Automerge.save(Automerge.from(plain(doc)))` — with `settings.openaiApiKey`
blanked. Dropping the history keeps the file small and, more importantly, keeps the key
(and every value it ever had) out of it. The `.manabi` file is still an Automerge document,
so `Automerge.load` rejects anything that is not one.

`importBackup(bytes)` loads the file, checks its shape (`isManabiDocument`) and that its
`schemaVersion` is not newer than the app's, then merges it inside a single
`Automerge.change` via [`merge.ts`](../src/lib/db/merge.ts).

**Why not `Automerge.merge`?** Every device creates its own document with
`Automerge.from(createEmptyDocument())` — a random actor and its own root change. Two such
documents share no history, so merging them makes their root collections *conflicting
assignments*: one side's `learningItems` map wins and the other's is silently dropped.
The merge is therefore **semantic**, collection by collection:

| Collection | Rule when a record exists on both sides |
| --- | --- |
| `learningItems`, `passages` | newer `updatedAt` wins (only if the content differs, ignoring timestamps) |
| `srsStates` | per skill: later `lastReviewed` wins (then more repetitions); `lapses` = max |
| `lessons` | `itemIds` are unioned |
| `contentDrafts`, `passageDrafts` | a decision (approved / rejected) beats `pending` |
| `exerciseAttempts`, `pronunciationAttempts`, `seededIds` | union by id |
| `passageReads` | union; the earlier read time wins |
| `xpSessions` | union by id (a session's points never change), so totals add up across devices |
| `settings` | never touched |

An import **never deletes** anything, and merging the same file twice is a no-op
(`MergeSummary` reports zero changes). Records are copied with `plain()` (a JSON round-trip),
which both detaches them from the loaded document and strips `undefined`.

## Migrations

Migrations are **forward-only and idempotent**. On load, `migrate()` runs if the stored
`schemaVersion` is behind:

```ts
function migrate(d) {
  if ((d.schemaVersion ?? 0) < SCHEMA_VERSION) {
    return Automerge.change(d, (doc) => {
      if (!doc.settings) doc.settings = defaultSettings();
      if (!doc.seededIds) doc.seededIds = {};
      if (!doc.passages) doc.passages = {};
      if (!doc.passageDrafts) doc.passageDrafts = {};
      // Fill in any settings added since this document was created.
      for (const [k, v] of Object.entries(defaultSettings()))
        if (doc.settings[k] === undefined) doc.settings[k] = v;
      // Schema 12: seeded words get their Taiwan form / reading where it differs.
      for (const [id, v] of Object.entries(SEED_ZH_VARIANTS))
        if (doc.learningItems[id] && !doc.learningItems[id].zhVariants)
          doc.learningItems[id].zhVariants = { ...v };
      doc.schemaVersion = SCHEMA_VERSION;
    });
  }
  return d;
}
```

Because missing settings are filled from `defaultSettings()`, adding a setting needs only a
default and a version bump — no per-field migration line.

To add a collection or field in a new schema version: bump `SCHEMA_VERSION`, add the
"ensure it exists" line to `migrate()`, and update `createEmptyDocument()`. Never remove or
repurpose an existing field destructively — old documents in users' browsers still have it.

### Schema history

| Version | Added |
| --- | --- |
| 1–4 | initial collections, seed upsert (`seededIds`), passages, passage drafts |
| 5 | GitHub sync settings (`githubSyncRepo`, `githubSyncToken`, `syncAuto`) |
| 6 | `asrScoring`; `PronunciationAttempt.transcript` / `score` (ASR scoring, with Hebrew diacritization) |
| 7 | `zhScript` (Traditional Chinese display) |
| 8 | `zhReading` (Zhuyin) |
| 9 | `typedRecall` (typed recall; `type-recall` / `dictation` exercise types) |
| 10 | `localAsr`, `localAsrModel` (on-device Whisper) |
| 11 | `syncMarkdown` (Markdown round-trip) |
| 12 | `zhRuby`; `LearningItem.zhVariants`, backfilled for seed words from `SEED_ZH_VARIANTS` |
| 13 | `reminderTime` (daily reminder) |

(`passageReads`, `xpSessions` and `pathChoice` arrived without a bump: the collections are optional
and the setting is filled from the defaults on the next migration. Adding Cantonese needed no bump
either: `yue` is just a new `Language` value.)

A backup or sync snapshot whose `schemaVersion` is newer than the app's is refused with a
message to update first.

## Seeding (the upsert mechanism)

A small set of hand-verified items and passages ships in [`seed.ts`](../src/lib/db/seed.ts).
On every boot, `applyNewSeeds()` adds any seed whose id is **not** already in `seededIds`:

```ts
for (const it of seedsToApply(doc.seededIds)) {
  if (!d.learningItems[it.id]) d.learningItems[it.id] = stripUndefined(it);
  d.seededIds[it.id] = true;   // mark applied, even if the user later deletes it
}
```

This means:

- New releases' seed content reaches **existing** users without duplicating.
- A seed you delete does **not** come back (its id stays in `seededIds`).
- Seed ids are stable (`seed-<lang>-<slug>`, `pass-<lang>-<slug>`) and **append-only** —
  never change an existing id, only add new ones.

See [content](./content.md#built-in-seed) for how to write seed content.

## The blob store

Audio *recordings* (your pronunciation attempts) and any device-side synthesized clips are
binary blobs, which do not belong in the CRDT document. They live in a separate raw-IndexedDB
store, [`blob-store.ts`](../src/lib/db/blob-store.ts): `storeBlob` returns a `blob:` ref,
`getBlobUrl`/`hasBlob` resolve it. Items reference blobs by `audioRef`. Prerecorded native
audio does **not** use the blob store — it streams from the static packs ([audio](./audio.md)).
