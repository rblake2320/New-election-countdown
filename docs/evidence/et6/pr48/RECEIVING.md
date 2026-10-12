# PR48 actual runtime receiving

2026-10-12 UTC. Exact source 2e4bd6efd82bcd498f642f3e88eb09bcb15f3ddd.
Runtime image sha256:10b550b96c5b9134ca1af412d452f402c03cbc0427cb7463d100fec76d7d1118.

Worked: production build; six focused tests; 23 existing D production/private-PG checks.
Chrome consumed the actual built application. The transparent observer forwards every response unchanged from loopback 5087 to 5088; it records URL/status only, never credentials. No hook/network mocks used for browser receiving.

Worked: Happening Now requested /api/elections/2/results and /530/results. Unknown reporting displays “Reporting: not yet stated by the source”; no Projected badge; Results navigation. Admin selection requested both /2/candidates and /2/results. Detail requested /2/polling-trends?timeRange=90. See browser-requests.ndjson and DOM receipts.

Worked: actual runtime stop caused observer ECONNREFUSED/502, then list and both card error states, distinct from no results. Restart and refetch recovered counts and cleared errors. This is a real transport interruption, not an official feed fault or a mocked response.

Blocked: country-specific UI request. Actual IDEA upstream returned 404, server swallowed it as an empty successful list, and country selector exposed only All Countries. The all-country endpoint was actually requested. No country options were fabricated. A/B must repair provider availability/error contract before country-specific receiving can pass.

Failed: existing admin form receiving of current counts. Private candidate 1 has votesReceived=10 in both real HTTP responses; selected admin form shows votes 0 and total 0. Source initializes asynchronous candidate inputs in a useState initializer and does not hydrate from currentResults. Sent to B for ET6 form repair. No Save action taken. This is separate from the successful URL correction.

Controls: ONLY disposable D PostgreSQL was changed: election 2 date 2026-11-03 -> database CURRENT_DATE (2026-10-12), candidate 1 null votes -> 10. These are explicitly synthetic UI controls, not official election results. Candidate percentages remain preexisting 0; this test does not assert vote-percentage correctness. Shared DB/source apply held.

The initial harness attempt ran before builder export finished and refused missing builder image; retained separately. Successful retake followed export completion. Provisioning harness source came from D receiving c077eda, scripts/test-congress-production.mjs blob 40f4c8867f74e7b53b516e89e87d6148161bed75; its temporary copy was restored before this evidence commit.

ET6 batch drill is separate: immutable A/C/B batch implementation and reviewed historical recordings are required. D acceptance commit 8fbc575 requires full reset snapshots, equal cursor 304, late-commit visibility, one batch per viewer per 30 seconds, and bounded 20/40 RPS testing. No batch/load readiness claim here.

Cleanup Worked: exact owned app/DB containers and both named networks removed; observer stopped. No runtime left running.
