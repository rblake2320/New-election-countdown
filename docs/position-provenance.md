# Position aggregator source integrity

The actual old receiving getter assigned0.95 confidence and the current clock to a verified position with no recorded date. Its aggregate then added a source-count confidence bonus. A failed source query became null, and updateCandidatePositions resolved despite its save method performing no operation. Immutable old Node bundle receipts retain those observed failures separately.

The aggregator now shares C38 CandidatePositionAPI's canonical verified-row reader. It keeps exact source words, subject ID, source row ID, URL and recorded date. Missing confidence/date/URL remain null. No party, voting/funding/website/news analysis is synthesized. Unsupported external adapters have explicit unavailable status rather than a placeholder result. An absent candidate is typed CANDIDATE_NOT_FOUND; source failure is POSITION_SOURCE_UNAVAILABLE, distinct from a known candidate's successful empty positions. Unsupported aggregate persistence is AGGREGATED_POSITION_WRITER_UNAVAILABLE before reading data or claiming writes.

Positions are read from current verified records on each request. An hour-old cached statement cannot survive verification revocation or conceal newly available data. The independent generic CacheService seconds TTL is unchanged and still tested at59minutes and3600seconds+1ms. Six inherited cache tests now enforce that source-current contract; their previous immutable source and failed full suite are retained. Malformed/foreign legacy cached payloads cannot override current subject-bound records. This avoids claiming source freshness from a cached0.95/model date.

Actual candidate/election alert guard changes remain the separately pushed C38 core; this branch is based on2ff223171e7357d3f14163c477ff9d5f8b635c4a and does not alter that guard. Only the fifth source module, its tests, verifier and evidence change here. No schema, package, compiler waivers, provider keys, public DB writes, routes or B/D code are added.

Verification:

    npx vitest run tests/position-cache-contract.test.ts tests/unit/position-aggregator-source.test.ts
    node scripts/verify_position_provenance.mjs current
    node scripts/verify_position_provenance.mjs old

The compiled verifier executes actual bundled modules with explicit DB/cache boundaries, not real PostgreSQL/provider/delivery. It retains the actual old0.95/currentDate result and repaired nulls, source failure, cache revocation and unsupported writer refusal. The positive statement excerpt is fetched real public source text; isolated rows are not asserted as actual campaign-portal records. Receipts use unique filenames unless an explicit unused filename is supplied.

A caller scan found only an unused routes.ts import of positionAggregatorService; therefore this packet makes no direct public civic-dashboard receiving claim. Parent owns route wiring and B owns nullable confidence/date presentation. Missing metadata must remain unknown at those receiving boundaries.
