#!/usr/bin/env python3
"""Prerecord ALL of Manabi's audio with edge-tts, bundled into AAC sprite packs.

Cloudflare Pages caps a deployment at 20k files, so ~20k individual clips won't
fit. Instead we synthesize each clip once (cached), then concatenate them into a
few hundred AAC `.m4a` packs and emit per-language manifests mapping
text → {pack, startSec, durSec}. The app plays the slice via HTMLAudio seek.

    pip install edge-tts mutagen          # ffmpeg must be on PATH
    node tools/dump-audio-texts.mjs
    python3 tools/gen-audio.py

Idempotent: cached clips and existing packs are skipped on re-runs.
"""
import asyncio
import concurrent.futures
import hashlib
import json
import os
import subprocess

import edge_tts

VOICE = {"zh": "zh-CN-XiaoxiaoNeural", "ja": "ja-JP-NanamiNeural", "he": "he-IL-HilaNeural"}
CACHE = "tools/.audio-cache"
GAP = f"{CACHE}/_gap.mp3"
OUT = "static/audio"
PACKS = f"{OUT}/packs"
SR = 24000           # all audio is 24kHz mono
CHUNK = 60           # clips per pack
CONCURRENCY = 8
EXT = ".webm"        # WebM/Opus — small + plays on Chrome/Firefox/Safari 16.4+ (incl. iOS)
# ffmpeg output codec args for a pack (Opus 24kbps mono; clear speech, ~half of AAC 48k).
CODEC = ["-c:a", "libopus", "-b:a", "24k", "-ar", str(SR), "-ac", "1"]


def clip_id(lang: str, text: str) -> str:
    return hashlib.sha1(f"{lang}\n{text}".encode("utf-8")).hexdigest()[:16]


def decoded_dur(path: str) -> float:
    """Exact decoded duration (s) = PCM bytes / 2 / sample-rate. This matches what
    the concat filter actually packs — MP3 *header* durations drift (gapless trim)."""
    try:
        p = subprocess.run(
            ["ffmpeg", "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", str(SR), "pipe:1"],
            capture_output=True,
        )
        return len(p.stdout) / 2 / SR
    except Exception:  # noqa: BLE001
        return 0.0


async def synthesize(texts: list[dict]) -> None:
    os.makedirs(CACHE, exist_ok=True)
    todo = [
        t for t in texts
        if t["lang"] in VOICE and not os.path.exists(f"{CACHE}/{clip_id(t['lang'], t['text'])}.mp3")
    ]
    print(f"synthesize: {len(todo)} new of {len(texts)} ({len(texts) - len(todo)} cached)")
    sem = asyncio.Semaphore(CONCURRENCY)
    done = 0

    async def one(t: dict) -> None:
        nonlocal done
        async with sem:
            h = clip_id(t["lang"], t["text"])
            path = f"{CACHE}/{h}.mp3"
            for attempt in range(4):
                try:
                    await edge_tts.Communicate(t["text"], VOICE[t["lang"]]).save(path)
                    if os.path.getsize(path) > 0:  # edge-tts can save an empty file on a hiccup
                        break
                    raise ValueError("empty audio")
                except Exception as e:  # noqa: BLE001
                    if os.path.exists(path) and os.path.getsize(path) == 0:
                        os.remove(path)
                    if attempt == 3:
                        print(f"  FAIL [{t['lang']}] {t['text']!r}: {e}")
                    else:
                        await asyncio.sleep(1.5 * (attempt + 1))
            done += 1
            if done % 500 == 0:
                print(f"  synthesized {done}/{len(todo)}")

    await asyncio.gather(*(one(t) for t in todo))


def make_gap() -> None:
    if not os.path.exists(GAP):
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-t", "0.35",
             "-i", "anullsrc=r=24000:cl=mono", "-c:a", "libmp3lame", "-q:a", "9", GAP],
            check=True,
        )


def pack(texts: list[dict]) -> None:
    make_gap()
    gap = decoded_dur(GAP)
    os.makedirs(PACKS, exist_ok=True)
    # Drop stale packs from a previous codec/format (e.g. old .m4a).
    for f in os.listdir(PACKS):
        if not f.endswith(EXT):
            os.remove(f"{PACKS}/{f}")

    # Exact decoded duration per unique clip, measured in parallel. Offsets are
    # built from these so they match the packed audio (no gapless-trim drift).
    wanted = {clip_id(t["lang"], t["text"]) for t in texts if t["lang"] in VOICE}
    print(f"measuring {len(wanted)} clips...")
    ids = list(wanted)
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
        durs = dict(zip(ids, ex.map(lambda h: decoded_dur(f"{CACHE}/{h}.mp3"), ids)))

    groups: dict[str, list[dict]] = {}
    dropped = 0
    for t in texts:
        if t["lang"] not in VOICE:
            continue
        if durs.get(clip_id(t["lang"], t["text"]), 0) <= 0:  # missing/empty/corrupt
            dropped += 1
            continue
        groups.setdefault(t["group"], []).append(t)
    if dropped:
        print(f"  skipped {dropped} missing/corrupt clips")

    manifest: dict[str, dict[str, dict]] = {"zh": {}, "ja": {}, "he": {}}
    npacks = 0
    for group, clips in groups.items():
        for ci in range(0, len(clips), CHUNK):
            chunk = clips[ci:ci + CHUNK]
            name = f"{group}-{ci // CHUNK}{EXT}"
            # Reuse an already-built pack — its concatenated audio is deterministic.
            if not os.path.exists(f"{PACKS}/{name}"):
                order = []
                for i, t in enumerate(chunk):
                    order.append(f"{CACHE}/{clip_id(t['lang'], t['text'])}.mp3")
                    if i < len(chunk) - 1:
                        order.append(GAP)
                args = ["ffmpeg", "-y", "-loglevel", "error"]
                for p in order:
                    args += ["-i", p]
                fc = "".join(f"[{i}:a]" for i in range(len(order))) + f"concat=n={len(order)}:v=0:a=1[out]"
                args += ["-filter_complex", fc, "-map", "[out]", *CODEC, f"{PACKS}/{name}"]
                subprocess.run(args, check=True)
            npacks += 1
            t0 = 0.0
            for i, t in enumerate(chunk):
                d = durs[clip_id(t["lang"], t["text"])]
                manifest[t["lang"]][t["text"]] = {"p": name, "s": round(t0, 3), "d": round(d, 3)}
                t0 += d + (gap if i < len(chunk) - 1 else 0)

    # Per-language manifests (app loads only the active language).
    for lang, m in manifest.items():
        with open(f"{OUT}/manifest-{lang}.json", "w", encoding="utf-8") as f:
            json.dump(m, f, ensure_ascii=False)
    # Drop any legacy per-clip mp3s in static/audio (replaced by packs).
    for f in os.listdir(OUT):
        if f.endswith(".mp3"):
            os.remove(f"{OUT}/{f}")
    if os.path.exists(f"{OUT}/manifest.json"):
        os.remove(f"{OUT}/manifest.json")
    print(f"packed {npacks} packs · clips: " + " ".join(f"{l}={len(m)}" for l, m in manifest.items()))


async def main() -> None:
    texts = json.load(open("tools/audio-texts.json", encoding="utf-8"))
    await synthesize(texts)
    pack(texts)
    print("done")


if __name__ == "__main__":
    asyncio.run(main())
