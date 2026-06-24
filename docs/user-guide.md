# User guide

Manabi is a personal language-learning app for reading **Chinese, Japanese, and Hebrew**.
The philosophy: you want to *recognize words, pronounce them correctly, understand them in
context, and gradually read real material* — not to handwrite characters. Every feature
serves that goal.

There are no accounts, no sign-up, and no data leaves your device (see
[Privacy](#privacy--your-data)). Everything is stored in your browser.

## Installing it on your phone (PWA)

Manabi is a Progressive Web App, so it installs like a native app and works offline.

**iPhone / iPad (Safari):**
1. Open **https://manabi.raskell.io** in **Safari** (it must be Safari — other iOS
   browsers cannot install PWAs).
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. Launch it from the home-screen 学 icon. It runs full-screen and works offline.

**Android (Chrome):** open the site, then use the **Install app** prompt or the ⋮ menu →
**Install app**.

**Desktop (Chrome/Edge):** click the install icon in the address bar.

The app shell and your data are cached for offline use. Audio and the big word lists
download the first time you use them, then stay cached.

## Choosing a language

The **home screen** (`/`) is the language selector: tap one of the **中文 / 日本語 / עברית**
cards to make it the active language. Each card shows how many items are due in that
language, so you can see at a glance where work is waiting. Everything — your due queue,
vocabulary, scripts, and reading material — is scoped to the active language, and your
progress in each is tracked separately.

## The learning model

Each thing you study is a **learning item** (a word, phrase, sentence, grammar point, or
single character). For every item, Manabi tracks **five separate skills**:

| Skill | What it trains |
| --- | --- |
| **Recognition** | See the word, know what it means |
| **Pronunciation** | Say it correctly (record-and-compare) |
| **Listening** | Hear it, identify it |
| **Context** | Understand it inside a sentence (cloze) |
| **Recall** | Produce it from the meaning |

Skills unlock progressively: a brand-new item starts with **recognition**; pronunciation
and listening open up once you have seen it, and context and recall unlock after a couple
of successful recognition reviews. Each skill is scheduled independently with spaced
repetition, so you review exactly what you are about to forget.

## The screens

- **Home (`/`)** — today's plan: how many new items and reviews are due, with a "Start
  review" button.
- **Review (`/review`)** — the core loop. Pick a mode and answer cards:
  - **Reading** — text-only recognition, recall, and context (cloze) exercises.
  - **Listening** — hear a word and choose it. Only offered for words that have audio.
  - **Speaking** — record yourself and self-rate your pronunciation against the native clip.
  - **Everything** — all of the above that is due.
  Grading buttons (Hard / Good / Easy) are optional; you can keep them off and just mark
  right/wrong. Keyboard shortcuts work throughout.
- **Read (`/read`)** — graded reading material: natural conversations and short
  non-fiction texts. Tap any line to hear it, toggle readings (pinyin/furigana/vowels) and
  translations, and **mine** a sentence — turning it into a review item — with one tap.
- **Scripts (`/scripts`)** — reference tables for the writing systems: hiragana &
  katakana, kanji (tabbed by JLPT level), hanzi (tabbed by HSK level), pinyin tones, and
  the Hebrew alef-bet. Tap a glyph to hear it and add it to your reviews, or add a whole
  set at once.
- **Vocab (`/vocab`)** — browse the full official word lists (HSK for Chinese, JLPT for
  Japanese). Search or browse by level; the reading sits above each word; tap **＋ Add** to
  start studying it, or add an entire level.
- **Items (`/items`)** — every item you are studying. Filter by level/tag/status, edit, or
  delete. Each item has a play button for its audio.
- **Lessons (`/lessons`)** — group items into named bundles.
- **Progress (`/dashboard`)** — your weak spots: per-skill scores and the items that need
  the most work.
- **Workbench (`/workbench`)** — generate new vocabulary or reading passages with AI (see
  below) into a review queue you approve before anything is added.
- **Settings (`/settings`)** — active language, daily limits, theme, the Hebrew
  vowel-hiding toggle, and your OpenAI key (for the workbench).

## Audio

Every seed word, example sentence, reading line, vocabulary word, and script glyph has a
**prerecorded native voice clip**. Tap any play button to hear it. This works fully
offline once cached. (Audio is prerecorded rather than synthesized on-device, so quality
is consistent and there is nothing to load.)

## Hebrew specifics

Hebrew is shown **right-to-left** and **vowelled (with niqqud)** by default, which is the
right way to learn to read it. Once you are comfortable, the **hide vowels** toggle in
settings strips the niqqud so you practice reading unpointed text, the way real Hebrew is
written.

## Daily limits

In settings you control **new items per day** and the **review cap**. New items are
introduced gradually so you do not get buried; reviews are capped so a backlog never makes
a session unbounded. The most-overdue reviews always come first.

## Privacy & your data

- **Everything is local.** Your items, progress, recordings, and settings live in your
  browser's IndexedDB. There is no server account and no analytics.
- **Your OpenAI key** (only needed for the AI workbench) is stored in settings on your
  device and used to call OpenAI directly from your browser. It is never sent anywhere
  else and is never committed to the repo.
- Because data is per-browser, it does not automatically sync between devices. The data
  model is built on CRDTs, so cross-device sync can be added later, but today each device
  is independent. Clearing your browser storage clears your progress.
