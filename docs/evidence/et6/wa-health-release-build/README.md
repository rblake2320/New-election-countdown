# Health migration release asset — 2026-10-13

Implementation commit `842db83810953338c543efd0a4f8991dd77e8ee8` changes exactly one Dockerfile line: copy `migrations/20261013_result_source_health.sql` from builder to production, owned by nodejs. No migration execution or application boot was added.

Both Docker builds exited0. Images and raw build logs/exits are adjacent:

- Production `electiontracker:et6-d-wa-health-release-20261013`: `sha256:dd9ede966d3704bd79353785cae270a919a293b993c78fd19b438ff3e01d8cc5`.
- Builder `electiontracker:et6-d-wa-health-release-20261013-builder`: `sha256:7a56dbf14144a69913f273034bad97e7c0948b59d997ec5d5b5e2ed2565e5313`.

The actual production image ran only a Node filesystem/hash check as its configured UID1001. It read the 932-byte `/app/migrations/20261013_result_source_health.sql` asset and compared SHA256 to the host source. Both were `bfffdcebbf96f4b2d34deda31ba539c89585953b720a4e5941db5bca11e64e02`. Check exited0; raw JSON/exit are `asset-check.json` and `asset-exit.txt`.

Root's uncommitted receiving harness and private-run receipts were left untouched and unstaged. The harness is not a build entrypoint; it may be present in the builder context, but is not production application code. No web server, application entrypoint, database, or migration was launched by this task. Runtime receiving remains root-owned.
