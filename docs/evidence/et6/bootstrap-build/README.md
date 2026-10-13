# Bootstrap composition builds and source checks — 2026-10-13

Exact source HEAD: `94015bb7647415c43f01834d99cf63ced71dc6ab` (main583057c + C bootstrap a9e219dd). No source edits made by this verification task.

| Check | Result | Raw log / exit |
| --- | --- | --- |
| Docker builder build | Worked, exit 0 | builder.txt / builder-exit.txt |
| Docker production build | Worked, exit 0 | production.txt / production-exit.txt |
| Fresh `npm run check` | Worked, zero diagnostics, exit 0 | typecheck.txt / typecheck-exit.txt |
| Full Vitest, normal timeouts, maxWorkers=2 | Worked, 110 files / 1054 tests passed, exit 0 | unit.txt / unit-exit.txt |

Unit run start 18:27:48 UTC, duration 56.69 seconds. Tests archived from exact HEAD with `git archive 94015bb7647415c43f01834d99cf63ced71dc6ab tests`, then extracted into `/app` in the built builder container. Application source and dependencies came from that image. No local dependencies or live database were substituted.

Image IDs (also retained in images.txt):

- `electiontracker:et6-d-bootstrap-20261013`: `sha256:0426f52a18af62712fb503387f834d9a713e2ef7a0368dd2c1a5db083c05188c`
- `electiontracker:et6-d-bootstrap-20261013-builder`: `sha256:7bd79026a0d4db1b4ab39c113ae823f008d55f8917c16e286a4d84289a9299c5`

Commands:

```text
docker build --target builder --tag electiontracker:et6-d-bootstrap-20261013-builder .
docker build --tag electiontracker:et6-d-bootstrap-20261013 .
docker run --rm electiontracker:et6-d-bootstrap-20261013-builder npm run check
docker run --rm --mount type=bind,source=<exact-tests-archive>,target=/input/tests.tar,readonly electiontracker:et6-d-bootstrap-20261013-builder sh -c "tar -xf /input/tests.tar -C /app && npx vitest run --maxWorkers=2"
```

No web service, PostgreSQL container, or runtime integration was started. Registry-intersection and bootstrap independent reviews remain separate release gates; this receipt does not clear them.
