# Frozen historical TLS + Louisiana build receipt

Exact source ec45ea4f2e6d29a380d542e827f6c64573c5ef1e archived using git archive into C:/Users/techai/.codex/tmp/et6-historical-tls-la-ec45ea4f. Uncommitted root orchestration excluded; existing Dockerfile unchanged.

Production sha256:4fd2c2f8427c1271b3502824dce782006257b0f77a3d88524ecc936867f403f1
Builder sha256:1b0a3a14c046439e9ffccd359e912ec5fa765e00f98a4e64c77323d50498ff6c
Tags electiontracker:et6-d-historical-tls-la-20261013 and suffix -builder.

Both builds exit0. Fresh `npm run check` in exact builder exits0 with no diagnostics. Frozen archived tests copied into builder /app/tests, then `npx vitest run tests/unit/results-nc-manual-host.test.ts tests/unit/results-manual-packet-sweep.test.ts tests/official-result-adapters/nc-la.test.ts --maxWorkers=2`: 3 files, 63 tests passed, exit0, duration3.20s, start2026-10-13 22:16:30UTC. Raw logs and individual exit files retained beside this receipt.

No fixture, web runtime, or PostgreSQL instance launched or modified by this build task. Earlier751a3128 receipt remains separate under historical-tls-build.
