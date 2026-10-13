# Packet library boot gate

Baseline: main `5fe2423963e2c0dce9c34448acaa9b1e9b7ddeb3`.
Only `tests/official-source-library-boot.test.ts` changes executable behavior.
The retained B report observed two intermittent failures across three complete
suite runs, in different boot cases; both cases passed alone. The old test did
not retain `spawnSync` error/phase timing, so that report does not establish the
exact OS error or scheduling cause.

The old test spawned a fresh compiler inside each runtime assertion. Each test
combined compilation and execution while each child independently allowed
5,000 ms, against Vitest's 5,000 ms test budget. The repair builds both existing
immutable wrappers once with one real esbuild child in `beforeAll`, then runs
each cached bundle in its own actual Node child. The compiler child, hook and
both runtime-child budgets remain 5,000 ms. No retry, timeout waiver, runtime
source, parser, provider, package or test-runner configuration change is made.
All original runtime assertions, including the old CLI-negative control, remain.

Phase records distinguish compiler from runtime failures and include elapsed
milliseconds, budget, exit status, signal and error message. They retain both
wrapper SHA256 values. The real old bundle still exits 1 with `CLI_ARGUMENT` and
exitCode 1; the canonical bundle exits 0 with its unchanged-exitCode boot marker.

Worked in the physical existing dependency checkout with an unchanged lock:
targeted 2/2; two default-concurrency full runs each 1,210/1,210; nonincremental
typecheck zero; production build. In the second full run the one compiler took
216.74 ms and runtimes took 149.46 ms (old negative) and 185.97 ms (canonical).
`receipt.json` retains the actual phase events and both reporter hashes.
`full*.json.gz` retain the complete JSON reporters, not synthetic summaries.
`B-reported-red.md` is peer-owned observed prior failure evidence, not a newly
reproduced child failure. No forced load, process kill, DB/provider call or
duplicate private production pipeline was used.

Reproduce:

```
npm test -- tests/official-source-library-boot.test.ts --reporter=verbose
npm test
npm run check
npm run build
```
