# Deploying Manabi (Cloudflare Pages, Git integration)

Manabi is a static SPA (`adapter-static` → `build/`). There is no server, no
database, and no secrets to host — OpenAI calls are made browser-direct with the
user's own key, and all data lives in each visitor's IndexedDB. Deploying just
means publishing `build/` to an HTTPS static host with a SPA fallback.

The repo is **public** and connected to Cloudflare's **Workers & Pages** Git
build: Cloudflare runs `npm run build` then `npx wrangler deploy` on every push to
`main`. No API token and no GitHub secrets — the Cloudflare build environment
authenticates itself.

Because the unified "Workers & Pages" flow deploys via `wrangler` (Workers Static
Assets), the repo needs a `wrangler.toml`:

- **`wrangler.toml`** — `name = "manabi"` + `[assets] directory = "./build"`.
  No Worker script; Cloudflare serves the `build/` output as static assets.
  *(Without this, `npx wrangler deploy` fails with no entry-point — that was the
  original "Deploying" failure.)*
- **`static/_redirects`** — `/* /404.html 200`, the SPA fallback (the build emits
  `404.html`, not `index.html`); the assets server honors it.
- **`.nvmrc`** — pins Node 22 for the Cloudflare build.
- **`.github/workflows/ci.yml`** — `npm run check` (0/0) + `npm test` + build on
  every push/PR (quality gate; independent of deploy).

## One-time setup (Cloudflare dashboard)

Already done if your project's build shows **Build command** `npm run build` and
**Deploy command** `npx wrangler deploy`. To set it up fresh:

1. **Workers & Pages → Create → Connect to Git**, pick `raskell-io/manabi`,
   branch **`main`**.
2. Build settings: **Build command** `npm run build`, **Deploy command**
   `npx wrangler deploy` (the default for a `wrangler.toml` project). Node version
   comes from `.nvmrc` (22).
3. **Save and Deploy** → live at `https://manabi.<subdomain>.workers.dev`; every
   push to `main` redeploys automatically.

If a build already failed at the Deploy step, just **Retry deployment** after
`wrangler.toml` is in `main`.

### Custom domain (optional)

Pages project → **Custom domains → Set up a custom domain** → `manabi.raskell.io`
(matching `kurumi.raskell.io`). If `raskell.io` is on Cloudflare the DNS record is
added automatically. HTTPS is provisioned automatically.

`paths.base` is `''`, so Manabi must be served from a domain root
(`manabi.pages.dev` or a custom domain) — not a sub-path.

## Alternatives

- **GitHub Pages** — now that the repo is public, free GitHub Pages also works
  (like `kurumi`): add a `static/CNAME` and a Pages deploy workflow using
  `actions/upload-pages-artifact` + `actions/deploy-pages`. GitHub serves
  `404.html` for unknown routes natively, so no `_redirects` is needed there.
- **Direct upload / CI** — `npx wrangler pages deploy build --project-name=manabi`
  (needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`). Use this if you ever
  want the build to happen in GitHub Actions instead of on Cloudflare.

## Notes

- **HTTPS is required** for the service worker / PWA install (especially iOS).
  Pages provides it on both `*.pages.dev` and custom domains.
- Each visitor gets their own local data; the deployed site is just the app shell.
- The local launchd host (`serve.mjs`, see README) stays independent — handy for
  offline/dev use.
