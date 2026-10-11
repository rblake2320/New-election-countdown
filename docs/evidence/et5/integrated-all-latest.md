# Updated full compiled integration acceptance

Heads: C listing932fb85, PR7ad9822c, PR8 36ae5bd, C3/PR5 d8daa0b, B5f8b881, A15515fd, D366ab72 plus the poll-hours harness below. Two receiving fixes were required: a10cf36 adds C3's three metadata columns to the isolated timezone fixture, and e968eb9 accepts raw string metadata at the existing timing normalization boundary. Neither fix changes production timing behavior. The .gitattributes conflict was resolved by preserving immutable B fixture bytes and C's LF manifest/payload rules.

Worked after targeted repair: compiled app boot, normal-user auth/dashboard/recommendations/watchlist, election listing contracts, NY/Adak/unknown timezone SQL acceptance, FEC16 private checks and259 source records across91 real compiled HTTP roster endpoints.

C3 compiled dry-run preserved full-row and tuple-version fingerprints. Injected failure after100 updates rolled back; apply updated506 election-day rows; repeat changed no rows/tuple versions. Actual compiled HTTP output matched SQL on all six poll-hours fields for506 elections:3036 comparisons, zero mismatches. Shared DB application did not occur.

Unit suite:286 passed/3 skipped. Fresh client/global gate:0 errors; whole-project964 errors. Initial combined typecheck was7 client/971 total; input-boundary repair removed the seven client diagnostics without weakening the CI gate. Production release still requires full type cleanup.

Evidence: integrated-all-latest.json, integrated-all-latest-unit.txt, integrated-all-latest-types.txt. Earlier fixture/schema failure and red type output remain in local test-results/all-latest*. Disposable database/network cleanup completed. Poll-hours acceptance is now an enforced container CI step (TEST_POLL_HOURS=1), and both receiving fixes were sent to their owners for inclusion in the individual PRs.
