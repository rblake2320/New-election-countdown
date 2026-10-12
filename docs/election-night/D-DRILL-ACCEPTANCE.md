# ET-6 D election-night drill: acceptance registered before execution

Owner decision: publish actual official election results as soon as known on Nov3; state ENR/Clarity/official pages first, AP optional later. Every visible result requires source URL, source as-of time, reporting percentage and unofficial/certified status. No projections. D owns runtime drill/load; A owns ingestion/admin contracts; C owns official source inventory/recordings; B owns receiving UI/form.

Status: awaiting settled A/C result schema and versioned recorded source packet. This is a test plan, not a results contract or a passed drill. Base main eb60469. Existing schema lacks source URL/source-as-of; existing ingestion DTO still has isProjectedWinner. Those are findings sent to A/C, not a proposed second schema.

## Inputs required from A/C
- Immutable implementation heads, migration order, shared DTO/schema, GET/POST paths and response/refusal examples.
- Identity for election, source contest and candidate; snapshot/revision/idempotency/correction ordering rules. Exact field names and nullability from A/C only.
- Explicit reporting-percent basis/unknown representation; source-as-of versus fetched/posted timestamps; certification evidence and who may set it. Never infer certification or a winner from100% reporting.
- C recorded official bytes + source URLs + retrieval times + SHA256 + expected contest/candidate totals, including source-published correction/partial/certified examples where available. Historical recordings labelled by their real election/date; never portray replay as live2026.

## Functional drill in an owned isolated PostgreSQL + actual production image
Run the actual parser/ingester against retained source bytes, through the same production write path and HTTP receiving route. No mocked storage or replacement browser results. Capture source manifest digest, image digest, migration IDs, independent SQL and receiving response bytes.

1. Initial partial unofficial snapshot: exact election/candidate identities, votes and provenance reach SQL/GET/UI; unknown reporting stays unknown per contract.
2. Newer official update then exact repeat: expected changes only, repeat zero writes, one durable audit/idempotency outcome per agreed contract.
3. Older/out-of-order, duplicate and concurrent deliveries: no stale overwrite or double counting; current snapshot remains internally consistent.
4. Official downward correction: accepted only under agreed revision semantics, never silently rejected just because votes decrease; retained audit identifies both versions.
5. Unofficial -> source-certified transition: only actual certification evidence permits certified.100% precinct reporting alone remains unofficial; no projected winner field becomes an announced result.
6. Bad contest/candidate identity, source URL, time, percent, vote count or malformed payload: typed refusal, zero partial writes and no misleading success. Deliberately mutated negative controls labelled synthetic, never official recordings.
7. Source outage/timeouts/malformed bytes: retain last good result, show its true as-of time and unavailable/stale state, retry bounded; recover on a valid update.
8. Kill/restart during update: committed snapshot/audit atomic, no half update; repeat after restart remains idempotent. All activity confined to the owned DB.
9. Admin posting: anonymous401, nonadmin403, validated authorized post, source evidence/as-of/status required, edits audited, invalid posts refuse. No live shared posting.
10. Nov3/Nov4 timezone boundary replay: retain correct source election/date across UTC/local rollover; no future or cross-election attribution.

Broken controls: old code should expose at least current501 ingestion gate and missing provenance/schema handling; each new acceptance names expected refusal or exact receiving data, never only process exit0.

## Bounded local load drill
Extend existing owned-container nginx/proxy load harness rather than target a public site. Mix built assets, election list/detail and settled results GETs while applying recorded updates. Preserve existing guard against arbitrary target URL.
- Baseline20RPS60s;2x40RPS60s on same host (bounded local measurement, not a production capacity promise).
- Ordinary browsing: zero429, zero unexpected5xx, zero socket/body timeout; compare all returned revisions/provenance to committed snapshots.
- Measure achievedRPS, inflight, p50/p95/p99/max, status counts, resource use and ingestion-to-receiving latency; retain full-body timing, not headers only.
- Initial drill threshold p95<=2s and body timeout5s; report hardware/workload. Any changed threshold must be recorded before rerun, never adjusted to hide a failure.
- Repeat the established120 concurrent ordinary-route/body-socket control after integrated changes, reusing its owner-maintained harness if available; do not duplicate another seat's active run.

## Coordination and handoff
A/C settle fields; D forwards the exact shared-schema/head reference to B. No projection, winner inference, source freshness or availability claim from a UI fallback. Separate refused/unavailable functionality stays open. Original failing receipts retained. Shared source apply/deploy hold unchanged. Current worktree D:/projects/et-wt/astra-election-night-drill, branch astra/election-night-drill.

## A draft observed, not settled (board23:15)
A proposes election_result_reports append-only snapshots plus candidate_result_lines, one recordResultReport writer for ingestion/admin; GET latest+history,404no_results_yet. Exact A draft is on ET6/canonical board. C settlement pending. D receiving questions for settlement: source-called-winner must exclude projections; nullable percent and precision/unit semantics; tie ordering for same-asOf corrections; independent source identity and official URL validation; missing-source-asOf handling; certified downgrade/correction rules. D forwards only final shared types/head to B.

## Historical batch draft (A23:24) — superseded by C full-reset v1 below
The A/C v1.2 contract supersedes the earlier draft above: status none is200 with nulls, not404. Confirmed text: Team/workmap/msg/20261011-et6-results-contract-A-confirmed.md; C owns shared/live-election-results.ts. Implementation head still pending.

A agreed GET /api/results?date=2026-11-03 or ?ids=1,2,3 (max600), returning {schemaVersion:1,generatedAt,cursor,items}. Items are the agreed per-election DTO without history. Full request includes no-result contests as status none. changedSince returns only changed contests and advances cursor to the current high-water mark even on an empty delta. ETag/304 supported. Detail pages keep individual GET.

Recorded workload:506 contests at30s/card imply1012 result requests/minute/viewer (plus listing/assets), exceeding a300/minute budget. This arithmetic documents B's reported scenario; it is not a measured runtime failure. New browser acceptance: one batch request per30s interval (2/minute steady state), zero card-level results polling, and real URL paths from the pending B query-fetcher fix. Mount/refocus/reconnect behavior must not create506 requests. Observe at least two full intervals in real browser/server logs.

Extend20/40RPS owned-container profile with batch full reads, conditional304s, changedSince reads and detail reads while recorded updates commit. Record exact mix and client/rate-limit identity distribution; single-viewer ordinary browsing must have zero429. Aggregate-capacity requests are separate from one-viewer rate-budget acceptance: never increase/disable the limiter to manufacture green; report actual rate-limit policy failures. Ingest writes retain their own admin limits.

Additional required acceptance:
- Full506-contest response exactly matches independent SQL; one item per election, none rows explicit, no accidental history payload explosion.
- Identical conditional request returns304 with empty body; client preserves last accepted snapshot. A new committed update returns200 with new ETag and only the changed contest in delta. Empty delta advances safely.
- ETag varies with canonical requested scope, full versus delta/changedSince semantics and effective representation. Stale/staleSince changes invalidate cached data even when report ID does not change; generatedAt semantics must agree with304 caching.
- Concurrent commit ordering: allocate report n, hold it uncommitted; commit n+1 and read cursor, then commit n. Subsequent delta must deliver n. A plain max(sequence ID) watermark is insufficient unless write/commit order is serialized. Retain exact two-connection schedule and SQL proof.
- Same-asOf corrected counts and source outages survive delta application; no lost row, double application or reset to fabricated zeros. Recovery after expired/invalid/future cursor has an explicit response and safe full-refresh path.
- Both date and normalized/deduplicated bounded IDs scopes tested; validate empty/malformed/date/over600 IDs and cross-scope cursor use. Scope changes clear/replace client cache safely.
- Query fetcher acceptance: Happening Now list, individual result, admin entry and polling-trends requests hit their actual observed API URLs, with encoded parameters and request cancellation intact. B owns implementation; D tests the delivered head.


## Current batch acceptance: full-reset v1 (C follow-up)
C/A now specify date/results/cursor/reset:true. Same cursor/representation ->304; otherwise200 FULL snapshot with reset:true, never partial delta application in v1. This supersedes the max-report-ID/items/changedSince-delta draft above. Query parameter spelling and executable schema come from the final C DTO, not this test plan.

20/40RPS profile uses one batch poll/viewer/30s plus detail reads; unchanged304 versus changed full-snapshot responses. Client replaces the scoped snapshot on reset, preserves it on304, and shows explicit unavailable/stale state on errors.

The concurrent late-commit control remains mandatory: a full-reset body does not alone fix missed commits if cursor/ETag still equals max(report_id). Effective cursor/ETag must change when any scoped visible result or stale state changes, including a lower-ID transaction that commits later. Exclude incidental request timestamps from representation identity; pin generatedAt semantics. Reordered commits, scope changes and none-to-result transitions must be received exactly once without dropping contests.

C research exclusions retained: pre-Nov3 staged California nonzero feed and NC noisy precinct-sort are not accepted as real results recordings. Replay uses true historical dates and independently sourced totals/certification/correction evidence. No shared apply.
