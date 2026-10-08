# Orbitals · Resonance

An npm-workspace monorepo for **Resonance**, a generative-art NFT collection: a scroll-driven React/Vite campaign site, a small Node.js + PostgreSQL API that registers campaign participants, and a deterministic artwork + metadata generator whose output the website can reproduce pixel-for-pixel in the browser.

## Stack

| Workspace | Stack | What it does |
|---|---|---|
| `apps/web` | React 19, TypeScript, Vite, Tailwind CSS 4, Motion, OGL (WebGL), Zustand | Scroll-driven "station log" narrative site with canvas/WebGL visuals and the campaign task console |
| `apps/api` | Node.js 22 (`node:http`, no framework), PostgreSQL (`pg`), `node:test` | Participant registration, signed-cookie sessions, campaign settings and quote-post submissions |
| `packages/generator` | Node.js, worker processes, `pngjs` | Deterministic renderer: seed → PNG plate + OpenSea-style metadata, rarity report and manifest hash |
| `apps/trailer` | Remotion, React Three Fiber | Work-in-progress video trailer (not part of the build) |

## Architecture

```
apps/web  ──/api──►  apps/api  ──►  PostgreSQL
   │                    (participants, campaign_settings; SQL migrations in apps/api/migrations)
   │
   └─ src/lib/resonance.ts: browser port of packages/generator ─ verified against generator output
```

**API (`apps/api`)**
- Plain `node:http` request handler built by `createApp({ config, store, rateLimiters })`, so tests inject an in-memory store.
- Endpoints: `GET /api/health`, `GET /api/me`, `POST /api/register` (X username + EVM wallet address), `POST /api/tasks/quote`, `POST /api/logout`, and admin-only `PUT /api/campaign` (Bearer secret, constant-time comparison).
- HMAC-SHA256 signed session cookies (HttpOnly, configurable SameSite, Secure in production), strict CORS to `WEB_ORIGIN`, 16 KB body limit, per-IP sliding-window rate limits.
- Config is validated at startup (`SESSION_SECRET` ≥ 32 chars, `DATABASE_URL` required, HTTPS origin enforced for cross-site cookies).
- Social tasks are trust-based: no X API credentials are used; submitted quote links are checked for format/ownership and reviewed manually.

**Generator (`packages/generator`)**
- `sfc32` seeded PRNG — the same seed always gives the same plate, on any machine.
- Renders the whole supply across worker processes, writes per-token metadata, checks for duplicate images, tallies trait rarity, and produces one commit hash over the manifest (to publish before mint).

**Web (`apps/web`)**
- `src/lib/resonance.ts` is a faithful port of the generator, so the site can render any token from its seed. `npm run verify:render` compares browser renders pixel-for-pixel against reference PNGs from the generator.
- The heavy WebGL layer (`ogl`) is lazy-loaded to keep it out of the entry chunk.

## Setup

Requirements: Node.js 22+, npm 10+, Docker (for local Postgres).

```bash
npm install
npm run db:up                                   # Postgres 17 via docker compose
cp apps/api/.env.example apps/api/.env          # then edit, see below
npm run db:migrate
npm run dev:api                                 # http://localhost:8787
npm run dev:web                                 # http://localhost:5173 (proxies /api to the API)
```

### Environment variables (`apps/api/.env`)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `SESSION_SECRET` | yes | ≥ 32 characters (`openssl rand -base64 48`) |
| `WEB_ORIGIN` | no | Allowed CORS origin, default `http://localhost:5173` |
| `PORT` | no | Default `8787` |
| `NODE_ENV` | no | `production` enables Secure cookies |
| `COOKIE_SAME_SITE` | no | `None` for a cross-domain frontend (requires HTTPS origin) |
| `CAMPAIGN_ADMIN_SECRET` | no | Enables `PUT /api/campaign` |
| `X_ORBITALS_ACCOUNT_URL`, `X_CAMPAIGN_POST_URL` | no | Campaign links (the post URL can also be set at runtime via the admin endpoint) |
| `PG_POOL_MAX`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_REGISTER`, `RATE_LIMIT_QUOTE`, `RATE_LIMIT_ME` | no | Tuning |

Frontend: `VITE_API_URL` (see `apps/web/.env.production.example`) when the API is on a different origin. More detail in [docs/environment.md](docs/environment.md); deployment guides in [docs/](docs/).

## Commands

```bash
npm run build           # build the web app (tsc -b + vite build)
npm run typecheck       # type-check the web app
npm test                # API tests (node:test)
npm run verify:render   # pixel-compare the browser port against generator reference renders
npm run generate -- -- 100 4   # render 100 tokens with 4 workers into artifacts/generated
```

Generator arguments: `<supply> [workerCount] [outDir] [signalLostId]`.

Trailer (`apps/trailer`, work in progress): `npm run trailer:audio` regenerates the audio bed; `trailer:studio` / `trailer:render` need the Remotion toolchain.

## Repository layout

```
apps/
  api/          Registration API, SQL migrations, tests
  web/          React/Vite campaign site
  trailer/      Remotion trailer (WIP)
packages/
  generator/    Deterministic artwork and metadata generator
docs/           Environment, deployment and design notes
artifacts/      Generated renders and rarity output (gitignored)
```

## License

[MIT](./LICENSE) © 2026 Obaro Destiny Udurie
