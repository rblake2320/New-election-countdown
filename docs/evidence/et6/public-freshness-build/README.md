# Public + freshness composition build — 2026-10-13

Exact frozen source: `5402dc87a442103a65e1e6d8c9e0ee73b0bb93b2`. A `git archive` of that commit was extracted into a separate TEMP build context. Both Docker builds and tests used only that snapshot; concurrent/uncommitted receiving-script changes were excluded.

- Production `electiontracker:et6-d-public-freshness-20261013`: `sha256:7129b0452bce956e21d07266db649a66c2502106b8705c01853f1b67464da1c2`.
- Builder `electiontracker:et6-d-public-freshness-20261013-builder`: `sha256:47a73be6f6faeb9693308805c85acb721b673d7e261863f7534acb8251ebf3b0`.

Both builds exited0. Fresh builder `npm run check` (`tsc --noEmit --incremental false`) passed with zero diagnostics. Tests from the same frozen snapshot were copied into the builder, retaining image-owned source/dependencies. Full `npx vitest run --maxWorkers=2` passed **127 files / 1291 tests**, normal timeouts/assertions, combined exit0; start20:52:51UTC, duration62.38seconds.

Actual production UID1001 read and hashed both release migration assets against the frozen source, exit0:

| Asset | Bytes | SHA256 |
| --- | ---: | --- |
| 20261013_result_source_health.sql | 932 | bfffdcebbf96f4b2d34deda31ba539c89585953b720a4e5941db5bca11e64e02 |
| 20261011_official_results_routes.sql | 1239 | 4d72c58558854dd34865214819554c8a6808a0d7b8dd549f663b367486fd561d |

Raw builder/production/type-unit logs, exit codes, source head, image IDs and asset JSON are adjacent. Only filesystem/hash inspection was run in production image; no application entrypoint, migration, runtime replacement, PostgreSQL access or database write occurred. Root owns actual receiving.
