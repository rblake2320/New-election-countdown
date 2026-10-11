# ET-8 FEC source sync acceptance

Owner: Sol EC / HWND 162924912. Branch `lane-c/source-sync`, stacked on reviewed listing PR #3. Shared DB application is held while the team integrates and reviews the data contracts.

The previous importer silently reused an old ZIP, stamped every unknown source as editorially verified, chose ambiguous Senate races, matched editorial names without party, deleted duplicate candidate rows, and performed writes outside one transaction. The new importer refreshes the official source, defaults to a database-enforced read-only plan, quarantines unresolved identities, and applies one locked serializable transaction with bounded serialization retries. It never deletes candidates, certifies ballots, or overwrites editorial/ballot provenance.

Independent review found changed-ID duplicate risk, existing source-hash replacement, Constitution/Conservative conflation, receipt-file failure after commit, and historical evidence being mistaken for the current version. Regression tests cover each. FEC evidence lives in `candidate_source_records` independently from candidate/ballot source hashes, with one explicitly current version per candidate/layer/source URL and retained first-observed timestamps. An A → B → A source transition updates the current record instead of leaving B's party data. Each apply commits `candidate_ingest_runs` alongside its data writes, including zero-change runs; candidate data remains unchanged on an identical repeat. Local receipts have unique per-run filenames. An injected local disk failure reports the committed apply/audit ID instead of claiming an uncommitted failure. ZIP extraction inflates only the selected file, with a streaming limit before full accumulation.

## Source and observed dry run

[FEC candidate master format](https://www.fec.gov/campaign-finance-data/candidate-master-file-description/) documents 15 fields and nullable name/district fields. [Official 2026 bulk ZIP](https://www.fec.gov/files/bulk-downloads/2026/cn26.zip) fetched on 2026-10-11 has SHA256 `6062f203fd5dd90a7e33e487088a4d496bd9634cc1e560f94b0f5e7ff8ea0126`.

The observed source contains 8,711 rows: 6,186 outside selected cycle/status/office/state, 2 incomplete, and 2,523 eligible. The read-only local plan has 2,464 inserts, 31 enrichments, 26 ambiguous identities and 2 missing races. Both source-row and plan-row conservation were asserted. Candidate rows remained 136 and the complete candidate-table digest stayed `d0b1eb10863dc80024fff0128d0ffe88` before/after.

These are FEC registrations, including primary contenders. They are not a general-election nominee roster or certified-ballot coverage. New rows have factual registration text, `source_status=fec_registered`, `ballot_status=not_certified`, no polling or fabricated profile content. Existing ballot and source fields remain intact. Unknown party is Other rather than an invented Independent affiliation.

The first source inspection encountered a nullable record (line 2640) and later a name/party/race collision between distinct FEC IDs. Both were researched rather than bypassed: nullable fields are counted as incomplete; the collision is quarantined rather than assuming same name means one person. Primary FEC pages for [H2NC06106](https://www.fec.gov/data/candidate/H2NC06106/) and [H4NC02150](https://www.fec.gov/data/candidate/H4NC02150/) retain distinct IDs, even though their displayed names/committee match. All 28 unresolved rows remain in the generated manifest for explicit resolution.

## Worked acceptance checks

- Pure regression coverage: official layout, incomplete rows, missing party, name/race/party enrichment, distinct identities, ambiguous existing records, ambiguous Senate contests, past-cycle isolation, exact repeat and editorial party conflicts.
- Disposable PostgreSQL: dry-run writes nothing; apply is atomic; repeated identical source changes zero candidate rows; editorial content/party/provenance/ballot hashes and timestamps stay intact; newly imported registrations are never certified; apostrophe names use SQL parameters; an injected failure rolls back candidates/source layers/receipts; concurrent imports produce one identity; a refreshed source updates an imported party; the source migration is idempotent and a committed DB receipt survives an injected local disk failure.
- Full unit suite, production build and fresh non-incremental typecheck run. Fresh typecheck remains 1,114 diagnostics with none in these changed files; whole-project cleanup remains lane D's integration gate.

Receipts: `artifacts/lane-c/fec-{private-postgres,live-dry-run}.json`. Raw red/green/full-unit/type/build reports remain beside them locally. The fixture wrapper starts only its labelled disposable PostgreSQL container, uses a process-only random credential, and removes that container afterward. The source ZIP and full manifest live in ignored `election-data-2026/`.

## Reproduce

```powershell
# Process-only environment: DATABASE_URL or ELECTION_ENV_FILE; never paste URLs into reports.
npx tsx scripts/sync_fec_candidates.ts --dry-run
python scripts/verify_fec_sync.py
npx vitest run tests/fec-candidate-sync.test.ts
```

After data/integration review, apply uses the reviewed source identity:

```powershell
npx tsx scripts/sync_fec_candidates.ts --apply --expect-sha256=<reviewed-hash>
```

The command refreshes the source again and refuses if its hash changed; then it replans under the database transaction. It does not reuse a stale cache. The exact JSZip 3.10.1 direct dependency is owned by lane D PR #1; this branch does not duplicate that package edit.

Deployment must run additive `migrations/20261011_candidate_source_records.sql` (also represented in `shared/schema.ts`) before apply. Dry-run works without that migration; apply refuses before candidate writes when the source/audit tables are absent. The migration has only been exercised against the labelled private fixture, not applied to the shared DB.
