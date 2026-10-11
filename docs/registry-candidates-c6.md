# Constitution Part 5 candidate: RESULTS-CATALOG-CONTEXT

id | title | rule | rationale | origin | scope | severity | enforcement | status
--- | --- | --- | --- | --- | --- | --- | --- | ---
RESULTS-CATALOG-CONTEXT | Bind provenance again at the receiving boundary | Clear results fields when the receiving election's canonical calendar date, phase or published state no longer matches the stored source context. | An actual admin date correction updated the election but preserved its old November 3 results metadata; the first detail, listing and wrapped detail all emitted a stale claim until the read projection enforced context. | Root review and compiled private red/green, 2026-10-11, ElectionTracker C6; old image admin HTTP200 and three stale bodies in artifacts/c6-private-69620-aab908; repaired run artifacts/c6-private-43588-2e2b84. | project:ElectionTracker | critical | projectOfficialResultsForElection unit/independent cases plus real compiled admin correction/detail/list/wrapped checks and Tokyo native-PG negative control | candidate

The parent checked the central registry for this ID and owns central capture
and deduplication. This candidate changes no owner-approved constitution rule.
The SQL calendar control reproduces native PG Date conversion to November 2 in
Tokyo, while the stored date and repaired detail/listing retain November 3.
