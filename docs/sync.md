# GitHub sync

Manabi has no server, so multi-device sync piggybacks on a **private GitHub repository**:
the backup snapshot (`manabi.manabi`, see [Data model → Backup & merge](./data-model.md#backup--merge))
is stored as a file in that repo and read/written from the browser through the GitHub
**Contents API**. Code: [`src/lib/sync.ts`](../src/lib/sync.ts).

## Why the Contents API and not isomorphic-git

GitHub's git-over-HTTP endpoints do not send CORS headers, so a browser cannot clone or
push without a proxy — which would mean running a server. The REST Contents API does allow
browser requests with a token, serves files up to 1 MB inline as base64 (the snapshot is
tens of KB), and returns the file's blob `sha`, which doubles as an optimistic lock.

## One round — `runSync(io)`

1. **Pull** `GET /repos/{repo}/contents/manabi.manabi`. A 404 with an existing repository
   means "no file yet"; a 404 on the repository itself is reported as a configuration error.
2. **Merge** the remote snapshot into the local document with the backup merge
   (`mergeBackup`: union by id, newest wins, never deletes).
3. **Compare** content fingerprints (`fingerprint`: SHA-256 over key-sorted JSON of every
   collection, settings excluded) of the remote snapshot and the merged local document.
   Equal → done, no commit. This is what keeps "sync on every start" free of noise commits.
4. **Push** `PUT …/contents/manabi.manabi` with the merged snapshot and the remote `sha`.
   A 409/422 means another device pushed in between → back to step 1, once.

`runSync` is pure over a `SyncIO` adapter (`fetchRemote / putRemote / load / merge / local /
snapshot`), so the decision logic is unit-tested with fakes in
[`sync.test.ts`](../src/lib/sync.test.ts); `githubIO` is the real adapter.

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
  the app reports this clearly. Attempts are the part of the document that grows.
- Concurrent edits to the *same* record on two devices are resolved by the merge rules
  (later `updatedAt` / later review wins), not by history.
