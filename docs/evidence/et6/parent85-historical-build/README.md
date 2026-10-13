# Parent85 + historical-client composition — 2026-10-13

Exact built source: `a8f9aaef10a29c7eb74f40bfa03cd715f16f9605`, incorporating the parent85 composition and main48093e9's B74 historical client changes. No source edits by this task.

- Production `electiontracker:et6-d-parent85-historical-20261013`: `sha256:e8c035c8d475cd86062a4aa94166afaf26ee1f796e63792622a0c37047ca43d6`.
- Builder `electiontracker:et6-d-parent85-historical-20261013-builder`: `sha256:f844f5658c95d5d79abc472be877e86dfca1c894a114a28c1fb7363c3c0b1c92`.

Both Docker builds passed with exit0. Fresh builder `npm run check` (`tsc --noEmit --incremental false`) passed with zero diagnostics. Exact a8f9aaef tests were archived and extracted into the builder; image-owned source/dependencies were used. Full `npx vitest run --maxWorkers=2` passed **121 files / 1198 tests**, normal timeouts/assertions, combined exit0. Start20:27:05UTC; duration55.96seconds.

Actual production default UID1001 read the932-byte `/app/migrations/20261013_result_source_health.sql`, SHA256 `bfffdcebbf96f4b2d34deda31ba539c89585953b720a4e5941db5bca11e64e02`, matching source exactly; asset check exit0. This was only a filesystem/hash check, without application or migration execution.

Adjacent files retain raw build/type/unit/asset output, exit codes and image IDs. No runtime replacement, web service, PostgreSQL access or database writes occurred. Root's active harness/browser-window/review files were left untouched.
