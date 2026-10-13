# Source increment recovery review — fda5214

**Worked.** Owning source `fda521497dd5abc9c6f48e253554e3fca3d38cdf` passed 24 actual private PostgreSQL transaction controls and eight actual rollback-admission controls. The full unit suite passed 1,016 tests in 112 files; production build exited zero. Root separately reported the fresh owning-source typecheck at zero. No shared database writes or auth/user fixture writes occurred here.

The exact new gate receipt SHA256 is `ba7d0dbeaa97a43ca5427f6336480a4138aed3861e0e5f814071c0c0826ce0b3`. Manifest membership and SHA remain unchanged: 87 rows, 26 sources, `f83bee609922a2213213d26fdd956c248a69a14718936ff2f39a757c0821223a`.

## Actual database outcomes

- Immutable old rollback admission failed for both advisory and plain-table writers. Actual `pg_locks` waits were observed, a labelled private audit marker committed, and the old SERIALIZABLE guard accepted its stale snapshot. `faultAfterWrites:1` forced rollback before any application changes committed. Old compiled binary and receipts remain in the parent evidence directory.
- New rollback session admission refused the held advisory writer in 15.4 ms. A fresh retry refused the committed drift with `POSTIMAGE_DRIFT`. After a real plain-table wait, the new guard saw the marker commit and refused. Fresh physical connections acquired/released admission after refusal, and cleanup restored the exact baseline.
- The full 87-row plan had zero unresolved rows, 36 new profiles and 51 reuse. Actual apply inserted 36 profiles and made 87 source changes. All 3,444 original complete candidate rows and 3,856 original history rows remained. Unassigned tables remained unchanged.
- `afterApply` without `beforeApply` refused. An actual callback fault after all 87 source changes/audit were staged rolled back the entire transaction.
- Apply and repeat snapshots were captured before COMMIT with an actual transaction ID, all seven table locks held, and the actual new audit ID present. Postcommit reads matched those captured hashes.
- An actual labelled foreign audit row was inserted after COMMIT. Its receiving hash differed from the captured owned postimage; rollback refused it rather than deleting it. The row remained until explicit cleanup of our own marker, then the owned postimage was restored.
- Repeat inserted zero profiles and changed zero sources, adding only its own audit. Stale postimage refusal, injected restore-write fault atomicity, and ordered rollback all passed. Final complete seven-table content SHA returned to `1322b3367130f43557be09f22033d9481b087d66d54f2bb74ada567f16c88eb2`.

These are logical full-row content comparisons. Rollback may advance original row versions; no unchanged-xmin claim is made. Labelled marker insert/delete and rolled-back inserts may advance sequences. Raw row images stay in the existing owner/SYSTEM-restricted private backup directory identified by the receipt; they are not in Git.

## Read-only wrapper disposition

**CLEAR** at wrapper SHA256 `696d1b44dec6c6ec32fb502a91731e6c7bb977cbb95c2bbca0eaa5cb3bba6b31`, retained as `wrapper-reviewed.mjs`. Root owns this operational script; the copy here is review evidence.

Ten finite offline controls passed in `wrapper-review-controls.json`. They exercise actual bundled helpers and the actual wrapper catch body; recovery I/O faults are injected without database connections. They are separate from the real PostgreSQL controls above.

The previous CLI-bearing helper import caused the old release dispatcher to consume the increment's arguments and set exit 1 while the importing entry continued. The new pure helper import passes the same input with no dispatch. The stdin probe supplies only a canonical physical module URL to avoid `[eval1]` URL encoding differences; it leaves compiled CLI/helper logic intact. The whole actual bundled wrapper without its mandatory arguments refuses before database/config reads.

The previous catch body dropped the final journal if recovery capture failed. Frozen source SHA `832c45c6a2b09ea2ec809960cc0f2a8fe970aff1cd5adb64530e676ccd37fecb` reproduces that red. The new body retains `Blocked` for snapshot, private-image write, rollback, and unknown foreign postimage failures, and emits a safe `Blocked/recovery_journal_unavailable` if final retention itself fails. Commit state is explicit; a nonreturned write call is not represented as proof of no COMMIT.

An initial diagnostic assertion treated JSON stderr as an object. Its transcript is `wrapper-review-instrumentation-original.json`; this was a **Blocked instrumentation check**, not an application defect. Parsing the actual JSON string corrected it, and the targeted retest passed. The unchanged wrapper already emitted the proper classification.

The reviewed wrapper pins all three owning modules—importer, rollback, capture—to fda, pins the actual 24-check receipt above, and compares the fresh restored backup's seven-table hash to the shared preimage before any shared write. Its callback locks all seven tables before guard/snapshot SELECT. The owned postimage is captured and privately retained under transaction locks; sole new audit ID and manifest binding are checked. A later external read must equal that owned image. Unknown/concurrent content is never adopted into a rollback image. Recovery is guarded against that exact owned postimage.

The backup-script diff only selects a guarded relative JSON output path. The retained backup receipt identifies actual DPAPI readback, private restore `et_sol_data_68fa478d817d`, and archive SHA `6d67f7e22f72d74759cc1ba3fea014aa1d5127b7c2637300a9b6c453c5732a6c`. Root owns its execution and the shared apply. Our approved private clone uses baseline `1322...`; root's separate shared receiving preimage is `99d76b1c02ac17d106aa3534e43493d70f8f5e3095cbe75e5127c896584be673`.

## Reproduce

The existing runner was extended, rather than adding a second complete PostgreSQL harness:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run_source_gap_private_sd.ps1 -ReviewedRuntimeHead fda521497dd5abc9c6f48e253554e3fca3d38cdf
```

It uses copied public input bytes, immutable runtime comparison, the exact approved private target, source preimage admission, the rollback controls and existing full gate. Historical evidence is separated from the new runtime directory. Following the final 24-check clearance, no additional PostgreSQL tests were run; only offline wrapper review, source provenance, unit tests and build were performed.
