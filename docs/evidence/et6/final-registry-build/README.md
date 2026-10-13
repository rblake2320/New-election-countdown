# Final registry composition build — 2026-10-13

Exact source: `67a3374b9adafb5c31e56d2da28382afe5f955d8`: base main583057c, final C475de45 (already includes canonical packet CLI emitter2814d7f), and registry repairc5d19db cherry-picked as67a3374. No other source edits.

Both images built successfully with the current Dockerfile:

- `electiontracker:et6-d-final-registry-20261013`: `sha256:5dd7b582980963dc1d7f246877c9b186a5777947c562563c7cfc7cad1c1ffd99`
- `electiontracker:et6-d-final-registry-20261013-builder`: `sha256:c110a3c94c50757b5b054849a65494c7b156ccab123a1126e63ccc468f520404`

Raw build logs, exit codes and image IDs are adjacent. Fresh builder `npm run check` (`tsc --noEmit --incremental false`) passed with zero diagnostics. It was followed by `npx vitest run --maxWorkers=2` using archived tests from exact67a3374 extracted into the builder; source/dependencies remained image-owned.

Full suite **Failed: 1058 passed / 2 failed, 109 files passed / 1 failed**, exit1. Start19:31:37UTC,56.79seconds. Raw combined log: `type-unit.txt`, exit: `type-unit-exit.txt`. Both failures are `tests/official-source-library-boot.test.ts`: the test launches the installed esbuild CLI file with Node, but on this Linux image that file is an ELF executable. Both fail with SyntaxError before the intended old/new bundle assertions. The test launcher requires a portable actual-compiler invocation; no test assertion was weakened and no source edit made here. Root and C owner notified.

## Portable test launcher repair and retest

Root authorized the narrow test repair, committed separately as `e20f9cde21755759973062b9f7ac4f3df322edea`. Only `tests/official-source-library-boot.test.ts` changed: its Node child loads esbuild's JS API with identical entrypoint, bundle, platform, format and output settings. Real compiled-child execution, old/new assertions and timeouts are unchanged.

Using the same builder image and exact original archived tests with only this repaired test copied over, focused **2/2 passed** (19:33:32UTC,981ms), then full **110 files / 1060 tests passed** (19:33:34UTC,55.59seconds), combined exit0. Raw log and exit: `portable-test-green.txt`, `portable-test-green-exit.txt`. The prior two failures remain retained in type-unit.txt. Production application bytes/images did not change for this test-only repair.

No web service, runtime, database, or source replay was launched. Root owns the replacement runtime and independent acceptance. Build/type/unit outcomes here do not substitute for those receiving checks.
