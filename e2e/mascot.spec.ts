import { test, expect, boot } from './fixtures';

test('one animated Nabi per screen; the nav logo is still', async ({ page }) => {
	await boot(page);
	for (const route of ['/', '/dashboard', '/path', '/review', '/radicals', '/settings']) {
		await page.goto(route);
		await page.locator('.app').waitFor();
		await expect(page.locator('.splash')).toHaveCount(0);
		const census = await page.evaluate(() => {
			const visible = [...document.querySelectorAll('svg.nabi')].filter((s) => (s as SVGElement).checkVisibility());
			const moving = visible.filter((s) => getComputedStyle(s.querySelector('.wing-l')!).animationName !== 'none');
			return { visible: visible.length, moving: moving.length };
		});
		expect(census.moving, `${route}: animated mascots`).toBeLessThanOrEqual(1);
		expect(census.visible, `${route}: the logo is there`).toBeGreaterThanOrEqual(1);
	}
});
