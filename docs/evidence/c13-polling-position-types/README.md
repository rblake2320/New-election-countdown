# Polling availability and position-cache receiving contracts

Owned production files: `server/polling-data-service.ts` and `server/position-aggregator-service.ts`. Base: 72cdbd9608b4dcccbe520be575d4d67aebe3b933. No compiler settings or other owners' production files were edited.

**Required dependency:** Lane A's cache API commit ececfb7cf1bf428657454418d215428038da24a2 must compose before this change. Its actual CacheService get/set are asynchronous, use namespaced keys and TTL **seconds**. C does not reimplement or edit that service. Verification used a separate physical checkout containing the owner commit plus the C patch; the C review branch contains only its owned source changes and tests.

The polling diagnostic at old line 186 was availability narrowing, not a date-freshness rule: the predicate returned an object/null instead of boolean. The typed guard returns boolean and narrows fulfilled non-null scrape values. Null/unavailable sources still return null polling, and older source/poll dates remain unchanged; no age cutoff or invented facts were added. The original predicate was independently extracted and executed: null/fresh/older controls returned object values, while rejected returned false.

Position cache reads are treated as unknown and checked for the actual position/source shape, valid recorded dates, finite confidence and matching candidate identity. Malformed or cross-candidate cache data raises an explicit error rather than returning empty success. A real empty result for an existing candidate is cached honestly. One-hour TTL remains 3600 seconds. No casts or non-null assertions were added.

Verification:

| Check | Result |
| --- | --- |
| Original strict process-flag baseline at 72c | 972 global / 3 owned diagnostics |
| Owner cache API, before C patch | 969 global / 2 owned diagnostics |
| Same owner API composition, after C patch | 967 global / **0 owned** diagnostics |
| Same targeted tests before C | 7 passed / 5 failed; malformed cache and wrong-candidate cache exposures reproduced |
| Targeted offline tests after C | **12 passed** |
| Full unit/component suite | **441 passed / 3 existing skips** |
| Build | **exit 0**, fresh client/server artifacts |

Typecheck command: `node node_modules/typescript/bin/tsc --noEmit --incremental false --strictNullChecks true --target ES2022`. No flags were loosened and no repository config was changed. Both verification installs were physical npm ci, not junctions. Tests block live providers and stub database access; no browser or live DB/provider run occurred. The repository's server boot/probe rule is superseded here by the parent's explicit offline/no-DB scope.

`acceptance-receipt.json` pins dependency/source/test hashes and exact diagnostic deltas. Other JSON files retain red/green tests and build exit. The unchanged unrelated 967-error full gate remains owned by the team's other packets; this change makes no whole-product readiness claim.
