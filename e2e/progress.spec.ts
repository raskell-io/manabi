import { readFileSync } from 'node:fs';
import { test, expect, boot } from './fixtures';

test('progress: review forecast and practice calendar', async ({ page }) => {
	await page.clock.install({ time: new Date('2026-10-19T09:00:00') });
	await boot(page);
	// One reading session today.
	await page.goto('/review?mode=reading');
	for (;;) {
		await page.locator('.choice, .summary, .streak-screen').first().waitFor();
		if (await page.locator('.summary, .streak-screen').count()) break;
		await page.locator('.choice').first().click();
		await page.keyboard.press('Enter');
	}
	await page.goto('/dashboard');
	const days = page.locator('.forecast .day');
	await expect(days).toHaveCount(14);
	await expect(days.first()).toHaveAttribute('aria-label', /^Today: \d+ reviews?$/);
	await expect(page.locator('.forecast .readout')).toContainText('in the next 7 days');
	await days.nth(1).hover();
	await expect(page.locator('.forecast .readout')).toContainText('Tomorrow');

	await expect(page.locator('.calendar .readout')).toContainText('1 day practised');
	const today = page.locator('.calendar .grid .cell').last();
	await expect(today).toHaveAttribute('aria-label', /Monday, 19 October|Monday, October 19/);
	await expect(today).toHaveClass(/l4/);
	await page.locator('.calendar summary').click();
	await expect(page.locator('.calendar table tbody tr')).toHaveCount(1);
});

test('daily reminder: a calendar file at the chosen time', async ({ page }) => {
	await boot(page);
	await page.goto('/settings');
	await page.locator('label.time input').fill('07:30');
	await page.locator('label.time input').blur();
	const [download] = await Promise.all([page.waitForEvent('download'), page.locator('button', { hasText: 'Add to my calendar' }).click()]);
	expect(download.suggestedFilename()).toBe('manabi-reminder.ics');
	const ics = readFileSync((await download.path())!, 'utf8');
	expect(ics).toMatch(/DTSTART:\d{8}T073000/);
	expect(ics).toContain('RRULE:FREQ=DAILY');
});
