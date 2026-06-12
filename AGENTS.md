# AGENTS.md — Agent Guide for ElectionTracker

Instructions for AI coding agents working in this repository.

## Prime directive: data integrity

This platform serves election information to voters. **Never introduce mock,
synthetic, placeholder, or invented data on any user-visible path.** If real
data is unavailable, return `null`/empty and let the UI render an honest empty
state. Specifically forbidden:

- Generated candidate names, polling percentages, vote counts, or trends
- Numbers attributed to real pollsters or institutions without a source
- `Math.random()` for any user-visible value (IDs and retry jitter are fine)
- Seeding `MemStorage` (it is an empty failover cache by design)

New seed data must cite a verifiable source (Ballotpedia, NCSL, state SOS,
FEC) in the accompanying commit message or comment.

## Build & test before claiming done

```bash
npm run build   # must succeed
npm test        # unit suite must stay green (121+ passing)
```

For server changes, boot and probe: `npm run dev`, then
`curl http://127.0.0.1:5000/api/health` (expect `ok: true`, real counts).

## Code conventions

- TypeScript ESM throughout. Path aliases: `@` → `client/src`,
  `@shared` → `shared`.
- Drizzle ORM for DB access; raw SQL only with `to_regclass` guards for
  legacy tables that may not exist.
- External API services: constructor must not throw when the key is missing —
  log a warning, expose `isEnabled`, return null/empty from methods.
- Election dates render in UTC (`timeZone: 'UTC'`) — they are stored at
  midnight UTC and shift a day in western timezones otherwise.
- npm scripts must be cross-platform (`cross-env`, no bare `NODE_ENV=x`).
- Never commit secrets. Keys go in `.env` (gitignored); `.env.example`
  documents them.

## Test layout

| Command | Scope | Needs |
|---|---|---|
| `npm test` | unit + component (jsdom) | nothing |
| `npm run test:integration` | smoke/integration specs | live DB + server |
| `npm run test:e2e` | tests/e2e | running server + browser |
| `npx playwright test` | Playwright specs | browser |

Don't move server-dependent tests into the unit run. Mock with `vi.hoisted`
when the mock object is referenced inside a `vi.mock` factory. MSW is v2
(`http`/`HttpResponse`, not `rest`).

## Areas needing care

- `server/routes.ts` is very large — prefer adding new endpoints as routers
  under `server/routes/`.
- `server/storage.ts` (DatabaseStorage) and `server/mem-storage.ts`
  (failover) implement the same interface; keep them in sync when adding
  methods.
- The mock-data validators use word-boundary regexes; test against titles
  containing "Democratic" before changing them.
- Legacy type errors exist (~1,160). Do not add new ones; fix only those in
  files you touch.
