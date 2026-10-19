import { test, expect, boot, useLanguage } from './fixtures';

test('names: places, people, add, search, Hebrew RTL', async ({ page }) => {
	await boot(page);
	await page.goto('/names');
	await expect(page.locator('.section h2')).toHaveText(['Countries', 'Places in the Chinese-speaking world', 'World cities']);
	await page.locator('.tabs button', { hasText: 'People' }).click();
	await page.locator('.section h2', { hasText: 'Family names' }).waitFor();
	expect(new URL(page.url()).searchParams.get('tab')).toBe('people');
	expect(await page.locator('.g').count()).toBeGreaterThanOrEqual(10);

	const fam = page.locator('.section').first();
	await fam.locator('.card').first().locator('button.add').click();
	await fam.locator('.card').first().locator('a.in').waitFor();
	await expect(fam.locator('.s-head')).toContainText(/add 17/i);
	await fam.locator('.s-head .btn3d').click();
	await fam.locator('.all-in').waitFor();
	await expect(fam.locator('a.in')).toHaveCount(18);
	await fam.locator('.card').first().locator('a.in').click();
	await page.locator('.preview').waitFor();
	await expect(page.locator('input').nth(3)).toHaveValue('Wang (family name)');

	await page.goto('/names');
	await page.fill('.search input', 'northern capital');
	await expect(page.locator('.card')).toHaveCount(1);

	await useLanguage(page, 'עברית');
	await page.goto('/names');
	await expect(page.locator('main')).toContainText('Places in Israel');
	await expect(page.locator('.card .script').first()).toHaveAttribute('dir', 'rtl');
});
