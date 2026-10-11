# Explicit Louisiana registration stage — Worked

Code925c1f2 on all-C composition9b52c3f; narrow main equivalent036c460 in PR20. Rebuilt production/builder images and ran the candidate ingestion container acceptance on disposable PostgreSQL with an internal network and no published ports. Harness exited0 and removed its containers/network; shared DB untouched.

The previous actual packaged receipt at artifacts/composition-review/packaged-f6471ed/receipt.json in9b52c3f failed every(source_refresh): the historical importer correctly skips the now-primary LA House contests while the current producer admits their registrations. The gate had conflated new registration creation with metadata-only proof refresh.

The repaired gate first derives the six canonical LA primary races and exact projection records independently in SQL. It admits only that exact INSERT action set, checks each new row's FK, party, public identity, source hash and registration-only flags, and preserves all2572 legacy full rows. It then runs the current producer on the full projection with the unchanged strict every(source_refresh) assertion. All2600 rows after registration join the protected baseline for nominee apply/repeat/CLI/HTTP/refusals.

Observed:28 registration inserts in districts01..06 with counts2/1/3/4/11/7;2467 metadata-only proof refreshes; legacy2572 profiles unchanged; post-registration2600 profiles unchanged. Expanded manifest1361 records/467 roster HTTP+2 invalid/missing controls,844 nominee inserts,repeat0,15 opposing-party refusals, injected rollback and CLI preflight/audit checks passed. Synthetic FEC16 remains separate and passed.

Production and builder builds passed; unit543passed/3skipped. New registration tests reject enrich/update/source_refresh, changed state/office/district/party/raw party/FEC ID, wrong FK, omissions, duplicates and preexisting candidate IDs.

This run intentionally targets the repaired candidate gate. The final all-C owner retains the single broader continuation including the previously repaired timezone/listing/poll-hour/C6 context gates. No runtime importer, catalog or shared-data mutation is included in this repair.
