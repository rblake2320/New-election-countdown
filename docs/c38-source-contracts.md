# C38 source and runtime contracts

The old source paths failed six receiving/unit controls at immutable 8c0f45af0490e0b0a341bce2b97c8878d420bb71: party/committee/website claims became policy positions; a database failure became an empty position list; the enhanced lookup threw on an absent record; Michigan returned hardcoded old names marked verified; alerts used a nonexistent electionDate property; and deadline scheduling resolved despite having no scheduler. The separately compiled old-module control reproduces five failures with one genuine empty-enhanced result; that fixture includes a candidate, unlike the absent-candidate unit scenario.

CandidatePositionAPI reads only verified candidate_positions rows bound to the requested numeric candidate ID. It keeps the actual stored statement, category, row ID, source URL and timestamp. There is no name join to a congress member, party-platform fallback, committee/tenure-based position or inferred website statement. Confidence is null because the table records no numeric confidence. Missing dates and URLs stay null. Unknown records return an honest empty list; query failure raises POSITION_SOURCE_UNAVAILABLE. Invalid identity, source text/date or unsafe URL is refused separately. The latest ordered verified row per exact category is selected. SQL authorization/verification writers are unchanged.

EnhancedPositionService shares that canonical reader and preserves its source facts. Unsupported voting/sponsorship/statement adapters are explicitly unavailable; no empty simulated dataset is analysed. Enrichment distinguishes not_recorded from unavailable, leaves averageConfidence null and derives lastUpdated only from actual recorded dates. A provider failure does not claim zero source categories or fresh research. Its availability metadata is a local adapter-configuration statement, not an assertion that an external government provider is down.

Michigan's unsupported fetchMichiganCandidates method now raises LEGACY_MICHIGAN_SOURCE_UNVERIFIED before network/database access. An OpenFEC key cannot certify ballot membership, and the old 2024 filing request plus literal names are removed. The existing reviewed ingestion entrypoint is scripts/refresh_general_candidates.ts with source manifests and dry/apply guards; this containment does not create another importer. The Michigan primary lookup actually requires MI/Michigan + primary + a valid future date in the declared 20-day lookup window; no match is null, catalog outage is typed unavailable.

EventProcessorService passes stored election.date into election and candidate alert context and refuses mismatched subject/election IDs or invalid dates before alert processing. It no longer consults nonexistent election.status. Deadline reminders raise SCHEDULER_UNAVAILABLE because this module has no durable scheduler or reviewed registration/early-voting dates; guessed 30/15-day deadlines and false Scheduled logs are removed. The background loop maintains actual in-memory filter expiry only and is unref'ed. An unrecorded processing-history timestamp stays null instead of reading the current clock as history. Alert storage/delivery implementations remain lane A's ownership.

The fixture's positive policy words are a seven-word exact excerpt fetched from a Senator's official source, with whole-response hash and fetch receipt. The isolated DB boundary row is explicitly not an actual campaign-portal submission, nominee record or shared DB import. No invented quote, polling number, election return or winner enters a product path.

Verification:

    npx vitest run tests/unit/c38-source-contracts.test.ts
    node scripts/verify_c38_contracts.mjs current
    node scripts/verify_c38_contracts.mjs old

The compiled verifier bundles the actual four modules and substitutes only DB/storage/alert/timer boundaries. It makes zero network calls and makes no real PostgreSQL/delivery claim. Receipts use unique filenames by default and refuse overwriting an explicitly supplied receipt path. Original red/setup receipts remain under artifacts/c38. Build and fresh full compiler receipts are retained; source changes introduce no new compiler directives, assertions hiding undefined data, schema or package edits. Other A/D-owned diagnostics remain visible.

The separate source-integrity sibling position-aggregator-service was reported and assigned for the next finite C repair after this core handoff; it is not modified by this four-module commit. Parent/B own the public confidence presentation and parent/A own route/provider gates.
