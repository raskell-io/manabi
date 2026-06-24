# Data model & storage

All of Manabi's user state is a single **Automerge CRDT document** persisted to IndexedDB.
This doc describes every entity, how persistence works, how migrations and seeding work,
and the gotchas that keep it correct.

Source of truth: [`src/lib/db/types.ts`](../src/lib/db/types.ts) (shapes) and
[`src/lib/db/store.ts`](../src/lib/db/store.ts) (all reads/writes).

## The document

`SCHEMA_VERSION = 4`. The document is a set of keyed maps (objects keyed by id) plus
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
  settings:             ManabiSettings;
}
```

Keyed maps (not arrays) are used everywhere because CRDT merges of independent
insert/update/delete by id are clean and order-independent.

### What is NOT in the document

To keep the doc small and fast, three large data sets live outside it and are fetched on
demand:

- **Audio** (`static/audio/packs/*.webm` + manifests) — see [audio](./audio.md).
- **Vocabulary lists** (`static/wordlists/*.json`) — see [content](./content.md).
- **Script tables** (`src/lib/scripts-data.ts`) — generated reference data.

Only when you *start studying* a word/glyph does a `LearningItem` get created in the doc.

## Entities

### LearningItem — the atomic unit

```ts
interface LearningItem {
  id: string;
  language: 'zh' | 'ja' | 'he';
  kind: 'word' | 'phrase' | 'sentence' | 'grammar' | 'character';
  target: string;          // the script: 今天 / 食べる / שָׁלוֹם
  reading: string;         // pinyin / kana / vowelled Hebrew
  transliteration?: string;// optional latin form (esp. Hebrew)
  meaning: string;         // English gloss
  tags: string[];          // ['time','HSK1','A1'] — HSK/JLPT/CEFR are metadata, not structure
  level: string;           // 'A1' | 'HSK1' | 'N4' ...
  examples: ExampleSentence[];
  audioRef?: string;       // blob ref of a (device-cached) synthesized clip
  status: 'published' | 'draft';
  createdAt: number; updatedAt: number;
}
```

Levels and exam tiers (HSK/JLPT/CEFR) are **tags/metadata**, not a hierarchy — items are
the unit, lessons are optional bundles. An `ExampleSentence` has the same
`target`/`reading`/`transliteration`/`meaning` shape plus an optional `audioRef`.

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
}
```

The five `Dimension`s are `recognition | pronunciation | listening | recall | context`.
See [SRS](./srs.md) for how these advance.

### Attempts, lessons, drafts

- `ExerciseAttempt` — one logged answer (item, dimension, exercise type, correct, quality,
  chosen vs expected, timestamp).
- `PronunciationAttempt` — a recording ref + a `bad | okay | good` self-rating.
- `Lesson` — `{ title, language, itemIds[] }`, a named bundle.
- `ContentDraft` / `PassageDraft` — AI-generated candidates awaiting approval; see
  [AI workbench](./ai-workbench.md).

### Settings

```ts
interface ManabiSettings {
  activeLanguage; newPerDay; reviewCap;
  openaiApiKey; openaiModel;          // for the workbench; key stays on-device
  localTtsEnabled; hideHebrewVowels; gradeButtons;
  theme: 'system' | 'light' | 'dark';
}
```

Defaults: `newPerDay: 5`, `reviewCap: 40`, `openaiModel: 'gpt-4o'`, `activeLanguage: 'zh'`.

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

### Derived stores

Reads are exposed as derived Svelte stores so components stay declarative:
`settings`, `activeLanguage`, `allItems`, `activeItems` (active language, published),
`lessons`, `passages`, `contentDrafts`, `passageDrafts`, `exerciseAttempts`,
`skillMemories`, and `reviewSummary` (the due counts). `snapshotQueue()` returns a stable
queue for a review session.

### Store API (write side)

CRUD and domain operations all live in `store.ts`, e.g. `createItem`, `updateItem`,
`deleteItem`, `gradeItem`, `recordPronunciationAttempt`, `createLesson`, `createPassage`,
`studyScriptChar`, `studyVocabWord`, `addVocabWords` (bulk = one change), `studyPassageLine`
(sentence mining), and the draft operations (`addDrafts`, `approveDraft`, …). Components
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
      doc.schemaVersion = SCHEMA_VERSION;
    });
  }
  return d;
}
```

To add a collection or field in a new schema version: bump `SCHEMA_VERSION`, add the
"ensure it exists" line to `migrate()`, and update `createEmptyDocument()`. Never remove or
repurpose an existing field destructively — old documents in users' browsers still have it.

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
