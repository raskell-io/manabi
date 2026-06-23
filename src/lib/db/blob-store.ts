/**
 * Binary blob storage for audio (synthesized pronunciation + recordings).
 *
 * Blobs live in their own IndexedDB object store, separate from the Automerge
 * document — putting binary data in the CRDT would bloat any future sync
 * payload and defeats the conflict-free semantics for data that never merges.
 * Ported from kurumi's blob-store.
 */

import { createStore, set, get, del, keys } from 'idb-keyval';
import { generateId } from './types';

const blobStore = createStore('manabi-blobs', 'blobs');

interface StoredBlob {
	blob: Blob;
	mimeType: string;
	size: number;
	createdAt: number;
}

/** Persist a blob and return a `blob:<id>` ref to store on an item. */
export async function storeBlob(blob: Blob, mimeType: string): Promise<string> {
	const id = generateId(16);
	const ref = `blob:${id}`;
	await set(ref, { blob, mimeType, size: blob.size, createdAt: Date.now() } satisfies StoredBlob, blobStore);
	return ref;
}

/** Retrieve a stored blob by ref. Returns null if missing. */
export async function getBlob(ref: string): Promise<{ blob: Blob; mimeType: string } | null> {
	const stored = await get<StoredBlob>(ref, blobStore);
	if (!stored) return null;
	return { blob: stored.blob, mimeType: stored.mimeType };
}

/** A playable object URL for a stored blob, or null if missing. */
export async function getBlobUrl(ref: string): Promise<string | null> {
	const found = await getBlob(ref);
	if (!found) return null;
	return URL.createObjectURL(found.blob);
}

/** Delete a stored blob. Safe with a missing ref. */
export async function deleteBlob(ref: string): Promise<void> {
	await del(ref, blobStore);
}

/** Whether a blob exists locally. */
export async function hasBlob(ref: string): Promise<boolean> {
	return (await get<StoredBlob>(ref, blobStore)) != null;
}

/** List every locally-stored blob ref. */
export async function listBlobRefs(): Promise<string[]> {
	return (await keys(blobStore)).map((k) => String(k));
}
