# Deploy to Cloudflare Pages

Static Next.js export (`out/`) is deployed by GitHub Actions to **Cloudflare Pages**.

| Item | Value |
|------|--------|
| Pages project | `yaadro-ecommerce-user-web-frontend` |
| Production branch | `main` |
| Build command | `npm run build` |
| Node.js (CI) | **22** (required by Wrangler 4.x) |
| Output directory | `out` |
| Custom domains | `testshop.yaadro.online`, `marketfresh.in` (+ `www.marketfresh.in` recommended) |

## 1) One-time Cloudflare setup

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Confirm DNS zones exist:
   - `yaadro.online` (for `testshop.yaadro.online`)
   - `marketfresh.in` (apex and optionally `www`)
3. **Workers & Pages** → create project **`yaadro-ecommerce-user-web-frontend`** (name must match `wrangler.toml` / workflow), or let the first GitHub deploy create it.
4. **Avoid duplicate deploys (important):** This repo deploys via **GitHub Actions** only. If you connected the same repo in Cloudflare Pages, **disconnect** it:
   - Pages → **yaadro-ecommerce-user-web-frontend** → **Settings** → **Builds**
   - **Disconnect** Git repository (or delete the Pages project and recreate as **Direct Upload** / empty project without Git)
   - Otherwise every push runs **two** builds: Cloudflare’s built-in CI **and** `.github/workflows/deploy-cloudflare-pages.yml`

## 2) API token and GitHub secrets

Create an API token: **My Profile → API Tokens → Create Custom Token**

| Permission | Access |
|------------|--------|
| Account → Cloudflare Pages | Edit |
| Account → Account Settings | Read |

Add to GitHub repository (or **`production`** environment):

| Type | Name |
|------|------|
| Secret | `CLOUDFLARE_API_TOKEN` |
| Secret | `CLOUDFLARE_ACCOUNT_ID` — see below (common misconfiguration) |

### `CLOUDFLARE_ACCOUNT_ID` (read carefully)

Must be the **Account ID**, not a Zone ID.

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Workers & Pages** (any page in that section)
3. Copy **Account ID** from the **right sidebar** (32-character hex)

Do **not** use DNS zone ID from **yaadro.online** or **marketfresh.in** — that causes:

`Project not found` / error code `8000007` even when the project appears in the UI.

Optional: set repository variable `CLOUDFLARE_PAGES_PROJECT_NAME` if the Pages project name in the dashboard differs from `yaadro-ecommerce-user-web-frontend`.

Remove obsolete AWS secrets/variables when migration is complete: `AWS_ROLE_ARN`, `AWS_REGION`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`.

## 3) GitHub environment variables (production)

Same as before — baked into the client bundle at build time:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | API base (includes `/api`) |
| `NEXT_PUBLIC_API_URL` | Optional legacy API host |
| `NEXT_PUBLIC_TENANT_RESOLVER_URL` | `GET ?domain=<hostname>` → shopId |
| `NEXT_PUBLIC_SHOP_ID` | Dev fallback; optional prod fallback |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps on address/checkout |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Optional Maps map ID |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | Product/media CDN base |
| `NEXT_PUBLIC_AUTH_SESSION_DAYS` | Optional session length |

Production resolves **shop by domain** (`utils/authApi.js`). Ensure the backend registers:

- `testshop.yaadro.online`
- `marketfresh.in`
- `www.marketfresh.in` (if used)

## 4) Attach custom domains

In **Pages → yaadro-ecommerce-user-web-frontend → Custom domains**:

1. Add `testshop.yaadro.online` (zone `yaadro.online` on Cloudflare).
2. Add `marketfresh.in` and `www.marketfresh.in` (zone `marketfresh.in`).

Cloudflare will create or suggest DNS records. For proxied orange-cloud records, SSL mode **Full (strict)** is recommended.

**Google Maps / OAuth:** update HTTP referrer and redirect URIs for the new hostnames.

## 5) DNS cutover (from AWS CloudFront)

1. Remove CNAME records pointing to `*.cloudfront.net`.
2. Use Pages-provided targets (or proxied CNAME to the Pages project).
3. Wait for TLS to show **Active** on each custom domain.

## 6) CI/CD workflows

| Workflow | Trigger | Action |
|----------|---------|--------|
| `.github/workflows/ci.yml` | PR + push to `main` | `npm ci`, lint, build |
| `.github/workflows/deploy-cloudflare-pages.yml` | push to `main`, manual | build + deploy `out/` |

No cache invalidation step — each deploy replaces assets on Pages.

## 7) Local commands

```bash
npm ci
npm run build          # produces out/
npm run pages:deploy   # requires CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
npm run pages:dev      # local Pages preview of out/
```

## 8) SPA routing

`public/_redirects` is copied into `out/` and provides SPA fallback for routes not pre-rendered at build time (e.g. `/orders/<uuid>/`), replacing the old CloudFront 403/404 → `index.html` behavior.

## 9) Verification checklist

- [ ] `https://testshop.yaadro.online/` loads
- [ ] `https://marketfresh.in/` loads
- [ ] Deep routes: `/cart/`, `/checkout/`, `/orders/<id>/`
- [ ] `/_next/static/*` returns JS/CSS (not HTML)
- [ ] Login/OTP resolves shop for each hostname
- [ ] Push to `main` runs deploy workflow successfully

## 10) Troubleshooting deploy failures

### `Project not found` (code `8000007`)

1. Fix **`CLOUDFLARE_ACCOUNT_ID`** — must be **Account ID** from Workers & Pages sidebar, not a DNS Zone ID.
2. In Cloudflare → **Workers & Pages**, confirm the project name is exactly **`yaadro-ecommerce-user-web-frontend`** (or set GitHub variable `CLOUDFLARE_PAGES_PROJECT_NAME` to match the dashboard).
3. Re-run **Deploy to Cloudflare Pages** after updating secrets.

The workflow uses **Wrangler** (`wrangler pages deploy`), which can create the Pages project on first successful deploy if it does not exist yet.

### Build OK but deploy never runs

Only **CI** runs on some pushes. Check for a separate workflow run: **Deploy to Cloudflare Pages**.

## 11) Decommission AWS

After domains are stable on Pages: delete CloudFront distribution, empty S3 bucket, remove IAM OIDC role, remove AWS GitHub configuration.
