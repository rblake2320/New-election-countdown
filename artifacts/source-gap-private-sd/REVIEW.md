# Incremental nominee source private acceptance

**Worked.** Owning runtime `72f7e8e6e5ac3fb93a7d31993c094565c1de1310` passed 15 real PostgreSQL lock controls and 17 private apply/repeat/rollback controls. All 1,016 unit tests in 112 files, full typecheck, and production build passed. The gate finished with the exact original seven-table content restored. This packet contains public nominee facts, compiled probes, hashes, and summaries; full original row images stay in the owner-restricted private backup directory.

## Source conservation and matching

The manifest SHA256 is `f83bee609922a2213213d26fdd956c248a69a14718936ff2f39a757c0821223a`: 87 rows from 26 sources, with no repeated incoming identities and no dropped rows. Every per-state/source dry plan had zero unresolved matches. Planning found 36 new profiles and 51 reused profiles.

| State | Input rows | Actual new profiles | Reused profiles |
|---|---:|---:|---:|
| SC | 11 | 4 | 7 |
| FL | 1 | 0 | 1 |
| GA | 32 | 15 | 17 |
| MN | 15 | 4 | 11 |
| AR | 7 | 3 | 4 |
| AZ | 18 | 9 | 9 |
| IL | 3 | 1 | 2 |
| Total | 87 | 36 | 51 |

Inputs are byte-pinned copies under `inputs/`; origin worktree paths in `input-index.json` document capture only. The default producer never reads those origin paths. Eight offline provenance controls reproduced the exact combined bytes from copies, rejected changed input bytes, rejected changed importer bytes, prevented an old-runtime source probe from labelling a current-runtime build as historical evidence, and independently asserted retained actual counts/restoration.

GA's 16 qualified-write-in refresh rows and MN's nine S/G/H03 refresh rows remain separate from this increment. Explicit SC name aliases were retained from the reviewed source proposal. Publisher-defined Workers and NOL party labels remain literal; no generic fuzzy name/party equivalence was introduced. Pinal web sources retain `sha256: null`. AZ Governor write-ins appearing in two different proposed source packets were resolved by the upstream reviewed refinement, rather than counted as separate people. Input class boundaries remain printed/qualified-write-in/source-specified; a Florida unopposed declaration is not presented as a printed ballot or election winner.

## Failures investigated and retested

1. At `abe38a8`, the importer refused the exact official Pima H06 write-in delegation URL. That admission was **Blocked**, not a dropped source row. Root admitted the exact state-bound asset at `8785ba7`. The unchanged full 87-row manifest then passed. Original refusal is `read-only-initial-url-refusal.json`.
2. The first lock-wait observation used `pg_stat_activity` inside the writer transaction, whose cached activity snapshot did not show the wait. That instrumentation attempt was **Blocked**. `advisory-instrumentation-blocked.json` retains the original incomplete transcript. Monitoring was corrected to actual `pg_locks`.
3. Actual immutable `9e10c4c` was **Failed**: while waiting for an advisory transaction lock, SERIALIZABLE captured a stale preimage. After a labelled private audit marker committed, the actual database hash changed but the callback still saw the old baseline and would accept it. The callback forcibly aborted before application writes. The marker was deleted and original content restored. `advisory-snapshot-red-9e10.json` and its exact compiled binary retain this reproduction.
4. Root repaired writer admission in `72f7e8e`: nonblocking session advisory lock before BEGIN, table LOCK as the callback's first query before any guard/snapshot SELECT, and checked session unlock. The same held writer now refuses in **7.9 ms**, before callback execution. After the marker commit, a fresh attempt rejects the committed drift. A plain table writer without the advisory convention also waits safely and sees the committed change after table-lock acquisition. Three callback failures using one pooled connection all release admission; fresh physical connections acquire and release it afterward. All 15 controls Worked.

PostgreSQL's documented first-statement snapshot semantics explain the reproduced mechanism. [PostgreSQL 16 transaction isolation](https://www.postgresql.org/docs/16/transaction-iso.html). `runtime-provenance.json` binds the actual core source files to owning Git blobs and records physical CRLF/LF differences without rewriting captured bytes.

## Actual private transaction results

The only writable target was `et_sol_data_6c78a3148c6b`, on loopback port 5432, verified by SQL and transport guards. The baseline source-content SHA was `1322b3367130f43557be09f22033d9481b087d66d54f2bb74ada567f16c88eb2`.

- Dry-run: all seven source tables and ingest audits unchanged.
- Apply: 36 inserted profiles and 87 source changes; actual audit 21; postimage SHA `a8aa6ee7198ab568955764465a38848bd5ff0f40b87fbc1f6d405934e473b390`.
- Preservation: all 3,444 original complete candidate rows and all 3,856 existing source history rows retained; elections and unrelated correction/results audits unchanged.
- Repeat: zero profile insertions and zero source changes; candidate/source/scope content unchanged; one real ingest audit appended (22).
- Actual controlled postimage drift: rollback refused with `POSTIMAGE_DRIFT`; a compare-and-set restored only the newly owned marker metadata. No foreign overwrite.
- Actual rollback fault after a restore write: `INJECTED_ROLLBACK_FAILURE`, transaction atomic, exact applied postimage retained.
- Ordered rollback: restored the exact original seven-table SHA and complete candidate content. Rollback performs SQL updates, so this is content preservation, not an original-xmin claim.

Private lock probes inserted/deleted clearly labelled audit controls; they made zero nominee application writes. Sequences advance normally even after removal/rollback. No auth/user fixture writes, shared writes, schema changes, external providers, or browser actions occurred in this gate.

`full-private-gate.json` contains the 17 scenario results and private backup run ID. Actual per-state insertion counts were independently derived from protected before/after complete row snapshots; `finish-receipt.mjs` records that receipt-only operation. The original executed binary is `full-private-gate.mjs`. `reproducible-full-gate.mjs` is the current source build with this improved count summary and source-pin guard; its database execution is not claimed here. Source modules remain the exact owning runtime.

## Reproduce and receive

On the approved owner Windows host, with installed physical dependencies, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run_source_gap_private_sd.ps1
```

The runner guards source pins, input pins, exact private destination, expected preimage, session admission, and table locks before applying. A different source preimage refuses; credentials are loaded process-only and never recorded. Raw private snapshots receive verified owner/SYSTEM-only ACLs. No source fixture DDL is needed.

The old-red source must be rebuilt at its declared `9e10c4c` runtime; its added source pin intentionally refuses a build from the green worktree. Original compiled red evidence remains unchanged. The portable green runner does not rerun the historical red probe.

Root owns the separate shared increment wrapper and its current shared preimage (`99d...`); this private clone's baseline is `1322...`. The private receipt is ready for that guarded receiving action, and is not a record of a shared apply. Parent-owned backup/wrapper/delegation files were excluded from this evidence commit.
