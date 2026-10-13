# Parent85 composition build — 2026-10-13

Exact built source HEAD: `dde00d86c2c746e94e10be0e15946bf2a5eeff2e` (scoped parent85 merge89090a8). No source edits by this task. During verification root merged main97a5ae2, producing `b14bb663fd108e60d4d5c3f324bd21e54701d33c`. Independent `git diff dde00d8 HEAD -- server shared client scripts/build-server.mjs Dockerfile package.json package-lock.json data` returned empty at that head; source equivalence was retained instead of rebuilding identical runtime inputs.

- Production `electiontracker:et6-d-parent85-20261013`: `sha256:88ab340386a347bf4994de915decb14e0e053639c89294f26edebc5d229d9a73`.
- Builder `electiontracker:et6-d-parent85-20261013-builder`: `sha256:7feee115c2bebddaed89cee8468cd32037f5801fd2dec2b4cf287a133219fef5`.

Both Docker builds passed, exit0. Fresh builder `npm run check` (`tsc --noEmit --incremental false`) passed with zero diagnostics. Exact dde00d8 tests were archived, mounted read-only, then extracted into the builder whose own application/dependencies were used. Full `npx vitest run --maxWorkers=2` passed **121 files / 1193 tests** with normal timeouts/assertions, combined exit0; start20:24:32UTC,55.83seconds.

Actual production default UID1001 read the932-byte `/app/migrations/20261013_result_source_health.sql`; SHA256 `bfffdcebbf96f4b2d34deda31ba539c89585953b720a4e5941db5bca11e64e02` matched source, exit0. It was a filesystem/hash inspection only, not application/migration execution.

Raw logs/exits and image IDs are adjacent: builder.txt, production.txt, type-unit.txt, asset-check.json, images.txt and corresponding exit files. No web runtime, PostgreSQL access, runtime replacement or database mutation occurred. Root's browser-window receipts and active files were left untouched.
