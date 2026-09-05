# Environment Configuration

The API reads `apps/api/.env`.

```env
NODE_ENV=development
PORT=8787
WEB_ORIGIN=http://localhost:5173
SESSION_SECRET=replace-with-at-least-32-random-characters
DATABASE_URL=postgresql://resonance:resonance_local@localhost:5432/resonance
X_CAMPAIGN_POST_URL=https://x.com/orbitals/status/REPLACE_WITH_POST_ID
X_ORBITALS_ACCOUNT_URL=https://x.com/orbitals
```

Generate the session secret with:

```bash
openssl rand -base64 48
```

No X API credentials are required. Actions are trust-based and submitted quote links are manually reviewed.

For production, replace `DATABASE_URL` with the Neon pooled connection string and set `WEB_ORIGIN` to the HTTPS website origin.

**Deploy guides:** [Hostinger + Render + Neon](./deploy-hostinger-render.md) (recommended) · [Railway alternative](./deploy-hostinger-railway.md)

Production API (Render) when the site is on a different domain:

```env
NODE_ENV=production
COOKIE_SAME_SITE=None
WEB_ORIGIN=https://yourdomain.com
```

Build the Hostinger frontend with `VITE_API_URL` pointing at your Render URL — see `apps/web/.env.production.example`.
