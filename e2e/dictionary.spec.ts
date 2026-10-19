import { test, expect, boot, useLanguage } from './fixtures';

test('tap a word in a passage to look it up and add it', async ({ page }) => {
	await boot(page);
	await page.goto('/read');
	await page.locator('a.card').first().click();
	const word = page.locator('.lines .tok').first();
	const tapped = await word.innerText();
	await word.click();
	const sheet = page.locator('.sheet');
	await expect(sheet.locator('.entry').first()).toBeVisible();
	await expect(sheet.locator('.reading').first()).not.toBeEmpty();
	await expect(page.locator('.tok.hit').first()).toContainText(tapped.slice(0, 1));
	const add = sheet.locator('button.add').first();
	if (await add.count()) {
		await add.click();
		await expect(sheet.locator('.in-reviews').first()).toBeVisible();
	}
	await page.keyboard.press('Escape');
	await expect(sheet).toHaveCount(0);
});

test('Hebrew words are found through prefixes and inflections', async ({ page }) => {
	await useLanguage(page, 'עברית');
	await page.goto('/read');
	await page.locator('a.card').first().click();
	const toks = page.locator('.lines .tok');
	await toks.first().waitFor();
	let found = 0;
	for (let i = 0; i < Math.min(6, await toks.count()); i++) {
		await toks.nth(i).click();
		await page.locator('.sheet').waitFor();
		await expect(page.locator('.sheet')).not.toContainText('Looking up');
		if (await page.locator('.sheet .entry').count()) found++;
		await page.keyboard.press('Escape');
	}
	expect(found).toBeGreaterThanOrEqual(4);
});

test('paste your own text: dictionary readings, lookup, delete', async ({ page }) => {
	await boot(page);
	await page.goto('/read');
	await page.locator('a', { hasText: 'Read your own text' }).click();
	await page.fill('textarea', '我喜欢吃米饭。今天很忙！');
	await expect(page.locator('.count')).toContainText('2 sentences');
	await page.locator('button', { hasText: 'Start reading' }).click();
	await page.waitForURL(/\/read\/(?!new)/);
	await expect(page.locator('h1')).toHaveText('我喜欢吃米饭。');
	await expect(page.locator('.lines .line')).toHaveCount(2);
	await expect(page.locator('.mine-all')).toHaveCount(0); // no translations → no line cards
	await page.locator('.controls button', { hasText: 'Readings' }).click();
	await expect(page.locator('.reading').first()).toHaveText('wǒ xǐhuan chī mǐfàn.');
	await page.locator('.tok', { hasText: '米饭' }).click();
	await expect(page.locator('.sheet .reading').first()).toContainText('mǐfàn');
	await page.keyboard.press('Escape');
	await page.locator('button.delete').click();
	await page.locator('button.delete', { hasText: 'Tap again' }).click();
	await page.waitForURL(/\/read$/);
	await expect(page.locator('a.card', { hasText: '我喜欢吃米饭' })).toHaveCount(0);
});

test('own text with AI readings and translations', async ({ page, context }) => {
	await context.route('https://api.openai.com/**', async (route) => {
		const body = JSON.parse(route.request().postData() ?? '{}');
		const prompt: string = body.messages?.[1]?.content ?? '';
		const lines: string[] = JSON.parse(prompt.slice(prompt.lastIndexOf('{"lines"'))).lines;
		const content = JSON.stringify({ lines: lines.map((l, i) => ({ reading: `reading ${i + 1}`, meaning: `meaning of ${l}` })) });
		await route.fulfill({ json: { choices: [{ message: { content } }] } });
	});
	await useLanguage(page, 'עברית');
	await page.goto('/settings');
	await page.locator('input[type="password"]').first().fill('sk-test');
	await page.locator('input[type="password"]').first().blur();
	await page.goto('/read/new');
	await page.fill('input', 'My text');
	await page.fill('textarea', 'אני לומד עברית. זה ספר טוב.');
	await expect(page.locator('.check')).toContainText('with AI');
	await page.locator('button', { hasText: 'Start reading' }).click();
	await page.waitForURL(/\/read\/(?!new)/);
	await expect(page.locator('h1')).toHaveText('My text');
	await page.locator('.controls button', { hasText: 'Translation' }).click();
	await expect(page.locator('.meaning').first()).toHaveText('meaning of אני לומד עברית.');
	await expect(page.locator('.mine-all')).toBeVisible();
	await page.locator('.tok', { hasText: 'ספר' }).click();
	await expect(page.locator('.sheet .entry').first()).toContainText('book');
});

test('pasted Traditional Chinese is stored Simplified, read in your script', async ({ page }) => {
	await boot(page);
	await page.goto('/read/new');
	await page.fill('textarea', '我們喜歡吃米飯。');
	await page.locator('button', { hasText: 'Start reading' }).click();
	await page.waitForURL(/\/read\/(?!new)/);
	await expect(page.locator('h1')).toHaveText('我们喜欢吃米饭。');
	await page.locator('.controls button', { hasText: 'Readings' }).click();
	await expect(page.locator('.reading').first()).toHaveText('wǒmen xǐhuan chī mǐfàn.');
	await page.goto('/settings');
	await page.locator('button.lang', { hasText: 'Taiwan' }).click();
	await page.goto('/read');
	await expect(page.locator('a.card', { hasText: '我們喜歡吃米飯' })).toHaveCount(1);
});
