# Deploy: Hostinger (web) + Railway (API) + Neon — alternative to Render

> **Primary guide:** [deploy-hostinger-render.md](./deploy-hostinger-render.md)

## Architecture

```
Browser
  ├─ https://yourdomain.com          → Hostinger (static Vite build)
  └─ https://your-api.up.railway.app → Railway (Node API)
                                           └─ Neon Postgres
```

The site and API are on **different origins**, so sessions use `COOKIE_SAME_SITE=None` (see below).

---

## 1. Neon

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string (`?sslmode=require`).
3. You will paste this into Railway as `DATABASE_URL`.

---

## 2. Railway (API)

1. New project → **Deploy from GitHub repo**.
2. Set **Root Directory** to `apps/api`.
3. Add environment variables:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `PORT` | `8787` (Railway also injects `PORT`; either works) |
| `WEB_ORIGIN` | `https://yourdomain.com` (exact Hostinger URL, no trailing slash) |
| `SESSION_SECRET` | `openssl rand -base64 48` |
| `DATABASE_URL` | Neon pooled connection string |
| `COOKIE_SAME_SITE` | `None` |
| `X_CAMPAIGN_POST_URL` | Real campaign post URL |
| `X_ORBITALS_ACCOUNT_URL` | `https://x.com/orbitals_nft` |

4. Deploy. Railway runs migrations then starts the server (`npm run start`).
5. Copy the public Railway URL (e.g. `https://orbitals-api-production.up.railway.app`).
6. Optional: add a custom domain like `api.yourdomain.com` in Railway → point DNS CNAME to Railway.

**Health check:** `GET /api/health` → `{ "ok": true }`

---

## 3. Hostinger (frontend)

### Build locally

```bash
cd apps/web
cp .env.production.example .env.production
# Edit VITE_API_URL to your Railway URL

npm run build
```

Upload **everything inside** `apps/web/dist/` to Hostinger `public_html` (or your site root).

Ensure `.htaccess` from the build is uploaded (copied from `public/.htaccess`).

### Environment at build time

| Variable | Example |
|----------|---------|
| `VITE_API_URL` | `https://your-api.up.railway.app` |
| `VITE_X_CAMPAIGN_POST_URL` | Same as API `X_CAMPAIGN_POST_URL` |
| `VITE_X_ORBITALS_ACCOUNT_URL` | `https://x.com/orbitals_nft` |

`VITE_*` values are baked into the JS bundle at build time — rebuild and re-upload after changes.

### Hostinger checklist

- [ ] SSL enabled on your domain (Let's Encrypt in hPanel)
- [ ] `public_html` contains `index.html`, `assets/`, `.htaccess`
- [ ] No stale API URL in an old build

---

## 4. Verify end-to-end

1. Open `https://yourdomain.com` → scroll to **Observer Intake**.
2. DevTools → Network: `GET https://your-api.../api/me` should return 200 (CORS headers present).
3. Complete a social task → register → file quote.
4. Cookies: `orbitals_session` should be set on the **Railway domain** with `Secure; SameSite=None`.

---

## 5. Same-domain alternative (optional)

If you point `api.yourdomain.com` at Railway and `yourdomain.com` at Hostinger, cookies still need `SameSite=None` for cross-subdomain fetch from `www` vs apex — unless both share the exact same site for cookie purposes.

Simplest long-term fix: Hostinger **reverse proxy** `/api` → Railway so the browser only talks to one origin. That allows `SameSite=Lax` and no `VITE_API_URL`. Ask Hostinger support if your plan supports proxy rules.

---

## Local dev (unchanged)

```bash
npm run db:up
npm run db:migrate
npm run dev:api    # :8787
npm run dev:web    # :5173, proxies /api
```

Do **not** set `VITE_API_URL` locally — the Vite proxy handles `/api`.
