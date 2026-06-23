/**
 * Manabi store.
 *
 * Owns the single Automerge document, persists it to IndexedDB via idb-keyval,
 * and exposes reactive Svelte stores plus CRUD / SRS / draft operations.
 * Persistence + change pattern ported from kurumi (`Automerge.change` →
 * `docStore.set` → fire-and-forget `saveDoc`).
 */

import * as Automerge from '@automerge/automerge';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { derived, writable, type Readable } from 'svelte/store';
import { deleteBlob } from './blob-store';
import { seedsToApply } from './seed';
import { gradeDimension, isPass } from '$lib/srs/schedule';
import { buildQueue, type QueueSummary } from '$lib/srs/queue';
import {
	createEmptyDocument,
	defaultSettings,
	freshSkillMemory,
	generateId,
	SCHEMA_VERSION,
	type ContentDraft,
	type Dimension,
	type ExerciseAttempt,
	type ExerciseType,
	type GeneratedItem,
	type ItemKind,
	type Language,
	type LearningItem,
	type Lesson,
	type ManabiDocument,
	type ManabiSettings,
	type PronunciationAttempt,
	type SelfRating,
	type SkillMemory
} from './types';

const STORAGE_KEY = 'manabi-doc';

let doc: Automerge.Doc<ManabiDocument>;
const docStore = writable<Automerge.Doc<ManabiDocument> | null>(null);

// --- Derived stores ---------------------------------------------------------

export const settings: Readable<ManabiSettings> = derived(
	docStore,
	($doc) => $doc?.settings ?? defaultSettings()
);

export const activeLanguage: Readable<Language> = derived(
	settings,
	($s) => $s.activeLanguage
);

/** Every item, newest first. */
export const allItems: Readable<LearningItem[]> = derived(docStore, ($doc) => {
	if (!$doc) return [];
	return Object.values($doc.learningItems).sort((a, b) => b.updatedAt - a.updatedAt);
});

/** Published items in the active language. */
export const activeItems: Readable<LearningItem[]> = derived(
	[docStore, activeLanguage],
	([$doc, $lang]) => {
		if (!$doc) return [];
		return Object.values($doc.learningItems)
			.filter((it) => it.language === $lang && it.status === 'published')
			.sort((a, b) => b.updatedAt - a.updatedAt);
	}
);

export const lessons: Readable<Lesson[]> = derived(docStore, ($doc) => {
	if (!$doc) return [];
	return Object.values($doc.lessons).sort((a, b) => b.createdAt - a.createdAt);
});

/** Pending drafts first, then decided ones (audit trail), newest first. */
export const contentDrafts: Readable<ContentDraft[]> = derived(docStore, ($doc) => {
	if (!$doc) return [];
	const order: Record<ContentDraft['status'], number> = { pending: 0, approved: 1, rejected: 2 };
	return Object.values($doc.contentDrafts).sort((a, b) => {
		const s = order[a.status] - order[b.status];
		return s !== 0 ? s : b.createdAt - a.createdAt;
	});
});

export const exerciseAttempts: Readable<ExerciseAttempt[]> = derived(docStore, ($doc) => {
	if (!$doc) return [];
	return Object.values($doc.exerciseAttempts).sort((a, b) => b.at - a.at);
});

export const skillMemories: Readable<SkillMemory[]> = derived(docStore, ($doc) => {
	if (!$doc) return [];
	return Object.values($doc.srsStates);
});

/** Live due/new counts for the active language (recomputed on every change). */
export const reviewSummary: Readable<QueueSummary> = derived(docStore, ($doc) => {
	if (!$doc) return { dueReviews: 0, newItems: 0, tasks: [] };
	return buildQueue($doc, $doc.settings);
});

/** Build a stable queue snapshot for a review session (call once at start). */
export function snapshotQueue(): QueueSummary {
	if (!doc) return { dueReviews: 0, newItems: 0, tasks: [] };
	return buildQueue(doc, doc.settings);
}

// --- Init / persistence -----------------------------------------------------

export async function initDB(): Promise<void> {
	try {
		const saved = await idbGet<Uint8Array>(STORAGE_KEY);
		doc = saved
			? migrate(Automerge.load<ManabiDocument>(saved))
			: Automerge.from<ManabiDocument>(createEmptyDocument());
		applyNewSeeds();
		docStore.set(doc);
		await saveDoc();
	} catch (err) {
		console.error('Failed to initialize Manabi database:', err);
		doc = Automerge.from<ManabiDocument>(createEmptyDocument());
		applyNewSeeds();
		docStore.set(doc);
		await saveDoc();
	}
}

/** Forward-only migrations. */
function migrate(d: Automerge.Doc<ManabiDocument>): Automerge.Doc<ManabiDocument> {
	let next = d;
	if ((next.schemaVersion ?? 0) < 2) {
		next = Automerge.change(next, (doc) => {
			if (!doc.settings) doc.settings = defaultSettings();
			if (!doc.seededIds) doc.seededIds = {};
			doc.schemaVersion = SCHEMA_VERSION;
		});
	}
	return next;
}

/**
 * Idempotently add any built-in seed items not yet applied to this document.
 * Tracked via `seededIds` so new releases' content reaches existing users
 * without re-adding items they've since deleted.
 */
function applyNewSeeds(): void {
	const missing = seedsToApply(doc.seededIds);
	if (missing.length === 0) return;
	doc = Automerge.change(doc, (d) => {
		if (!d.seededIds) d.seededIds = {};
		for (const it of missing) {
			if (!d.learningItems[it.id]) d.learningItems[it.id] = stripUndefined(it);
			d.seededIds[it.id] = true;
		}
	});
}

async function saveDoc(d: Automerge.Doc<ManabiDocument> = doc): Promise<void> {
	await idbSet(STORAGE_KEY, Automerge.save(d));
}

/**
 * Automerge rejects `undefined` values. Deeply drop undefined-valued keys
 * (e.g. optional `transliteration`/`audioRef`) before writing into the doc.
 */
function stripUndefined<T>(value: T): T {
	if (Array.isArray(value)) return value.map((v) => stripUndefined(v)) as unknown as T;
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			if (v === undefined) continue;
			out[k] = stripUndefined(v);
		}
		return out as T;
	}
	return value;
}

function updateDoc(changeFn: (doc: ManabiDocument) => void): void {
	if (!doc) {
		console.error('Manabi database not initialized');
		return;
	}
	doc = Automerge.change(doc, changeFn);
	docStore.set(doc);
	void saveDoc();
}

// --- Settings ---------------------------------------------------------------

export function updateSettings(patch: Partial<ManabiSettings>): void {
	updateDoc((d) => {
		Object.assign(d.settings, patch);
	});
}

export function setActiveLanguage(language: Language): void {
	updateSettings({ activeLanguage: language });
}

// --- Item CRUD --------------------------------------------------------------

export interface NewItemInput extends GeneratedItem {
	language: Language;
	kind?: ItemKind;
	status?: LearningItem['status'];
}

export function createItem(input: NewItemInput): string {
	const id = generateId();
	const now = Date.now();
	updateDoc((d) => {
		d.learningItems[id] = stripUndefined({
			id,
			language: input.language,
			kind: input.kind ?? 'word',
			target: input.target,
			reading: input.reading,
			transliteration: input.transliteration,
			meaning: input.meaning,
			tags: input.tags ?? [],
			level: input.level ?? 'A1',
			examples: input.examples ?? [],
			status: input.status ?? 'published',
			createdAt: now,
			updatedAt: now
		});
	});
	return id;
}

export function updateItem(id: string, patch: Partial<LearningItem>): void {
	updateDoc((d) => {
		const item = d.learningItems[id];
		if (!item) return;
		for (const [k, v] of Object.entries(patch)) {
			if (k === 'id' || k === 'createdAt') continue;
			if (v === undefined) {
				delete (item as Record<string, unknown>)[k];
				continue;
			}
			(item as Record<string, unknown>)[k] = stripUndefined(v);
		}
		item.updatedAt = Date.now();
	});
}

export function deleteItem(id: string): void {
	const item = doc?.learningItems[id];
	const audioRefs: string[] = [];
	if (item) {
		if (item.audioRef) audioRefs.push(item.audioRef);
		for (const ex of item.examples) if (ex.audioRef) audioRefs.push(ex.audioRef);
	}
	updateDoc((d) => {
		delete d.learningItems[id];
		delete d.srsStates[id];
	});
	for (const ref of audioRefs) void deleteBlob(ref);
}

export function getItem(id: string): LearningItem | undefined {
	return doc?.learningItems[id];
}

export function getDoc(): ManabiDocument | undefined {
	return doc;
}

// --- SRS --------------------------------------------------------------------

export function getSkillMemory(itemId: string): SkillMemory | undefined {
	return doc?.srsStates[itemId];
}

/**
 * Apply an SM-2 grade to one dimension of an item and log the attempt.
 * Creates the SkillMemory lazily on first review.
 */
export function gradeItem(
	itemId: string,
	dimension: Dimension,
	quality: number,
	exerciseType: ExerciseType,
	expected: string,
	chosen?: string
): void {
	const item = doc?.learningItems[itemId];
	if (!item) return;
	updateDoc((d) => {
		let srs = d.srsStates[itemId];
		if (!srs) {
			d.srsStates[itemId] = freshSkillMemory(itemId);
			srs = d.srsStates[itemId];
		}
		srs.dims[dimension] = gradeDimension(srs.dims[dimension], quality);
		srs.updatedAt = Date.now();

		const attemptId = generateId();
		d.exerciseAttempts[attemptId] = stripUndefined({
			id: attemptId,
			itemId,
			language: item.language,
			dimension,
			exerciseType,
			correct: isPass(quality),
			quality,
			chosen,
			expected,
			at: Date.now()
		});
	});
}

// --- Pronunciation ----------------------------------------------------------

export function recordPronunciationAttempt(
	itemId: string,
	audioRef: string,
	selfRating: SelfRating
): void {
	updateDoc((d) => {
		const id = generateId();
		d.pronunciationAttempts[id] = { id, itemId, audioRef, selfRating, at: Date.now() };
	});
	// A self-rating also feeds the pronunciation SRS dimension.
	const quality = selfRating === 'good' ? 5 : selfRating === 'okay' ? 3 : 1;
	gradeItem(itemId, 'pronunciation', quality, 'record-compare', itemId);
}

// --- Lessons ----------------------------------------------------------------

export function createLesson(title: string, language: Language, itemIds: string[]): string {
	const id = generateId();
	updateDoc((d) => {
		d.lessons[id] = { id, title, language, itemIds, createdAt: Date.now() };
	});
	return id;
}

export function deleteLesson(id: string): void {
	updateDoc((d) => {
		delete d.lessons[id];
	});
}

// --- AI content drafts ------------------------------------------------------

export function addDrafts(language: Language, kind: ItemKind, items: GeneratedItem[], sourcePrompt: string): number {
	updateDoc((d) => {
		for (const item of items) {
			const id = generateId();
			d.contentDrafts[id] = stripUndefined({
				id,
				language,
				kind,
				item,
				sourcePrompt,
				status: 'pending' as const,
				createdAt: Date.now()
			});
		}
	});
	return items.length;
}

/** Approve a draft: publish it as a LearningItem and mark the draft approved. */
export function approveDraft(draftId: string): string | undefined {
	const draft = doc?.contentDrafts[draftId];
	if (!draft || draft.status !== 'pending') return undefined;
	const newId = createItem({
		language: draft.language,
		kind: draft.kind,
		...draft.item,
		status: 'published'
	});
	updateDoc((d) => {
		const dr = d.contentDrafts[draftId];
		if (dr) dr.status = 'approved';
	});
	return newId;
}

export function rejectDraft(draftId: string): void {
	updateDoc((d) => {
		const dr = d.contentDrafts[draftId];
		if (dr) dr.status = 'rejected';
	});
}

export function deleteDraft(draftId: string): void {
	updateDoc((d) => {
		delete d.contentDrafts[draftId];
	});
}
