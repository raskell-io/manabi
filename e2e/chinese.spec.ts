import { test, expect, boot } from './fixtures';

const SIMPLIFIED_ONLY = /[们这说话发头学习东车来时会]/;
const BOPO = /\p{Script=Bopomofo}/u;
const PINYIN = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/;

test('Traditional script (Taiwan, Hong Kong) and back', async ({ page }) => {
	await boot(page);
	await page.goto('/settings');
	await expect(page.locator('.zh-preview')).toContainText('头发');
	await page.locator('button.lang', { hasText: 'Taiwan' }).click();
	await expect(page.locator('.zh-preview')).toContainText('頭髮');
	await expect(page.locator('.zh-preview')).toContainText('麵條');

	await page.goto('/items');
	const scripts = page.locator('.script[lang^="zh"]');
	await scripts.first().waitFor();
	const tags = await scripts.evaluateAll((els) => els.map((e) => (e as HTMLElement).lang));
	expect(tags.length).toBeGreaterThan(10);
	expect(new Set(tags)).toEqual(new Set(['zh-Hant-TW']));
	expect((await scripts.allInnerTexts()).filter((t) => SIMPLIFIED_ONLY.test(t))).toEqual([]);
	await page.locator('input[placeholder^="Search"]').fill('謝');
	await expect(scripts.first()).toContainText('謝');

	await page.goto('/scripts');
	await expect(page.locator('.glyph', { hasText: '們' }).first()).toBeVisible();
	await page.locator('.glyph-cell', { hasText: '們' }).first().click();
	await expect(page.locator('.sheet .radical')).toContainText('Radical 9');
	await page.keyboard.press('Escape');

	await page.goto('/radicals?r=149');
	await page.locator('.member').first().waitFor();
	const members = await page.locator('.m-char').allInnerTexts();
	expect(members).toContain('說');
	expect(members).not.toContain('说');

	await page.goto('/path');
	await expect(page.locator('.badge', { hasText: '讀' }).first()).toBeVisible();

	await page.goto('/review');
	await page.locator('.mode-card').first().click();
	for (let i = 0; i < 4; i++) {
		await page.locator('.exercise').waitFor();
		expect(await page.locator('.exercise').innerText()).not.toMatch(SIMPLIFIED_ONLY);
		await page.locator('.choice').first().click();
		await page.keyboard.press('Enter');
		if (await page.locator('.summary, .streak-screen, .goal-screen').count()) break;
	}

	await page.goto('/settings');
	await page.locator('button.lang', { hasText: 'Hong Kong' }).click();
	await expect(page.locator('.zh-preview')).toContainText('這裏');
	await expect(page.locator('.zh-preview')).toHaveAttribute('lang', 'zh-Hant-HK');
	await page.locator('button.lang', { hasText: 'Simplified' }).click();
	await expect(page.locator('.zh-preview')).toContainText('头发');
	await page.goto('/items');
	await scripts.first().waitFor();
	expect(new Set(await scripts.evaluateAll((els) => els.map((e) => (e as HTMLElement).lang)))).toEqual(new Set(['zh-Hans']));
});

test('Zhuyin reading aid', async ({ page }) => {
	await boot(page);
	await page.goto('/settings');
	await expect(page.locator('.zh-preview-reading')).toContainText('Wǒmen');
	await page.locator('button.lang', { hasText: 'Zhuyin' }).click();
	await expect(page.locator('.zh-preview-reading')).toHaveText('ㄨㄛˇ ˙ㄇㄣ ㄕㄨㄛ ㄏㄢˋ ㄩˇ.');

	await page.goto('/items');
	await page.locator('.row .sub').first().waitFor();
	const subs = await page.locator('.row .sub').allInnerTexts();
	expect(subs.filter((t) => !BOPO.test(t) || PINYIN.test(t))).toEqual([]);
	await page.locator('input[placeholder^="Search"]').fill('ㄒㄧㄝˋ');
	await expect(page.locator('.row .sub').first()).toBeVisible();

	await page.goto('/scripts');
	await expect(page.locator('.roman').first()).toHaveText(BOPO);
	await page.locator('.tab', { hasText: 'Zhuyin' }).click();
	await expect(page.locator('.glyph-cell')).toHaveCount(37);
	await expect(page.locator('.glyph-cell').first().locator('.roman')).toHaveText('b');
	await page.locator('.tab', { hasText: 'tones' }).click();
	await expect(page.locator('.glyph').first()).toHaveText('mā');

	await page.goto('/vocab');
	await page.locator('.reading').first().waitFor();
	const vr = await page.locator('.reading').allInnerTexts();
	expect(vr.filter((t) => !BOPO.test(t) || PINYIN.test(t))).toEqual([]);

	await page.goto('/review');
	await page.locator('.mode-card').first().click();
	for (let i = 0; i < 4; i++) {
		await page.locator('.exercise').waitFor();
		expect(await page.locator('.exercise').innerText()).not.toMatch(PINYIN);
		await page.locator('.choice').first().click();
		await page.keyboard.press('Enter');
		if (await page.locator('.summary, .streak-screen, .goal-screen').count()) break;
	}
});

test('an item\'s own Taiwan form and reading; readings above the characters', async ({ page }) => {
	await boot(page);
	await page.goto('/settings');
	await page.locator('button.lang', { hasText: 'Taiwan' }).click();
	await page.goto('/items');
	await page.locator('input[placeholder^="Search"]').fill('internet');
	await expect(page.locator('.row .script').first()).toHaveText('網路');
	await expect(page.locator('.row .sub').first()).toHaveText('wǎnglù');

	// Edit it: a Hong Kong form too.
	await page.locator('.row').first().click();
	await expect(page.locator('input[placeholder="e.g. 軟體"]')).toHaveValue('網路');
	await page.fill('input[placeholder="e.g. 軟件"]', '網絡');
	await page.locator('button.save').click();

	await page.goto('/settings');
	await page.locator('button.lang', { hasText: 'Hong Kong' }).click();
	await page.locator('label.check', { hasText: 'Show the reading above each character' }).locator('input').check();
	await page.goto('/items');
	await page.locator('input[placeholder^="Search"]').fill('internet');
	const word = page.locator('.row .script').first();
	await expect(word.locator('ruby')).toHaveCount(2);
	await expect(word.locator('rt')).toHaveText(['wǎng', 'luò']);
	expect(await word.evaluate((el) => [...el.querySelectorAll('ruby')].map((r) => r.firstChild?.textContent).join(''))).toBe('網絡');

	// In a passage, every line gets its syllables, and words stay tappable.
	await page.goto('/read');
	await page.locator('a.card').first().click();
	await expect(page.locator('.lines rt').first()).toBeVisible();
	await page.locator('.lines .tok').first().click();
	await expect(page.locator('.sheet .entry').first()).toBeVisible();
});
