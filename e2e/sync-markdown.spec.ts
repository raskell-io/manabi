import { test, expect, boot } from './fixtures';
import type { BrowserContext } from '@playwright/test';

/** An in-memory GitHub repository behind the Contents API. */
async function fakeGitHub(context: BrowserContext) {
	const files = new Map<string, { content: string; sha: number }>();
	let sha = 0;
	await context.route('https://api.github.com/**', async (route) => {
		const req = route.request();
		const url = new URL(req.url());
		const m = /^\/repos\/me\/sync(?:\/contents\/(.+))?$/.exec(url.pathname);
		if (!m) return route.fulfill({ status: 404, json: { message: 'Not Found' } });
		const path = m[1] ? decodeURIComponent(m[1]) : null;
		if (!path) return route.fulfill({ json: { full_name: 'me/sync' } });
		if (req.method() === 'GET') {
			const f = files.get(path);
			return f ? route.fulfill({ json: { content: f.content, encoding: 'base64', sha: String(f.sha) } }) : route.fulfill({ status: 404, json: { message: 'Not Found' } });
		}
		const body = JSON.parse(req.postData() ?? '{}');
		const cur = files.get(path);
		if (cur && body.sha !== String(cur.sha)) return route.fulfill({ status: 409, json: { message: 'conflict' } });
		files.set(path, { content: body.content, sha: ++sha });
		return route.fulfill({ status: 201, json: { content: { sha: String(sha) } } });
	});
	const text = (path: string) => Buffer.from(files.get(path)?.content ?? '', 'base64').toString('utf8');
	const edit = (path: string, fn: (t: string) => string) =>
		files.set(path, { content: Buffer.from(fn(text(path)), 'utf8').toString('base64'), sha: ++sha });
	return { files, text, edit };
}

test('items and passages as Markdown in the sync repo, edits come back', async ({ page, context }) => {
	const gh = await fakeGitHub(context);
	await boot(page);
	await page.goto('/settings');
	await page.fill('input[placeholder="you/manabi-sync"]', 'me/sync');
	await page.locator('input[placeholder="you/manabi-sync"]').blur();
	await page.fill('input[placeholder="github_pat_…"]', 'token');
	await page.locator('input[placeholder="github_pat_…"]').blur();
	await page.locator('button', { hasText: 'Sync now' }).click();
	await expect(page.locator('.sync-status')).toContainText('Synced');

	expect([...gh.files.keys()].sort()).toEqual([
		'content/he/items.md', 'content/he/passages.md', 'content/ja/items.md', 'content/ja/passages.md',
		'content/ko/items.md', 'content/ko/passages.md', 'content/zh/items.md', 'content/zh/passages.md', 'manabi.manabi'
	]);
	const md = gh.text('content/zh/items.md');
	expect(md).toContain('## 今天\n<!-- id: seed-zh-0');

	// Edit on "GitHub": a meaning, and a brand-new word.
	gh.edit('content/zh/items.md', (t) => t.replace('- meaning: today', '- meaning: today (edited)') + '\n## 明白\n- reading: míngbai\n- meaning: to understand\n');
	await page.locator('button', { hasText: 'Sync now' }).click();
	await expect(page.locator('.sync-status')).toContainText(/pulled .*item/);

	await page.goto('/items');
	await page.locator('input[placeholder^="Search"]').fill('today (edited)');
	await expect(page.locator('.row')).toHaveCount(1);
	await page.locator('input[placeholder^="Search"]').fill('明白');
	await expect(page.locator('.row')).toHaveCount(1);
	// The file was rewritten with fresh ids and hashes for both.
	expect(gh.text('content/zh/items.md')).toMatch(/## 明白\n<!-- id: \S+ · h: [0-9a-f]+ -->/);
});
