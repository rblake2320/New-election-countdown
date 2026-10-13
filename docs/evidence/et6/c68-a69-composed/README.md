# C68 + A69 composed checks — 2026-10-13

Initial exact source archive: `1da8f6659ada65cac0d24501e3e526f6a54ed073`.
After receipt-only naming repair: `59911e5bbc38344c16f7c6f45a81649cf428bf69`.

Each run used `git archive HEAD` extracted into a fresh `/verify` directory in `electiontracker:et6-d-main63-evidence-20261013-builder` (image `sha256:b4ac1d75337481866ef4b03755a4c959fc3697cb43fb92040f94a513d79d0f68`). Only `/app/node_modules` was linked from that image; all source/configuration/tests came from the exact archive. No source overlays or shared database access.

| Check | Observed result | Raw evidence |
| --- | --- | --- |
| `npm run check` (`tsc --noEmit --incremental false`) | Worked: exit 0, zero diagnostics | typecheck.txt, typecheck-exit.txt |
| Initial `npx vitest run --maxWorkers=2 && npm run build` | Failed: 883 tests/101 files passed, one misplaced retained review file failed import; build skipped by shell condition | unit-build.txt, unit-build-exit.txt |
| Separate `npm run build` on initial exact archive | Worked: exit 0 | build.txt, build-exit.txt |
| `npx vitest run --maxWorkers=2` after receipt-only rename | Worked: 101 files / 883 tests passed, exit 0 | unit-receiptfix.txt, unit-receiptfix-exit.txt |

Final unit run started 17:39:19 UTC and took 59.36 seconds. The receipt fix renamed `yellow-pr69-regressions.test.ts` to `.test.ts.txt`, preserving bytes/SHA256 `6d3aa9de7a4131f214e2cb40b72865e03e73226eaad3b8d7136a4cb67e5278bd`. Hash filename and reproduction instructions were updated; historical raw output remains unchanged. No executable source test was changed or excluded.

Invocation pattern (the archive is mounted read-only at `/input/source.tar`):

```sh
mkdir /verify && tar -xf /input/source.tar -C /verify && ln -s /app/node_modules /verify/node_modules && cd /verify && npm run check
```

The unit and build runs used the same extraction followed by the commands in the table. Tool sessions: typecheck10129, initial units62263, corrected units1616. Normal timeouts and assertions remained in force.

The independent A69 cancellation/admission regressions remain recorded separately in `../pr69-review/`; passing the shipped unit suite does not resolve those observed defects. This is not a release-readiness approval.

Separately prepared, unpushed CI gate: commit `25ea8a7` on `astra/full-type-release`, composed locally with pre-A69 main `d141799` and C `6fe86cad` at `45ee4422d2f82ada2f15811e80ea77c662084a48`. Its fresh archived `npm run check` also exited 0. Only the workflow step changes: full `npm run check` through Bash/tee, retaining diagnostics and propagating failure; no compiler options weakened. Root owns publication.
