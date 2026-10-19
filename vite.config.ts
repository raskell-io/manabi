import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
	plugins: [
		wasm(),
		topLevelAwait(),
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				id: '/',
				name: 'Manabi — Language Learning',
				short_name: 'Manabi',
				description: 'A local-first, reading-first language learning app for Chinese, Japanese, Korean & Hebrew',
				lang: 'en',
				dir: 'ltr',
				categories: ['education'],
				theme_color: '#ffffff',
				background_color: '#ffffff',
				display: 'standalone',
				scope: '/',
				start_url: '/',
				icons: [
					{ src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
					{ src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
					{ src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
					{ src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,wasm}'],
				// Exclude the ONNX runtime WASM + HF model weights from precache;
				// they're loaded on demand the first time local TTS is used.
				globIgnores: ['**/ort-*.wasm', '**/onnxruntime-*.wasm'],
				maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB for Automerge WASM
				runtimeCaching: [
					{
						// Audio index + vocab word lists: small JSON fetched on demand.
						// Cache them so Listening and Vocab keep working offline / on a
						// flaky connection instead of silently coming up empty.
						urlPattern: /\/(audio\/manifest-[a-z]+|wordlists\/[^/]+)\.json$/,
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'manabi-data',
							expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 60 }
						}
					},
					{
						// Dictionary shards (tap-a-word lookup): fetched as words are
						// tapped, kept so lookups work offline afterwards.
						urlPattern: /\/dict\/(index|[a-z]{2}\/\d+)\.json$/,
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'manabi-dict',
							expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 }
						}
					},
					{
						// Stroke-order data for the drawing pad: bundled files and the
						// pinned CDN fallback never change for a given URL — cache forever.
						urlPattern: ({ url }) =>
							/^\/strokes\/(zh|ja)\/[0-9a-f]+\.json$/.test(url.pathname) ||
							(url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith('/npm/hanzi-writer-data')),
						handler: 'CacheFirst',
						options: {
							cacheName: 'manabi-strokes',
							expiration: { maxEntries: 3000 },
							cacheableResponse: { statuses: [0, 200] }
						}
					},
					{
						urlPattern: /^https:\/\/api\.openai\.com\/.*/i,
						handler: 'NetworkOnly'
					},
					{
						// Let HF model downloads through to the network so
						// transformers.js's own cache handles them.
						urlPattern: /^https:\/\/(?:[a-z0-9-]+\.)?(?:huggingface\.co|hf\.co)\/.*/i,
						handler: 'NetworkOnly'
					}
				]
			},
			devOptions: {
				enabled: true
			}
		})
	],
	optimizeDeps: {
		exclude: ['@automerge/automerge', '@huggingface/transformers']
	},
	// top-level-await + wasm need a modern target; esbuild's default would
	// otherwise try to down-level top-level await/destructuring and fail.
	build: {
		target: 'esnext'
	},
	worker: {
		format: 'es'
	}
});
