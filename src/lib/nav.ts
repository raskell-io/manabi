/**
 * Navigation model — one definition for the phone tab bar, the desktop
 * sidebar and the Library hub.
 *
 * Five primary destinations (Home · Review · Read · Library · Progress) fit a
 * thumb-sized bottom bar; everything else lives under Library (a hub page)
 * or behind the Settings gear. Keep this list short on purpose.
 */

import {
	Home,
	GraduationCap,
	BookOpen,
	LayoutGrid,
	BarChart3,
	Table2,
	BookA,
	Library,
	Layers,
	Sparkles
} from 'lucide-svelte';

export interface NavItem {
	href: string;
	label: string;
	/** A lucide-svelte icon (all icons share Home's component signature). */
	icon: typeof Home;
	/** One-line description for hub cards. */
	description?: string;
	/** Paths (prefixes) that count as "inside" this destination. */
	match?: string[];
}

export const LIBRARY: NavItem[] = [
	{ href: '/scripts', label: 'Scripts', icon: Table2, description: 'Kana, kanji, hanzi, Hangul and the alef-bet — tap a glyph to study it.' },
	{ href: '/vocab', label: 'Vocab', icon: BookA, description: 'Full HSK and JLPT word lists, by level.' },
	{ href: '/items', label: 'Items', icon: Library, description: 'Everything you are studying. Search, edit, review a selection.' },
	{ href: '/lessons', label: 'Lessons', icon: Layers, description: 'Your own bundles of items, each reviewable on its own.' },
	{ href: '/workbench', label: 'Workbench', icon: Sparkles, description: 'Generate words and passages with AI, then approve what you keep.' }
];

export const PRIMARY: NavItem[] = [
	{ href: '/', label: 'Home', icon: Home },
	{ href: '/review', label: 'Review', icon: GraduationCap },
	{ href: '/read', label: 'Read', icon: BookOpen },
	{ href: '/library', label: 'Library', icon: LayoutGrid, match: ['/library', ...LIBRARY.map((l) => l.href)] },
	{ href: '/dashboard', label: 'Progress', icon: BarChart3 }
];

/** Whether `path` is inside a destination (Home is exact; others match by prefix). */
export function isNavActive(item: Pick<NavItem, 'href' | 'match'>, path: string): boolean {
	if (item.href === '/') return path === '/';
	const prefixes = item.match ?? [item.href];
	return prefixes.some((p) => path === p || path.startsWith(p + '/'));
}
