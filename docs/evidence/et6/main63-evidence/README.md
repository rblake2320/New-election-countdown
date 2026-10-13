# Exact composed builder verification — 2026-10-13

Worktree HEAD: `bc91236142d660c21fef86ab9c3977cc09cb40d2`.
Builder: `electiontracker:et6-d-main63-evidence-20261013-builder`.
Observed image ID: `sha256:b4ac1d75337481866ef4b03755a4c959fc3697cb43fb92040f94a513d79d0f68`.

## Unit suite: Worked

```powershell
docker run --rm --mount "type=bind,source=D:/projects/et-wt/astra-et6-composed/tests,target=/receiving-tests,readonly" electiontracker:et6-d-main63-evidence-20261013-builder sh -c "cp -a /receiving-tests/. /app/tests/ && npx vitest run --maxWorkers=2"
```

Exact builder internal source, worktree tests copied into ephemeral container. Normal test timeouts and assertions. Raw stdout/stderr: `unit.txt`; process exit: `unit-exit.txt` (0). Vitest 5.0.3: **98 files / 851 tests passed**, start 17:22:49 UTC, duration 55.46 seconds. Tool session 33163.

## Fresh type check: Failed

```powershell
docker run --rm electiontracker:et6-d-main63-evidence-20261013-builder npx tsc --noEmit --incremental false
```

Raw stdout/stderr: `typecheck.txt`; process exit: `typecheck-exit.txt` (2). Tool session 59045. Exactly **38 diagnostics**, confined to:

| File | Diagnostics |
| --- | ---: |
| server/candidate-position-api.ts | 6 |
| server/enhanced-position-service.ts | 18 |
| server/michigan-candidate-service.ts | 9 |
| server/services/event-processor-service.ts | 5 |

No source changes or commits were made by this verification task. Root Astra owns the production runtime replay and release decision. The type check is still red.
