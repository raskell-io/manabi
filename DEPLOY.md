# Deploying Manabi (Cloudflare Pages)

Manabi is a static SPA (`adapter-static` → `build/`). There is no server, no
database, and no secrets to host — OpenAI calls are made browser-direct with the
user's own key, and all data lives in each visitor's IndexedDB. Deploying just
means publishing `build/` to an HTTPS static host with a SPA fallback.

CI/CD is wired up:

- **`.github/workflows/ci.yml`** — `npm run check` (0/0) + `npm test` + build on every push/PR.
- **`.github/workflows/deploy.yml`** — builds and deploys to Cloudflare Pages on push to `main`.
- **`static/_redirects`** — `/* /404.html 200`, the SPA fallback Cloudflare needs
  (the build emits `404.html`, not `index.html`).

## One-time setup

These steps need a human with the Cloudflare account + GitHub repo admin.

### 1. Create the Pages project (named `manabi`)

Dashboard → **Workers & Pages → Create → Pages → Direct Upload**, name it `manabi`.
Or via CLI:

```bash
npx wrangler pages project create manabi --production-branch main
```

> Use **Direct Upload** (not Git integration) — the GitHub Action pushes the
> prebuilt `build/`, so Cloudflare never needs access to the private repo.

### 2. Get credentials

- **Account ID** — Cloudflare dashboard (Workers & Pages sidebar), or `npx wrangler whoami`.
- **API token** — My Profile → API Tokens → **Create Token**. Give it the
  permission **Account → Cloudflare Pages → Edit** (the "Edit Cloudflare Workers"
  template also works). Scope it to your account.

### 3. Add the GitHub repo secrets

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | the token from step 2 |
| `CLOUDFLARE_ACCOUNT_ID` | the account id from step 2 |

Or from the CLI (uses the repo's account-scoped `gh`):

```bash
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
```

### 4. Deploy

Push to `main` (or run the **Deploy to Cloudflare Pages** workflow manually). The
app goes live at `https://manabi.pages.dev`.

> The deploy job will fail until steps 1–3 are done — that's expected.

### 5. Custom domain (optional)

Pages project → **Custom domains → Set up a custom domain** → `manabi.raskell.io`.
If `raskell.io` is on Cloudflare, the DNS record is added automatically; otherwise
add a `CNAME manabi → manabi.pages.dev`. HTTPS is provisioned automatically.

`paths.base` is `''`, so Manabi must be served from a domain root
(`manabi.pages.dev` or a custom domain) — not a sub-path.

## Manual deploy (no CI)

```bash
npm run build
npx wrangler pages deploy build --project-name=manabi
```

## Notes

- **HTTPS is required** for the service worker / PWA install (especially iOS).
  Pages provides it on both `*.pages.dev` and custom domains.
- Each visitor gets their own local data; the deployed site is just the app shell.
- The local launchd host (`serve.mjs`, see README) stays independent — handy for
  offline/dev use.
