# ET-6 batch election identity regression receipt

Recorded 2026-10-13 by Astra's Orange review subagent for PR #63. These are observations transcribed from execution tool outputs, not a retained raw log. Raw stdout was not persisted to disk. Working directory: `D:/projects/et-wt/astra-et6-production`.

## Old source: Failed as expected

```powershell
docker run --rm --mount "type=bind,source=D:/projects/et-wt/astra-et6-production/tests,target=/app/tests,readonly" electiontracker:et6-d-8c0f45a-builder npx vitest run tests/unit/results-store-batch.test.ts
```

Tool session 47791. Vitest reported start `17:01:52` (container UTC; 12:01:52 America/Chicago), duration 4.33 seconds, exit 1: one file failed, two tests failed. Both ID-filter and date-filter cases rejected the old projection `SELECT e.id AS election_id` because it lacked the distinct `e_id` projection. The test also asserts payload IDs `[1, 2, 3]` for realistic rows containing null report-side `election_id`, `status: none`, null report ID and empty candidates.

## Repaired source: Worked

```powershell
docker run --rm --mount "type=bind,source=D:/projects/et-wt/astra-et6-production/server,target=/app/server,readonly" --mount "type=bind,source=D:/projects/et-wt/astra-et6-production/tests,target=/app/tests,readonly" electiontracker:et6-d-8c0f45a-builder npx vitest run tests/unit/results-store-batch.test.ts
```

Tool session 23437. Vitest reported start `17:01:07` (container UTC; 12:01:07 America/Chicago), duration 6.54 seconds, exit 0: one file and both tests passed. This used the repaired host source mounted over the original builder source.

## Full suite on repaired builder: Worked

```powershell
docker run --rm --mount "type=bind,source=D:/projects/et-wt/astra-et6-production/tests,target=/receiving-tests,readonly" electiontracker:et6-d-batchfix-20261013-builder sh -c "cp -a /receiving-tests/. /app/tests/ && npx vitest run --maxWorkers=2"
```

Tool session 4300. Builder image ID observed by `docker image inspect`: `sha256:7b0deeaac1662425dfda3e3e7f5233c13749da312f7b34224ad56137cfee0340`.

Vitest 5.0.3 reported start `17:04:36` (container UTC; 12:04:36 America/Chicago), duration 89.18 seconds, exit 0:

```text
Test Files  92 passed (92)
     Tests  809 passed (809)
```

All tests used their unchanged assertions and timeouts. Tests were copied into the ephemeral container because this builder omits the test tree; source came from the repaired image. No shared database was used by these runs.

## Earlier verification failures retained in this account

The initial full suite with both Windows source and tests bind-mounted (session 39079, start 17:02:01 UTC, 48.19 seconds) returned exit 1: 804 passed, five failed. Four failures were 5-second timeouts in `no-embedded-credentials`, `no-secret-logging`, `storage-honesty`, and `tranche3-contracts`; the Congress committees UI check timed out while showing loading content. A one-worker targeted mounted rerun (session 70683, start 17:03:06 UTC, 66.91 seconds) returned 42 passed and four failed: two filesystem-scan timeouts and two Congress UI waits. The final image-local run above cleared all these failures without changes to test assertions or timeouts.

Two intermediate runner setup attempts were unsuccessful: mounting only the regression file lacked `tests/setup.ts` (session 89006); copying the test directory itself created an extra `receiving-tests` path (session 90001). The latter container was explicitly identified by command and stopped. The corrected copy command above completed successfully. These setup attempts are not counted as product test results.

The source change under review is only the distinct `e_id` SQL projection, row type, and argument passed to `buildResultsPayload`, with `tests/unit/results-store-batch.test.ts` added. The root agent separately owns the actual packaged PostgreSQL and load-test receipts; their outcomes are not claimed as this subagent's observations.
