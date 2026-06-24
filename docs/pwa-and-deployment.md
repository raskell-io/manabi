# PWA & deployment

Manabi ships as a static SPA that installs as a PWA and deploys to Cloudflare Pages. This
doc covers the PWA wiring, offline behavior, the production deploy, and local hosting.

The deploy runbook lives in [`DEPLOY.md`](../DEPLOY.md); this is the engineering background.

## Static SPA build

- [`svelte.config.js`](../svelte.config.js) uses **`adapter-static`** with
  `fallback: 'index.html'` and `paths.base = ''` (served at a domain root).
- [`src/routes/+layout.ts`](../src/routes/+layout.ts) sets **`ssr = false`** and
  `prerender = false` — there is no server runtime; everything renders client-side.
- [`vite.config.ts`](../vite.config.ts) sets `build.target: 'esnext'` (top-level-await +
  Automerge WASM need a modern target) and uses `vite-plugin-wasm` +
  `vite-plugin-top-level-await`.
- Output goes to `build/`.

Dynamic routes (`/items/[id]`, `/read/[id]`) work via the SPA fallback: any unknown path
serves `index.html` and the client router takes over.

## PWA setup

PWA support is `@vite-pwa/sveltekit` (Workbox under the hood), configured in
`vite.config.ts`. It generates `manifest.webmanifest` and a service worker (`sw.js` +
`workbox-*.js`).

### The wiring gotcha

`@vite-pwa/sveltekit` **generates** the manifest and service worker but does **not** wire
them into the page automatically (it expects you to use its `pwaInfo` virtual module). Until
wired, the app is *not installable* — no `<link rel="manifest">`, no SW registration. Manabi
wires both **manually**, which is simpler and adapter-static-proof:

- [`src/app.html`](../src/app.html) hardcodes `<link rel="manifest" href="/manifest.webmanifest">`.
- [`+layout.svelte`](../src/routes/+layout.svelte) registers the SW on mount:

  ```ts
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  }
  ```

  Fire-and-forget so it never blocks boot. `registerType: 'autoUpdate'` is baked into the
  generated SW, so new versions activate automatically.

### iOS install requirements (in `app.html`)

iOS "Add to Home Screen" needs more than a manifest:

- `<link rel="apple-touch-icon" sizes="180x180">` — and the icon must be **opaque, full
  square** (transparent corners render as black; iOS adds its own rounding). The build's
  `apple-touch-icon.png` is flattened onto the brand background for exactly this reason.
- `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, and
  `apple-mobile-web-app-status-bar-style` = **`default`** (not `black-translucent`, which
  forces white status-bar text — unreadable in the app's light theme).
- `theme-color` metas for light/dark, `viewport-fit=cover`, and `env(safe-area-inset-*)`
  padding on the top bar / drawer / content so nothing hides under the notch.

### Icons

All derived from the 学 logo (`static/icon.svg`, lavender on `#1e1e2e`):
`favicon.ico` (16/32/48), `favicon.svg`, `favicon.png`, `icon-192.png`, `icon-512.png`,
`apple-touch-icon.png` (180, opaque), `icon-maskable-512.png` (full-bleed, for Android
adaptive icons). The manifest lists icons with `purpose: 'any'` and a `maskable` variant.

### Offline behavior

The Workbox `globPatterns` precache the **app shell only** (~72 entries: JS/CSS/HTML/icons).
Deliberately **excluded**:

- **Audio packs** and **word lists** — fetched on demand and held in the HTTP cache. 73 MB
  of audio would make the first install huge, and Range-request caching in a SW is
  error-prone ([audio](./audio.md#what-is-not-precached)).
- OpenAI and Hugging Face requests — `NetworkOnly` runtime rules.

Result: the shell works offline immediately; audio/vocab work offline **after first use**.

## Production deploy (Cloudflare Pages)

Deployed at **https://manabi.raskell.io** on **classic Cloudflare Pages with Git
integration** — pushes to `main` auto-deploy, with no CLI, login, or secrets.

- Build command: `npm run build` · Output dir: `build` · Node: 22 (`.nvmrc`).
- SPA routing: [`static/_redirects`](../static/_redirects) = `/* /index.html 200`. Classic
  Pages honors 200-rewrites; this is why classic Pages is used rather than the Workers
  Static Assets flow (which 307-loops on `_redirects` rewrites).

There are no build-time secrets. The OpenAI key is entered at runtime in Settings and lives
only in the user's browser. See [`DEPLOY.md`](../DEPLOY.md) for the dashboard steps and the
history of why the Worker flow was abandoned.

## Local hosting

For running the production build on your own machine, [`serve.mjs`](../serve.mjs) is a
dependency-free static server:

- SPA fallback to `index.html`.
- **HTTP Range support** — required for audio-pack seeking ([audio](./audio.md#playback--srclibaudiots)).
- Correct mime types incl. `.webm`.

A macOS launchd agent (`~/Library/LaunchAgents/io.raskell.manabi.plist`) runs
`node serve.mjs` on `http://127.0.0.1:4317` with `KeepAlive` + `RunAtLoad`. Rebuild and the
service serves the new `build/` on the next request (restart it to be safe).

```
launchctl bootout   gui/$(id -u)/io.raskell.manabi   # stop
sleep 2                                               # required: avoid an I/O-error race
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/io.raskell.manabi.plist  # start
```

The `sleep 2` between `bootout` and `bootstrap` matters — without it, bootstrap races the
teardown and fails with an "Input/output error".
