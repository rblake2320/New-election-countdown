# Reviewed-manifest CI acceptance — Worked

Gate commit c9e5d19, C11 4e737f3 composed with main677503c and projection9865745. The production Docker image and builder were rebuilt from this composition. All database work used disposable harness-owned PostgreSQL, an internal Docker network, and no published ports. Containers and network were removed after the run. Shared apply hold remains.

## Observed results

- Actual parsed FEC projection: 2523 registration identity rows; original ZIP SHA6062f203fd5dd90a7e33e487088a4d496bd9634cc1e560f94b0f5e7ff8ea0126; projection SHA677e8eb2118af3f492ddcdc572a1a0c7e2f14bd0c9bef012813ac68b0d04a2d0. Independently rederived from the locally retained ZIP and compared all2523 parsed rows. CI uses the pinned projection; raw ZIP parsing is a separate derivation check. No ZIP, contacts, or committee fields committed.
- 136 editorial rows -> historical FEC ingest2495 actions ->2600 full profiles -> current producer2495 source-only proof refreshes. Admission before proof refresh refused without table changes.
- Reviewed manifest SHA7890860f047cb79e64144c57f56ea721669348c2f5905fd25159ba738c81982e:1361 records,467 independently SQL-matched races;844 inserts. Real compiled HTTP467 roster checks plus400/404 controls; exact manifest identities, source metadata, profile fields, candidate IDs and cardinalities compared.
- All2600 complete existing profiles unchanged after proof refresh, nominee apply, repeat, CLI, HTTP and conflict controls. Repeat inserts0/source changes0. All15 opposing-party changes refused. Injected nominee failure rolled all candidate/source/snapshot/audit tables back. CLI unwritable receipt preflight refused without writes; successful repeat committed its audit.
- Separate synthetic FEC fixture retained: all16 original controls passed. This is reported separately from actual FEC-first acceptance.
- Unit454 passed/3skipped across47 files. Production and builder images built successfully. Full-project typecheck remains963 existing errors; this is not a green full-type readiness claim.

## Failure and repair evidence

`old-count-red.json` executes the old259 assertion in the real-source gate and fails1361 !=259 before admission. `compiled-green.json` is the corrected full run. The old91 race constant is also removed: independent SQL/manifest cardinalities replace both frozen sample counts. Exact receiving tests reject changed names, party, state, office, district, date, source IDs, omissions and duplicates.

Two first-run failures are retained: the projection initially missed the Docker build context; an explicit fixture allowlist repairs packaging. The full-catalog sweep exceeded the unchanged production300/min API limiter; checks are now paced4/sec. No limiter bypass or increased production budget was added.

The acceptance uses C11's reviewed manifest, not a claim that pending C6 receiving or PR16 server changes have passed. Those remain separately owned. Local raw build/unit/type logs are retained in this worktree; committed receipts contain no credentials.
