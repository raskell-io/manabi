// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	/** Build stamp (vite.config.ts `define`), shown on the About page. */
	const __APP_VERSION__: string;
	const __BUILD_COMMIT__: string;
	const __BUILD_DATE__: string;

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
