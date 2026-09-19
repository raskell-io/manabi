/**
 * Backup merge.
 *
 * Every device creates its own Automerge document (random actor, own root
 * change), so two devices never share history. `Automerge.merge` would treat
 * their root collections as *conflicting assignments* — one side's
 * `learningItems` map would silently win and the other's would be dropped.
 * Backups are therefore merged *semantically*, collection by collection:
 * union by id, and where a record exists on both sides the more recent one
 * wins. An import never deletes anything.
 *
 * `mergeInto` is pure over plain objects so it can run inside
 * `Automerge.change` (the store) and in unit tests alike.
 */

import { DIMENSIONS, type DimState, type ManabiDocument } from './types';

export interface MergeSummary {
	items: { added: number; updated: number };
	srs: { added: number; updated: number };
	attempts: number;
	lessons: { added: number; updated: number };
	passages: { added: number; updated: number };
	drafts: { added: number; updated: number };
}

export function emptySummary(): MergeSummary {
	return {
		items: { added: 0, updated: 0 },
		srs: { added: 0, updated: 0 },
		attempts: 0,
		lessons: { added: 0, updated: 0 },
		passages: { added: 0, updated: 0 },
		drafts: { added: 0, updated: 0 }
	};
}

function isRecord(v: unknown): v is Record<string, unknown> {
	return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** Structural check that a loaded document is a Manabi document. */
export function isManabiDocument(x: unknown): x is ManabiDocument {
	if (!isRecord(x)) return false;
	return (
		typeof x.schemaVersion === 'number' && isRecord(x.learningItems) && isRecord(x.srsStates)
	);
}

/**
 * Plain deep copy via JSON: drops Automerge internals and undefined-valued
 * keys, so the result can be assigned into another document.
 */
export function plain<T>(v: T): T {
	return JSON.parse(JSON.stringify(v)) as T;
}

/** Deterministic JSON: object keys sorted at every level, undefined dropped. */
export function stableStringify(v: unknown): string {
	if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
	if (v && typeof v === 'object') {
		const o = v as Record<string, unknown>;
		return (
			'{' +
			Object.keys(o)
				.sort()
				.filter((k) => o[k] !== undefined)
				.map((k) => JSON.stringify(k) + ':' + stableStringify(o[k]))
				.join(',') +
			'}'
		);
	}
	return JSON.stringify(v) ?? 'null';
}

/** A record without its timestamps (seeds get `Date.now()` per device). */
function stripTs<T extends object>(r: T): T {
	const c = { ...plain(r) } as Record<string, unknown>;
	delete c.createdAt;
	delete c.updatedAt;
	return c as T;
}

/**
 * The synced part of a document, normalized so that two devices holding the
 * same *meaning* produce the same fingerprint: settings left out, record
 * timestamps dropped, lesson item lists order-insensitive. Must agree with
 * `mergeInto`: whatever a merge treats as "nothing to do" fingerprints equal.
 */
export function contentOf(doc: ManabiDocument): Record<string, unknown> {
	const map = <T extends object>(
		coll: Record<string, T> | undefined,
		f: (r: T) => unknown = stripTs
	) => Object.fromEntries(Object.entries(coll ?? {}).map(([k, v]) => [k, f(v)]));
	return {
		learningItems: map(doc.learningItems),
		lessons: map(doc.lessons, (l) => ({ ...stripTs(l), itemIds: [...l.itemIds].sort() })),
		passages: map(doc.passages),
		srsStates: map(doc.srsStates),
		exerciseAttempts: doc.exerciseAttempts ?? {},
		pronunciationAttempts: doc.pronunciationAttempts ?? {},
		contentDrafts: map(doc.contentDrafts),
		passageDrafts: map(doc.passageDrafts),
		seededIds: doc.seededIds ?? {}
	};
}

/** SHA-256 hex of a document's synced content — equal ⇔ nothing to sync. */
export async function fingerprint(doc: ManabiDocument): Promise<string> {
	const data = new TextEncoder().encode(stableStringify(contentOf(doc)));
	const hash = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

function entries<T>(coll: Record<string, T> | undefined): [string, T][] {
	return coll ? Object.entries(coll) : [];
}

/**
 * Whether the other side's record should replace ours: newer `updatedAt`
 * wins; identical content (timestamps aside) is never a change; an exact
 * timestamp tie is broken deterministically so both devices converge.
 */
function otherRecordWins(
	mine: { updatedAt: number } & object,
	other: { updatedAt: number } & object
): boolean {
	const m = stableStringify(stripTs(mine));
	const o = stableStringify(stripTs(other));
	if (m === o) return false;
	if (other.updatedAt !== mine.updatedAt) return other.updatedAt > mine.updatedAt;
	return o > m;
}

/**
 * Whether the other side's dimension state should replace ours: later review
 * wins, then more repetitions; an exact tie (same day, same count, e.g. graded
 * on both devices before a sync) is broken deterministically.
 */
function otherDimWins(local: DimState, other: DimState): boolean {
	const l = local.lastReviewed ?? '';
	const o = other.lastReviewed ?? '';
	if (o !== l) return o > l;
	if (other.repetitions !== local.repetitions) return other.repetitions > local.repetitions;
	return stableStringify(other) > stableStringify(local);
}

/** Draft outcomes: an approval (it published an item) beats a rejection beats pending. */
const DRAFT_RANK = { pending: 0, rejected: 1, approved: 2 } as const;

/**
 * Merge `other` into `local` (mutating `local`) and report what changed.
 * Records that exist on both sides: items/passages → newer `updatedAt` wins
 * (only if the content actually differs); SRS → per skill, the more recently
 * reviewed state wins and `lapses` takes the max; lessons → item ids are
 * unioned; drafts → approved beats rejected beats pending; attempts
 * and `seededIds` are unioned. Settings are never touched.
 */
export function mergeInto(local: ManabiDocument, other: ManabiDocument): MergeSummary {
	const s = emptySummary();

	for (const [id, it] of entries(other.learningItems)) {
		const mine = local.learningItems[id];
		if (!mine) {
			local.learningItems[id] = plain(it);
			s.items.added++;
		} else if (otherRecordWins(mine, it)) {
			local.learningItems[id] = plain(it);
			s.items.updated++;
		}
	}

	for (const [id, sm] of entries(other.srsStates)) {
		const mine = local.srsStates[id];
		if (!mine) {
			local.srsStates[id] = plain(sm);
			s.srs.added++;
			continue;
		}
		let changed = false;
		for (const dim of DIMENSIONS) {
			const o = sm.dims?.[dim];
			if (!o) continue;
			const l = mine.dims[dim];
			if (!l) {
				mine.dims[dim] = plain(o);
				changed = true;
				continue;
			}
			const lapses = Math.max(l.lapses ?? 0, o.lapses ?? 0);
			if (otherDimWins(l, o)) {
				mine.dims[dim] = { ...plain(o), lapses };
				changed = true;
			} else if (lapses !== l.lapses) {
				l.lapses = lapses;
				changed = true;
			}
		}
		if (changed) {
			mine.updatedAt = Math.max(mine.updatedAt, sm.updatedAt ?? 0);
			s.srs.updated++;
		}
	}

	for (const [id, a] of entries(other.exerciseAttempts)) {
		if (!local.exerciseAttempts[id]) {
			local.exerciseAttempts[id] = plain(a);
			s.attempts++;
		}
	}
	for (const [id, a] of entries(other.pronunciationAttempts)) {
		if (!local.pronunciationAttempts[id]) {
			local.pronunciationAttempts[id] = plain(a);
			s.attempts++;
		}
	}

	for (const [id, l] of entries(other.lessons)) {
		const mine = local.lessons[id];
		if (!mine) {
			local.lessons[id] = plain(l);
			s.lessons.added++;
			continue;
		}
		const missing = l.itemIds.filter((x) => !mine.itemIds.includes(x));
		if (missing.length) {
			mine.itemIds.push(...missing);
			s.lessons.updated++;
		}
	}

	if (!local.passages) local.passages = {};
	for (const [id, p] of entries(other.passages)) {
		const mine = local.passages[id];
		if (!mine) {
			local.passages[id] = plain(p);
			s.passages.added++;
		} else if (otherRecordWins(mine, p)) {
			local.passages[id] = plain(p);
			s.passages.updated++;
		}
	}

	for (const [id, dr] of entries(other.contentDrafts)) {
		const mine = local.contentDrafts[id];
		if (!mine) {
			local.contentDrafts[id] = plain(dr);
			s.drafts.added++;
		} else if (DRAFT_RANK[dr.status] > DRAFT_RANK[mine.status]) {
			mine.status = dr.status;
			s.drafts.updated++;
		}
	}
	if (!local.passageDrafts) local.passageDrafts = {};
	for (const [id, dr] of entries(other.passageDrafts)) {
		const mine = local.passageDrafts[id];
		if (!mine) {
			local.passageDrafts[id] = plain(dr);
			s.drafts.added++;
		} else if (DRAFT_RANK[dr.status] > DRAFT_RANK[mine.status]) {
			mine.status = dr.status;
			s.drafts.updated++;
		}
	}

	if (!local.seededIds) local.seededIds = {};
	for (const id of Object.keys(other.seededIds ?? {})) local.seededIds[id] = true;

	return s;
}
