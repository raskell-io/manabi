# Audio pipeline

Every spoken text in Manabi — seed words, example sentences, reading lines, the full
HSK/JLPT vocab browser, and every script glyph — has a **prerecorded native voice clip**.
This doc explains why, how the clips are generated and packed, how playback works, and how
to regenerate or extend it.

## Why prerecorded (not on-device TTS)

The app ships a local TTS attempt (`@huggingface/transformers` MMS, in
[`providers/tts-local.ts`](../src/lib/inference/providers/tts-local.ts)), but **in-browser
ONNX TTS does not load reliably**, so it is not the audio path. Cloud TTS at *runtime*
would need network and a key for every play. The solution: synthesize everything **once,
offline**, with a high-quality voice, and ship static audio that plays instantly and
offline.

The synthesis engine is **edge-tts** (free Microsoft neural voices), chosen after local
models failed to cover all three languages well:

| Language | Voice |
| --- | --- |
| zh | `zh-CN-XiaoxiaoNeural` |
| ja | `ja-JP-NanamiNeural` |
| he | `he-IL-HilaNeural` |

(Local alternatives that did not work out: the Voxtral model lacks zh/ja/he; Kokoro's zh
path is broken; MMS Hebrew is robotic.)

## Why sprite packs (the file-count constraint)

There are **~20,000 unique clips**. Cloudflare Pages caps a deployment at **20,000 files**,
so one file per clip will not fit. Instead, clips are concatenated into a few hundred
**audio sprite packs** with a small inter-clip gap, and a per-language **manifest** records
where each clip lives inside its pack.

Current output: **347 WebM/Opus packs (~73 MB)** + three manifests
(`manifest-zh.json` 11,319 entries, `manifest-ja.json` 8,525, `manifest-he.json` 177).
That is ~350 files total — comfortably under the cap.

Format is **Opus 24 kbps mono in a WebM container**. Opus is ~half the size of AAC for
speech; WebM is the container that plays Opus across Chrome, Firefox, **and Safari/iOS 16.4+**
(Ogg/Opus would fail on Safari).

## The manifest

```jsonc
// static/audio/manifest-zh.json
{ "今天": { "p": "zh-core-0.webm", "s": 0, "d": 1.296 }, ... }
//          pack file              start(s)  duration(s)
```

`p` = pack filename, `s` = start offset in seconds, `d` = clip duration. Playback seeks to
`s` and stops at `s + d`.

## Generating the audio

Two tools, run offline (not part of the app build). Output (`static/audio/`) is committed;
the clip cache is gitignored.

### 1. Collect texts — `tools/dump-audio-texts.mjs`

```
node tools/dump-audio-texts.mjs   →  tools/audio-texts.json
```

esbuild-bundles `seed.ts` and `scripts.ts` to run them under Node, reads
`static/wordlists/`, and collects every unique `(language, text)` — seed item targets +
examples + passage lines + all vocab words + all script glyphs — deduped and **grouped into
pack buckets** (`{lang}-core`, `{lang}-vocab-{level}`, `{lang}-kanji-{level}`, etc.). Output
is `[{ lang, text, group }]` (~20,021 entries).

### 2. Synthesize + pack — `tools/gen-audio.py`

```
pip install edge-tts          # ffmpeg must be on PATH
node tools/dump-audio-texts.mjs
python3 tools/gen-audio.py
```

Phases:

1. **Synthesize** each clip with edge-tts → cached MP3 in `tools/.audio-cache/<hash>.mp3`
   (`hash = sha1("<lang>\n<text>")[:16]`). Idempotent (skips cached), retries, and rejects
   0-byte files (edge-tts occasionally writes empties on a network blip).
2. **Measure** each clip's exact duration (see the drift gotcha below).
3. **Pack**: for each group, concatenate ≤60 clips (with a 0.35 s gap between) via ffmpeg's
   `concat` filter → `static/audio/packs/<group>-<n>.webm` (Opus). Existing packs are
   reused on re-run.
4. **Manifest**: write `static/audio/manifest-{lang}.json` from the measured offsets.

The synthesis cache makes this incremental: only new texts are voiced; re-running just
re-measures and re-packs.

### The offset-drift gotcha (important)

Clip offsets **must be computed from decoded PCM duration**, not MP3 header/`mutagen`
length:

```python
# bytes of decoded s16le mono PCM / 2 / sample_rate  == exact duration
ffmpeg -v error -i clip.mp3 -f s16le -ac 1 -ar 24000 pipe:1 | (len / 2 / 24000)
```

MP3 headers report a *nominal* length, but ffmpeg **gapless-trims** ~26 ms of encoder
delay/padding per clip when concatenating. Using header lengths makes the cumulative offset
drift ~1.7 s over a 60-clip pack, so late clips seek **past** the pack's end and play
silence. The decoded-PCM duration matches exactly what gets packed. (Re-encoding to a
different codec/bitrate preserves the timeline, so offsets stay valid across an AAC→Opus
re-pack.)

## Playback — `src/lib/audio.ts`

The play path is a small audio-sprite engine:

```ts
playPrerecorded(language, text)
  → entry = manifest[text]                       // { p, s, d }
  → playSlice(`/audio/packs/${entry.p}`, s, d)
```

`playSlice`:

1. `new Audio(packUrl)` (one element reused per pack, so each pack file is fetched once).
2. Wait for metadata, then `audio.currentTime = s` and **wait for the `seeked` event**
   (setting `currentTime` before `play()` without waiting plays from 0).
3. `audio.play()`, then a `requestAnimationFrame` loop pauses at `s + d`.

Seeking inside a pack needs **HTTP Range** support. Cloudflare serves Range natively;
the local `serve.mjs` had Range support added for parity (and `.webm` mime). A new play
supersedes any in-flight one.

`AudioButton.svelte` is the UI: it checks the manifest for the active language
(`hasPrerecorded`) to decide if it is enabled, then plays the prerecorded clip, falling back
to a device-cached blob or on-the-fly synthesis only if there is no clip.

The `/review` Listening mode uses `hasPrerecorded` to only offer hear-it cards for words
that actually have audio.

## Regenerating

After adding or changing any spoken text (seed, generators, etc.):

```
node tools/dump-audio-texts.mjs     # recollect texts
python3 tools/gen-audio.py          # synth new clips, re-pack, rewrite manifests
npm run build                       # bundle the new packs into build/
```

The Python tooling reuses an edge-tts virtualenv (e.g. a sibling project's `.venv`); any
env with `edge-tts` + `ffmpeg` works. Commit `static/audio/packs/` and
`static/audio/manifest-*.json`; the `tools/.audio-cache/` MP3 cache stays gitignored.

### Knobs

- **Bitrate/codec** — `CODEC` in `gen-audio.py` (`libopus -b:a 24k`). Lowering shrinks
  size; the timeline (and manifests) stay valid.
- **Voices** — the `VOICE` map.
- **Pack size** — `CHUNK` (clips per pack). Smaller packs = more files but smaller per-clip
  download; keep the total file count under ~20k for Cloudflare Pages.

## What is NOT precached

The service worker precaches the app shell but **not** the audio packs ([PWA](./pwa-and-deployment.md)).
73 MB would make the first install enormous, and Range-request caching in a service worker
is error-prone. Packs are fetched on demand and held in the browser's HTTP cache, so audio
works offline after first use.
