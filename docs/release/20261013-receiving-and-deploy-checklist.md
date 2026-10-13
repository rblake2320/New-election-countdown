# ElectionTracker release handoff — 2026-10-13

Deployment remains held. This checklist prepares a reviewable release; it does not authorize deployment, key changes, or shared health DDL.

## Current verified state

- Main `b5522fe` contains the source increment and all reviewed runtime repairs through PR90. Every merged PR had verify, bundle-budget and container checks green.
- The shared seven source tables have SHA256 `769c35bb4b850257f9409ee567da95e00b271855d510cbb0015e8557e431f93a`. Nov. 3: 506 races, 3,464 profiles, 1,448 current official-list facts, 502 results URLs, 496 known closing times. Profiles include registrations; they are not all qualified nominees.
- Increment: 36 new official-list profiles, 87 source facts, 51 profile reuses; repeat zero new/zero source changes. All 3,444 prior complete profiles and 3,856 prior source rows were preserved.
- D independently restored the source-only postimage and matched all 506 roster HTTP responses and all 87 new memberships/source/party/scope fields to SQL. B rendered all 506 actual payloads: 498 sourced, two not recorded, six Louisiana not applicable. No invented candidates or complete-empty race claims.
- Actual production replay: WA 1,903,073 to 1,903,115, unchanged repeat stable, raw evidence byte-exact, changed stale revision 409, ETag 200/304/recovery. Mixed batches retain 505 healthy races plus a per-race failure; client recovery needs no reload.
- D load: 20 requests/s for 1,200 requests and 40 requests/s for 2,400 requests, ten client IPs, zero 429/5xx/timeouts/missed requests; p95 21.950/21.432 ms. These measurements describe that workload, not an unspecified user capacity.
- Authenticated preference persistence and source-only policy routes passed real JWT/PostgreSQL receiving. Public SQL outages return typed 503, legitimate empty lists remain 200, invalid windows remain 400. Candidate timestamps match stored SQL across repeated GETs.
- Shared increment gates: 24 actual transaction controls, eight rollback-admission controls, ten offline wrapper controls; current-main composition 1,312 tests, full typecheck zero, build passed. Retained old failures include advisory/rollback snapshot races, foreign postimage absorption, import side effects, and incomplete recovery journals.

## Remaining receiving and external inputs

1. B/D historical admin browser receiving: pinned Playwright 1.64.0 in the same new internal-only application/PostgreSQL network, no host ports, synthetic fixture admin, real retained NC/LA reports. Check both widths, exact report hydration, public-list exclusion and no mutations after login. Existing 5094 stays untouched.
2. B owns remaining Firefox/WebKit receiving on the same isolated fixture. Preserve failure/304/recovery controls and original evidence.
3. Portable 506-payload regression PR91 was reviewed and merged at exact green head `730b1d7`. Further changes get their own checks.
4. AZ08/KY03 official printed rosters remain unavailable after additional official-source checks. Keep honest unknown state; do not turn primary filings, an absent write-in row or a challenge page into a general roster.
5. The approved application configuration has no MapQuest key. Actual missing configuration returns 503. Configured positive geocoding needs an authorized valid key; boundary fixtures do not replace that acceptance.
6. Owner-relayed decision: retain test keys while testing. Any rotation/key swap belongs to the deployment step after testing is green. No rotation during these tests.

## Deploy ordering when the owner releases the hold

1. Freeze final main SHA and runtime/builder image digests. Retest any executable difference from the independently received image. Generate the release artifact inventory/SBOM, sign and verify the release artifact with the approved release identity, and retain its provenance; do not substitute a source-build log for the actual image.
2. Preserve a fresh protected full PostgreSQL backup and verify a private restore against current data. The source increment's DPAPI backup and exact source rollback are retained separately; do not overwrite their historical receipts.
3. Run required schema migrations before switching the application. In particular `migrations/20261013_result_source_health.sql` is shipped in the image and must exist before the new result health reader runs. It has not been applied to shared data in this session. Do not apply it implicitly at boot.
4. Load only the approved production secrets. Keep credentials out of command arguments, receipts, images and source control. Complete the owner-directed key swap at this stage.
5. Start the reviewed runtime with readiness checks. Verify authenticated and public API/UI paths, exact-race rosters, source metadata, batch 304/recovery, real preference persistence and backup/restore. Classify unavailable vendors; never return false empty success.
6. Enable only reviewed exact-tuple automatic adapters. Current 2026 general automatic registry covers 22 NC/LA races. Other states are manual-only until a reviewed source/adapter is added. Historical WA/CA parser receipts are not 2026 general coverage.
7. Keep the previous runtime and backup until the receiving checks pass. Application rollback does not erase later user changes. Source rollback accepts only its exact owned postimage under admission/table locks; concurrent or unknown changes are refused and retained for reconciliation.

## Evidence locations

- `artifacts/source-gap-shared/apply-done.json`, `dry-run.json`, `backup-receipt.json`.
- `artifacts/source-gap-private-sd/runtime-repair-fda52149/REVIEW.md` and hash-bound receipts.
- D: `docs/evidence/et6/source-increment-internal/93520-1f736ce3/`, `parent85-internal/130108-3e3d689b/`, `health-release-load/` on the owning D branch.
- B: `Team/workmap/evidence/lane-b-20261013/increment-payloads/` and `mixed-hn-5094/`; portable fixture/test in PR91.
- Canonical coordination: `Team/tasks/20261011-electiontracker-team-board.md` and `Team/workmap/SOL-EC-CURRENT.md`. Jira ET-6/ET-9 retain the actual apply and receiving milestones.
