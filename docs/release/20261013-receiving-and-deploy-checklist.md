# ElectionTracker release handoff — 2026-10-13

Deployment remains held. This checklist prepares a reviewable release; it does not authorize deployment, key changes, or shared health DDL.

## Current verified state

- Main `11f7b1d` contains the source increment, reviewed runtime repairs through PR90, portable actual-payload regression PR91, release checklist PR92, and exact NC/LA manual-host repairs PR93/94. Every merged PR had verify, bundle-budget and container checks green.
- The shared seven source tables have SHA256 `769c35bb4b850257f9409ee567da95e00b271855d510cbb0015e8557e431f93a`. Nov. 3: 506 races, 3,464 profiles, 1,448 current official-list facts, 502 results URLs, 496 known closing times. Profiles include registrations; they are not all qualified nominees.
- Increment: 36 new official-list profiles, 87 source facts, 51 profile reuses; repeat zero new/zero source changes. All 3,444 prior complete profiles and 3,856 prior source rows were preserved.
- D independently restored the source-only postimage and matched all 506 roster HTTP responses and all 87 new memberships/source/party/scope fields to SQL. B rendered all 506 actual payloads: 498 sourced, two not recorded, six Louisiana not applicable. No invented candidates or complete-empty race claims.
- Final NC/LA manual-only production image `4fd2c2f8` matches main runtime/data/schema/manifests/Docker/build configuration. Real NC 82,579-byte evidence and 827,755 votes/six options, LA 196,212 votes/two options each posted201, repeated stably and returned304 with unchanged original URLs. Exact official state-bound host maps work with live adapters disabled.
- Strict internal HTTPS receiving: 14 actual Node/three-engine unknown-CA/correct-SAN/wrong-SAN controls and all six historical browser runs at390/1280 passed (nine checks each). Original CSP/HSTS/HTML bytes and Secure/HttpOnly/SameSite cookies were preserved. All report/vote/evidence/profile and seven source table digests stayed unchanged; disposable resources removed,5094 unchanged. D receipt `historical-browser-internal/148276-47c604fb/receipt.json`, evidence commit06661bc. Prior polling-enabled broad-guard failure164132 remains retained separately.
- Actual production replay: WA 1,903,073 to 1,903,115, unchanged repeat stable, raw evidence byte-exact, changed stale revision 409, ETag 200/304/recovery. Mixed batches retain 505 healthy races plus a per-race failure; client recovery needs no reload.
- D load: 20 requests/s for 1,200 requests and 40 requests/s for 2,400 requests, ten client IPs, zero 429/5xx/timeouts/missed requests; p95 21.950/21.432 ms, 60 seconds per phase, retained in D `docs/evidence/et6/mixed-final-load/load-99708-fb6723d9/receipt.json`. These measurements describe that workload, not an unspecified user capacity.
- Image boundaries: D image `7495e348` owns the mixed-batch/load run above; image `7129b045` owns public fault/freshness and actual 506-roster receiving on the source postimage. The new PR90 guarded importer was exercised by its retained actual transaction gate; it was not rebuilt into that older image. Freeze and receive the final composed image before deployment.
- Authenticated preference persistence and source-only policy routes passed real JWT/PostgreSQL receiving. Public SQL outages return typed 503, legitimate empty lists remain 200, invalid windows remain 400. Candidate timestamps match stored SQL across repeated GETs.
- Shared increment gates: 24 actual transaction controls, eight rollback-admission controls, ten offline wrapper controls; pre-PR91 source-increment composition 1,312 tests, full typecheck zero, build passed; PR91 adds three portable real-payload tests and separately passed all three CI gates. Retained old failures include advisory/rollback snapshot races, foreign postimage absorption, import side effects, and incomplete recovery journals.

## Remaining receiving and external inputs

1. NC/LA manual-host repairs and six historical HTTPS browser runs are complete on the final image with retained actual evidence above. Keep the same security policy for future receiving and retest executable changes.
2. The separate mixed-source run146988-68fd49ce is retained Failed: Firefox passed7/7; WebKit passed the healthy505/error/recovery506 behavior but its browser events counted no304 while application logs recorded eight wire304 responses. Per-engine correlation was missing. D/B own a fresh exact request-ID/validator/ETag/body-hash join and both widths; the original run is not relabeled and the unrun390 case is not passed. No runtime/cache/security rewrite is indicated by that measurement discrepancy.
3. Portable 506-payload regression PR91 was reviewed and merged at exact green head `730b1d7`. Further changes get their own checks.
4. AZ08/KY03 official printed rosters remain unavailable after additional official-source checks. Keep honest unknown state; do not turn primary filings, an absent write-in row or a challenge page into a general roster.
5. The approved application configuration has no MapQuest key. Actual missing configuration returns 503. Configured positive geocoding needs an authorized valid key; boundary fixtures do not replace that acceptance. Read-only official Census API research found structure-address/geography support but no truthful street/postal reverse or full validation replacement; no substitute provider or invented fields were introduced.
6. Owner-relayed decision: retain test keys while testing. Any rotation/key swap belongs to the deployment step after testing is green. No rotation during these tests.

## Deploy ordering when the owner releases the hold

1. Freeze final main SHA and runtime/builder image digests. Retest any executable difference from the independently received image. Generate the release artifact inventory/SBOM, sign and verify the release artifact with the approved release identity, and retain its provenance; do not substitute a source-build log for the actual image.
2. Preserve a fresh protected full PostgreSQL backup and verify a private restore against current data. The source increment's DPAPI backup and exact source rollback are retained separately; do not overwrite their historical receipts.
3. Run required schema migrations before switching the application. In particular `migrations/20261013_result_source_health.sql` is shipped in the image and must exist before the new result health reader runs. It has not been applied to shared data in this session. Do not apply it implicitly at boot.
4. Load only the approved production secrets. Keep credentials out of command arguments, receipts, images and source control. Complete the owner-directed key swap at this stage.
5. Start the reviewed runtime with readiness checks. Verify authenticated and public API/UI paths, exact-race rosters, source metadata, batch 304/recovery, real preference persistence and backup/restore. Classify unavailable vendors; never return false empty success.
6. Enable only reviewed exact-tuple automatic adapters. Current Nov. 3 automatic registry covers 22 NC/LA contests, including six Louisiana House open-primary races. Other states are manual-only until a reviewed source/adapter is added. Historical WA/CA parser receipts are not 2026 general coverage.
7. Keep the previous runtime and backup until the receiving checks pass. Application rollback does not erase later user changes. Source rollback accepts only its exact owned postimage under admission/table locks; concurrent or unknown changes are refused and retained for reconciliation.

## Evidence locations

- `artifacts/source-gap-shared/apply-done.json`, `dry-run.json`, `backup-receipt.json`.
- `artifacts/source-gap-private-sd/runtime-repair-fda52149/REVIEW.md` and hash-bound receipts.
- D: `docs/evidence/et6/source-increment-internal/93520-1f736ce3/`, `parent85-internal/130108-3e3d689b/`, `mixed-final-load/load-99708-fb6723d9/receipt.json` on the owning D branch.
- B: `Team/workmap/evidence/lane-b-20261013/increment-payloads/` and `mixed-hn-5094/`; portable fixture/test in PR91.
- Canonical coordination: `Team/tasks/20261011-electiontracker-team-board.md` and `Team/workmap/SOL-EC-CURRENT.md`. Jira ET-6/ET-9 retain the actual apply and receiving milestones.
