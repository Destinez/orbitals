# Resonance

Resonance is organized as an npm workspace containing the public campaign site, its X task-verification API, and the deterministic NFT artwork generator.

## Structure

```text
apps/
  api/                 Observer registration and campaign evidence storage
  web/                 React/Vite campaign site
packages/
  generator/           Deterministic artwork and metadata generator
    archive/           Superseded renderer experiments kept for reference
docs/
  design/              Product brief, content, and visual handoff material
artifacts/              Generated renders and rarity output (gitignored)
```

## Setup

Requirements: Node.js 22 or newer and npm 10 or newer.

```bash
npm install
cp apps/api/.env.example apps/api/.env
```

Configure `apps/api/.env` using [docs/environment.md](docs/environment.md), then run the API and web app in separate terminals:

```bash
npm run dev:api
npm run dev:web
```

The web app runs at `http://localhost:5173` and proxies `/api` to the API at `http://localhost:8787` during development.

## Commands

```bash
npm run build
npm test
npm run typecheck
npm run verify:render
npm run generate -- -- 100 4
```

Generator arguments are `<supply> [workerCount] [outDir] [signalLostId]`. Its default output is `artifacts/generated`.
