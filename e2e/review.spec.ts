import { test, expect, boot, squish } from './fixtures';

test('a full reading session runs to its summary', async ({ page }) => {
	await page.goto('/review');
	await page.locator('.mode-card[data-mode=reading]').click();
	for (let n = 0; n < 40 && !(await page.locator('.summary').count()); n++) {
		await page.locator('.choice:not([disabled])').first().waitFor({ timeout: 5000 }).catch(() => {});
		if (await page.locator('.summary').count()) break;
		await page.locator('.choice').nth(n % 2).click();
		await page.locator('.grade').waitFor();
		await page.keyboard.press('Enter');
	}
	await expect(page.locator('.summary')).toBeVisible();
});

test('a session in dark mode', async ({ page }) => {
	await page.goto('/settings');
	await page.getByRole('button', { name: 'Dark', exact: true }).click();
	await page.goto('/review');
	await page.locator('.mode-card[data-mode=reading]').click();
	await page.locator('.choice').first().click();
	await expect(page.locator('.grade')).toBeVisible();
});

test.describe('Home → session → summary', () => {
	test.skip(({ isMobile }) => !isMobile, 'phone flow (tab bar, focus mode)');

	test('Continue, haptics, summary, Next up, lessons, theme colour', async ({ page, context }) => {
		await context.addInitScript(() => {
			navigator.vibrate = (p) => {
				((window as unknown as { __vib: unknown[] }).__vib ||= []).push(p);
				return true;
			};
		});
		await boot(page);
		await expect(page.locator('.next')).toContainText('Continue reading');
		expect(squish(await page.locator('.next').innerText())).toMatch(/Continue reading 5 cards · new & due/);
		await expect(page.locator('.next')).toHaveAttribute('href', '/review?mode=reading');
		await expect(page.locator('.also')).toContainText(/Listening · \d+/);
		const chips = (await page.locator('.langs .lang-chip').allInnerTexts()).map(squish);
		expect(chips).toHaveLength(4);
		expect(chips[0]).toMatch(/中文 \d+/);

		await page.locator('.next').click();
		await page.locator('.session-head .quit').waitFor();
		expect(page.url()).toMatch(/mode=reading/);
		await expect(page.locator('.tabbar')).toBeHidden();

		let wrong = 0;
		for (let i = 0; i < 5; i++) {
			await page.locator('.choice').last().click();
			await page.locator('.grade').waitFor();
			if (await page.locator('.grade.no').count()) wrong++;
			await page.keyboard.press('Enter');
		}
		await page.locator('.summary').waitFor();
		const vib = await page.evaluate(() => (window as unknown as { __vib: unknown[] }).__vib);
		expect(vib).toHaveLength(5);
		expect(vib.filter(Array.isArray)).toHaveLength(wrong);

		const sums = (await page.locator('.sum').allInnerTexts()).map(squish);
		expect(sums[0]).toMatch(/^cards 5$/i);
		expect(sums[1]).toMatch(new RegExp(`^accuracy ${Math.round((100 * (5 - wrong)) / 5)}%$`, 'i'));
		expect(sums[2]).toMatch(/^time \d+s$/i);
		const skills = (await page.locator('.skills li').allInnerTexts()).map(squish);
		expect(skills).toHaveLength(1);
		expect(skills[0]).toMatch(/^Recognition \d\/5$/);
		const next = (await page.locator('.chips .chip').allInnerTexts()).map(squish);
		expect(next.some((c) => /^Listening · \d+/.test(c))).toBe(true);
		expect(next.some((c) => /^Speaking · \d+/.test(c))).toBe(true);
		if (wrong > 0) expect(next.some((c) => c.includes(`Drill the ${wrong} missed`))).toBe(true);

		await page.locator('.chips .chip', { hasText: 'Listening' }).click();
		await expect(page.locator('.meta')).toContainText(/1 \/ \d+.*Listening|Listening.*1 \/ \d+/s);
		await page.locator('.session-head .quit').click();
		await page.locator('.mode-card').first().waitFor();
		const readingLeft = Number(squish(await page.locator('.mode-card .m-count').first().innerText()).match(/^(\d+)/)![1]);
		await page.locator('.tabbar .tab', { hasText: 'Home' }).click();
		await expect(page.locator('.next')).toHaveAttribute('href', readingLeft > 0 ? '/review?mode=reading' : '/review?mode=listening');
		expect(squish(await page.locator('.stat').first().innerText())).toBe('0 New today');

		await page.goto('/lessons');
		await page.click('button.new');
		await page.fill('input.title', 'Home lesson');
		for (let i = 5; i < 8; i++) await page.locator('button.pill').nth(i).click();
		await page.click('button.save');
		await page.locator('.tabbar .tab', { hasText: 'Home' }).click();
		const row = squish(await page.locator('.due-lessons li').first().innerText());
		expect(row).toMatch(/Home lesson.*new.*Review/i);

		const metas = () => page.evaluate(() => [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map((m) => m.content));
		await page.goto('/settings');
		await page.locator('button.theme', { hasText: 'Dark' }).click();
		await expect.poll(metas).toEqual(['#13111f', '#13111f']);
		await page.locator('button.theme', { hasText: 'System' }).click();
		await expect.poll(metas).toEqual(['#ffffff', '#13111f']);
	});
});
