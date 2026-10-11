# Assessment B — efficiency, performance and detector evidence

Independent Assessment B (/root/blue_green_review); Assessment A findings were not consumed. Target: client/src/pages/home.tsx and representative cards/grid/layout. Source lane-b0968cfdb; initial origin/mainedcfe91, live preview main426c709. Read-only review; no implementation changes. No production readiness claim.

## Measured browser outcomes

Own fresh Chrome tab456101930 on private preview127.0.0.1:5079. Default grid showed506 elections and mounted15 timer elements (3 featured +12 grid),30 election links and1,796 DOM elements. A normal List click changed that to509 timers (3 featured +506 list),1,018 election links and45,283 DOM elements: about25x the DOM footprint. This is direct read-only browser DOM evidence, not an estimated render latency.

Subsequent ordinary search displayed Unable to Load Elections. A normal HTTP read of /api/elections?timeframe=upcoming&search=zzzz-no-election-match returned429, body Too many API requests/retryAfter1minute. The preview was shared with other reviewers; this review does not attribute every request or rate-limit hit solely to its tab. Parent captured aggregate request-outcomes.json separately. Our late docker-log read found the already-removed preview container, so no aggregate counts are claimed here.

Source explains the fan-out: home.tsx414 maps every result in list mode, while ElectionGrid.tsx17 virtualizes only grid mode. election-card.tsx91 calls useCandidates for each mounted election; use-elections.tsx58-72 starts one fetch per distinct candidate query. Cache deduplicates duplicate featured cards, but does not cap distinct races. The list had506 distinct election cards in addition to3 featured copies. One shared1-second clock is good, but509 timer subscribers still render on each tick.

Browser screenshot captured the desktop layout in the tool transcript: tall featured cards, substantial interior whitespace for missing candidates, duplication of the same first races in featured/grid, and nested page/grid scrollbars. Screenshot is ordinary browser evidence; no detector overlay exists. Read-only evaluation cannot perform the required mutable overlay injection. Performance Navigation/Resource API was unavailable in the scoped evaluator, so no LCP/INP/load-time measurements are claimed.

## Prioritized issues and acceptance criteria

1. **P1 measured — List mode makes ordinary browsing expensive enough to coincide with API429 failures.** Files home.tsx414, election-card.tsx91, ElectionGrid.tsx17. Virtualize list mode too; eliminate per-card candidate reads by a bounded batch/summary contract or fetch only visible cards. Keep real data and explicit unavailable states. Acceptance:506-row List renders a bounded visible-card count, navigating/searching still succeeds under existing API budgets, request counts are recorded and no normal-use429s occur. Preserve keyboard traversal and browser-find limitations explicitly when selecting virtualization versus pagination. Do not repair this by merely raising the server limiter.

2. **P1 source-confirmed error classification — detail errors masquerade as missing election.** election-details.tsx41-47 discards query errors; line78 shows Election Not Found whenever election is absent. use-elections.tsx46-48 discards HTTP status into generic Error. Root independently saw valid detail HTTP200 while UI rendered NotFound during429 pressure. Preserve structured status and show retry/rate-limited/service-unavailable separately from genuine404. Candidate fetch failures must not become zero candidates. Acceptance: ordinary controlled query failures404,429,503 receive distinct UI; retry recovers without replacing the entire app or inventing data.

3. **P2 source-confirmed — search refetches each keystroke and invalidates all election cache entries.** home.tsx89-98 updates searchQuery then invalidates ['/api/elections']; use-elections query key already includes filters, and its queryFn ignores AbortSignal. This can refetch the old active key plus fetch the new key while obsolete requests continue. Add bounded debounce, pass signal to fetch, and use key changes for fetching rather than broad invalidation. Acceptance: entering a10-character search normally results in one settled search fetch (with an explicit debounce threshold), canceled stale requests cannot overwrite results, and switching filters reuses still-fresh matching cache.

4. **P2 source-confirmed — empty search recovery does not clear active search.** home.tsx398-408 Clear All Filters resets stored filters.search but query input lives separately in searchQuery (line49), consumed atline64. Therefore a no-match search remains active after the button's handler. Browser empty-state verification was interrupted by the observed429, so classify this as code-confirmed handler mismatch, not a completed live clear-button test. Acceptance: no-match search -> Clear All Filters resets visible input and result query; results return.

5. **P2 source-confirmed — result/detail freshness is indefinite without a user-visible refresh route.** queryClient.ts default staleTimeInfinity; useElection inherits it. useCandidates has1-hour staleTime with refetchOnMount/windowFocus bothfalse; useElectionResults has10-minute staleTime but all scheduled/focus/mount refetch disabled. Staleness alone triggers no update. For election-night viewing, use a bounded phase-aware refresh and visible last-updated indicator; pause background polling when appropriate. Acceptance: a controlled upstream result change reaches the active detail view within the stated refresh interval without reload; offline/provider failure retains timestamp and honest stale status.

## Strengths retained

App.tsx lazy-loads non-home routes, including detail/admin pages. use-now.ts shares one timer per interval and cleans unused timers. use-countdown.tsx memoizes timezone schedule calculation. Default grid virtualizes. Candidate/detail fetches are query-key cached; expensive card analysis waits for Details. Preserve these improvements while fixing List and request semantics.

## Deterministic scan

One bundled detect.mjs invocation over home.tsx, election-card.tsx, ElectionGrid.tsx, countdown-timer.tsx and modern-layout.tsx. JSON retained in ux-assessment-b-detector.json. Result: **1 warning**, rule border-accent-on-rounded, election-card.tsx536. This is a **false positive**: the matched rounded border-b-2 element is an animated loading spinner, not a decorative card accent. CLI emitted valid JSON and exit1 on this installed version (reference documents findings exit2); findings were consumed once, not rerun. No independent design defect should be filed for this spinner.

## Evidence files

ux-assessment-b-detector.json: exact CLI result.
ux-assessment-b-measurements.json: own DOM counts, observed429 and evidence boundaries.
This report: ux-review-performance.md.

No source edits, data writes, DOM/script injection, paid provider calls or new background service. Parent owns final synthesis/Jira and coordinated Opus/Sol implementation.
