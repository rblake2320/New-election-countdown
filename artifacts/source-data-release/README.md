# Actual source data release rehearsal

Owner-approved target: `et_sol_data_6c78a3148c6b`, restored from the owner's encrypted source backup on local PostgreSQL5432. Child writes remained in that exact private database. Credentials were loaded into the process without logging. Source-only additive schema preparation was approved separately; no live-results deployment migration or auth/user table was changed.

The exported pipeline performed **APPLY → REPEAT → guarded ROLLBACK → APPLY** with actual current core importers. Original136 candidates plus537 elections restored exactly to logical source-row SHA `f96fbee688ecb420d9e91b02558aede045b9d405d145b972deb5636053bf3da0`;673 original rows restored and7671 inserted rows removed. Whole postimage drift was refused before writes; a fault after the first row restoration rolled back atomically. Sequences/MVCC timestamps are not part of logical row hashing. Original candidate columns changed only31 `fec_candidate_id`,31 `fec_status`,31 `updated_at`; all profile/bio/name/party/incumbency fields remained unchanged.

Final per-state publication: `final-per-state.json`. November3 rows:506 elections,3428 candidates,0 empty races,1361 current general-list source records,500 source scopes. Overall candidate table3444 includes16 historical candidates. FEC remains registration evidence. Louisiana six House open primaries contain28 registration-only candidates across districts2/1/3/4/11/7, with no ballot certification/nomination promotion. FEC quarantines28 identities/races are recorded by actual state/office/district/reason and are separate from the LA28.

All506 races have poll-hours metadata;10 closes remain honestly unknown (KS6/NH4). All506 have results-source metadata, but **502 have actual URLs**; NH4 intentionally remain null. Earlier retained rehearsal receipts named the metadata count `resultsLinkRows`; that label was corrected in code and final-per-state.json. It was not502/506 published live-vote feeds.

Source stages: LA6 catalog corrections; FEC2464 new registrations plus31 metadata enrichments; nominee844 inserts/1361 source changes after0 unresolved conflicts;506 poll-hours updates;506 results-field updates. Repeat produced0 candidate/source/poll/results changes (audit receipts alone append). Raw before/post rows are only in owner/SYSTEM-DACL-protected `C:/.codex/private/election-source-backups/<runId>/` files, never in Git/public receipts.

Exact inputs: FEC ZIP `6062f203fd5dd90a7e33e487088a4d496bd9634cc1e560f94b0f5e7ff8ea0126`; nominee manifest `7890860f047cb79e64144c57f56ea721669348c2f5905fd25159ba738c81982e`. Five ordered existing migrations are exported as `SOURCE_MIGRATIONS`: candidate_source_records, general_candidate_list_snapshots, la_house_catalog_corrections, official_results_routes, poll_hours_metadata (all20261011).

Private CLI:

```powershell
$env:ELECTION_ENV_FILE='D:/projects/New-election-countdown/.env'
npx tsx scripts/source_data_release.ts --database et_sol_data_6c78a3148c6b --fec-zip <approved-local-cn26.zip> --receipt <new-public-receipt.json> --rehearse
```

Default mode is a read-only plan. `--prepare-private-schema` explicitly prepares only the approved five source migrations and retains the separate pre-schema image. Raw images require verified restricted DACLs before data mutations. Windows filesystem owner reassignment was denied; preserving the existing owner and restricting/verifying DACLs to current owner identity and SYSTEM succeeded. The initial server-inet-loopback guard was too strict for Docker; it was repaired to validate the configured client loopback endpoint/5432 plus exact current_database and serverport5432. The whole exported pipeline then passed against the actual Docker-backed local DB.

Root can reuse `loadReviewedReleaseSources`, `captureSourceSnapshot`, `runSourceRelease`, `loadPrivateSnapshot` and `rollbackSourceRows` with an explicit exact-target database authorization callback and the full reviewed preimage SHA. This capability is absent from CLI arguments; CLI retains its private-prefix refusal. Root owns separate shared authorization/backup/API receiving. The final private fixture is left applied for D; no preview, provider call, new container or shared write was performed by this child.
