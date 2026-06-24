#!/usr/bin/env python3
"""Prerecord Manabi's audio with edge-tts (Microsoft neural voices, free).

Reads tools/audio-texts.json (produced by dump-audio-texts.mjs) and writes one
MP3 per text to static/audio/<hash>.mp3, plus static/audio/manifest.json mapping
lang -> text -> hash so the app can look up a clip without a network 404 probe.

    pip install edge-tts
    node tools/dump-audio-texts.mjs
    python3 tools/gen-audio.py

Idempotent: existing clips are skipped, so re-runs only fill in new content.
"""
import asyncio
import hashlib
import json
import os

import edge_tts

VOICE = {
    "zh": "zh-CN-XiaoxiaoNeural",
    "ja": "ja-JP-NanamiNeural",
    "he": "he-IL-HilaNeural",
}
OUT = "static/audio"
CONCURRENCY = 6


def clip_id(lang: str, text: str) -> str:
    return hashlib.sha1(f"{lang}\n{text}".encode("utf-8")).hexdigest()[:16]


async def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    texts = json.load(open("tools/audio-texts.json", encoding="utf-8"))

    manifest: dict[str, dict[str, str]] = {}
    todo = []
    for item in texts:
        lang, text = item["lang"], item["text"]
        if lang not in VOICE:
            continue
        h = clip_id(lang, text)
        manifest.setdefault(lang, {})[text] = h
        if not os.path.exists(f"{OUT}/{h}.mp3"):
            todo.append((lang, text, h))

    print(f"{len(texts)} texts, {len(todo)} to synthesize ({len(texts) - len(todo)} cached)")

    sem = asyncio.Semaphore(CONCURRENCY)
    done = 0

    async def synth(lang: str, text: str, h: str) -> None:
        nonlocal done
        async with sem:
            try:
                await edge_tts.Communicate(text, VOICE[lang]).save(f"{OUT}/{h}.mp3")
            except Exception as e:  # noqa: BLE001
                print(f"  FAIL [{lang}] {text!r}: {e}")
                return
            done += 1
            if done % 50 == 0:
                print(f"  {done}/{len(todo)}")

    await asyncio.gather(*(synth(*t) for t in todo))

    with open(f"{OUT}/manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False)
    total = sum(len(v) for v in manifest.values())
    print(f"done — {done} synthesized, {total} clips in manifest")


if __name__ == "__main__":
    asyncio.run(main())
