# Content pipeline

Manabi's learning content comes from three sources, in increasing size:

1. **Built-in seed** — a small, hand-verified set that ships in the app so it is usable
   immediately, offline, with no key.
2. **Generated reference data** — the full kana/kanji/hanzi tables (Scripts page), the
   complete HSK/JLPT word lists and Cantonese frequency bands (Vocab browser), radicals, stroke-order data and the
   tap-a-word dictionaries, produced by offline generators from open datasets.
3. **AI-generated drafts** — optional, created in the [workbench](./ai-workbench.md) and
   approved by you.

This doc covers the first two, plus the learner's own pasted texts. Audio for all of it is
covered in [audio](./audio.md).

## Built-in seed

[`src/lib/db/seed.ts`](../src/lib/db/seed.ts) defines a small leveled set tuned to the
target learner: Chinese A1→A2 (HSK 1–3), Cantonese A1→A2 (63 everyday words and phrases, Hong
Kong usage), a Japanese B1 refresher (N4/N3 grammar), and
Korean A1 (TOPIK I basics in polite -요 forms), Hebrew A1 (alef-bet, numbers, phrases —
vowelled). It also seeds natural reading passages
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
- Korean `target` is Hangul (no hanja); `reading` is Revised Romanization.
- Chinese is written **Simplified** with tone-marked pinyin; Traditional is a display
  conversion. Where conversion is wrong for a word (a one-to-many character on its own, or
  Taiwan vocabulary / reading), add a `zhVariants` entry to `SEED_ZH_VARIANTS` and reference
  it from the seed spec; `migrate()` backfills existing databases only when the schema
  version is bumped (see [data model → Chinese](./data-model.md#chinese-script-and-readings)).
- Readings should split one syllable per hanzi (`zhuyin.ts` `readingSyllables`), or ruby and
  Zhuyin fall back; `zhuyin.test.ts` checks every seed word lines up.
- Cantonese is written as **colloquial Cantonese in Hong Kong Traditional characters** (係 嘅 唔
  咗, stored that way — no Simplified storage, no `zhVariants`) with **Jyutping** readings: tone
  digits, one syllable per character, separated by spaces (`nei5 hou2`). `seed.test.ts` checks
  every Cantonese seed syllable against the `yue` dictionary. See [Cantonese](./cantonese.md).
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
[`src/lib/scripts.ts`](../src/lib/scripts.ts) — so are the Cantonese sections, derived rather than
generated: **Characters** (Starter / Everyday, the characters of the A1 / A2 seed words with their
Jyutping; `CANTONESE_BASE_TONE` gives a character's own tone where the word changes it, 話 *waa6* in
廣東話 *waa2*) and the six **Jyutping tones** on *si1*–*si6*. `scripts.ts` also assembles the tabbed sections the
`/scripts` page renders (`scriptSections`, `sectionGlyphs`, `blockGlyphs`). Tapping a glyph
calls `studyScriptChar` → a `character` `LearningItem`.

### Vocabulary lists — `tools/gen-vocab-data.mjs`

Generates the Vocab browser data into `static/wordlists/` as per-level JSON plus an
`index.json`:

```
node tools/gen-vocab-data.mjs [zh] [ja] [yue]
```

With no arguments it builds all three; naming languages rebuilds only those and merges them into
the existing `index.json`.

- **Chinese** — full HSK 3.0: levels 1–6 plus the 7–9 band (~11k words), from
  [`drkameleon/complete-hsk-vocabulary`](https://github.com/drkameleon/complete-hsk-vocabulary).
- **Japanese** — JLPT N5–N1 (~7.9k words), from
  [`jamsinclair/open-anki-jlpt-decks`](https://github.com/jamsinclair/open-anki-jlpt-decks)
  (expression / reading / meaning, derived from JMdict and Tanos lists).
- **Cantonese** — the 5,000 most frequent words of the words.hk corpus, ranked by its
  public-domain word counts with Jyutping from its word list
  ([words.hk/faiman/analysis](https://words.hk/faiman/analysis/)), glossed in English from
  `static/dict/yue` (CC-Canto / CC-CEDICT, CC BY-SA — so build that dictionary first with
  `node tools/gen-dict.mjs yue`). Words without a reading or a dictionary entry are skipped. Four
  bands by rank: **Top 500 / 501–1,500 / 1,501–3,000 / 3,001–5,000** (`yue-500.json` …
  `yue-5000.json`; the level id is the band's upper rank, which `/vocab` shows as that range; added
  words are tagged `YUE Top 500`, `YUE 501–1,500` …).

There are no Korean or Hebrew word lists (`/vocab` says so). Each word list entry is compact (`{ t: target, r: reading, m: meaning }`). The `/vocab`
page **fetches the active language's levels on demand** — these files are deliberately
**not** bundled and **not** in the Automerge document, because ~24k words would bloat both.
Only words you tap **＋ Add** become `LearningItem`s, via `studyVocabWord` (single) or
`addVocabWords` (a whole level = one Automerge change).

## How content reaches the review queue

```
seed.ts ───────────────► applyNewSeeds() ──► learningItems (on boot)
scripts-data.ts ─tap──►  studyScriptChar() ─► learningItems (character)
wordlists/*.json ─Add─►  studyVocabWord()  ─► learningItems (word)
/read passage line ─mine►studyPassageLine()─► learningItems (sentence)
tapped word ──Add to reviews► studyVocabWord() ► learningItems (word)
workbench draft ─approve►approveDraft()    ─► learningItems (published)
sync Markdown edit ─────► applyContentFile() ► learningItems / passages
```

All of these create published `LearningItem`s, which `buildQueue` then schedules
([SRS](./srs.md)).

## Adding / regenerating content

| Task | How |
| --- | --- |
| Add a few curated items/passages | Edit `seed.ts`, add new stable ids, ship. |
| Add place or people names | Edit `names-data.ts` by hand (same five sections per language), run the tests. |
| Add Hebrew roots or root words | Edit `roots-data.ts` by hand (vowelled; seed words spelled exactly as in the seed), run the tests. |
| Refresh kanji/hanzi tables | `node tools/gen-scripts-data.mjs`, commit `scripts-data.ts`. |
| Refresh HSK/JLPT/Cantonese word lists | `node tools/gen-vocab-data.mjs [zh] [ja] [yue]` (yue after `gen-dict.mjs yue`), commit `static/wordlists/`. |
| Refresh radicals / stroke data | `node tools/gen-radicals-data.mjs`, then `node tools/gen-stroke-data.mjs`; commit the outputs. |
| Refresh the dictionaries | `node tools/gen-dict.mjs [zh] [yue] [ja] [ko] [he]`, commit `static/dict/`. |
| Add audio for new content | Re-run the [audio pipeline](./audio.md#regenerating). |
| Generate items/passages with AI | Use the [workbench](./ai-workbench.md). |

After regenerating data, also regenerate audio if the new texts should be playable, since
the audio packs are keyed by exact text. The generators are idempotent and safe to re-run.

### Radicals — `tools/gen-radicals-data.mjs`

Generates [`src/lib/radicals-data.ts`](../src/lib/radicals-data.ts): the 214 Kangxi radicals (ideograph,
stroke count, meaning, pinyin, component/simplified variants such as 氵 讠) and, for every hanzi/kanji in
the Scripts sets, the seed and the vocab word lists — plus the **Traditional forms** (Taiwan and Hong Kong,
via opencc-js) of all that Chinese text, so the Traditional script option keeps working (語 under 言;
about 4,580 characters indexed) — the radical it is filed under with its residual stroke count. Sources: Unicode Unihan `kRSUnicode`, `CJKRadicals.txt` and `UnicodeData.txt` (Unicode
License v3); pinyin from makemeahanzi. Needs `unzip`. Powers `/radicals` and the radical chip on glyphs.

```
node tools/gen-radicals-data.mjs
```

### Hebrew roots — `src/lib/roots-data.ts` (hand-curated)

About fifty common three-letter roots (שׁוֹרָשִׁים), each with three to seven everyday vowelled words and an
optional teaching note. Roots are stored as regular letters (no final forms or shin/sin dots); verbs are
present tense, masculine singular, like the seed. `roots.test.ts` enforces niqqud and shin/sin dots,
one root per spelling, and that a word which is also a seed item is spelled exactly as in the seed, so
adding it from `/roots` never creates a near-duplicate. `splitByRoot` highlights the root letters in a
word (longest in-order match, allowing final ה → י and initial י → ו, ignoring a feminine final ה); no
data tool is needed. Not native-proofread yet.

### Names — `src/lib/names-data.ts` (hand-curated)

Per language, five sections: countries, places where the language is spoken, world cities, family names
and given names (each given name marked male / female / both), with an optional literal meaning
(`北京` “northern capital”). Readings follow the seed: pinyin, Jyutping, kana + romaji, Revised Romanization,
transliterated vowelled Hebrew. Added items are tagged `name`, `place`/`person` and `names-<section>`,
and their meaning says the kind of name (“Wang (family name)”). `names.test.ts` checks the conventions.

### Stroke order — `tools/gen-stroke-data.mjs`

Downloads [Hanzi Writer](https://github.com/chanind/hanzi-writer) stroke data for every hanzi/kanji on
the Scripts page, in the seed and in the radical table — Chinese also bundles the Traditional forms
(Taiwan + Hong Kong, via opencc-js) of that text, and the Cantonese seed words and examples (already
Traditional) go into the Chinese set — into `static/strokes/{zh,ja}/<code-point>.json`,
and writes `src/lib/strokes-index.ts` (what is bundled). Chinese uses `hanzi-writer-data@2.0.1` (Make Me a
Hanzi); Japanese uses `hanzi-writer-data-jp@0.0.1` (AnimCJK — Japanese glyph shapes and stroke order).
Both are Arphic Public License (+ LGPL for AnimCJK); see `static/strokes/README.md`. Re-runs resume and
skip files already present; run it after the radicals generator. Other characters load from the same
pinned CDN at runtime; the service worker caches both (`manabi-strokes`). Make Me a Hanzi has no
data for some colloquial Cantonese characters (咗 佢 冇 啲 喺 哋 嚟 嗰 攰): the CDN answers 404,
`loadStrokes` throws `NoStrokeData`, and StrokePad says the open data lacks the character instead
of "you may be offline".

```
node tools/gen-stroke-data.mjs
```

### Chinese script conversion — no generated data

Traditional Chinese needs no data step of its own: [`src/lib/chinese.ts`](../src/lib/chinese.ts)
converts the stored Simplified text at display time with **opencc-js** (`opencc-js/cn2t`, ~1 MB,
loaded lazily as its own chunk once a Traditional script is picked). The conversion is phrase-level
(头发 → 頭髮, 发展 → 發展) and changes characters only, never vocabulary, so the displayed word still
matches its pinyin and audio. Per-item exceptions live in `zhVariants`. What *does* depend on the
conversion is the generated radical index and bundled stroke files above — rerun both generators
after adding Chinese text, so its Traditional characters are covered. Zhuyin is likewise computed
(`zhuyin.ts`, pinyin → bopomofo against the standard syllable table); no data file. Cantonese is
outside all this: it is stored in Hong Kong Traditional, `displayText` passes it through, and
`scriptLangTag('yue')` is always `zh-Hant-HK`; `toHongKong()` only normalizes speech-recognition
output.

### Dictionaries — `tools/gen-dict.mjs`

Builds the tap-a-word dictionaries into `static/dict/<lang>/<bucket>.json` plus
`static/dict/index.json` (per language: buckets present, entry count, source, licence). The layout is
shared with the runtime in [`src/lib/dict-shard.ts`](../src/lib/dict-shard.ts): entries are compact
(`{ w, r, g, p? }` — headword, reading, up to three glosses, part of speech) and sharded into 64
buckets by the first code point of the lookup key (Hebrew keys drop niqqud), so a tap fetches one
small file. Korean and Hebrew shards also carry an inflected-form → lemma map (`f`).

```
node tools/gen-dict.mjs [zh] [yue] [ja] [ko] [he]   # no args = all five
```

Needs network; downloads are cached in `.cache/dict/` (~300 MB, gitignored). Sources, all
**CC BY-SA** (the data stays under its source licence, see `static/dict/LICENSE.md`):

| Language | Source | Notes |
| --- | --- | --- |
| zh | **CC-CEDICT** (MDBG export) | ~111k entries keyed by Simplified headword; pinyin converted to tone marks; long proper names dropped |
| yue | **CC-Canto** (Pleco) + **CC-CEDICT** with Pleco's Cantonese readings (`cccedict-canto-readings`) | ~113k keys (~10 MB) by Traditional headword, Jyutping readings; senses ranked: the readings file's Cantonese senses, then CC-CEDICT, then CC-Canto extras, surnames and places last; `YUE_FIRST` puts the everyday reading first for a few words (嘅 *ge3*), `YUE_EXTRA` adds what the sources lack (喺); CC BY-SA 3.0 / 4.0 |
| ja | **JMdict** via `scriptin/jmdict-simplified` | ~53k: words marked common plus every word in Manabi's JLPT lists and seed; JMdict part-of-speech codes kept for deinflection |
| ko | English **Wiktionary** via kaikki.org (Wiktextract) | ~32k lemmas + inflected forms from the conjugation / declension tables |
| he | English **Wiktionary** via kaikki.org | ~10k lemmas (vowelled headwords) + inflected forms |

At runtime [`dictionary.ts`](../src/lib/dictionary.ts) fetches the manifest and shards on demand
(the service worker keeps them in the `manabi-dict` cache), and
[`lookup.ts`](../src/lib/lookup.ts) `createLookup(loader)` does the matching — pure apart from the
injected loader, and tested against the real data:

- **Chinese and Cantonese** — longest dictionary match starting at the tapped character (so 学习 is one tap
  even if `Intl.Segmenter` split it).
- **Japanese** — the same, also trying every deinflection of each span with
  [`deinflect-ja.ts`](../src/lib/deinflect-ja.ts) (食べました → 食べる, "polite · past"), checked
  against the entry's part of speech.
- **Korean** — the word; else its inflection from the form map (먹었습니다 → 먹다); else without a
  trailing particle (학교에서 → 학교) or a common verb ending.
- **Hebrew** — the word without niqqud; else its inflection (ילדים → ילד); else with up to three
  prefix letters peeled (וּבַבַּיִת → ו + ב + בית).

The UI is `TapText` (every word of a passage line is tappable; it also handles ruby) and
`LookupSheet` (headword, reading — pinyin or Zhuyin, Jyutping, kana, RR, transliteration — glosses, how the
tapped form relates, audio, **Add to reviews** → `studyVocabWord`).

## The learner's own texts

**Read your own text** (`/read/new`, [`src/lib/own-text.ts`](../src/lib/own-text.ts)) turns pasted
text into a passage (up to 80 lines). Pasted Chinese is converted to Simplified first
(`toSimplified` in `chinese.ts`, OpenCC t2cn) — content is stored Simplified, and the script
setting shows it as Traditional again. `splitSentences` splits it, and `dictionaryReading` works out
readings offline from the dictionary — pinyin or Jyutping word by word (zh / yue; pasted Cantonese
is kept as typed, not converted), kana including inflected forms
(`inflectedKana`, ja), approximate Revised Romanization (`romanizeHangul`, ko); Hebrew gets none
(unvowelled text has no reliable reading). With an OpenAI key and the AI option on, the router's
`annotate` task adds a reading and an English translation per line
([AI workbench](./ai-workbench.md#other-router-tasks-hebrew-diacritization-annotation--transcription)).
The passage is saved with `level: 'Your text'` and the tag `mine`, and can be deleted from its page.
