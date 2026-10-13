# PR81 independent review

Exact head ebb94741e2ec88114dae862ffc98a0f5f955d651. READ ONLY B checkout; tests ran in own detached yellow-pr69-review checkout. Source inspection finds adminOnly (isAuthenticated,requireAdmin) on historical route; existing admin prefix also applies degraded-mode/auth. DTO shared marker preserves explicit source fields/null without promoting FEC to ballot certification. Existing actual HTTP/SQL compiler tests20pass.

MUST FIX: historical handler line38 uses generic storage.getElections. DatabaseStorage.getElections line552 calls handleDatabaseOperation; its supported endpoint-disabled error branch lines539-544 returns fallback[]. New route consequently sends200[] instead of503lookup_unavailable. Independent real Express + actual DatabaseStorage test injected the known query error and observed200, reproducing the precise forbidden empty-success case. Storage health/mode may still be database during an endpoint failure, so the earlier degraded-mode guard does not provide a strict read boundary.

Fix through strict historical lookup read (or scoped strict behavior), without weakening valid-empty behavior. Reuse the attached unchanged regression. Actual PostgreSQL was not stopped or contacted; query rejection injected at builder boundary, actual storage error handling and actual HTTP response executed. No sharedDB/browser/build work.

Command: npx vitest run tests/server-election-lookup-http.test.ts tests/election-list-query.test.ts tests/yellow-pr81-storage.test.ts --reporter=dot
Outcome:1failed20passed. Evidence red.txt and yellow-pr81-storage.test.ts.txt.
