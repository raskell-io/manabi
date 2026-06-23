// Manabi is a local-first SPA: all data lives in IndexedDB and is read on the
// client, so we disable SSR and prerendering. adapter-static serves the app
// with a 404.html SPA fallback for dynamic routes like /items/[id].
export const ssr = false;
export const prerender = false;
