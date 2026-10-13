# Mixed final image verification — 2026-10-13

Exact clean source HEAD: `42305705bb5c0013b358c828aece4ca0a00a37ac`. No source edits made by this task.

- Production `electiontracker:et6-d-mixed-final-20261013`: `sha256:7495e348687985dbbbc9a01627f47e34a9da50873aa06d4b392e51d4393e5da9`.
- Builder `electiontracker:et6-d-mixed-final-20261013-builder`: `sha256:f868d61f3bf511c87c1a1c09b77b8d0839119f1cd43f80a9b322ac490a300eba`.

Both Docker builds exited0 using the current Dockerfile. Fresh builder `npm run check` (`tsc --noEmit --incremental false`) passed with zero diagnostics. Then full `npx vitest run --maxWorkers=2` passed **119 files / 1174 tests**, normal timeouts/assertions, combined exit0. Test run started20:18:54UTC, duration64.31seconds. Exact4230570 test tree was archived, mounted read-only, and extracted into the builder; application source/dependencies remained image-owned.

The actual production image default UID1001 read `/app/migrations/20261013_result_source_health.sql`:932bytes, SHA256 `bfffdcebbf96f4b2d34deda31ba539c89585953b720a4e5941db5bca11e64e02`, exactly matching source. Asset inspection exited0. No application entrypoint or migration was executed.

Raw logs and exits: builder.txt, production.txt, type-unit.txt, asset-check.json, corresponding *-exit.txt; image IDs in images.txt. No runtime replacement, web service, PostgreSQL access, or database mutation performed. Root owns runtime receiving and replacement.
