# Environment Configuration

The API reads `apps/api/.env`.

```env
NODE_ENV=development
PORT=8787
WEB_ORIGIN=http://localhost:5173
SESSION_SECRET=replace-with-at-least-32-random-characters
DATABASE_URL=postgresql://resonance:resonance_local@localhost:5432/resonance
X_ORBITALS_ACCOUNT_URL=https://x.com/orbitals_nft
CAMPAIGN_ADMIN_SECRET=replace-with-a-long-random-secret
```

The campaign **post URL is not baked into the frontend**. It lives in Neon (`campaign_settings`) and is served by `GET /api/me`. Follow works immediately. Like / repost / quote stay locked until you publish a real post.

After you post on X, update in one place (no Hostinger rebuild):

```bash
curl -X PUT "$API_URL/api/campaign" \
  -H "Authorization: Bearer $CAMPAIGN_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"postUrl":"https://x.com/orbitals_nft/status/YOUR_POST_ID"}'
```

Or in the Neon SQL editor:

```sql
UPDATE campaign_settings
SET post_url = 'https://x.com/orbitals_nft/status/YOUR_POST_ID', updated_at = NOW()
WHERE id = 1;
```

Open tabs pick it up within ~20 seconds.

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
