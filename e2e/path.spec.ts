import { test, expect, boot } from './fixtures';

test('learning path: stages, start, read, Refresher, Hebrew', async ({ page }) => {
	await boot(page);
	await expect(page.locator('a.strip')).toContainText('Stage 1: The four tones');
	await page.locator('a.strip').click();
	await expect(page.locator('.trail .stop')).toHaveCount(7);
	await expect(page.locator('p.sub')).toContainText('Beginner · HSK 1');
	await expect(page.locator('.how-body')).toHaveCount(1);
	await expect(page.locator('.panel')).toContainText(/you are here/i);
	await page.locator('.how-head').click();
	await expect(page.locator('.how-body')).toHaveCount(0);

	await page.locator('.panel .btn3d', { hasText: /Start/ }).click();
	await page.waitForURL(/\/review\?items=/);
	expect(page.url()).toMatch(/The\+four\+tones|The%20four%20tones/);
	await page.goto('/path');
	await expect(page.locator('.how-body')).toHaveCount(0); // stays collapsed

	await page.locator('.stop').nth(3).locator('.node').click();
	await page.locator('.panel .kicker', { hasText: /stage 4/i }).waitFor();
	const readBtn = page.locator('.panel a.btn3d', { hasText: 'Read' }).first();
	const href = await readBtn.getAttribute('href');
	await readBtn.click();
	await page.waitForURL(/\/read\//);
	await page.locator('.lines .line').last().scrollIntoViewIfNeeded();
	await page.mouse.wheel(0, 4000);
	await page.waitForTimeout(600);
	await page.goto('/read');
	await expect(page.locator(`a.card[href="${href}"] .read-mark`)).toHaveCount(1);
	await page.goto('/path');
	await expect(page.locator('.stop').nth(3)).toContainText('1 of 3 read');

	await page.locator('.path-card', { hasText: 'Refresher' }).click();
	await page.locator('.stop .label b', { hasText: 'Everyday words' }).waitFor();
	await expect(page.locator('p.sub')).toContainText('Refresher · HSK 2–3');
	await page.reload();
	await expect(page.locator('p.sub')).toContainText('Refresher');
	await page.goto('/');
	await expect(page.locator('a.strip .kicker')).toContainText(/Refresher/i);
	await expect(page.locator('a.strip')).toContainText('Everyday words');

	await page.goto('/path');
	await page.locator('.path-card', { hasText: 'Beginner' }).click();
	await page.locator('.stop .label b', { hasText: 'On to the Refresher' }).waitFor();
	await page.locator('.stop').last().locator('.node').click();
	await page.locator('.panel a', { hasText: 'Start the Refresher path' }).click();
	await page.locator('.stop .label b', { hasText: 'Everyday words' }).waitFor();
	expect(new URL(page.url()).search).toBe('');

	await page.locator('.langs button', { hasText: 'עברית' }).click();
	await expect(page.locator('p.sub')).toContainText('Beginner');
	await expect(page.locator('.stop .badge', { hasText: 'א' }).first()).toBeVisible();
	await expect(page.locator('h1')).toContainText('Your Hebrew path');
});
