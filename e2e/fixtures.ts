import { test as base, expect, type Page } from '@playwright/test';

/**
 * `test` that fails on any uncaught page error or console error — the class of
 * bug svelte-check can't see (e.g. a `?` left in a compiled .svelte script).
 * 404s are expected (optional audio / stroke data probes).
 */
export const test = base.extend<{ pageErrors: string[] }>({
	pageErrors: [
		async ({ page }, use) => {
			const errors: string[] = [];
			page.on('pageerror', (e) => errors.push(e.message));
			page.on('console', (m) => {
				if (m.type() === 'error' && !/404|Failed to load resource|sw\.js/.test(m.text())) errors.push(m.text());
			});
			await use(errors);
			expect(errors, 'page / console errors').toEqual([]);
		},
		{ auto: true }
	]
});

export { expect };

/** Open Home and wait until the app has booted (seeded DB, language chips). */
export async function boot(page: Page): Promise<void> {
	await page.goto('/');
	await page.waitForSelector('.langs');
	await expect(page.locator('.splash')).toHaveCount(0);
}

/** Switch the active language from Home. */
export async function useLanguage(page: Page, native: '中文' | '廣東話' | '日本語' | '한국어' | 'עברית'): Promise<void> {
	await boot(page);
	await page.locator('.langs .lang-chip', { hasText: native }).click();
}

/** Collapse whitespace (innerText keeps line breaks). */
export const squish = (s: string) => s.replace(/\s+/g, ' ').trim();

/** After a session's last card: past the streak and daily-goal screens (when they show) to the summary. */
export async function toSummary(page: Page): Promise<void> {
	for (;;) {
		await page.locator('.summary, .streak-screen, .goal-screen').first().waitFor();
		const screen = page.locator('.streak-screen, .goal-screen');
		if (!(await screen.count())) break;
		await screen.locator('button', { hasText: 'Continue' }).click();
	}
	await page.locator('.summary').waitFor();
}
