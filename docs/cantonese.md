# Cantonese (yue): feasibility notes

Research done before building Cantonese as a fifth language (October 2026). Nothing here is
implemented yet. **Verdict: go**, with one caveat: there is no on-device TTS for Cantonese
that runs in transformers.js, so audio has to be pre-generated.

Cantonese would be its own `Language` (`yue`), not a variant of `zh`: the readings
(Jyutping), much of the vocabulary and the grammar particles (係 嘅 唔 咗) differ, so
Mandarin skill schedules mean nothing for it. Written in Hong Kong Traditional characters,
as colloquial written Cantonese, with Jyutping readings (LSHK scheme, tones 1–6 as digits:
`hai6`, `ge3`).

## What already carries over

- Traditional characters: `chinese.ts` (OpenCC `hk`), and the radical index and bundled
  stroke data already cover Traditional forms (`gen-radicals-data.mjs`,
  `gen-stroke-data.mjs`). `strokes.ts` can treat `yue` like `zh`.
- Dictionary lookup (`lookup.ts`) works for any Han-script language by longest match;
  Cantonese needs its own data (below).

## Audio (TTS)

| Option | Status |
| --- | --- |
| MMS (`facebook/mms-tts-yue`) | **Does not exist.** Note: MMS has no Mandarin or Japanese voice either — only Korean is usable on-device today (`tts-local.ts`). |
| Piper | Only `zh_CN` voices; nothing for zh_HK / yue. |
| sherpa-onnx `vits-cantonese-hf-xiaomaiiwn` | Exists (≈ 114 MB, needs the sherpa-onnx WASM runtime, not transformers.js); licence not stated — unusable until clarified. |
| OpenAI TTS | Cantonese not listed; most likely reads hanzi in Mandarin. Worth a quick test with `instructions: "speak Hong Kong Cantonese"` — unverified. |
| edge-tts zh-HK (HiuGaai, HiuMaan, WanLung) | Works for pre-generated audio (`tools/gen-audio.py`: one `VOICE["yue"]` line). Same licensing grey area as the existing packs. |
| Azure / Google zh-HK, yue-HK voices | Paid; terms generally allow distributing generated audio — the clean-licence route. |

**Plan:** bundled recordings (edge-tts or Azure) like the other languages; no on-device TTS.

## Speech recognition

- Whisper knows `yue` since large-v3; small models tend to write standard written Chinese
  rather than colloquial Cantonese, which breaks letter-by-letter scoring.
- `onnx-community/whisper-small-cantonese-ONNX` (fine-tune of `alvanlii/whisper-small-cantonese`,
  Apache-2.0, ~8% CER on Common Voice zh-HK) has a transformers.js port — a candidate for
  `asr-local.ts`. Mind the onnxruntime-web int8-decoder problem (use fp16/q4 weights).
- OpenAI transcription: `yue` is accepted by the newer models; whether output is colloquial
  (係 / 嘅) is unverified. Scoring may need a 書面語 ↔ 口語 equivalence step or a prompt.

## Dictionary and word lists

- **CC-Canto** (cantonese.org, CC BY-SA 3.0): CC-CEDICT format with Jyutping; plus Jyutping
  readings for all CC-CEDICT entries — fits `gen-dict.mjs` almost unchanged.
- **words.hk**: full data on request under a non-commercial licence; its derived lists
  (word / character frequency, readings) are public domain — the basis for levels.
- No HSK equivalent: seed lists need hand curation, bucketed by words.hk frequency;
  HKCanCor (CC BY 4.0) gives spoken frequency.

## Checklist when building it

`Language` + `LANGUAGES` and every `Record<Language, …>` (CLAUDE.md), the reading guide
(Jyutping with tone digits), a `yue` dictionary build, seed vocabulary / passages / paths /
names, gen-audio voice, `scriptLangTag` (`zh-Hant-HK`), and the e2e page sweep.
