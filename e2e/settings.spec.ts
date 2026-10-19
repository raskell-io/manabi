import { test, expect, boot } from './fixtures';

test('on-device speech recognition: opt-in with a model choice', async ({ page }) => {
	await boot(page);
	await page.goto('/settings');
	const toggle = page.locator('label.check', { hasText: 'Recognize speech on this device' }).locator('input');
	await expect(toggle).not.toBeChecked();
	await expect(page.locator('.asr-models')).toHaveCount(0);
	await toggle.check();
	await expect(page.locator('.asr-models .lang')).toHaveCount(2);
	await expect(page.locator('.asr-models .lang.active')).toContainText('Base');
	await expect(page.locator('main')).toContainText('Hebrew needs the larger model');
	await page.locator('.asr-models .lang', { hasText: 'Small' }).click();
	await expect(page.locator('main')).not.toContainText('Hebrew needs the larger model');
	await page.reload();
	await expect(page.locator('.asr-models .lang.active')).toContainText('Small');
});

test('typed recall can be switched off', async ({ page }) => {
	await boot(page);
	await page.goto('/settings');
	const toggle = page.locator('label.check', { hasText: 'Type the word on recall cards' }).locator('input');
	await expect(toggle).toBeChecked();
	await toggle.uncheck();
	await page.reload();
	await expect(page.locator('label.check', { hasText: 'Type the word on recall cards' }).locator('input')).not.toBeChecked();
});

test('About: reachable from Settings and the Library, with the build and credits', async ({ page }) => {
	await boot(page);
	await page.goto('/settings');
	await page.locator('a', { hasText: 'About Manabi' }).click();
	await expect(page).toHaveURL(/\/about$/);
	await expect(page.locator('h1')).toContainText('Manabi');
	await expect(page.locator('.build')).toHaveText(/^v\d+\.\d+\.\d+ · \S+ · \d{4}-\d{2}-\d{2}$/);
	await expect(page.locator('.credit-list li')).toHaveCount(20);
	await expect(page.locator('.credits')).toContainText('CC-CEDICT');
	await page.goto('/library');
	await expect(page.locator('main a[href="/about"]')).toBeVisible();
});
