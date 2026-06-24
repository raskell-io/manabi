# Manabi documentation

Manabi (学び, "learning") is a local-first, reading-first language-learning PWA for
**Chinese (zh)**, **Japanese (ja)**, and **Hebrew (he)**. It trains recognition,
pronunciation, listening, reading, and recall — explicitly **no handwriting drills**.
Everything runs in the browser: all state lives in IndexedDB, there is no backend
database, and the whole app installs to your home screen and works offline.

This directory is the long-form documentation. The repo root [`README.md`](../README.md)
is the quick overview; [`DEPLOY.md`](../DEPLOY.md) is the deployment runbook. These docs
go deeper into how each subsystem is engineered and how to extend it.

## Where to start

**If you just want to use the app**, read the [User guide](./user-guide.md).

**If you want to understand or change the code**, read [Architecture](./architecture.md)
first, then dive into whichever subsystem you are touching.

## Map

| Doc | Audience | What it covers |
| --- | --- | --- |
| [User guide](./user-guide.md) | User | Installing, the learning model, every screen, settings, offline & privacy |
| [Architecture](./architecture.md) | Dev | The stack, the module map, data flow, project invariants |
| [Data model & storage](./data-model.md) | Dev | The Automerge document, every entity, persistence, migrations, the blob store |
| [SRS & review loop](./srs.md) | Dev | Multi-dimensional SM-2, the due queue, unlock rules, exercise generation |
| [Content pipeline](./content.md) | Dev | Built-in seed, the kana/kanji/hanzi & vocab generators, how to add content |
| [Audio pipeline](./audio.md) | Dev | Prerecorded Opus sprite packs, the playback engine, regenerating audio |
| [AI content workbench](./ai-workbench.md) | Dev | The inference router, providers, draft → review → publish, adding a provider |
| [PWA & deployment](./pwa-and-deployment.md) | Dev | PWA wiring, offline/service worker, Cloudflare Pages, local hosting |
| [Development & extending](./development.md) | Dev | Setup, tasks, testing, conventions, and step-by-step extension recipes |

## The one-paragraph version

The atomic unit is a `LearningItem` (a word, phrase, sentence, grammar point, or
character). Each item tracks **five skills independently** — recognition, pronunciation,
listening, context, and recall — each with its own SM-2 spaced-repetition schedule. The
review loop builds a due queue, serves generated exercises, grades them, and advances the
schedules. Content comes from three places: a small hand-verified **seed**, large
**generated reference sets** (full kana/kanji/hanzi tables and HSK/JLPT word lists), and
an optional **AI workbench** that drafts new items for human approval. Audio is fully
**prerecorded** (the in-browser TTS does not work reliably) and bundled into a few hundred
Opus sprite packs. State is an **Automerge CRDT document** persisted to IndexedDB, so the
app is offline-first and sync-ready without a server.
