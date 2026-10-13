# Candidate lesson

id | title | rule | rationale | origin | scope | severity | enforcement | status
---|---|---|---|---|---|---|---|---
ET-parent-unknown-legacy-20261013 | Unsupported legacy metadata on retry | Include unsupported stored metadata in idempotent equality and clear it during authorized updates | Fresh-row tests passed while a legacy defaulttrue survived an actual authenticated update; real PG and same-preference retry revealed the gap | Independent aa77c48 review,2026-10-13; owning8a357ae repair | project:ElectionTracker | critical | Real compiled HTTP/PG legacy-update/equality/stable-xmin acceptance | candidate
