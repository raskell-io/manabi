/**
 * Install hint — a one-line, dismiss-once nudge to install the PWA.
 *
 * Shown only on Home, only after the learner has answered a few cards, never
 * when already running as an installed app, and never again once dismissed.
 * Chromium browsers hand us a `beforeinstallprompt` event we can replay from
 * an Install button; iOS Safari has no such event, so there the hint shows
 * the two Share-sheet steps instead. Browsers with neither get nothing.
 */

import { writable } from 'svelte/store';

/** Chromium's install prompt event (not in lib.dom). */
export interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const installPrompt = writable<BeforeInstallPromptEvent | null>(null);

const DISMISS_KEY = 'manabi-install-hint';
/** Answered cards before the hint may appear — a real session, not a first glance. */
export const MIN_ATTEMPTS = 5;

export type InstallHintKind = 'prompt' | 'ios';

/** Pure decision, so it is testable: which hint (if any) to show. */
export function decideInstallHint(env: {
	standalone: boolean;
	ios: boolean;
	hasPrompt: boolean;
	dismissed: boolean;
	attempts: number;
}): InstallHintKind | null {
	if (env.standalone || env.dismissed || env.attempts < MIN_ATTEMPTS) return null;
	if (env.hasPrompt) return 'prompt';
	if (env.ios) return 'ios';
	return null;
}

export function isStandalone(): boolean {
	if (typeof window === 'undefined') return false;
	const nav = navigator as Navigator & { standalone?: boolean };
	return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export function isIOS(): boolean {
	if (typeof navigator === 'undefined') return false;
	const ua = navigator.userAgent;
	// iPadOS Safari reports itself as a Mac; the touch points give it away.
	return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function wasInstallHintDismissed(): boolean {
	try {
		return localStorage.getItem(DISMISS_KEY) !== null;
	} catch {
		return false;
	}
}

export function dismissInstallHint(reason: 'dismissed' | 'installed' = 'dismissed'): void {
	try {
		localStorage.setItem(DISMISS_KEY, reason);
	} catch {
		/* storage unavailable — the hint will simply show again next time */
	}
}

let armed = false;
/** Capture Chromium's install prompt so we can show it from our own button. */
export function armInstallCapture(): void {
	if (armed || typeof window === 'undefined') return;
	armed = true;
	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		installPrompt.set(e as BeforeInstallPromptEvent);
	});
	window.addEventListener('appinstalled', () => {
		installPrompt.set(null);
		dismissInstallHint('installed');
	});
}

/** Replay the captured prompt. Resolves to whether the learner accepted. */
export async function promptInstall(ev: BeforeInstallPromptEvent): Promise<boolean> {
	await ev.prompt();
	const { outcome } = await ev.userChoice;
	installPrompt.set(null);
	if (outcome === 'accepted') dismissInstallHint('installed');
	return outcome === 'accepted';
}
