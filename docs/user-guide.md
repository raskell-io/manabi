# User guide

Manabi is a personal language-learning app for reading **Chinese, Japanese, Korean, and Hebrew**.
The philosophy: you want to *recognize words, pronounce them correctly, understand them in
context, and gradually read real material*. Handwriting is there only as optional practice
(watch a character's stroke order and trace it on the drawing pad); it is never part of your
reviews. Every feature serves that goal.

There are no accounts and no sign-up, and your data stays on your device unless you turn on
sync or an AI feature yourself (see [Privacy](#privacy--your-data)). Everything is stored in
your browser.

## Installing it on your phone (PWA)

After your first review session, Home shows a one-line hint above the tab bar: on Android
and desktop Chrome it has an **Install** button; on iPhone and iPad it explains the two
Share-sheet steps, since Safari has no install prompt. Dismiss it once and it stays gone.

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

The language chips at the top of the **home screen** (`/`) — **中文 / 日本語 / 한국어 / עברית** —
switch the active language (Settings has the same choice). Each shows how many items are due in
that language, so you can see at a glance where work is waiting. Everything — your due queue,
vocabulary, scripts, and reading material — is scoped to the active language, and your
progress in each is tracked separately.

## The learning model

Each thing you study is a **learning item** (a word, phrase, sentence, grammar point, or
single character). For every item, Manabi tracks **five separate skills**:

| Skill | What it trains |
| --- | --- |
| **Recognition** | See the word, know what it means |
| **Pronunciation** | Say it correctly (record-and-compare) |
| **Listening** | Hear it, identify it — or rebuild a sentence you hear |
| **Context** | Understand it inside a sentence (cloze) |
| **Recall** | Produce it from the meaning — by typing it |

Skills unlock progressively: a brand-new item starts with **recognition**; pronunciation
and listening open up once you have seen it, and context and recall unlock after a couple
of successful recognition reviews. Each skill is scheduled independently with spaced
repetition, so you review exactly what you are about to forget.

## Getting around

On a phone (and when installed as an app) the **bottom bar** switches between the five
places you use most — **Home · Review · Read · Library · Progress** — with Settings behind
the gear at the top right. **Library** gathers your Path, Scripts, Radicals, Roots, Names,
Vocab, Items, Lessons and the Workbench; its tab stays lit while you are inside any of them.
A running review session takes over the screen: the bars disappear and the **✕** at the top
left quits back to the mode picker (progress is saved after every card, so quitting loses
nothing). On a desktop the same destinations sit in the sidebar.

## The screens

- **Home (`/`)** — today in one tap: a **Continue** card that opens the right session
  (Reading when anything is new or due, otherwise Listening, then Speaking), the other
  modes with their counts underneath, today's numbers, and any lessons with something due.
  The language chips at the top switch languages.
- **Review (`/review`)** — the core loop. Pick a mode and answer cards:
  - **Reading** — text-only recognition, recall, and context (cloze) exercises, scheduled
    by spaced repetition (what's due). Recall cards ask you to **type the word** (see
    [Typing answers](#typing-answers)); turn that off in Settings → Review to pick from four
    instead.
  - **Listening** — hear a word and choose it. About half the time, when the word has a short
    example sentence, you hear the sentence instead and **rebuild it from word tiles**
    (dictation); then its reading and translation are shown. Practice over **any** of your
    words that have audio — always available, no need to study them first. A session is capped
    at your review cap ("20 of 84 cards") and ordered by need: words you have never practiced
    first, then the weakest.
  - **Speaking** — record yourself and self-rate against the native clip. Also available for
    any of your words that have audio. With speech recognition available — an OpenAI key, or
    [recognition on this device](#speech-recognition-on-your-device) — Manabi transcribes your
    take and shows what it heard and how closely it matched, with a suggested rating that
    you confirm or adjust (turn this off under Settings → Pronunciation). Sessions are
    capped like Listening, with your lowest-scoring words first. Keyboard: **Space**
    records and stops, **P** plays your take, **1 / 2 / 3** rate it, **Enter** accepts the
    suggestion.
  - **Everything** — all of the above together.
  Grading buttons (Hard / Good / Easy) are optional; you can keep them off and just mark
  right/wrong. Keyboard shortcuts work throughout. A finished session shows cards,
  accuracy, time and a per-skill breakdown, plus **Next up**: drill what you missed, or go
  straight into another mode.
- **Read (`/read`)** — graded reading material: natural conversations and short
  non-fiction texts. **Tap any word to look it up** (see [Looking up words](#looking-up-words)).
  Each line has a play button, an eye button that reveals that line's reading and
  translation, and **＋** to **mine** it — turn it into a review item; the toggles at the top
  show readings (pinyin/kana/romanization/vowels) and translations for every line.
  **Read your own text** adds your own material (see [below](#reading-your-own-text)).
- **Scripts (`/scripts`)** — reference tables for the writing systems: hiragana &
  katakana, kanji (tabbed by JLPT level), hanzi (tabbed by HSK level), pinyin tones, and
  the Hebrew alef-bet. Tap a glyph to hear it and add it to your reviews, or add a whole
  set at once.
- **Vocab (`/vocab`)** — browse the full official word lists (HSK for Chinese, JLPT for
  Japanese). Search or browse by level; the reading sits above each word; tap **＋ Add** to
  start studying it, or add an entire level.
- **Items (`/items`)** — every item you are studying. Search, edit, or delete. Each item has
  a play button for its audio, and **Review these** runs a session over exactly the items
  currently listed (e.g. everything matching "HSK2"). An item's page also lists your recent
  recordings of it, with what speech recognition heard and the score.
- **Lessons (`/lessons`)** — group items into named bundles. Each card shows what's new
  and due inside it, and its **Review** button runs any review mode over just that lesson's
  items. Daily limits don't apply inside a lesson — you get all of it.
- **Progress (`/dashboard`)** — **Coming up**: how many skill reviews fall due on each of the
  next 14 days in this language (anything overdue counts as today); **Practice**: how many
  answers and recordings you made on each day of the last 18 weeks, as a calendar from light to
  dark. Hover or tap a day for its count; both charts also have a table view. Then your weak
  spots, made actionable: per-skill accuracy, the
  items with the most lapses with a **Drill these** button, and a **Pronunciation** section
  (takes, average match score, the words you pronounced worst) with **Practice these**,
  which opens Speaking over just those words.
- **Workbench (`/workbench`)** — generate new vocabulary or reading passages with AI (see
  below) into a review queue you approve before anything is added.
- **Settings (`/settings`)** — active language, daily limits, review options (grade buttons,
  typed recall), audio, pronunciation scoring and on-device recognition, the **Chinese** script
  and reading aid, the Hebrew vowel-hiding toggle, your OpenAI key (for the AI features),
  **Backup** (export a file / import & merge), **Sync (GitHub)**, the **Daily reminder**, and
  the theme — described below.

## Audio

Every seed word, example sentence, reading line, vocabulary word, and script glyph has a
**prerecorded native voice clip**. Tap any play button to hear it. This works fully
offline once cached. (Audio is prerecorded rather than synthesized on-device, so quality
is consistent and there is nothing to load.) Words you add yourself have no recording: Korean
ones are spoken by an on-device voice, and the other languages use OpenAI's voice if you have
set a key.

## Points, runs and streaks

A session opens with a short card from Nabi (tap to skip). Every right answer earns **10 XP**
(15 while you are on a run of three or more), floating off the progress bar; the bar heats up
on a run, and 3, 5, 10… in a row get a cheer. The first session that counts each day lights
your **streak** — a flame screen with the week so far — before the summary, where the numbers
count up. All of it is still when your device asks for reduced motion.

## Typing answers

Recall cards show the meaning and ask you to type the word. You can type it in its own
script or romanized:

- **Chinese** — characters (Simplified or Traditional), or pinyin with tone marks or numbers
  (`mǎ` or `ma3`).
- **Japanese** — kanji or kana, or romaji.
- **Korean** — Hangul or romanization.
- **Hebrew** — with or without vowel points, or transliterated.

Pinyin without tones (or with the wrong ones), or a one-letter slip, counts as right but says
**Almost!** and shows the answer so you can take a second look. **I don't know** reveals the
answer.

## Looking up words

In **Read**, every word is tappable. A sheet shows the dictionary entry — the word, its reading
(pinyin or Zhuyin, kana, romanization, transliteration), up to three meanings, how the form you
tapped relates to it (食べました is the polite past of 食べる; 학교에서 is 학교 + a particle; וּבַבַּיִת
is ו + ב + בית), a play button, and **Add to reviews**. The dictionaries (CC-CEDICT, JMdict and
English Wiktionary, under CC BY-SA) are downloaded piece by piece as you tap and then work
offline.

## Reading your own text

**Read → Read your own text** turns anything you paste — an article, a message, a story — into
a text you read like the built-in ones: split into lines, every word tappable. Readings are
worked out on your device (pinyin, kana, Korean romanization; Hebrew gets none). With an
OpenAI key you can also have the AI add a reading and an English translation to every line;
lines with a translation can be sent to your reviews. Your own texts can be deleted from their
page.

## Chinese: Traditional characters and Zhuyin

**Settings → Chinese** chooses how Chinese is written: **Simplified**, **Traditional · Taiwan**
or **Traditional · Hong Kong**. Your words, progress and audio are shared — switching only
changes how the characters look, never what you have learned. The reading aid can be **pinyin**
or **Zhuyin** (ㄅㄆㄇ, bopomofo), and **Show the reading above each character** puts it over
every character wherever the reading is known — in reviews, word lists, and every line you read.

Where Taiwan or Hong Kong write a word differently, or Taiwan says it differently (网络 is
網路 *wǎnglù* in Taiwan), an item can carry its own **Taiwan form**, **Hong Kong form** and
**Taiwan reading**; edit them on the item's page. Radicals and the drawing pad work on the
Traditional characters too.

## Speech recognition on your device

**Settings → Pronunciation → Recognize speech on this device** scores your recordings without
an OpenAI key and without a connection. Pick **Base** (~130 MB, about 3 seconds per take) or
**Small** (~300 MB, about 10 seconds; needed for Hebrew). The model downloads the first time
it is used — or press **Download now** — and then works offline. It is less accurate than
OpenAI, especially for single words, so when you have a key OpenAI is used first and the
on-device model only steps in when that is not possible. As always, you confirm the
suggested rating.

## Hebrew specifics

Hebrew is shown **right-to-left** and **vowelled (with niqqud)** by default, which is the
right way to learn to read it. Once you are comfortable, the **hide vowels** toggle in
settings strips the niqqud so you practice reading unpointed text, the way real Hebrew is
written.

Content you add yourself may arrive bare. Items whose Hebrew has no vowel points show a
**no vowels** badge in the Items list, and their editor offers **Add vowels (AI)**: with an
OpenAI key, the text is pointed for you to check before saving. The letters are guaranteed
untouched — a result that changes anything but the marks is discarded. The Workbench points
its Hebrew output the same way before it reaches the review queue.

## Daily limits

In settings you control **new items per day** and the **review cap**. New items are
introduced gradually so you do not get buried; reviews are capped so a backlog never makes
a session unbounded. The most-overdue reviews always come first.

Reviewing a single lesson from the Lessons page, or any explicit selection (**Drill these**,
**Practice these**, **Review these**), ignores both limits: a bounded set you chose
deliberately is never "too much".

## Privacy & your data

- **Everything is local.** Your items, progress, recordings, and settings live in your
  browser's IndexedDB. There is no server account and no analytics.
- **Your OpenAI key** (only needed for the AI features: the workbench, AI readings for your
  own texts, adding Hebrew vowels, and cloud speech recognition) is stored in settings on your
  device and used to call OpenAI directly from your browser. It is never sent anywhere
  else and is never committed to the repo. Your recordings go to OpenAI only for scoring, and
  not at all with on-device recognition.
- Because data is per-browser, devices only share it if you [sync](#sync-between-devices-github)
  or move a [backup](#backup--moving-between-devices). Clearing your browser storage clears
  your progress on that device.

## Backup & moving between devices

Because everything is local, clearing your browser's site data would erase your progress.
**Settings → Backup → Export backup** downloads a single `manabi-<date>.manabi` file with
all your items, lessons, passages, drafts, progress, and review history (recordings and your
OpenAI key are left out). Keep it somewhere safe.

**Import & merge** reads such a file into the current device. It **merges** rather than
replaces: nothing you have is deleted, items and lessons from both sides are combined, and
for each item and each skill the more recently reviewed state wins. So you can study on
your phone, export, import on your laptop, study there, and go back the other way — both
histories combine. Importing the same file twice is harmless ("nothing new to merge").

## Sync between devices (GitHub)

If you would rather not shuffle files, **Settings → Sync (GitHub)** keeps your devices in
step automatically. You need a GitHub account, an empty **private** repository (say
`you/manabi-sync`), and a fine-grained personal access token that can read and write that
repository's contents. Enter both on every device.

From then on Manabi syncs when it starts, after every review session, and when a device
comes back online — or whenever you press **Sync now**. A sync pulls the other devices'
progress, merges it exactly like an import (nothing is ever deleted), and pushes only when
something actually changed. The token never leaves your browser except in calls to GitHub,
and it is not included in backups.

With **Also keep your items and texts as Markdown** (on by default), the repository also gets
`content/<language>/items.md` and `passages.md`: every item and text as a readable section.
Edit them on GitHub — fix a meaning, add an example, add a new word as a new `##` section —
and the change comes back on the next sync. Only sections you changed are applied, deleting a
section deletes nothing, and your progress stays in the snapshot, so reviewing never touches
these files.

## Daily reminder

Manabi has no server to send notifications, so the reminder lives in your calendar. In
**Settings → Daily reminder**, pick a time and press **Add to my calendar**: it downloads a
calendar event that repeats every day at that time and links back to Manabi. Open it with your
calendar app and it does the reminding.
