import { test, expect, toSummary } from './fixtures';
import type { Page } from '@playwright/test';

/** One item (今天) taken through the days it takes to unlock dictation, context and typed recall. */
const session = (page: Page, mode: string) => page.goto(`/review?items=seed-zh-0&title=Today&mode=${mode}`);

async function gradeGood(page: Page) {
	await expect(page.locator('.grade.ok')).toBeVisible();
	await page.keyboard.press('Enter');
}

test('dictation, then typed recall, as the word matures', async ({ page, context }) => {
	// Deterministic shuffles and card choice (dictation needs rng ≥ 0.5).
	await context.addInitScript(() => {
		Math.random = () => 0.9;
	});
	await page.clock.install({ time: new Date('2026-10-20T08:00:00') });

	// Day 1: first recognition rep.
	await session(page, 'reading');
	await expect(page.locator('.instruction')).toHaveText('What does this mean?');
	await page.locator('.choice', { hasText: 'today' }).click();
	await gradeGood(page);
	await toSummary(page);

	// Listening is unlocked: a short example sentence to rebuild from tiles.
	await session(page, 'listening');
	await expect(page.locator('.instruction')).toHaveText('Build the sentence you hear');
	await expect(page.locator('.bank .tile')).toHaveCount(4);
	for (const w of ['我', '今天', '很', '忙']) await page.locator('.bank .tile:not(.used)', { hasText: new RegExp(`^${w}$`) }).click();
	await expect(page.locator('.reveal-meaning')).toHaveText('I am very busy today.');
	await gradeGood(page);
	await toSummary(page);

	// Day 2: second recognition rep (and the context card it unlocked).
	await page.clock.setSystemTime(new Date('2026-10-21T08:00:00'));
	await session(page, 'reading');
	for (;;) {
		await page.locator('.choice, .summary, .streak-screen, .goal-screen').first().waitFor();
		if (await page.locator('.summary, .streak-screen, .goal-screen').count()) break;
		const instruction = await page.locator('.instruction').innerText();
		await page.locator('.choice', { hasText: instruction.startsWith('What does') ? 'today' : '今天' }).first().click();
		await gradeGood(page);
	}

	// Day 3: recall is unlocked — type it.
	await page.clock.setSystemTime(new Date('2026-10-22T08:00:00'));
	await session(page, 'reading');
	await page.locator('.instruction', { hasText: 'Type the word' }).waitFor();
	await expect(page.locator('.big-meaning')).toHaveText('today');
	await page.locator('.typed input').fill('jintian');
	await page.locator('.typed button[type=submit]').click();
	await expect(page.locator('.feedback')).toContainText('Almost!');
	await expect(page.locator('.answer-line')).toContainText('add the tones');
	await expect(page.locator('.answer-line')).toContainText('今天');
	await expect(page.locator('.grade-row button')).toHaveCount(3); // still counts as right
});

test('typed recall: "I don\'t know" shows the answer', async ({ page, context }) => {
	await context.addInitScript(() => {
		Math.random = () => 0.1;
	});
	await page.clock.install({ time: new Date('2026-10-20T08:00:00') });
	for (const day of ['2026-10-20', '2026-10-21']) {
		await page.clock.setSystemTime(new Date(`${day}T08:00:00`));
		await session(page, 'reading');
		for (;;) {
			await page.locator('.choice, .summary, .streak-screen, .goal-screen').first().waitFor();
			if (await page.locator('.summary, .streak-screen, .goal-screen').count()) break;
			const instruction = await page.locator('.instruction').innerText();
			await page.locator('.choice', { hasText: instruction.startsWith('What does') ? 'today' : '今天' }).first().click();
			await gradeGood(page);
		}
	}
	await page.clock.setSystemTime(new Date('2026-10-22T08:00:00'));
	await session(page, 'reading');
	await page.locator('.typed').waitFor();
	await page.locator('.typed button', { hasText: "I don't know" }).click();
	await expect(page.locator('.grade.no')).toBeVisible();
	await expect(page.locator('.answer-line')).toContainText('今天');
	await expect(page.locator('.answer-reading')).toHaveText('jīntiān');
	await page.keyboard.press('Enter');
	await expect(page.locator('.grade')).toHaveCount(0); // on to the next card
});
