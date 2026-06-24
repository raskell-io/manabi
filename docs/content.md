# Content pipeline

Manabi's learning content comes from three sources, in increasing size:

1. **Built-in seed** — a small, hand-verified set that ships in the app so it is usable
   immediately, offline, with no key.
2. **Generated reference data** — the full kana/kanji/hanzi tables (Scripts page) and the
   complete HSK/JLPT word lists (Vocab browser), produced by offline generators from open
   datasets.
3. **AI-generated drafts** — optional, created in the [workbench](./ai-workbench.md) and
   approved by you.

This doc covers the first two. Audio for all of it is covered in [audio](./audio.md).

## Built-in seed

[`src/lib/db/seed.ts`](../src/lib/db/seed.ts) defines a small leveled set tuned to the
target learner: Chinese A1→A2 (HSK 1–3), a Japanese B1 refresher (N4/N3 grammar), and
Hebrew A1 (alef-bet, numbers, phrases — vowelled). It also seeds natural reading passages
(modern conversations + short non-fiction) for `/read`.

Exports:

- `seedItems(now?)` / `seedPassages(now?)` — the full seed sets.
- `seedsToApply(seededIds)` / `passagesToApply(seededIds)` — only the seeds **not yet
  applied** to a given document, used by `applyNewSeeds()` on boot.

### Rules for editing the seed

- **Ids are stable and append-only.** Items use `seed-<lang>-<slug>`, passages
  `pass-<lang>-<slug>`. To add content, add new ids. **Never** change or reuse an existing
  id — the upsert tracks applied ids in `seededIds`, so a changed id reads as "new" and a
  reused id will not re-apply.
- A seed you ship and a user later deletes will **not** come back (its id is remembered).
- `kind` must be a valid `ItemKind` (`word | phrase | sentence | grammar | character`).
  Verbs are `word` with a `'verb'` tag, not a separate kind.
- Hebrew `target`/`reading` are **vowelled** (niqqud); provide a `transliteration`.
- Optional fields must be omitted, not `undefined` (the doc's
  [`stripUndefined`](./data-model.md#the-undefined-gotcha) handles writes, but keep seed
  literals clean).

See [data model → seeding](./data-model.md#seeding-the-upsert-mechanism) for the upsert
mechanics.

## Generated reference data

Two Node generators turn open datasets into the static content the Scripts and Vocab
screens read. They are **run manually** (they need network access) and their **output is
committed**. They are not part of the app build.

### Scripts tables — `tools/gen-scripts-data.mjs`

Generates [`src/lib/scripts-data.ts`](../src/lib/scripts-data.ts): the full JLPT **N5–N3**
kanji sets and HSK **1–3** hanzi sets, with readings, meanings, and pinyin.

```
node tools/gen-scripts-data.mjs
```

Sources (attribution is written into the file header and shown on the page):

- **Kanji** readings/meanings — KANJIDIC2 © EDRDG (CC BY-SA 4.0), via
  [`davidluzgouveia/kanji-data`](https://github.com/davidluzgouveia/kanji-data) (which adds
  Tanos JLPT levels).
- **Hanzi** word lists — HSK 3.0 from
  [`drkameleon/complete-hsk-vocabulary`](https://github.com/drkameleon/complete-hsk-vocabulary).
- **Hanzi** pinyin/definitions —
  [`skishore/makemeahanzi`](https://github.com/skishore/makemeahanzi) (Unihan-derived).

`scripts-data.ts` is **generated — do not hand-edit it**; rerun the generator. The kana
grids and Hebrew alef-bet are defined directly in
[`src/lib/scripts.ts`](../src/lib/scripts.ts), which also assembles the tabbed sections the
`/scripts` page renders (`scriptSections`, `sectionGlyphs`, `blockGlyphs`). Tapping a glyph
calls `studyScriptChar` → a `character` `LearningItem`.

### Vocabulary lists — `tools/gen-vocab-data.mjs`

Generates the Vocab browser data into `static/wordlists/` as per-level JSON plus an
`index.json`:

```
node tools/gen-vocab-data.mjs
```

- **Chinese** — full HSK 3.0: levels 1–6 plus the 7–9 band (~11k words), from
  [`drkameleon/complete-hsk-vocabulary`](https://github.com/drkameleon/complete-hsk-vocabulary).
- **Japanese** — JLPT N5–N1 (~7.9k words), from
  [`jamsinclair/open-anki-jlpt-decks`](https://github.com/jamsinclair/open-anki-jlpt-decks)
  (expression / reading / meaning, derived from JMdict and Tanos lists).

Each word list entry is compact (`{ t: target, r: reading, m: meaning }`). The `/vocab`
page **fetches the active language's levels on demand** — these files are deliberately
**not** bundled and **not** in the Automerge document, because ~19k words would bloat both.
Only words you tap **＋ Add** become `LearningItem`s, via `studyVocabWord` (single) or
`addVocabWords` (a whole level = one Automerge change).

## How content reaches the review queue

```
seed.ts ───────────────► applyNewSeeds() ──► learningItems (on boot)
scripts-data.ts ─tap──►  studyScriptChar() ─► learningItems (character)
wordlists/*.json ─Add─►  studyVocabWord()  ─► learningItems (word)
/read passage line ─mine►studyPassageLine()─► learningItems (sentence)
workbench draft ─approve►approveDraft()    ─► learningItems (published)
```

All of these create published `LearningItem`s, which `buildQueue` then schedules
([SRS](./srs.md)).

## Adding / regenerating content

| Task | How |
| --- | --- |
| Add a few curated items/passages | Edit `seed.ts`, add new stable ids, ship. |
| Refresh kanji/hanzi tables | `node tools/gen-scripts-data.mjs`, commit `scripts-data.ts`. |
| Refresh HSK/JLPT word lists | `node tools/gen-vocab-data.mjs`, commit `static/wordlists/`. |
| Add audio for new content | Re-run the [audio pipeline](./audio.md#regenerating). |
| Generate items/passages with AI | Use the [workbench](./ai-workbench.md). |

After regenerating data, also regenerate audio if the new texts should be playable, since
the audio packs are keyed by exact text. The generators are idempotent and safe to re-run.
