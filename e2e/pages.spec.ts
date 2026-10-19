import { test, expect, useLanguage } from './fixtures';

const ROUTES = ['/', '/about', '/path', '/review', '/read', '/library', '/scripts', '/radicals', '/roots', '/names', '/vocab', '/items', '/lessons', '/dashboard', '/workbench', '/settings'];

for (const lang of ['中文', '廣東話', '日本語', '한국어', 'עברית'] as const) {
	test(`every page renders in ${lang}`, async ({ page }) => {
		await useLanguage(page, lang);
		for (const route of ROUTES) {
			await page.goto(route);
			await expect(page.locator('main, .app').first(), route).toBeVisible();
			await expect(page.locator('h1').first(), route).toBeVisible();
		}
	});
}

test('no page is wider than a phone screen', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'phone layout');
	await useLanguage(page, '中文');
	for (const route of [...ROUTES, '/items/seed-zh-0', '/items/seed-zh-internet', '/read/new']) {
		await page.goto(route);
		await expect(page.locator(route.startsWith('/items/') ? 'button.save' : 'h1').first(), route).toBeVisible();
		const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
		expect(scroll, `${route} is ${scroll}px wide on a ${inner}px screen`).toBeLessThanOrEqual(inner);
	}
});
