# Official results routes (ET-11 C6)

The public election contract adds `officialResultsUrl: string | null` and
`officialResultsSource: OfficialResultsSource | null`. The type and runtime
validator are in `shared/official-results.ts`. Existing elections without a
reviewed route have explicit nulls. Election inserts cannot assert provenance.

These are navigation sources, not vote totals, winners, publication, or
certification. The retained October 11 reviews cover exactly 50 states: 49
healthy routes and New Hampshire's blocked live transport. NH has a null
destination and unknown metadata. Michigan's advertised November query is
retained separately because its selector still shows the primary. Louisiana
uses its healthy government landing; the published `--environment--` href is
not repaired or promoted into a delegation claim. Non-general November 3 rows
receive an unknown publication status with their own election phase.

Only reviewed state rows on **2026-11-03** are synchronized. Historical primary
rows and unreviewed states retain their previous fields. Every reviewed state
must have at least one receiving row; a missing state refuses the operation.
The manifest is reconstructed from exact reviewed source bytes before use.
No network fetching, schema migration, or importer execution runs at web boot.

## Release operation

Run the additive migration before deploying code that selects the new columns:

```sh
node --input-type=module -e "import pg from 'pg'; import {readFile} from 'node:fs/promises'; if(!process.env.DATABASE_URL) throw Error('DATABASE_URL required'); const p=new pg.Pool({connectionString:process.env.DATABASE_URL}); try { await p.query(await readFile('migrations/20261011_official_results_routes.sql','utf8')); } finally { await p.end(); }"
```

The image includes the compiled CLI, manifest, review bytes and migration.
Credentials are supplied through the process environment, never CLI arguments.
Use distinct receipt filenames in an existing writable directory. A source
refresh is reviewed separately; the importer does not claim the old snapshot
is freshly checked whenever it runs.

Future reviewed publications use `routeType: "election_specific_results"`,
`status: "published"` and `availabilityReason: "published_for_target_election"`.
Their optional `publicationEvidence` binds the exact November 3 date, election
phase, destination, official contextual label, two retained proof digests and
the receiving check timestamp. Both the government-context receipt and actual
receiving-results receipt must declare verified context and observed results;
their retained bytes, dates, phases and URLs are checked. An HTTP 200 response,
advertised selector, previous primary or route shell alone is refused.
Off-government destinations additionally need the exact observed government
delegation. A specific General source is refused for a primary receiving row;
it cannot silently inherit published status. `published` says returns are
available, never that they are certified or that a candidate has won.
The current committed 50-state snapshot has **zero published entries**; the
future positive/negative shapes exist only in isolated acceptance tests.

```sh
# Default is READ ONLY dry-run, with no audit/data writes.
node dist/sync_official_results.js --receipt artifacts/results-plan.json

# Copy both exact hashes from that inspected dry-run.
node dist/sync_official_results.js --apply \
  --expect-sha256 <manifestSha256> \
  --expect-preimage-sha256 <preimageSha256> \
  --receipt artifacts/results-apply.json

# An audited rollback also requires its own fresh dry-run and exact guards.
node dist/sync_official_results.js --rollback-run <applyRunId> \
  --receipt artifacts/results-rollback-plan.json
node dist/sync_official_results.js --apply --rollback-run <applyRunId> \
  --expect-sha256 <manifestSha256> \
  --expect-preimage-sha256 <preimageSha256> \
  --receipt artifacts/results-rollback.json
```

Apply and rollback acquire advisory writer lock `2026110301` (shared with
candidate ingestion) and an election table write lock. Both bind the entire
ordered election catalog preimage, including future/unrecognized columns.
Any intervening data or membership change refuses the stale plan. Only the
two results fields change. Postimage verification and an audit row commit in
the same transaction. Repeat applies report zero changes and do not update
election row versions. Rollback refuses stale catalogs and already reversed
runs. Serialization/lock failures require a fresh dry-run; they do not silently
rebuild an approved plan.

The retained CLI failure receipt contains a safe diagnostic and commit status.
If receipt export fails after commit, recover the durable
`official_results_sync_runs` row by run ID before retrying; audit data is the
authority. The CLI does not expose fault injection.

## Reproduction

Install physical dependencies with browser downloads skipped for this offline
workflow: set `PUPPETEER_SKIP_DOWNLOAD=true` and
`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` in the current process environment.
No dependency junctions are used. Run:

```sh
npm ci --no-audit --no-fund
npm test
npm run build
docker build --target builder -t electiontracker:c6-results-builder .
docker build -t electiontracker:c6-results .
node scripts/test-official-results-container.mjs
```

The harness owns a new disposable PostgreSQL database, Docker network and app
for every run. It publishes zero ports, never uses a browser or shared DB,
and cleans up only its named resources. It tests the real seeded catalog,
migration twice, compiled CLI defaults/guards/apply/rollback/reapply, source
availability cases, transactional injected failure, writer lock contention,
missing receiving states, stale preimages/rollbacks, unknown manifest fields,
future DB columns, repeat row versions, and candidate preservation.
It also forces a real non-root filesystem rename failure after commit and
checks that the CLI reports **Applied**, retains its audit ID and temporary
receipt, and refuses to describe the committed data as rolled back.
The audit table is also represented in Drizzle. A later schema synchronization
restricted to that table is tested with populated receipts to ensure durable
audit history and the full election catalog survive unchanged.
Every real detail response plus the upcoming list is compared with independent
SQL. HTTP quota is respected via `Retry-After`, with waits recorded.

LA-01's private acceptance fixture retains the actual lane-C catalog correction
context; it is not an importer catalog change. Lane C's parent owns the complete
Louisiana catalog correction and downstream integration.

## Lessons retained for the engineering registry

* SQL NULL and JSONB `null` are distinct. A JSONB preimage parameter for a nullable
  field must be SQL NULL when the prior DB field is null. The first real private
  apply caught the mismatch before any commit; the rollback receipt was kept.
* The first mounted receiving route can shadow a later route with the same URL.
  A Drizzle schema update propagated into the listing, but the active reduced
  detail projection omitted the fields. The actual receiving HTTP test caught
  this; its failing body and corrected rerun are retained separately.
