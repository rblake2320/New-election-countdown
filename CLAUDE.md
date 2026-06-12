# ElectionTracker — Claude Code Project Guide

Real-time 2026 U.S. election tracking platform. **Data integrity is the prime
directive: no mock, synthetic, or invented data may ever be served to users.**
Fields without verified real values stay `null` and the UI shows honest empty
states.

## Commands

```bash
npm run dev               # Dev server (Express + Vite middleware) on :5000
npm run build             # vite build (client → dist/public) + esbuild (server → dist/index.js)
npm start                 # Production server (needs NODE_ENV=production, serves dist/)
npm run check             # TypeScript check (legacy errors exist; don't add new ones)
npm test                  # Unit tests (fast, no server needed) — must stay green
npm run test:integration  # Needs live DB + server on :5000
npm run test:e2e          # Needs running server + browser
npm run db:push           # Push Drizzle schema to DATABASE_URL
npm run db:seed           # Seed verified 2026 data (skips if elections exist)
```

## Architecture

- **Client**: React 18 + TypeScript, Vite, shadcn/ui (Radix), Tailwind,
  TanStack Query, wouter. Source in `client/src/`, alias `@` → `client/src`.
- **Server**: Express + TypeScript ESM, entry `server/index.ts`. Routes in
  `server/routes.ts` (large) + `server/routes/*.ts` routers.
- **DB**: PostgreSQL via `pg` + Drizzle ORM (`drizzle-orm/node-postgres`).
  Schema: `shared/schema.ts` (alias `@shared`). Connection: `server/db.ts`
  (loads `.env` via dotenv).
- **Auth**: JWT-signed httpOnly cookie sessions (`server/auth.ts`,
  `server/routes/auth.ts` at `/api/auth/*`). Argon2 password hashing,
  DB-backed session revocation. **No Replit/OIDC — that was removed.**
- **Storage failover**: `server/storage-factory.ts` switches between
  `DatabaseStorage` (source of truth) and `MemStorage` (empty failover
  cache — must NEVER be seeded with synthetic data).

## Data rules (critical)

1. Seed data lives in `server/seed-data.ts` + `server/seed-data-2026.ts` —
   every race/candidate was verified against Ballotpedia/NCSL/state SOS
   sources on 2026-06-11. Update only with sourced facts.
2. Polling numbers come only from the `polling_data` table
   (`polling-trend-service.ts`). Never generate polls, sample sizes, margins
   of error, or attribute numbers to pollsters.
3. `Math.random()` is allowed only for IDs/jitter — never for any value a
   user can see.
4. Election dates are calendar dates stored at **midnight UTC** — always
   render with `timeZone: 'UTC'` (see `election-card.tsx`) or re-anchor to
   local midnight (see `election-details.tsx`), or dates display a day early.
5. The mock-data filter (`server/validators/state-election-rules.ts`,
   `client/src/lib/election-validators.ts`) uses **word-boundary** regex —
   a substring match on 'demo' blocks the word "Democratic".

## External APIs

All optional enhancers configured via `.env` (see `.env.example`). Every
service must degrade gracefully when its key is absent (warn + disabled, never
throw at module load). Key status is reported at `/api/services/status` and on
the System Configuration admin page. The visitor-facing banner
(`service-status-banner.tsx`) shows only critical failures.

## Environment

Required: `DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`.
Local dev DB: postgres in Docker on :5432 (`elections` database).
Server binds `127.0.0.1` on Windows dev, `0.0.0.0` in production
(`HOST`/`PORT` env vars override).

## Deployment

Hostinger VPS via Docker — see `DEPLOYMENT.md` and `docker-compose.prod.yml`.
The Dockerfile is multi-stage; builder installs devDependencies (the build
needs vite/esbuild), production stage runs `node dist/index.js` as non-root
with `NODE_ENV=production`.

## Gotchas

- `npm run check` reports ~1,160 pre-existing type errors; the build
  (vite+esbuild) does not typecheck. Don't add new errors; don't try to fix
  them all in unrelated PRs.
- 3 CongressData tests are `it.skip` — Radix pointer interactions need a real
  browser (covered by e2e).
- `tests/admin-widget-visibility.spec.ts` and `tests/featured-layout.spec.ts`
  are Playwright specs — run with `npx playwright test`, not vitest.
