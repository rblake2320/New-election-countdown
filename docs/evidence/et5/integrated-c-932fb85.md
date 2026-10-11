# Compiled integration acceptance: C 932fb85

Worked on integration commit 5b7ceb3aca7b0e19f03414d6b42a1b2bec789e6e (B4ad6a93, C932fb85 and existing A+D snapshot): production image builds and boots against disposable PostgreSQL; /, /api/health and /api/elections return HTTP200; 537 unique seeded elections.

The timezone acceptance script was compiled with esbuild and run against a separate fixture database inside the harness-owned PostgreSQL container. All three election-night instants passed with NY, Adak and unknown-zone fixtures; NULL-party Other and January31-to-February-end cases passed. The production HTTP listing passed eight contract checks, including membership/order/candidate counts versus independent SQL and invalid filter400. Fixed-time election-night scenarios exercise the compiled query directly; current-time listing checks exercise the HTTP server.

Integrated units: 171 passed, 3 skipped. Fresh client/global type gate: 0 errors; whole-project diagnostics:974. Production readiness still requires full type cleanup and the other release gates.

Receipt: integrated-c-932fb85.json. Unit log: integrated-c-932fb85-unit.txt. No shared database writes, no PR5 apply. Disposable containers/network removed by the harness.

Harness now supports TEST_ELECTION_TIMEZONE=1 with a builder containing C932fb85. The fixture refuses any database name except its dedicated test name.
