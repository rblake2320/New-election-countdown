# ET-6 live official results contract v1.2 — A/C agreed

Owner decision: publish official results as soon as known on November 3; unofficial counts are allowed when labelled. No predictions or projections. C owns verified source inventory, adapters, shared DTO and dry-run intake; A owns database schema, transactional posting and HTTP/event integration. B owns UI; D owns recorded-feed election-night/load acceptance. A confirmed this proposal in full as v1.2 in `Team/workmap/msg/20261011-et6-results-contract-A-confirmed.md`. That file additionally defines reportId, source.kind, history, supersedesReportId and stale metadata. The canonical executable shapes are in `shared/live-election-results.ts`.

## GET /api/elections/:id/results

Preserve B's fields: `electionId`, `status`, `reporting`, `source`, `asOf`, `retrievedAt`, `totalVotes`, `candidates`, `winnerCalledBy`. No request-time replacement of the stored timestamps.

- `status`: `none | unofficial | certified`. `none` means no verified result has been ingested for this race, not a claim that no official website has published anything. DB errors are non-2xx, never `none`.
- `source`: null for `none`; otherwise `{id, name, url, sourceContestId}`. Registered official source/contest IDs and exact state/date/phase/district context prevent cross-race joins. Public URL is required HTTPS and must be present in the source inventory; source names/URLs never establish certification alone.
- `asOf`: actual source count/publication timestamp, nullable when absent. `asOfBasis`: `source_timestamp | source_publication_time | not_provided`. `retrievedAt`: actual fetch/verification timestamp, required for recorded counts. Do not invent an as-of time from the request or retrieval clock.
- `reporting`: null when no reporting information; otherwise `{percent: number|null, basis: precincts|ballots|votes|source_unspecified, precinctsReporting: number|null, precinctsTotal: number|null}`. Unknown is null, never zero/100.100% precincts does not establish complete ballot counting, certification or a winner.
- `totalVotes`: nonnegative safe integer or null. `candidates`: `{candidateId: number|null, sourceCandidateId: string, name: string, party: string|null, votes: number, percent: number|null, isWinner: boolean}`. Every name/party/count is source-derived; no fuzzy join or fabricated candidate row. Unknown IDs remain explicit for dry-run mapping review. An aggregate write-in option stays a ballot option, not an invented person.
- `isWinner`: false unless an explicit official winner declaration names that exact ballot option. Certification alone does not justify selecting the highest count: multi-seat races, ties and runoffs exist. Never compute an outcome from reporting/margin thresholds. `winnerCalledBy` is null absent an official declaration; otherwise `{source, url, at}` with official decision evidence. Reject projected-winner inputs; retire old `determineWinner` heuristic.
- Add `schemaVersion: 1`, `revision: string`, `sourcePayloadSha256: string`, `certification: null|{url, certifiedAt: string|null}`. `certified` requires retained exact-race certification evidence, not an admin checkbox or a source title containing Certified.

`none` has null source/asOf/retrievedAt/reporting/totalVotes/winnerCalledBy/certification and empty candidates. Unknown percentages or source timestamps on a genuine published record remain null and must be shown honestly.

## POST /api/elections/:id/results (admin)

Takes the recorded-result fields above, plus `expectedRevision: string|null`, `idempotencyKey`, and exact source-context/evidence bindings. It must not accept `status:none` to erase records or automatically fetch arbitrary user URLs. Enforce registered official source and exact outer election context. Server verifies snapshot and certification evidence; raw UI values cannot create certification or winner authority.

Validate all rows before mutation; one transaction writes counts, revision and durable audit. Source replay is idempotent; same key/different payload refuses409. Older source timestamps cannot silently overwrite newer data; explicit official correction revisions may decrease counts and reporting. Stale admin expectedRevision refuses409. No projections and no shared database application during C dry runs.422 reports field errors;404 unknown election;401/403 auth;503 storage/source failure.

## Transport

B may poll every30 seconds while results are active. A supplies revision/ETag and304 for unchanged snapshots, persisted as-of time and no phantom live clock. D verifies the exact request mix/load and source-failure/recovery. Source failures preserve the last accepted record and expose a stale/failure indication; they cannot become empty success or erase good counts.

## C dry run

Fetch only admitted official sources with bounded transport; retain bytes+SHA, actual URLs, status and source election context. Parse to V1 records, validate source/candidate/race mappings, output accepted/refused/not-published/unmapped receipts without any database write. Historical official returns may be retained for D's drill with their actual election date/phase, never relabelled as November2026 returns. Current C6 navigation inventory is a starting index, not proof a vote feed is published or parseable.

## Batch amendment for B/D

B observed that506 card polls every30seconds exceed the300/minute limit for one viewer. Use a single `GET /api/results?date=YYYY-MM-DD` per visible date in v1, not one request per card. Response: `{schemaVersion:1,date,results:[same current-result DTO],cursor,reset:true}`. Current snapshots only; `history:[]` in each batch row and detail GET supplies history. A implements ETag/304. With `changedSince` equal to the current committed-snapshot cursor return304; changed/unknown cursor returns a full replacement batch, never an incomplete delta based on an uncommitted report-ID high water mark. `ids` is reserved for a later version, not silently accepted in v1. D includes this batch in20/40RPS drill. A owns endpoint implementation; the shared batch DTO is exported now.

Manual evidence upload, source-picker endpoint and source-option identity rules are being settled with A. A hash alone never proves retained source bytes. A must validate/re-hash an immutable evidence upload before accepting a referenced report; the result report schema intentionally does not accept arbitrary raw-byte fields. Unmapped source options retain null candidateId; never generate sourceCandidateId from a candidate profile ID or fuzzy join.
