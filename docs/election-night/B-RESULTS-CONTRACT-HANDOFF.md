# B handoff: agreed results row and batch read

Source: A/C v1.2 agreement at Team/workmap/msg/20261011-et6-results-contract-A-confirmed.md and A23:24 canonical-board batch amendment. This is a routing summary, not another DTO definition. C owns shared/live-election-results.ts; exact executable head pending.

Per contest: schemaVersion,electionId,reportId,revision,status(none|unofficial|certified),reporting{percent,basis,precinctsReporting,precinctsTotal},source{id,kind,name,url,sourceContestId},sourcePayloadSha256,asOf,asOfBasis,retrievedAt,totalVotes,candidates[{candidateId nullable,sourceCandidateId,name,party,votes,percent,isWinner}],winnerCalledBy,certification,supersedesReportId,history. Source outages retain snapshot with stale/staleSince. Unknown count metadata is null; source-asOf is never replaced by fetch time. Explicit official declaration alone permits isWinner; certification alone never chooses highest votes. No projections.

Batch GET /api/results?date=2026-11-03 or ?ids=... max600 => {schemaVersion:1,generatedAt,cursor,items:[per-contest DTO without history]}. Full includes status none; changedSince returns changed items, cursor advances to high-water mark even if empty. ETag/304. Poll batch once per30s; individual endpoint only for details. Use canonical A/C file for exact nullability/enums/refusal shapes.

D load plan now includes batch full/304/delta plus details at20/40RPS, independent SQL and two-interval real-browser request counts. D raised commit-order cursor and stale-cache invalidation controls to A before implementation. No current batch/runtime pass claimed.


UPDATE — C full-reset v1 supersedes preceding batch paragraph: envelope date/results/cursor/reset:true; same cursor304, otherwise full snapshot200/reset:true. No partial changedSince deltas in v1. Final C shared DTO governs exact fields/query parameters. D retains out-of-order commit and stale-state cursor controls: max-ID alone can still miss a late lower-ID commit. Batched B client follows DTO; PR48 actual-URL fix is a separate receiving gate.
