# Sol EC data and integration acceptance

Owner: Sol EC, HWND 162924912. Team: ElectionTracker 23-day (4 seats).
Parent: ET-1. Lane: ET-4. Branch: lane-c/data-refresh.

## First milestone: election listing filters

- On 2026-10-11, next-30-days returns upcoming elections through 2026-11-10 and excludes 2026-09-15.
- Federal and federal select the same races. Democratic and D select the same party.
- Unknown filters are rejected rather than silently broadening the result.
- Date filtering and candidate counts execute in SQL, with a bounded query count independent of election count.
- The empty failover store and database store implement the same filter contract.

Keep changes to listing predicates and their storage implementation separate from Fable's authentication changes in server/routes.ts.

## Data milestones

- FEC dry run leaves all database rows unchanged. Imported filings are labeled FEC-registered and never certified.
- Nominee refresh requires row-level source citations, preserves ballot_status, and is idempotent for state/office/district/date.
- Polling windows require official state sources. Multi-zone and local-option states retain explicit uncertainty instead of an invented statewide instant.
- All general-election data and official-results links are reviewed before live mutation. No mock candidate, polling, vote, or trend values are introduced.

Each milestone retains its exact scenario, observed result, source snapshot, and receipt in its Jira subtask before completion.

## C4/C5 observed outcomes, 2026-10-11

- Worked: six in-memory regression scenarios first failed on the original code and then passed after repair. The 12 focused SQL/HTTP/memory tests pass. Full unit suite: 133 pass, 3 existing skips. Production Vite/esbuild build passes.
- Worked: read-only PostgreSQL behind the real Express listing handler returns 506 upcoming rows for next-30-days, 470 for both federal/Federal, and 55 for both D/Democratic. Each valid request executes one SQL statement. Invalid timeframe returns HTTP 400 and executes zero statements. All candidate counts match an independent grouped SQL control.
- Worked: fresh TypeScript checks with incremental cache disabled report 1124 baseline errors and 1114 candidate errors, with no added diagnostic classes. This is an improvement against a failing global baseline, not a green global typecheck. Lane D coordinates the remaining production type gate.
- Receipts: artifacts/lane-c/C4-C5-receipt.json, filters-red.json, filters-unit.json, filters-live-postgres.json and types-delta.json.
