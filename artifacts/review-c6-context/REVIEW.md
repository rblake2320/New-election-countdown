# C6 receiving-context regression review

Immutable repaired head: 91420049901cbce8981bc675530486a0f4a3e05d. Old head: 554ab9020a0c2937a2df5bbc56a5e963444a3be9.

Worked: all 32 independent edge cases. The actual exported projectOfficialResultsForElection helper returns both fields null for stale outer dates, changed primary/runoff phases, mismatched published outer/receipt states, invalid calendar/time text, Invalid Date and missing date. It preserves correct same-date Date/ISO/date-only/SQL timestamp contexts and complete synthetic general/primary published contexts. No projection call throws.

Worked: all 537 original retained actual detail-payload field pairs remain exact, including healthy unknown/generic routes, NH blocked source metadata with null URL, LA429 primary metadata and 31 null historical records. Original payload SHA256: 401e79f55b0db62d3e790f694e1f2650422f3fc229d6c6f65d7377914c5d5d82.

Same-case old negative control reproduces 24 stale exposures: 22 serialized contexts plus Invalid Date and undefined date. The old actual detail receiving expression officialResultsFieldsSchema.parse(election) validates inner fields but ignores outer date/phase/state. Old listing paths passed these stored fields through. This child ran the pure exported new helper and the exact old receiving expression offline; no HTTP status or compiled-container result is claimed here. NC separately owns old/new real handler/private-container evidence.

Read-only immutable wiring inspection confirms active detail route uses the named projection; DB and Replica list/detail paths use projectElectionResultsRow; Mem list/detail paths use the named projection. SQL-backed row mapper obtains to_char raw canonical timestamp, converts to UTC Date, strips resultsCatalogTimestamp, then projects. Those storage/query files are pinned and hashed in new-source-receipt.json. NC owns real PostgreSQL/Tokyo validation.

Evidence: acceptance-cases.json; old-negative-control-receipt.json; new-projection-acceptance.json; old/new immutable source snapshots; new-source-receipt.json; old-controls.ts/run-old.cjs; new-controls.ts/run-new.cjs. Synthetic publication sources/receipts and earlier real payload/UI review receipts remain untouched in their original folders. No browser, network/server preview, database write or peer-source edit occurred. No implementation was duplicated.
