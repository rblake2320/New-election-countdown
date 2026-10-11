# ET-5: infrastructure release gates

Owner: Astra EC. Worktree `D:\projects\et-wt\lane-d`, branch `lane-d/infra-ci`.
Parent: https://rob47595-1791122756383.atlassian.net/browse/ET-1
Lane: https://rob47595-1791122756383.atlassian.net/browse/ET-5

This PR separates development tools from the runtime, updates dependencies,
corrects test-runner discovery, and adds reproducible CI gates. Typecheck is a
visible diagnostic job while legacy errors are repaired; it is not a passing
type-safety claim. Full audit reports include development dependencies. The
400,000-byte entry budget is enforced separately and requires the client lane's
route splitting. Browser discovery is not browser execution.

## Commands

```
npm ci
npm test
npm run test:e2e:list
npm run build
npm audit --omit=dev --audit-level=high
node scripts/check-bundle.mjs
docker build -t electiontracker:et5 .
docker build --target builder -t electiontracker:et5-builder .
node scripts/test-container.mjs
```

`PORT` defaults to 5058 in Playwright. Set `BASE_URL` and
`E2E_EXTERNAL_SERVER=1` to deliberately target an existing test server. The runner
does not reuse an occupied port automatically. Running browser tests against a
shared server requires its steward's approval because some specs mutate data.

## Migrations and deployment

## Executed milestone (2026-10-11)

- Clean install: 760 packages versus 1,253 at baseline.
- Unit suite: 121 passed, three existing skips; Playwright discovers 62 tests in
  17 files through its own runner (browser execution remains a separate gate).
- Production audit: zero advisories. Full tree: 12 (five high, seven moderate),
  including the Tailwind 3 build chain. Coordinate Tailwind 4 with the client lane.
- Container regression: restoring the original seed CLI guard reproduces exit
  before HTTP. The repaired compiled app serves `/`, `/api/health`, `/api/elections`
  with HTTP 200 on a fresh isolated PostgreSQL database: 537 rows, 537 distinct.
  No development tools or application source directories exist in the runtime.
- The original `import.meta.url` CLI check changed meaning when bundled by
  esbuild and ran a second seed plus `process.exit`. CLI extraction fixes that
  packaging defect; startup policy remains owned by lane A.
- Bundle gate failed: 1,428,947-byte entry versus 400,000-byte budget. The client
  lane owns route splitting. Typecheck ran and reported 1,059 diagnostics;
  none refer to the modified `server/vite*` files after the typed options fix.

Receipts are in `docs/evidence/et5/`; runtime logs are produced by the container
test under `test-results/container/`. The container test creates an internal
network with no host ports and removes its own containers/network in `finally`.

## Remaining release work

The eleven existing SQL files contain mixed schema, data repair and seed changes
and have no Drizzle journal. Running `drizzle-kit migrate` against them would not
constitute a migration strategy. Preserve them; do not execute them automatically
at web boot or delete them. Follow-up: capture a reviewed initial schema baseline,
generate journalled migrations in a separate folder, and test upgrade + restore
against a disposable database before any release migration.

Production image intentionally excludes migration tools and raw application
source. Use a separate reviewed migration job/image. Compose requires private
DB/JWT secrets and `APP_ORIGIN`, does not publish PostgreSQL, and binds the web
port only to loopback for the reverse proxy. Puppeteer remains a runtime import;
browser installation is not part of this image and browser-dependent features
must be disabled or provisioned separately before enabling them.

No VPS changes are included. Deployment, load test and 24-hour soak follow A+C
integration, an approved hostname/TLS plan, expected RPS and external-service
limits. Record those inputs and receiving-side evidence in ET-5 before release.
