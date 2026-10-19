import { test, expect, useLanguage } from './fixtures';

const ROUTES = ['/', '/path', '/review', '/read', '/library', '/scripts', '/radicals', '/roots', '/names', '/vocab', '/items', '/lessons', '/dashboard', '/workbench', '/settings'];

for (const lang of ['中文', '日本語', '한국어', 'עברית'] as const) {
	test(`every page renders in ${lang}`, async ({ page }) => {
		await useLanguage(page, lang);
		for (const route of ROUTES) {
			await page.goto(route);
			await expect(page.locator('main, .app').first(), route).toBeVisible();
			await expect(page.locator('h1').first(), route).toBeVisible();
		}
	});
}
