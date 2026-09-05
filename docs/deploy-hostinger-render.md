# Deploy: Hostinger (web) + Render (API) + Neon (Postgres)

## Architecture

```
Browser
  ├─ https://yourdomain.com              → Hostinger (static Vite build)
  └─ https://orbitals-api.onrender.com   → Render (Node API)
                                               └─ Neon Postgres (pooled)
```

Cross-origin setup requires `COOKIE_SAME_SITE=None` and `VITE_API_URL` at build time.

---

## Scale notes (thousands of sign-ups)

| Concern | Recommendation |
|---------|----------------|
| **Render plan** | Use **Starter ($7/mo)** or higher. Free tier **sleeps** after ~15 min idle — bad for a live campaign. |
| **Neon connection string** | Always use the **pooled** URL (`-pooler` host or `?pgbouncer=true`). Never the direct connection for the API. |
| **Connections** | Default `PG_POOL_MAX=8` per instance. Neon free allows ~100 connections total — one Render instance is fine. |
| **Rate limits** | Built-in per-IP limits on register/quote (see env vars below). Tune if you see 429s in logs. |
| **Single instance** | Thousands of **total** submissions over days is fine on Starter. Thousands **simultaneous** may need Standard + Neon scale-up. |
| **Multi-instance** | In-memory rate limits do not sync across instances. Stay on 1 instance unless you add Redis. |

Expected traffic pattern: most users hit `/api/me` once, complete 4 client tasks, then one `POST /api/register` + one `POST /api/tasks/quote`. ~6 API calls per completed signup.

---

## 1. Neon

1. Create project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string ending in `?sslmode=require`.
3. For heavy campaigns, enable Neon's **autoscaling** or bump compute in the dashboard.

---

## 2. Render (API)

### Option A — Blueprint (recommended)

1. Render Dashboard → **New** → **Blueprint**.
2. Connect this GitHub repo — Render reads `/render.yaml`.
3. Fill in sync variables when prompted:
   - `WEB_ORIGIN` → `https://your-hostinger-domain.com`
   - `DATABASE_URL` → Neon pooled string
   - `X_CAMPAIGN_POST_URL` → real campaign post
4. Confirm **Starter** plan (change from free in the service settings if needed).
5. Deploy.

### Option B — Manual Web Service

1. **New** → **Web Service** → connect repo.
2. **Root Directory:** `apps/api`
3. **Build:** `npm install`
4. **Start:** `npm start`
5. **Health check path:** `/api/health`
6. Environment variables:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `WEB_ORIGIN` | `https://yourdomain.com` (exact, HTTPS, no trailing slash) |
| `SESSION_SECRET` | `openssl rand -base64 48` |
| `DATABASE_URL` | Neon **pooled** connection string |
| `COOKIE_SAME_SITE` | `None` |
| `X_CAMPAIGN_POST_URL` | Real post URL |
| `X_ORBITALS_ACCOUNT_URL` | `https://x.com/orbitals_nft` |
| `PG_POOL_MAX` | `8` (optional) |
| `RATE_LIMIT_REGISTER` | `5` per IP per 15 min (optional) |
| `RATE_LIMIT_QUOTE` | `8` per IP per 15 min (optional) |

7. Copy the Render URL (e.g. `https://orbitals-api.onrender.com`).

---

## 3. Hostinger (frontend)

```bash
cd apps/web
cp .env.production.example .env.production
```

Set in `.env.production`:

```env
VITE_API_URL=https://orbitals-api.onrender.com
VITE_X_CAMPAIGN_POST_URL=<same as API>
VITE_X_ORBITALS_ACCOUNT_URL=https://x.com/orbitals_nft
```

```bash
npm run build
```

Upload **all files** from `apps/web/dist/` to `public_html`. Ensure `.htaccess` is included.

Enable **SSL** on your domain in hPanel.

---

## 4. Verify

1. `curl https://your-api.onrender.com/api/health` → `{"ok":true}`
2. Open the site → Observer Intake → Network tab shows `GET .../api/me` with CORS headers.
3. Complete flow: social tasks → register → file quote.
4. Check Render logs for 429s (rate limit) or DB connection errors.

---

## 5. Monitoring during campaign

- **Render** → Metrics: CPU, memory, response times
- **Neon** → Dashboard: connections, compute usage
- **Logs** → watch for `23505` (duplicate username/wallet) vs spikes in 429

---

## Local dev (unchanged)

```bash
npm run db:up && npm run db:migrate
npm run dev:api   # :8787
npm run dev:web   # :5173, proxies /api — do not set VITE_API_URL
```

---

## Railway alternative

See [deploy-hostinger-railway.md](./deploy-hostinger-railway.md) if you prefer Railway over Render.
