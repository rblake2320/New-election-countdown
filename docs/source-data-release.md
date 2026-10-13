# Reviewed source-data release

This operation changes election catalog/source metadata and candidate source
layers. It never treats FEC registration as nomination or ballot certification.
The only shared write operation is the explicitly approved lane-C release
wrapper; deployment and live election-result posting are separate operations.

`plan_sourced_data_deployment.ts` and `verify_shared_source_receiving.ts` use
PostgreSQL-enforced read-only connections. The latter refuses any nonzero repeat
action and checks the complete seven-table source digest before and after.
The existing receiving receipt is immutable; do not overwrite it to rerun a
historical claim. Use a new dated receipt path for a separately approved operation.

The shared release on 2026-10-13 completed at 17:43:24.799Z. All 506 Nov3 races
now have candidate profiles (3428 total), with 1361 official general-list facts,
506 poll-source records (10 unknown closes), and 502 actual results URLs. These
counts describe distinct layers; profiles are not necessarily ballot nominees.
The four null results URLs are NH Senate21, Governor57, House495 and496, retained
as unknown transport-blocked destinations. No results publication was invented.

The actual full backup used a current-user DPAPI protected archive and owner/SYSTEM
ACL. The private PostgreSQL rehearsal executed apply, repeat, exact rollback,
injected atomic rollback failure, stale postimage refusal and reapply. Rollback
checks full source-row postimages under locks, refuses concurrent changes, and
never touches users/sessions/credentials. Additive schema survives data rollback.

Evidence: `artifacts/data-deployment/shared-apply-20261013.json`,
`shared-readonly-receiving.json`, `backup-receipt.json`, and
`artifacts/source-data-release/final-per-state.json` plus actual rehearsal receipts.
Private row images and the DPAPI archive stay protected and uncommitted.
The applied wrapper refuses an existing receipt: do not reapply this historical
release. A independently recounted the shared database; B reconciled every state;
D independently restored the exact source-only postimage into its owned runtime
database and checked actual HTTP coverage. Shared deployment remains held.
