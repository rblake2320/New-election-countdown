# FEC source proof backfill

Legacy C1 records retained the candidate ID, status, party and ZIP hash but omitted the registration race tuple. This follow-on writes electionYear, state, office, district, electionId, electionDate, display name and normalized name to the independent fec_registration metadata. It does not claim ballot certification or a general-election nomination.

A matching candidate whose source proof is missing or stale receives a distinct source_refresh action. That path executes no candidate UPDATE, including updated_at. The source proof and ingestion receipt commit atomically. Existing core changes still use the original update path; exact source/core repeats plan zero actions.

Physical npm-ci acceptance uses the actual official cn26 ZIP (SHA256 6062f203fd5dd90a7e33e487088a4d496bd9634cc1e560f94b0f5e7ff8ea0126), immutable dcf12af legacy importer, and a disposable loopback PostgreSQL fixture populated from a DB-enforced read-only ElectionTracker snapshot. 2495 legacy actions produce 2600 candidates; all 2495 later backfill actions are source_refresh. The complete 2600-row digest including updated_at stays identical, default dry-run changes nothing, an injected source-write failure rolls back profiles/sources/audit, and exact repeat plans zero changes. Shared source digest stays unchanged.

Retained evidence: artifacts/fec-first/producer-physical-green.json. Reproduction: set ELECTION_ENV_FILE to the approved source environment file, DATABASE_URL to the dedicated 127.0.0.1:5571/et_sol_fec_first fixture, FEC_FIRST_PRIVATE_TEST=1, place the hash-verified ZIP at artifacts/fec-first/cn26.zip, then run npx tsx scripts/verify_fec_source_proof_private.ts against a fresh fixture. Both targets are strictly guarded. The original importer snapshot is retained under artifacts/fec-first/original-core/server/fec-candidate-sync.ts; it came from git show dcf12af:server/fec-candidate-sync.ts.

No shared apply was performed. These checks use physical dependencies; earlier linked-dependency observations are retained separately and are not the physical installation proof.
