# Stronger compiler mechanism — Worked; full type gate remains Failed

Input inventory TYPE-GATE-PLAN.md SHA5fc7cf1876bcf4e7955d0ce4ecc69aab3388d24436551f60d15a1723ea41c2cf verified. Exact source72cdbd9, code9451332 on astra/type-mechanism; narrow main equivalentf2524c9 in draftPR22. Fresh nonincremental compiles used physically installed TypeScript5.6.3 in the same builder image, with package-lock byte equality checked before both runs.

| Full-program scope | Baseline | Stronger configuration |
| --- | ---: | ---: |
| shared |158|0|
| client |0|3|
| server |789|969|
| total |947|972|

513 old diagnostic signatures disappeared;538 new signatures were exposed. These are exact file/line/column/code/message differences, not counts of repaired runtime defects. Actual schema inference is restored and Map/Set iteration target errors disappear. Newly exposed nullable contracts stay in the repair inventory. Based on the established file ownership map: A956/C13/B3 remaining diagnostic locations. Full raw diagnostics and per-owner JSON are retained here; no consumer edits by D.

Changes: strictNullChecks=true; targetES2022; checker/client useDefineForClassFields=false; server esbuild explicitly retains useDefineForClassFields=true. The latter split matters: installed client and server builders previously used different defaults. A single false setting changed two server outputs; a single true setting changed client outputs. Final baseline/candidate production builds in the same environment have identical hashes for every output file (build-parity.json). This prevents an unintended runtime class-initialization change during the compiler repair. References: https://www.typescriptlang.org/tsconfig/#useDefineForClassFields and https://esbuild.github.io/content-types/#typescript-caveats .

The new bounded compiler gate imports the actual shared schema, verifies required name/party types, omitted generated ID, null rejection and typed Map iteration. Old configuration fails including unused negative-type expectations; repaired configuration passes. Negative expectations are confined to compile-only fixtures, not production suppression. CI runs this bounded mechanism check in addition to existing client checks. npm run check now explicitly uses noEmit/incremental=false and remains the full-project release check; it exits2 with972 diagnostics here.

Unit543passed/3skipped; builds passed and emitted bytes match baseline. No duplicated all-C/runtime/load runner was started. The separately reported provider cancellation blocker and full types remain release-blocking; no readiness/assurance or shared-apply claim. DraftPR22 awaits B's three client guards and review; A/C own the remaining contract implementations. Main's single server entrypoint is preserved in the narrow PR; all-C's two entrypoints are preserved in9451332.

## Post-B verification: 84c03b8 adopted

Opus focused fix is 90e98ba on PR22 and 4fd5b93 on all-C. Fresh tsc --noEmit --incremental false: PR22 has 970 server errors; all-C has 969. Both client and shared are zero. Full type readiness remains Failed. Same npm test / vitest run command: PR22 427 passed/3 skipped in 50 files; all-C 546 passed/3 skipped in 58 files. Source compositions differ in 22 test/fixture files; the earlier 543 all-C count preceded three new B tests.

One local narrow run Failed because the reused builder retained expanded all-C data (15 reviewed declarations) against the narrow test expecting 4. Failed receipt retained. Replacing /app/data with exact PR22 data alongside source/tests/scripts repaired the harness; full 427/3 retest Worked. Independent GitHub run38148007474 at90e98ba passes verify, bundle-budget and container, reports 427/3 and client/global0/full970.

Earlier byte parity covers D compiler changes before B adoption. B intentionally changes falsy CodeToggle rendering; no unchanged-byte claim for B. No shared database actions or duplicate all-C integration/load runner. Evidence writing initially hit Windows default encoding and produced an empty file in aeca18f; corrected immediately using explicit UTF-8.
