import { test, expect, boot, squish, toSummary } from './fixtures';

test('a full reading session runs to its summary', async ({ page }) => {
	await page.goto('/review');
	await page.locator('.mode-card[data-mode=reading]').click();
	for (let n = 0; n < 40 && !(await page.locator('.summary, .streak-screen, .goal-screen').count()); n++) {
		await page.locator('.choice:not([disabled])').first().waitFor({ timeout: 5000 }).catch(() => {});
		if (await page.locator('.summary, .streak-screen, .goal-screen').count()) break;
		await page.locator('.choice').nth(n % 2).click();
		await page.locator('.grade').waitFor();
		await page.keyboard.press('Enter');
	}
	// The first session of the day extends the streak: that screen comes first.
	await expect(page.locator('.streak-screen h1')).toHaveText('You started a streak!');
	await toSummary(page);
	await expect(page.locator('.summary')).toBeVisible();
});

test('a lesson starts with an intro card, then XP and combos as you go', async ({ page }) => {
	// Learn the right answers first: every Chinese item's meaning, from the Items list.
	await boot(page);
	await page.goto('/items');
	await page.locator('.row').first().waitFor();
	const meaningOf = new Map(
		await page.locator('.row').evaluateAll((rows) =>
			rows.map((r) => [r.querySelector('.script')?.textContent ?? '', r.querySelector('.meaning')?.textContent ?? ''] as const)
		)
	);

	await page.goto('/review');
	await page.locator('.mode-card[data-mode=reading]').click();
	await expect(page.locator('.intro .title')).toHaveText('Reading');
	await expect(page.locator('.intro .count')).toHaveText(/^\d+ cards$/);
	await page.locator('.intro').click(); // tap to skip
	await expect(page.locator('.intro')).toHaveCount(0);

	// Three right answers in a row: +10 XP each, then the combo toast.
	for (let i = 1; i <= 3; i++) {
		const word = (await page.locator('.prompt .script').first().innerText()).trim();
		await page.locator('.choice', { hasText: meaningOf.get(word)! }).first().click();
		await expect(page.locator('.grade.ok')).toBeVisible();
		await page.keyboard.press('Enter');
		await expect(page.locator('.xp-total')).toHaveText(`${i * 10 + (i >= 3 ? 5 : 0)} XP`);
	}
	await expect(page.locator('.combo-toast')).toHaveText(/3 in a row!/);
	await expect(page.locator('.bar.hot')).toBeVisible();

	// Finish the session right: its XP is banked and adds up on Progress.
	let total = 35;
	for (let i = 4; !(await page.locator('.summary, .streak-screen, .goal-screen').count()); i++) {
		const word = (await page.locator('.prompt .script').first().innerText()).trim();
		await page.locator('.choice', { hasText: meaningOf.get(word)! }).first().click();
		await page.keyboard.press('Enter');
		total += 15;
		if (i > 40) throw new Error('session did not end');
	}
	// First session of the day: the streak, then the daily goal (50 XP by default).
	await page.locator('.streak-screen button').click();
	await expect(page.locator('.goal-screen h1')).toHaveText('Daily goal reached!');
	await toSummary(page);
	await expect(page.locator('.xp-bank')).toHaveText(`${total} XP in total · ${total} today`);
	await page.goto('/dashboard');
	await expect(page.locator('.xp-tile.total .xp-num')).toHaveText(String(total));
	await page.goto('/');
	await expect(page.locator('.ring-card')).toHaveClass(/met/);
	await expect(page.locator('.ring-num')).toHaveText(`${total}/50`);
	await page.locator('.ring-card').click();
	await page.locator('button.lang', { hasText: 'Intense' }).click();
	await page.goto('/');
	await expect(page.locator('.ring-num')).toHaveText(`${total}/200`);
	await expect(page.locator('.ring-card')).not.toHaveClass(/met/);
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
		expect(chips).toHaveLength(5);
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
		await toSummary(page);
		const vib = await page.evaluate(() => (window as unknown as { __vib: unknown[] }).__vib);
		expect(vib).toHaveLength(5);
		expect(vib.filter(Array.isArray)).toHaveLength(wrong);

		// The numbers count up: poll until they settle.
		const sums = () => page.locator('.sum').allInnerTexts().then((t) => t.map(squish));
		await expect.poll(async () => (await sums())[0]).toMatch(/^cards 5$/i);
		await expect.poll(async () => (await sums())[1]).toMatch(new RegExp(`^accuracy ${Math.round((100 * (5 - wrong)) / 5)}%$`, 'i'));
		expect((await sums())[2]).toMatch(/^time \d+s$/i);
		await expect.poll(async () => (await sums())[3]).toMatch(wrong === 5 ? /^xp 0$/i : /^xp [1-9]\d*$/i);
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
