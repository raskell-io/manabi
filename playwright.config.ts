import { defineConfig } from '@playwright/test';

/**
 * Browser tests (e2e/) against the production build served by `vite preview`.
 * Each test gets a fresh browser context — a fresh IndexedDB, so the built-in
 * seed is all there is. Run `npm run test:e2e` (builds first) or, with a
 * build in place, `npx playwright test`.
 */
export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['github'], ['list']] : 'list',
	use: {
		baseURL: 'http://localhost:4173',
		// The app registers a precaching service worker; tests want the network.
		serviceWorkers: 'block',
		trace: 'retain-on-failure'
	},
	projects: [
		{ name: 'desktop', use: { viewport: { width: 1200, height: 900 } } },
		{ name: 'phone', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
	],
	webServer: {
		command: 'npx vite preview --port 4173 --strictPort',
		url: 'http://localhost:4173',
		reuseExistingServer: !process.env.CI
	}
});
