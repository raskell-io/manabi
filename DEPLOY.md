# Deploying Manabi (Cloudflare Pages, Git integration)

Manabi is a static SPA (`adapter-static` → `build/`). There is no server, no
database, and no secrets to host — OpenAI calls are made browser-direct with the
user's own key, and all data lives in each visitor's IndexedDB. Deploying just
means publishing `build/` to an HTTPS static host with a SPA fallback.

The repo is **public** and deploys via **Cloudflare Pages Git integration**:
connect the repo once in the dashboard and Cloudflare rebuilds + deploys on every
push to `main`. No API token, no GitHub secrets, no Wrangler login.

> Avoid the "Workers & Pages → Create → Workers" flow: that makes a *Worker*
> (deploy command `npx wrangler deploy`, needs a `wrangler.toml` + Wrangler auth,
> and does NOT honor `_redirects` 200-rewrites — it 307-loops). Use **Pages**.

What's in the repo for this:

- **`static/_redirects`** — `/* /index.html 200`, the SPA fallback (classic Pages
  honors 200-rewrites). The build emits `index.html` as the shell
  (`svelte.config` `fallback: 'index.html'`).
- **`.nvmrc`** — pins Node 22 for the Cloudflare build.
- **`.github/workflows/ci.yml`** — `npm run check` (0/0) + `npm test` + build on
  every push/PR (quality gate; independent of deploy).

## One-time setup (Cloudflare dashboard)

1. **Workers & Pages → Create → Pages → Connect to Git**, pick `raskell-io/manabi`,
   branch **`main`**.
2. Build settings:
   - **Framework preset:** SvelteKit (or None)
   - **Build command:** `npm run build`
   - **Build output directory:** `build`
   - **Root directory:** `/`
   - Node 22 is read from `.nvmrc`; if a build picks an older Node, add an env var
     `NODE_VERSION=22`.
3. **Save and Deploy** → live at `https://<project>.pages.dev`; every push to
   `main` redeploys automatically.

### Custom domain

Pages project → **Custom domains → Set up a custom domain** → `manabi.raskell.io`
(if it's currently attached to a stray Worker, remove it there first).

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
