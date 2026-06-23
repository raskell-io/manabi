import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html', // SPA shell; CF Workers serves it via not_found_handling=single-page-application
			precompress: false,
			strict: true
		}),
		paths: {
			base: ''
		},
		prerender: {
			handleUnseenRoutes: 'ignore'
		}
	}
};

export default config;
