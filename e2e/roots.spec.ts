import { test, expect, boot } from './fixtures';

test('Hebrew roots: list, search, detail, add, item page', async ({ page }) => {
	await boot(page);
	await page.goto('/roots');
	await page.locator('.empty button', { hasText: 'Hebrew' }).click();
	await page.locator('.tile').first().waitFor();
	expect(await page.locator('.tile').count()).toBeGreaterThanOrEqual(60);
	await expect(page.locator('.group-h', { hasText: 'In your words' })).toHaveCount(1);
	await page.fill('.search input', 'michtav');
	await expect(page.locator('.tile')).toHaveCount(1);
	await page.fill('.search input', 'כ-ת-ב');
	await expect(page.locator('.tile')).toHaveCount(1);
	await page.locator('.tile').first().click();
	await page.locator('.words .word').first().waitFor();
	expect((await page.locator('.letter').allInnerTexts()).join('')).toBe('כתב');
	await expect(page.locator('.word').nth(1).locator('.hl')).toHaveCount(3);
	await page.locator('.word').nth(1).locator('button.add').click();
	await page.locator('.word:nth-child(2) a.in').waitFor();
	await expect(page.locator('.words-head')).toContainText(/4 more/i);
	await page.locator('.words-head .btn3d').click();
	await page.locator('.all-in').waitFor();
	await expect(page.locator('.word a.in')).toHaveCount(5);
	await page.locator('.word').nth(1).locator('a.in').click();
	await page.locator('section.root').waitFor();
	await expect(page.locator('.root-chip')).toContainText('כ־ת־ב');
	await expect(page.locator('.root-word .hl')).toHaveCount(3);
	await expect(page.locator('.kin')).toHaveCount(4);

	await page.goto('/roots?r=lmd');
	await page.locator('.word a.in').first().click();
	await expect(page.locator('section.root')).toBeVisible();
	await page.goto('/radicals');
	await expect(page.locator('.roots-hint')).toBeVisible();
	await page.goto('/library');
	await expect(page.locator('main a[href="/roots"]').first()).toBeVisible();
});
