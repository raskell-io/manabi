# Cantonese (yue)

Cantonese is Manabi's fifth language, code `yue` (`Language` in
[`types.ts`](../src/lib/db/types.ts); `LANGUAGES` lists it as Cantonese / 廣東話). It is its own
language, not a variant of `zh`: the readings (Jyutping), much of the vocabulary and the
grammar particles (係 嘅 唔 咗) differ, so Mandarin skill schedules mean nothing for it. Items,
progress, audio and dictionary are all separate from Chinese.

This doc describes what is built, where the data comes from, the speech caveats, and how to
extend it. Options not taken (yet) are at the end.

## Conventions

- **Script.** Colloquial written Cantonese (口語: 係, 嘅, 唔, 咗, 佢, 冇, 喺), not standard written
  Chinese, in **Hong Kong Traditional characters** — and *stored* that way. Unlike Mandarin there
  is no Simplified storage, no `zhVariants`, and the Chinese script option (`zhScript`) does not
  apply: `displayText` passes Cantonese through, and `scriptLangTag('yue')` is always
  `zh-Hant-HK`, so the browser picks Hong Kong glyph forms.
- **Readings.** **Jyutping** (LSHK) with tone digits 1–6, **one syllable per character**,
  separated by spaces: 你好 `nei5 hou2`, 廣東話 `gwong2 dung1 waa2`. Readings record the tone as
  said, including changed tones (變調): 話 is `waa6` on its own but `waa2` in 廣東話.
- **Ruby.** "Show the reading above each character" (`settings.zhRuby`) also covers Cantonese:
  `$rubyOf(text, reading, language)` in [`chinese.ts`](../src/lib/chinese.ts) hands `yue` to
  `jyutpingRuby`, which pairs characters with syllables when the counts line up (else no ruby).
  Zhuyin and the pinyin / Zhuyin choice do not apply.
- **`isHanLanguage`** (`zh`, `yue`, `ja`) is the test for "written in Han characters, no spaces
  between words" — use it rather than `language === 'zh'` where Cantonese should behave alike
  (lookup, segmentation, strokes).

[`src/lib/cantonese.ts`](../src/lib/cantonese.ts) holds the helpers: `jyutpingSyllables`
(validate and split a reading), `jyutpingRuby`, `splitJyutping` (letters vs tone digits, for
typed answers), `JYUTPING_TONES` (the six tones on *si1*–*si6*: 詩 史 試 時 市 事) and
`colloquialize` (below). `cantonese.test.ts` covers them; `e2e/cantonese.spec.ts` walks the
language in the browser (lookup, ruby, Scripts, path, names, a review).

## What the learner gets

- **Seed** ([`seed.ts`](../src/lib/db/seed.ts)): 63 items (`seed-yue-*`, 48 at A1, 15 at A2 —
  greetings, people, numbers, the particles, shopping, getting around) and 6 passages
  (`pass-yue-*`): ordering at a cha chaan teng, my day, asking the way, the wet market, a hike on
  the Dragon's Back, and a short text about Hong Kong.
- **Learning paths** ([`path.ts`](../src/lib/path.ts)). *Beginner*: the six tones → first words
  (A1) → their characters → first conversations → listening → recall. *Refresher*: everyday words
  (A2) → more characters → places (Hong Kong and the Pearl River Delta) → read conversations →
  listening → recall → keep going.
- **Scripts** ([`scripts.ts`](../src/lib/scripts.ts)): **Characters**, levelled Starter / Everyday,
  derived from the A1 / A2 seed words with each character's Jyutping (`CANTONESE_BASE_TONE` gives a
  character's own tone where the word changes it), and **Jyutping tones**. There is no HSK-style
  character list for Cantonese. The Radicals page counts over this "Cantonese starter" set.
- **Names** ([`names-data.ts`](../src/lib/names-data.ts)): the usual five sections with Jyutping,
  Hong Kong usage where it differs (澳洲 for Australia, not 澳大利亞).
- **Typed recall** ([`answer.ts`](../src/lib/exercises/answer.ts)): characters, or Jyutping with
  tone digits; right letters with missing or wrong tones is "close".
- **Dictionary lookup**: tap-a-word over `static/dict/yue/`, longest match like Chinese; pasted
  texts get Jyutping word by word from the same data (`own-text.ts`; pasted Cantonese is kept as
  typed, not converted).
- **Drawing pad**: `strokeLang('yue')` is `'zh'`, so Cantonese uses the Chinese (Make Me a Hanzi)
  stroke data.
- **Not there:** word lists on `/vocab` (none exist for Cantonese yet), and on-device TTS.

## Data sources and licences

| What | Source | Licence |
| --- | --- | --- |
| Dictionary (`static/dict/yue/`, ~113k keys, ~10 MB) | **CC-Canto** (Pleco, cantonese.org) + **CC-CEDICT** (MDBG) with Pleco's Cantonese readings for it (`cccedict-canto-readings`) | CC BY-SA 3.0 (CC-Canto, readings) / CC BY-SA 4.0 (CC-CEDICT); see `static/dict/LICENSE.md` |
| Audio (212 clips, `static/audio/packs/yue-*.webm`, `manifest-yue.json`) | edge-tts `zh-HK-HiuMaanNeural` | same grey area as the other languages' packs ([audio](./audio.md)) |
| Stroke order | Make Me a Hanzi via `hanzi-writer-data` | Arphic Public License |
| Seed, passages, names, paths | written for Manabi | MIT, with the code |

The dictionary build (`buildYue` in [`tools/gen-dict.mjs`](../tools/gen-dict.mjs)) keys entries by
the **Traditional** headword with Jyutping readings and ranks senses: the readings file's own
Cantonese senses first (係 "(Cantonese) to be"), then CC-CEDICT's under its Cantonese reading,
then CC-Canto's extras (slang, extra senses); surnames and places last, long proper names dropped.
`YUE_FIRST` puts the everyday reading first where the sources lead with a rare one (嘅 `ge3`, not
`koi3`; also 靚 呢 去 飲 啦 呀 喇 平 嚟 行), and `YUE_EXTRA` adds everyday words the 2015–17
sources lack (喺 `hai2`). `seed.test.ts` checks every Cantonese seed syllable against this
dictionary, which catches a mistyped tone.

## Speech: recognition and synthesis

**Recognition** (pronunciation scoring) is the weak spot:

- Whisper **base and small have no Cantonese token** (only large-v3 knows `yue`), so on-device
  recognition runs with language `'chinese'` (`WHISPER_LANGUAGE` in `asr-text.ts`). The result
  tends to be Mandarin-flavoured standard written Chinese, sometimes Simplified.
- OpenAI transcription takes ISO 639-1 codes, so Cantonese is sent as `zh` with a Cantonese prompt
  (以下係廣東話嘅句子，用香港繁體字寫。).
- Both transcripts are converted to Hong Kong Traditional (`toHongKong` in `chinese.ts`, opencc-js),
  and `scorePronunciation` first runs `colloquialize(transcript, target)`: written-Chinese words
  recognition likes to write (是, 的, 不, 了, 他, 在, 看, 沒有, 我們, …) become their Cantonese
  forms (係, 嘅, 唔, 咗, 佢, 喺, 睇, 冇, 我哋, …) — but **only where the target uses the colloquial
  word**, so a 是 that is meant stays 是.
- Scores are therefore rougher than for the other languages; the learner confirms every rating
  anyway.

**Synthesis.** All seed text has prerecorded clips. For text without one (your own items, AI
drafts) there is no on-device voice; OpenAI TTS is sent an `instructions` string asking for Hong
Kong Cantonese, never Mandarin. **Unverified** whether the model obeys — it may still read the
characters in Mandarin.

## Extending Cantonese content

- **Seed items / passages.** Add to `seed.ts` with new stable ids (`seed-yue-<slug>`,
  `pass-yue-<slug>`), colloquial Hong Kong characters, Jyutping one syllable per character. Run
  `npm run test` — the seed test flags syllables the dictionary doesn't know. A new character
  shows up on Scripts automatically (Starter for A1 words, Everyday for A2); if its syllable in the
  word is a changed tone, add its base reading to `CANTONESE_BASE_TONE`.
- **Audio.** `node tools/dump-audio-texts.mjs` then `python3 tools/gen-audio.py` (voice
  `VOICE["yue"]`); commit the new `yue-*` packs and `manifest-yue.json`. See
  [audio](./audio.md#regenerating).
- **Strokes.** `node tools/gen-stroke-data.mjs` bundles the Cantonese seed words and examples into
  the `zh` set (they are already Traditional). Make Me a Hanzi has **no data** for some colloquial
  characters (咗 佢 冇 啲 喺 哋 嚟 嗰 攰); the CDN answers 404, `loadStrokes` throws
  `NoStrokeData`, and the drawing pad says the open data lacks the character instead of "you may
  be offline".
- **Dictionary.** `node tools/gen-dict.mjs yue` (needs network and `unzip`; downloads cached in
  `.cache/dict/`), commit `static/dict/yue/` and `static/dict/index.json`. Fix a bad lead reading
  with `YUE_FIRST`, add a missing word with `YUE_EXTRA`.
- **AI drafts.** The workbench's reading guide asks for colloquial Hong Kong Cantonese in
  Traditional characters with spaced Jyutping; review drafts for standard written Chinese
  creeping in (是 / 的 / 不).

## Not done yet / options

### Audio (TTS)

| Option | Status |
| --- | --- |
| edge-tts zh-HK (HiuGaai, **HiuMaan**, WanLung) | **In use** for the prerecorded packs. Licensing grey area, like the other packs. |
| OpenAI TTS | In use as the runtime fallback with Cantonese `instructions`; whether it speaks Cantonese is unverified. |
| MMS (`facebook/mms-tts-yue`) | Does not exist (MMS has no Mandarin or Japanese voice either; only Korean is usable on-device). |
| Piper | Only `zh_CN` voices; nothing for zh_HK / yue. |
| sherpa-onnx `vits-cantonese-hf-xiaomaiiwn` | Exists (≈ 114 MB, needs the sherpa-onnx WASM runtime, not transformers.js); licence not stated — unusable until clarified. |
| Azure / Google zh-HK, yue-HK voices | Paid; terms generally allow distributing generated audio — the clean-licence route. |

### Speech recognition

- `onnx-community/whisper-small-cantonese-ONNX` (fine-tune of `alvanlii/whisper-small-cantonese`,
  Apache-2.0, ~8% CER on Common Voice zh-HK) has a transformers.js port — the candidate for a
  proper on-device Cantonese model in `asr-local.ts`, writing colloquial Cantonese directly. Mind
  the onnxruntime-web int8-decoder problem (use fp16 / q4 weights).
- OpenAI: the newer transcription models may accept `yue` directly; whether their output is
  colloquial (係 / 嘅) rather than 書面語 is untested. `colloquialize` would still be needed for
  standard-Chinese output.

### Vocabulary and levels

- **words.hk**: full data on request under a non-commercial licence; its derived lists (word /
  character frequency, readings) are public domain — the natural basis for frequency levels and a
  `/vocab` word list.
- There is no HSK equivalent, so lists need hand curation, bucketed by words.hk frequency;
  HKCanCor (CC BY 4.0) gives spoken frequency.
- CC-Canto dates from 2017; newer slang and some everyday words are missing (hence `YUE_EXTRA`).
