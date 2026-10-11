---
target: ElectionTracker current UI UX performance
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-10-11T12-32-33Z
slug: client-src-pages-home-tsx
---
# ElectionTracker usability, flow and performance review

Method: dual-agent (A: /root/orange_review; B: /root/blue_green_review), plus root receiving flows and independent publisher research by /root/yellow_review. Reviewed 2026-10-11. Rendered target: current merged main `426c709`, compiled private PostgreSQL preview at the owner's specified `http://127.0.0.1:5079/`. Desktop 1366x900 and mobile 390x844. Pending lane-B `0968cfd` was inspected separately in source, not presented as shipped behavior. No application code or shared database was changed.

## Verdict

The site has a useful foundation, but its present flow and efficiency are not excellent. The consistent dark palette, meaningful race/date labels, honest unpublished-poll-hours caveat, skippable onboarding and visible validation are strengths. The primary task is obscured by repeated featured cards, competing discovery tools and secondary controls. Ordinary browsing exposed request-volume and error-state defects that matter more than adopting another framework.

The independent visual assessment scored 23/40. After combining the observed loss of search state on Back and false Not Found response under rate limiting, the synthesis scores 20/40 below. This is a heuristic review score, not a measured conversion rate, accessibility certification or performance percentile.

| Heuristic | Score /4 | Main observation |
|---|---:|---|
| System status | 3 | Countdown and result count visible; scope labels conflict |
| Real-world match | 2 | Voter task secondary; View Trends lands on Overview |
| Control and freedom | 2 | Back loses the typed Alaska search |
| Consistency | 2 | Titles, Details and Trends use different navigation behavior |
| Error prevention | 2 | All Time / Upcoming and maintenance wording confuse scope |
| Recognition | 2 | Mobile filters below three long featured cards |
| Efficiency | 2 | Duplicate cards, nested scrolling and expensive List mode |
| Minimalist design | 2 | Too many nested panels and uneven internal card space |
| Error recovery | 1 | Existing election presented as Not Found after HTTP 429 |
| Help | 2 | Useful tour; weaker contextual source/scope explanations |
| Total | 20/40 | Targeted production pass required |

## Prioritized team findings

| Priority | Finding and evidence | Owner | Acceptance |
|---|---|---|---|
| P1 | List mode mounts all 506 races. During the three-reviewer ordinary browser session, request fanout coincided with many 429s. This is not a one-user load benchmark. Keep API protection; remove unnecessary client work first. | Opus + Fabel; Astra measures | Virtualize List as Grid is virtualized; batch or defer candidate reads; bound initial request count independently of total races; run normal browse/filter/detail in two tabs with zero 429s and no offscreen fetch storm. |
| P1 | `/elections/2` rendered Election Not Found while server logs showed its browser request returned 429. An ordinary direct API read returned 200 with that election. Screenshot retained. | Opus + Fabel | Distinguish 404, retryable failure and rate limiting; show honest recovery/retry status; preserve the last useful result. Receiving tests must exercise the real page, not only HTTP endpoints. |
| P1 | Mobile first viewport is dominated by the first featured card; filters follow three long cards. Grid/List toolbar clips at narrow widths. | Opus | Search/state/filter entry and current result scope visible before featured content; no horizontal clipping at 320/390 widths, keyboard and touch usable. |
| P1 | Alaska governor card displayed Dan Sullivan/Mary Peltola Senate bios in the current main preview, although its detail API reports zero candidates. This describes current main; pending C roster work must be assessed separately. | Sol + Fabel; Opus receiving | Exact race/office association; never substitute state-wide candidates for an empty race; empty/unknown provenance remains explicit. Check main plus the proposed FEC/nominee stack before shared apply. |
| P2 | Alaska search returned two results, but browser Back from detail reset it to 506. View Trends opens Overview. All Time appears alongside Upcoming. | Opus | URL-backed search/filter/view/tab state; Back restores scope and scroll; Trends selects trends; heading/count/timeframe describe the same query. |
| P2 | Cards have large unequal blank spaces, repeat the same countdown and duplicate featured/list content. Several search tools and a Find All Missing Elections button compete with the voter task. | Opus | One clear primary discovery path; compact aligned card anatomy; move operational actions into the appropriate operator surface; retain honest source caveats. |
| P2 | Mobile AX review found visually labeled checkboxes without exposed names. Some semantics are already addressed in pending lane B, so do not duplicate that implementation. | Opus | Render latest branch and verify unique control IDs, label association, named checked state, focus and keyboard interaction in the actual drawer. |

The first-time voter faces too many equal-priority discovery choices; the mobile voter must scroll before narrowing races; the keyboard user needs unambiguous names and restored navigation context. Political Party exposes six choices alongside several other groups. Progressive disclosure should make State/Search/Upcoming primary and advanced choices optional, not remove legitimate filter capability.

## Relevant advances released in the last five months

Window: 2026-05-11 through 2026-10-11. Sources and exact compatibility/acceptance details are in `ux-review-tech-research.md`.

1. **Adopt current SPA performance diagnostics first.** September 22 Chrome DevTools updates add soft-navigation analysis and calibrated CPU controls. Measure cold entry, filter/list transitions and Watch/auth/return journeys; ordinary reload-only scores miss these interactions. [Publisher](https://developer.chrome.com/blog/new-in-devtools-october-2026/).
2. **Keep Tailwind 4 as the isolated ET-25 decision.** The July 16 version 4.3.3 release is within the window; the v4 architecture is older. Opus owns the migration. Its browser floor changes compatibility, and removing build-time findings is not evidence of faster user interactions. Preserve the owner decision on older browsers. [Release](https://github.com/tailwindlabs/tailwindcss/releases/tag/v4.3.3), [compatibility](https://tailwindcss.com/docs/upgrade-guide).
3. **Pilot React 19.3 transitions later.** September 9 stabilized ViewTransition/Fragment refs. This can improve visual continuity, but requires a React migration and measured dependency/accessibility checks. Reduced motion and immediate response come first. [Publisher](https://react.dev/blog/2026/09/09/react-19-3).
4. **Evaluate native select progressively.** Safari 27's September 17 customizable-select work makes a simple native state filter worth a small cross-browser experiment, retaining ordinary select fallback. Do not replace working rich controls merely for novelty. [Publisher](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/).
5. **Separate development speed from site speed.** Vite 8.1's June 23 experimental bundled dev mode may improve developer reloads; the current Vite 8.3.4 stack already includes that feature family. It is not a production performance upgrade by itself. [Publisher](https://vite.dev/blog/announcing-vite8-1).

Existing Grid virtualization, shared countdown clocks and chart splitting should be retained. Duplicate font declarations and long detail sections deserve measurement before adding another library. The detector reported one stylistic warning on pending lane B; that rule is advisory and is not a functional defect or accessibility measurement.

## Evidence and next gate

Worked: desktop/mobile rendering, Alaska search, signed-out Watch to auth, empty-sign-in validation, truthful polling empty state. Failed: coordinated ordinary List/detail browsing encountered 429s and false Not Found; search state lost on Back; narrow layout observations above. Review screenshots, scoped request counts and independent reports are retained alongside this file.

No LCP/INP/CLS field percentile or maximum-user-capacity claim is made. The next performance gate belongs to Astra: reproducible compiled desktop/constrained-mobile journey traces after request fanout repair, then field measurements by device segment. Targets remain p75 LCP <=2.5s, INP <=200ms, CLS <=0.1; lab and field results must be labeled separately. The five-minute private preview was stopped and its owned resources cleaned up after review.

First critique for this snapshot; no historical score trend. Product decision for the design team: make the default answer either 'my races' or 'national overview' explicit. Recommended next work is the existing ET-3/ET-5/ET-9 owner lanes, with ET-25 preserved for the browser-support decision. No parallel redesign or framework rewrite was started.
