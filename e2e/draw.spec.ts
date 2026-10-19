import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { test, expect, boot, useLanguage } from './fixtures';

/** Trace a character along its stroke medians on the drawing pad. */
async function trace(page: Page, char: string, lang: 'zh' | 'ja') {
	const data = JSON.parse(readFileSync(`static/strokes/${lang}/${char.codePointAt(0)!.toString(16)}.json`, 'utf8'));
	const box = (await page.locator('.board .host svg').first().boundingBox())!;
	const size = box.width, pad = 14, scale = (size - 2 * pad) / 1024;
	const yOff = 124 * scale + pad;
	for (const med of data.medians as number[][][]) {
		const pts = med.map(([x, y]) => [box.x + x * scale + pad, box.y + size - yOff - y * scale]);
		await page.mouse.move(pts[0][0], pts[0][1]);
		await page.mouse.down();
		for (let i = 1; i < pts.length; i++) {
			const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
			for (let t = 1; t <= 4; t++) await page.mouse.move(ax + ((bx - ax) * t) / 4, ay + ((by - ay) * t) / 4);
		}
		await page.mouse.up();
		await page.waitForTimeout(350);
	}
}

test('glyph sheet: radical, watch, trace', async ({ page, isMobile }) => {
	await boot(page);
	await page.goto('/scripts');
	await page.locator('.glyph-cell', { hasText: '水' }).first().click();
	await page.locator('.sheet .host svg').waitFor();
	await expect(page.locator('.sheet .radical')).toContainText('Radical 85');
	await page.locator('.sheet .modes button', { hasText: 'Trace' }).click();
	if (!isMobile) {
		await page.waitForTimeout(500);
		await trace(page, '水', 'zh');
		await expect(page.locator('.sheet .done')).toBeVisible({ timeout: 5000 });
	}
});

test('radicals: 214 tiles, search, detail', async ({ page }) => {
	await boot(page);
	await page.goto('/radicals');
	await expect(page.locator('.tile')).toHaveCount(214);
	await page.locator('.search input').fill('water');
	await page.locator('.tile', { hasText: '水' }).first().click();
	await page.locator('.member').first().waitFor();
	expect(page.url()).toMatch(/r=85/);
});

test('Japanese item page offers both characters to write; Korean has no radicals', async ({ page }) => {
	await useLanguage(page, '日本語');
	await page.goto('/items/seed-ja-0');
	await page.locator('.write .host svg').waitFor();
	await expect(page.locator('.write-chars button')).toHaveCount(2);
	await useLanguage(page, '한국어');
	await page.goto('/radicals');
	await expect(page.locator('.empty')).toBeVisible();
});
