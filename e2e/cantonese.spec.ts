import { test, expect, useLanguage } from './fixtures';

test('Cantonese: Hong Kong characters, Jyutping, lookup and ruby', async ({ page }) => {
	await useLanguage(page, '廣東話');

	// A passage: tap a word for its Cantonese reading (the segmenter splits 唔|該;
	// the lookup takes the longest dictionary word from the tapped character).
	await page.goto('/read');
	await page.locator('a.card', { hasText: '茶餐廳' }).click();
	await expect(page.locator('h1')).toContainText('茶餐廳');
	await page.locator('.lines .tok', { hasText: /^唔$/ }).first().click();
	await expect(page.locator('.sheet .reading').first()).toHaveText('m4 goi1');
	await expect(page.locator('.tok.hit')).toHaveText(['唔', '該']);
	await page.keyboard.press('Escape');

	// Readings above the characters: Jyutping syllables.
	await page.goto('/settings');
	await page.locator('.ruby-toggle input').check();
	await page.goto('/items');
	const item = page.locator('.row', { hasText: 'good morning' }).first();
	await expect(item.locator('.script')).toHaveAttribute('lang', 'zh-Hant-HK');
	await expect(item.locator('rt')).toHaveText(['zou2', 'san4']);

	// The six tones and the starter characters.
	await page.goto('/scripts');
	await expect(page.locator('.glyph-cell', { hasText: '係' }).first()).toContainText('hai6');
	await page.getByRole('tab', { name: 'Jyutping tones' }).click();
	await expect(page.locator('.glyph-cell', { hasText: '詩' })).toContainText('si1');

	// The path starts from the tones; places are Hong Kong's.
	await page.goto('/path');
	await expect(page.getByText('The six tones').first()).toBeVisible();
	await page.goto('/names');
	await expect(page.locator('body')).toContainText('澳洲');

	// Frequency word lists, Jyutping readings.
	await page.goto('/vocab');
	await expect(page.getByRole('tab', { name: /Top 500/ })).toHaveAttribute('aria-selected', 'true');
	await expect(page.locator('.list li').first()).toContainText('係');
	await expect(page.locator('.list li .reading').first()).toHaveText('hai6');

	// A review session runs on the Cantonese words.
	await page.goto('/review');
	await page.locator('.mode-card[data-mode=reading]').click();
	await page.locator('.intro').click();
	await expect(page.locator('.prompt .script').first()).toHaveAttribute('lang', 'zh-Hant-HK');
	await page.locator('.choice').first().click();
	await expect(page.locator('.grade')).toBeVisible();
});
