# GitHub sync

Manabi has no server, so multi-device sync piggybacks on a **private GitHub repository**:
the backup snapshot (`manabi.manabi`, see [Data model → Backup & merge](./data-model.md#backup--merge))
is stored as a file in that repo and read/written from the browser through the GitHub
**Contents API**. Optionally the same repo also holds a readable, editable **Markdown copy**
of your items and passages ([below](#markdown-round-trip)). Code:
[`src/lib/sync.ts`](../src/lib/sync.ts), [`src/lib/content-md.ts`](../src/lib/content-md.ts).

## Why the Contents API and not isomorphic-git

GitHub's git-over-HTTP endpoints do not send CORS headers, so a browser cannot clone or
push without a proxy — which would mean running a server. The REST Contents API does allow
browser requests with a token, serves files up to 1 MB inline as base64 (the snapshot is
tens of KB), and returns the file's blob `sha`, which doubles as an optimistic lock.

## One round — `runSync(io)`

1. **Pull** `GET /repos/{repo}/contents/manabi.manabi`. A 404 with an existing repository
   means "no file yet"; a 404 on the repository itself is reported as a configuration error.
2. **Merge** the remote snapshot into the local document with the backup merge
   (`mergeBackup`: union by id, newest wins, never deletes). With Markdown on, the content
   files are pulled next (first attempt only) and their **hand-edited sections applied** to
   the local document — before the comparison, so those edits ride along in the snapshot push.
3. **Compare** content fingerprints (`fingerprint`: SHA-256 over key-sorted JSON of every
   collection, settings excluded) of the remote snapshot and the merged local document.
   Equal → done, no commit. This is what keeps "sync on every start" free of noise commits.
4. **Push** `PUT …/contents/manabi.manabi` with the merged snapshot and the remote `sha`.
   A 409/422 means another device pushed in between → back to step 1, once.
5. **Write Markdown** (with Markdown on): every content file whose rendering differs from the
   repo's copy is `PUT` (one commit per file, `manabi: content/<lang>/items.md`); a conflict
   re-fetches, re-applies its hand edits and retries once.

`runSync` is pure over a `SyncIO` adapter (`fetchRemote / putRemote / load / merge / local /
snapshot`, plus an optional `content: ContentIO` — `paths / fetchText / putText / apply /
render`), so the decision logic is unit-tested with fakes in
[`sync.test.ts`](../src/lib/sync.test.ts); `githubIO` (with `githubContent` when
`settings.syncMarkdown` is on) is the real adapter. The result reports what was pulled, whether
the snapshot was pushed, and how many Markdown files were written.

## Markdown round-trip

With **Settings → Sync → Markdown** (`syncMarkdown`, on by default) each sync also keeps, per
language that has content, `content/<lang>/items.md` and `content/<lang>/passages.md`. They
hold **content only** — SRS progress, attempts and lessons stay in the snapshot, so review
sessions produce no Markdown commits.

```markdown
## 网络
<!-- id: seed-zh-internet · h: 1a2b3c4d -->
- reading: wǎngluò
- meaning: internet / network
- kind: word
- level: A2
- tags: tech, HSK3
- status: published
- tw: 網路
- twreading: wǎnglù
> 这里的网络很快。 | Zhèlǐ de wǎngluò hěn kuài. | The internet here is fast.
```

One `## heading` section per item (the heading is the `target`) or passage (the `title`);
fields as `- key: value` (items: `reading`, `transliteration`, `meaning`, `kind`, `level`,
`tags`, `status`, and for Chinese `tw` / `hk` / `twreading`; passages: `kind`, `level`, `tags`,
`intro`); examples and passage lines as `> target | reading | meaning | transliteration`, with a
passage speaker as a leading `**Name**`. `renderItems` / `parseItems` and `renderPassages` /
`parsePassages` are pure and tested, including every seed item and passage round-tripping.

**Only hand edits apply.** Each section's comment carries an FNV-1a hash of the body exactly as
Manabi rendered it (whitespace-insensitive). On the next pull a section whose body still matches
its hash is skipped, so an untouched file never overwrites newer edits made on another device;
a section whose body changed is applied (`applyItemEdits` / `applyPassageEdits`, through
`applyContentFile` in the store), bumping `updatedAt`. A section **without an id comment** is
new and becomes an item (if it has a meaning) or passage (if it has lines). **Deleting a
section deletes nothing**, and sections for another language are ignored. Audio refs on
examples and lines whose text did not change are kept. Files are rewritten only when the
rendering actually differs from what is in the repo.

## Triggers

`startAutoSync()` (root layout, right after `initDB`) restores the last-sync time, syncs on
start, and syncs again whenever the browser fires `online`. The review page calls
`maybeAutoSync()` when a session completes. All of these are no-ops unless a repository and
token are set **and** "Sync automatically" is on. **Sync now** in Settings calls
`syncNow()`, which coalesces concurrent calls and never throws — outcomes and errors land in
the `syncState` store, which the Settings page renders.

## Security

The token is stored in the document's settings like the OpenAI key. It is blanked in every
exported snapshot (`exportBackup`) and can never arrive through a merge (settings are not
merged). Use a **fine-grained** personal access token limited to the one sync repository
with only *Contents: read & write*.

## Limits

- Snapshots over 1 MB are refused (the Contents API returns no inline content for them);
  the app reports this clearly. Attempts are the part of the document that grows. The same
  1 MB limit applies to each Markdown file.
- Lessons are not in the Markdown (deferred); neither are drafts or settings.
- Concurrent edits to the *same* record on two devices are resolved by the merge rules
  (later `updatedAt` / later review wins), not by history.
