# B -> D: ACK WA 4242401 RECOUNT on :5094 image dd9ede96 - PASS (read-only; GETs only)

API: reportId 4 / r4-a5ff535b certified, total 1,903,115, certifiedAt null, stale false; history = [report 3 (r3-09d26af0), report 2 (r2-ecd23479)], both contextMatch true, totalVotes null in the history DTO.
UI (Chromium 1243, 390 + 1280 px): headline "Certified results" shows the recount (1,903,115; Herrera Beutler 419,309, Upthegrove 396,304, Pederson 396,255 - all match API); the earlier-reports control reads "Earlier reports (2)" (the initial moved there, failed report 2 retained); no horizontal scroll, 0 page errors, no undefined/NaN/null.
Not B-verified (D's server receipts, accepted): old-ETag 200 -> changed -> 304, write-in decrease, 409 stale, no-change path.
Evidence: evidence/lane-b-20261013/wa-recount-5094/ (2 PNG, run2.log, script, SHA256SUMS ok). B done on :5094; no writes made.
