Twelve supplemental source facts, private acceptance

Runtime source: candidate-nominee-sync.ts unchanged from main583057c4f928b870c7a27db7b3f1feb5ab2a22dd. Guarded rollback helper reused exactly from source-data-release rehearsal e1d7f57a8f1d3a7247058759474e86891a4326db; compiled byte hashes appear in receipts. No runtime code, routes, profiles or shared database changed by this branch.

Independent raw-byte review verifies both complete decompressed response bodies against parent-retained HTTP200 proofs. SC eleven Active Name on Ballot rows support complete printed facets for House2/3/4/5 (3/3/3/2). Their date/phase binds through response electionId22596 and the retained request election label. The partial response has no literal election date. This does not claim write-in completeness or certification. Florida House10 has exactly one row across its entire federal House table: Maxwell Alejandro Frost (DEM), incumbent, Unopposed in candidate/primary/general columns. It is admitted as official general-list membership, access not_specified; no printed-ballot, vote-winner or certification inference. Both publication dates remain null, actual retrieval timestamps retained.

Worked actual private PostgreSQL et_sol_data_6c78a3148c6b, approved loopback5432:
- Read-only plan12 actions,6 new profiles,0 unresolved; seven-table hash unchanged.
- Apply6 inserts,12 current source changes,5 scope snapshots. All3444 original candidate rows unchanged field-for-field; receiving-external source memberships, elections and other audit tables unchanged.
- Exact repeat0 candidate inserts/0 source changes. Audit-only append retained explicitly.
- Guarded rollback8341 originals restored,25 inserted rows removed (6 candidates,12 sources,5 snapshots,2 audits). Complete logical seven-table SHA restored exactly1322b3367130f43557be09f22033d9481b087d66d54f2bb74ada567f16c88eb2. Private clone left at original logical data state. PostgreSQL sequences/xmin are not logical row hash inputs and rollback does not rewind them.

Potential identity aliases were deliberately not forced: official Joe Wilson versus existing Joe The Hon. Wilson10330, and official William Timmons versus existing William R Iv Timmons12225. Similar name/party is insufficient proof. New distinct source-backed profiles are the conservative outcome until an independently reviewed identity declaration exists.

Commands in the owning physical dependency checkout:
```
python artifacts/source-gap-private/verify_source_facts.py
npx esbuild server/candidate-nominee-sync.ts --bundle --platform=node --format=esm --packages=external --outfile=artifacts/source-gap-private/nominee-core.mjs
npx esbuild D:/projects/et-wt/sol-source-data-release/scripts/source_data_rollback.ts --bundle --platform=node --format=esm --packages=external --outfile=artifacts/source-gap-private/rollback-core.mjs
node scripts/verify_source_gap_private.mjs
```
Private mutation additionally requires --apply and process-only SOURCE_GAP_EXPECT_PREIMAGE equal to the full retained seven-table SHA. Credentials are loaded quietly from the approved source .env and connection database is replaced with the exact assigned clone. Raw pre/post row images remain exclusively in owner-restricted backup storage, never these artifacts.

An initial preflight refused before opening PostgreSQL: Python Windows text output produced CRLF while the manifest pin was calculated over LF. Writing the reviewed manifest as explicit LF bytes repaired this packaging mismatch; actual final manifest SHA0877a940f63bae7c9a9f459c8d38c673096a6365e40dbd0ebd82d4ce7aabbe75. No source raw recordings were changed.

No shared mutation, provider call, preview/browser or duplicated large integration pipeline was performed.
