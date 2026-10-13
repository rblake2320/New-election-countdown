# Frozen historical TLS build receipt

Source: 751a3128573a8c8d2082dac459433978e4bda53c, archived with git archive into C:/Users/techai/.codex/tmp/et6-historical-tls-751a3128. Uncommitted receiving scripts excluded.

Production: sha256:ccd91da7c2ea2e805681442e697f014b32af062fdb244d93d21fe55ce400fced
Builder: sha256:1060747fd7c45724c34db4d09b5a7938d6388ca75bc481ef3870a74625fee351
Tags: electiontracker:et6-d-historical-tls-20261013 and suffix -builder.

Both docker builds exited 0 using unchanged archived Dockerfile. Raw logs builder.txt / production.txt, separate exit files retained.

Fresh builder `npm run check` exited 0, no diagnostics (types.txt). Archived tests were mounted read-only then copied into builder /app/tests because .dockerignore excludes tests. Focused command `npx vitest run tests/unit/results-nc-manual-host.test.ts tests/official-result-adapters/nc-la.test.ts --maxWorkers=2` exited 0: 2 files, 52 tests passed, 2.15s, start 2026-10-13 22:10:29 UTC (focused.txt). This comprises 9 actual NC manual writer-boundary checks and 43 NC/LA parser checks.

No fixture, web runtime, or PostgreSQL instance was launched by this build task. Root owns actual receiving execution.
