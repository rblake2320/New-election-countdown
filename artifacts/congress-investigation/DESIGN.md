# Congress source-bound import: bounded repair design

Investigation source is immutable main `8b49d60030b7c94ce772c1b3137ba43a4f85fbcb`. No server, route, schema, configuration or database change was made. The real `CongressImportService` ran with only local-file reads and the DB boundary mocked. The 11 passing probe assertions reproduce unsafe legacy behavior; they are diagnostic success, not importer acceptance.

## Observed failure and mechanism

`importFromCompleteDataset` parses both attached JSON files, deletes all existing members, then transforms rows and inserts batches of100 without a transaction. A null row fails after delete; batch2 of201 fails with100 rows already persisted, batch3 with200. Empty arrays erase old rows and return success0. The invoked cleaner returns every row, including duplicates, `(former)` and `(vacant)`. `IMPORT_n` IDs change with ordering and have no official identity provenance. Successful import returns input-derived counts without a DB readback. Malformed JSON before the delete preserves old rows (safe control).

`validateImport` uses `total >= 535` as completeness. The actual function reports complete for535 duplicate House records, no Senators, one state. It reports incomplete for the complete fetched voting-only snapshot533, and complete for all539 actual occupied members while retaining expected House435. These are source-scope failures, not arithmetic errors. PR27 tests cover recorded count/null contracts and never call the destructive importer. Both administrative import routes still call it; route ownership stays with Fabel. The sync-all route labels the old JSON as an authenticated dataset without source binding.

Sweep: `bulk_restore_congress.js` also deletes first, writes batches without a transaction and substitutes a name/order-based identifier when missing. `server/storage.ts:935` is another insert writer that catches write errors; `scripts/sync_congress.ts` is a separate provider-key writer. These were inspected only. A transaction in one service cannot serialize writers that do not join the same lock.

## Official inputs actually fetched

- House: [Clerk MemberData XML](https://clerk.house.gov/xml/lists/MemberData.xml), HTTP200, SHA256 `01833c6c646873b2247950e8ab9c7ecc2c57fd2bf019d1014bd64a58b496ed3d`. XML declares Congress119/session2, publish-date October1,2026; HTTP Last-Modified September29,2026 is retained separately.441 seat records contain439 occupied people:433 representatives, five delegates and one resident commissioner. FL20/TX23 have empty name/bioguide/party and explicit vacancy footnotes; they are seat records, not member identities. The source's official-name field preserves full names; postal-code is an attribute on member-info/state. House district strings distinguish ordinals, At Large, Delegate and Resident Commissioner.
- Senate: [Senators XML](https://www.senate.gov/general/contact_information/senators_cfm.xml), HTTP200, SHA256 `01459d6977e9b5590e7d27cb333ff062cf9cf0783c934373393512fe2542b5e2`.100 unique current people,50 states/two distinct classes each. Exact first_name/last_name produce the derived display name; member_full is retained as independent raw identity context. The XML does not declare Congress; the fetched and hashed [official Senators landing](https://www.senate.gov/senators/index.htm) declares119th Congress and links this XML. Missing future rows must not become inferred vacancies.
- All539 occupied member IDs are distinct real `[A-Z][0-9]{6}` bioguide values. Source party codes are retained verbatim: voting House R218/D214/I1; nonvoting R3/D3; Senate R53/D45/I2. No fabricated IDs, biography, nomination, vote or certification is derived.
- [Clerk FAQ](https://clerk.house.gov/Help/ViewMemberFAQs) confirms the six nonvoting roles. RadioTV corroboration request returned403 in the web reader and was not bypassed; the actual Clerk XML is sufficient for the retained source derivation.

Raw XML/HTML containing contact details was held in memory only, hashed and discarded. Receipts retain tag names, not contact values. Derived records contain only identity, party, seat, role and relevant date/occupancy evidence. Re-fetching is required to recompute whole-document hashes; the retained minimized projection cannot reconstruct contact-bearing raw bytes.

## Smallest immediate repair, without routes/schema changes

1. Refuse the old attached-assets entrypoint before file reads/DB mutations with a named legacy-source refusal. Merely checking that JSON exists is not provenance. Do not claim the old import was repaired by assigning an `IMPORT_n` value differently. Both routes must receive the service refusal until their owner adapts error/status/source wording.
2. Introduce one bounded official snapshot loader/import method using the reviewed contact-free projection and a pinned whole-projection hash plus source-review receipt. Only the two exact government XML URLs and official Senate context URL are admitted. Keep raw source hashes, retrieved timestamps, exact congressional context, source ID per row and explicit declared scope. A future source snapshot requires a newly reviewed manifest, not automatic trust in a bare matching count or200 response.
3. Validate the entire snapshot before calling any writer: nonempty input, recognized source, Congress119 context, real unique bioguide identities, unique occupied seat keys, explicit House roles/district mapping, exact per-source seat coverage, known vacancy evidence with null person fields, and all-row sourceId linkage. Reject duplicate identities/seats, malformed/unknown districts, unknown vacant identity rows, free-text former/outgoing markers and ambiguous seat/member status. Do not use name heuristics to decide current membership or choose the first candidate per seat. The government's current member section establishes the occupied rows; predecessor sections are never member inputs.
4. Prefer scope `all_current_members_including_nonvoting` for this particular reviewed snapshot:439 House +100 Senate=539 occupied, two separate vacancy records,435 voting House seats. Existing columns can store these people's actual IDs/names/state/chamber/district; manifest/audit keeps role semantics. Alternatively, voting-only533 must be an explicit separately hashed scope that excludes all six nonvoters, not accidental filtering. No scope gets a `535 people` completeness requirement.
5. Use one transaction for every accepted mutation and actual final readback. Acquire a shared Congress writer advisory lock and appropriate table lock; recheck the exact manifest SHA and whole targeted-table preimage inside the lock. Upsert by real bioguide ID, changing only approved member fields. Reconcile removals only within the manifest's complete current Congress/scope; preserve unrelated Congress rows and fields. Existing unverified legacy IDs must be included in a reviewed migration/removal plan with exact preimage evidence, never silently relabelled as official IDs. Any error aborts all changes. Never combine independently committed chunks.
6. Within the same transaction compare actual readback to every projected accepted member and its declared occupied scope; commit only exact agreement. Repeat must do zero writes. Return source-scoped occupied counts and explicit vacancy/nonvoting counts, not inferred input batch totals or statutory seats mislabelled as recorded people. Provenance storage/audit beyond the service requires coordination because this bounded repair excludes schema changes. Until a durable source receipt can be retained, do not label a new importer fully operational.

## Finite acceptance to run after authorization

Use dedicated private PostgreSQL, not shared credentials. Preserve the exact legacy red receipt.

| Scenario | Required repair outcome |
| --- | --- |
| Legacy assets alone, empty/malformed/duplicate/unknown-source input | Refused before writes; old rows/IDs/xmin unchanged |
| Actual reviewed539 member snapshot with two separate vacant seats |539 actual real-ID members; no vacancy-as-member; roles/counts agree with source |
| Actual snapshot validation with one source/seat/person removed or forged | Refused before writes; absence never filled with invented IDs/names |
| Failure after first100 writes / near final readback | Complete rollback; prior rows and IDs retained |
| Repeat identical accepted source | Zero writes and unchanged xmin |
| Stale preimage / competing coordinated writer | Refused or serialized with exact evidence |
| Readback mismatch / changed source manifest | Rollback, no success receipt |
| Other Congress / unrelated existing fields | Unchanged |
| Built service receives the same approved snapshot | Same outcomes as source path; no provider key/network needed |

This design makes no claim that transaction repair or live/shared import has run. The current task authorized diagnosis only; the executed source and mock receipts are complete and ready for the owning implementation decision.

## Replay

Use this isolated branch with its own physical `npm ci` dependencies. `npm ci` here installed757 packages with process-only browser download skips; no dependency junction was used. Run `node artifacts/congress-investigation/replay-legacy.mjs` to stage the retained diagnostic source temporarily, run only its Vitest probes, then remove that exact staged file. `python artifacts/congress-investigation/derive_official.py` fetches government sources again and may observe a new snapshot; preserve the original receipts when comparing a later source.
