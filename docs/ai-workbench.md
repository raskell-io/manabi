# AI content workbench

The workbench (`/workbench`) generates new vocabulary items and reading passages with an
LLM, into a **human-review queue** — nothing is added to your study set until you approve
it. This mirrors kurumi's proposal-review pattern. It is entirely optional; the app is
fully usable without it.

Source: [`src/lib/inference/`](../src/lib/inference/),
[`src/routes/workbench/+page.svelte`](../src/routes/workbench/+page.svelte).

## Prerequisite: an OpenAI key

Generation calls OpenAI **directly from your browser** using a key you enter in **Settings**
(`openaiApiKey`, with `openaiModel` defaulting to `gpt-4o`). The key is stored in the
Automerge document on your device and never committed or sent anywhere else.
`canGenerate(settings)` gates the UI on a key being present.

## The inference router

[`router.ts`](../src/lib/inference/router.ts) is a small provider abstraction (the
`InferenceProvider` interface in [`types.ts`](../src/lib/inference/types.ts)) with two task
families:

| Task | Routing | Provider |
| --- | --- | --- |
| `generateItems` | remote only | OpenAI (JSON mode) |
| `generatePassages` | remote only | OpenAI (JSON mode) |
| `synthesize` (TTS) | local-first, then remote | MMS (local) → OpenAI |

```ts
synthesize(input, settings)       // TTS — local MMS first, OpenAI fallback
generateItems(input, settings)    // vocab drafts (OpenAI JSON)
generatePassages(input, settings) // reading drafts (OpenAI JSON)
canGenerate(settings) / canSynthesize(settings)  // capability checks
```

Generation is **OpenAI-only** (it needs reliable JSON output). TTS is **local-first** by
design, but in practice the local path does not load, so audio is handled by the
[prerecording pipeline](./audio.md) instead — the router's TTS path is a fallback that
rarely fires.

Providers live in [`providers/openai.ts`](../src/lib/inference/providers/openai.ts) (chat
JSON-mode generation + a TTS endpoint) and
[`providers/tts-local.ts`](../src/lib/inference/providers/tts-local.ts) (transformers.js
MMS). [`local-models.ts`](../src/lib/inference/local-models.ts) is the local model registry.

## Generation → validation → draft

Both modes return raw model output that is **validated and normalized** before it can enter
the document:

- `validateGeneratedItems` / `validateGeneratedPassages` (re-exported from
  [`index.ts`](../src/lib/inference/index.ts)) check shape, language, and required fields,
  dropping anything malformed. `passages.test.ts` covers the passage validator.
- Valid candidates become `ContentDraft`s (`addDrafts`) or `PassageDraft`s
  (`addPassageDrafts`) in the document, with status `pending`.

## The review queue

`/workbench` has a **Vocabulary | Reading** switch:

- **Vocabulary mode** — generate `GeneratedItem`s for a prompt/topic → `contentDrafts`.
- **Reading mode** — generate conversations/texts → `passageDrafts`.

Each draft is shown for review (keyboard shortcuts, approve/reject):

| Action | Store call | Effect |
| --- | --- | --- |
| Approve item | `approveDraft(id)` | publishes a `LearningItem` (status `published`), enters the SRS pool |
| Reject item | `rejectDraft(id)` / `deleteDraft(id)` | discards the draft |
| Approve passage | `approvePassageDraft(id)` | publishes a `Passage` to `/read` |
| Reject passage | `rejectPassageDraft(id)` | discards the draft |

Approved items immediately become reviewable ([SRS](./srs.md)); approved passages appear in
[Read](./user-guide.md). Generated items do **not** have prerecorded audio until you
re-run the [audio pipeline](./audio.md) over the new texts.

## Extending

- **Add a provider** (e.g. a local LLM, or another API): implement the `InferenceProvider`
  interface in a new `providers/*.ts`, register it in `router.ts`, and decide its routing
  priority. The router already separates `local`/`remote` execution targets.
- **Change the generation prompt / schema**: edit `providers/openai.ts` and the matching
  `validateGenerated*` function and `Generated*` type. Keep the validator strict — it is the
  only thing between model output and your document.
- **Add a generation mode**: add a task to the router + types, a `validate*` function, a
  draft collection ([data model](./data-model.md)), and a tab in the workbench page.

## Testing without a key

The end-to-end flow is verifiable by stubbing the OpenAI `fetch` in a headless browser
(the mock must handle the CORS preflight `OPTIONS` and return CORS headers). The validators
themselves are plain unit tests (`passages.test.ts`).

## Other router tasks: Hebrew diacritization & transcription

The same router serves two more OpenAI-only tasks (both advertised through
`ProviderCapabilities` and implemented in `providers/openai.ts`):

- **`diacritize({ texts })`** — adds niqqud to bare Hebrew strings (Chat Completions, JSON
  mode, temperature 0). The provider only checks the shape; [`src/lib/hebrew.ts`](../src/lib/hebrew.ts)
  does the real validation: a pointed string is accepted only if stripping its marks gives
  back exactly the input (`acceptDiacritized`), so the model can never rewrite letters.
  `diacritizeItems` / `diacritizePassages` batch a whole generation into one request and only
  send strings that `needsNiqqud` (two or more Hebrew letters, no marks). Used by the item
  editor's **Add vowels (AI)** button and automatically by the Workbench for Hebrew output.
- **`transcribe({ audio, language })`** — sends a learner's recording (multipart) to the
  transcription endpoint with the language hint; for Chinese a neutral Simplified-script
  prompt keeps the output in the same script as the items. Gated by the **Pronunciation**
  setting (`asrScoring`). Scoring is pure and lives in
  [`src/lib/pronunciation.ts`](../src/lib/pronunciation.ts) — see [SRS → Pronunciation
  scoring](./srs.md#pronunciation-scoring-asr).
