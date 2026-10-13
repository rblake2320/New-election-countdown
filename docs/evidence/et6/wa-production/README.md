# Actual production receiving

Image5dd7b582 / application source67a3374 (C475de45 plus D registry fix).
Default routes Worked:22 not_published,484 not_admitted,0 refused. NC Senate24 correctly source1383.
WA initial actual XLSX/PDF parsed and recorded1903073/8/certified. Repeat Failed: report2 capture04:27:30.691594 becomes report3 capture04:27:30.691 through PG Date roundtrip, changing canonical hash. Polling stopped via authenticated API200. C owns repair; no recount run on defective image.
Initial deployment helper failure (host PATH replaced by container PATH) retained; corrected helper allowlists only needed environment keys. No credentials retained.
All receiving is in reviewed private destination et6-d-source-copy-20261013 / et6-prod-109656-3a740d1d-db:5432/et6_receiving. Shareddata/deployment untouched.

## Repaired production retake
C8a9f737 whole-published-facts normalization composed. Explicit private health migration applied; Docker842db83 ships exact migration (UID1001 byte/hashcheck). Current image dd9ede966d3704bd79353785cae270a919a293b993c78fd19b438ff3e01d8cc5.
Initial-repaired report3=1903073 repeats withoutappend; recount report4=1903115 repeatswithoutappend. All3raw sourcefiles byteequalSQL. OldinitialETag200changed->304; detailhistory2includesr3and deliberatelyretained priorfailedr2. First changed-snapshot harness wrongly checked history in batch DTO (intentionally stripped); redpreserved and corrected detail-history check Worked. Actual stale changed-source submission409/reportunchanged.
B actualChromium390/1280 initial+recountreceiving passed, no writes. Messages 20261013-B-to-D-WA-initial-ACK.md and WA-recount-ACK.md.
Final full builder suite with actual tests mounted read-only:111files/1077tests passed. Earlier localcommand had no node_modules; builder-onlycommand had no tests (Docker intentionallyexcludes them); both harness errorsretained. Fulltype0/build0 separately retained in wa-clock-build.
