# JSON evidence parser repair — 2026-10-13

Actual production upload of the retained 6,321-byte Louisiana official JSON returned `400 empty_evidence`. The global JSON parser consumed and decoded the stream before the evidence route's authenticated raw parser. Route-only tests used HTML and never exercised this production middleware composition.

`registerRequestBodyParsers` now uses Express's own route matcher to skip generic parsers only for POST `/api/admin/results-evidence`. Its raw parser remains after the global write guard and authentication/admin checks. JSON parsing, webhook `rawBody`, URL-encoded forms, ordinary JSON limits, the 10 MB evidence limit and typed media/size/empty errors are exercised through real HTTP in `tests/unit/results-evidence-body.test.ts`.

Source fixture: https://voterportal.sos.la.gov/ElectionResults/ElectionResults/Data?blob=20260627/RacesCandidates_Multiparish.htm, retrieved by lane C at 2026-10-12T05:05:48.486533Z. SHA256 `cf1e6a52f5554f0bb4959f6b9ad7cc583e53f70e57ca28b62346f7c8c01be637`; exact response bytes retained in `tests/fixtures/la-jun27-results-evidence.json`.

## Recorded execution

- `red.txt`: same production helper extracted without behavioral change; three failed / three passed. Exact official JSON and Express case/slash/query variant returned 400; valid 10 MB JSON returned 413. Start 17:14:35 UTC, duration 3.42 seconds, exit 1.
- `green.txt`: repaired helper, six focused tests passed; full suite 93 files / 815 tests passed; `npm run build` passed. Focused start 17:15:05 UTC, 2.03 seconds; full start 17:15:08 UTC, 78.84 seconds; combined command exit 0.

Commands were run from this worktree. Red used the same copy command below followed only by `npx vitest run tests/unit/results-evidence-body.test.ts`, before the helper's skip-router repair. Green:

```powershell
docker run --rm --mount "type=bind,source=D:/projects/et-wt/astra-evidence-body,target=/receiving,readonly" electiontracker:et6-d-batchfix-20261013-builder sh -c "cp -a /receiving/server/. /app/server/ && cp -a /receiving/tests/. /app/tests/ && npx vitest run tests/unit/results-evidence-body.test.ts && npx vitest run --maxWorkers=2 && npm run build" *> evidence-body-green.log
```

The tests use real Express networking, the production parser registration, real globalWriteGuard, real results routes and MemStorage evidence storage. Storage health and session/admin middleware are controlled test doubles; no shared DB was used. Root Astra owns the separately compiled combined batch-ID/parser image and actual PostgreSQL replay; those results belong in its receiving receipt.

Sweep: repository search found this evidence endpoint is the only `express.raw` route. The global JSON parser's webhook byte-capture behavior is preserved and checked. Existing route-only tests continue to pass. An initial test-runner setup error (`new URL` under jsdom) was corrected to a cwd-relative fixture read before the retained red run; no product outcome was inferred from it.

Candidate systemic lesson recorded in engineering-standards REGISTRY as `CAND-20261013-RAW-BODY-COMPOSITION`: exercise byte-sensitive uploads through production parsers, with guards and boundaries composed.
