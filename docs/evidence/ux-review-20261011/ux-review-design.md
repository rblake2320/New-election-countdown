# Assessment A — independent visual design review

Method: independent Assessment A subagent /root/orange_review; no detector output seen. Parent owns Assessment B and synthesis. Impeccable critique reference used. Review date 2026-10-11. Mode: Operate/Read. Stable target client/src/pages/home.tsx and rendered race/auth routes, main 426c7095b900795c8e6fdc3a18e58f123a584a9e. Private compiled preview http://127.0.0.1:5079, worktree D:/projects/et-wt/astra-ux-review, no shared database writes.

## Verdict

The visual language is recognizably an election monitoring product: race names, geographic context, candidate snippets and truthful countdown caveats establish its purpose. However, the composition still behaves like a dashboard assembled from several equal-priority widgets. A first-time voter needs one clear answer to 'which races matter to me?'; the page instead leads with three nationally ordered featured races, a large cycle selector, a second list repeating those races, and several search concepts. This is a coherent dark interface, but its task hierarchy needs another production pass.

Desktop inspected at 1366x900, mobile at 390x844, plus native browser size. Screenshot scaling is not a measured font/contrast verdict. Tested dismissing welcome tour, opening mobile filters, Watch -> sign-in, empty sign-in validation, View Trends -> race route, and Polling Trends empty state. Browser screenshots retained in ux-preview/. No account was created and no location was submitted.

## Nielsen score (higher is better)

| Heuristic | Score /4 | Observed basis |
|---|---:|---|
| Visibility of system status | 3 | Live countdown, result count and poll-hours caveat are visible; count '506 of 537' alongside All Time versus Upcoming is confusing. |
| Match with real world | 2 | Real race/date/candidate labels work. 'View Trends' opens Overview, while local-voter discovery is secondary to national featured races. |
| User control and freedom | 3 | Tour can be skipped; filters have Clear; race has Back; browser Back restores browsing. Full account recovery not assessed. |
| Consistency and standards | 2 | Card system and colors are coherent; Details opens a dialog while title/View Trends navigate, and the latter does not select trends. |
| Error prevention | 2 | Typed filter choices and sign-in validation help; ambiguous timeframe/default labels and operational 'Find All Missing Elections' wording invite mistaken expectations. |
| Recognition rather than recall | 2 | Desktop filter labels are visible. Mobile filters sit after three long featured cards; drawer checkbox names were missing in the AX snapshot although visual labels were present. |
| Flexibility and efficiency | 2 | Grid/list and multiple filters exist, but duplicate featured/content cards and nested scrolling slow scanning; mobile toolbar is cramped. |
| Aesthetic and minimalist design | 2 | Clear dark palette and section headings; excessive nested panels, repeated countdown blocks and unequal internal card gaps compete with the facts. |
| Error recovery | 3 | Empty sign-in surfaced actionable email/password errors and focused email; polling empty state is honest. No broad outage/recovery claim. |
| Help and documentation | 2 | Skippable tour explains sources/countdowns. Contextual explanation of date scope, candidate coverage and multiple search tools is weaker at the actual decision points. |
| Total | **23/40** | **Acceptable: significant targeted improvements needed** |

These scores describe the inspected signed-out browsing experience, not production security/reliability or every authenticated workflow.

## Three strengths

1. Trust-preserving facts: countdown explicitly says 'until Election Day' when poll hours are unpublished; no fabricated polling chart appears in the inspected empty polling tab.
2. Consistent visual vocabulary: navy background, blue action emphasis, outlined panels and recurring card anatomy make the interface recognizable across entry, filters and race detail.
3. Basic recovery and escape are visible: tour Skip, filter Clear, race Back, and specific inline sign-in validation prevent common dead ends.

## Five priorities

1. **P1 — Put mobile race selection before the featured stack.** At 390x844 the first viewport contains one long Alabama card. Filters and the Upcoming heading appear only after all three featured cards (two large downward scrolls in the review). The upcoming toolbar also crowds the title/count and places List beyond the visible right edge. Move Search/State/Filters and the result scope to a compact top region; place featured content after the primary filtered list or use a compact strip. Acceptance: first mobile viewport exposes filter entry and result scope; all Grid/List/Filters controls fit without horizontal scrolling at 320/390 widths.
2. **P1 — Resolve scope and labeling conflicts.** Main default presents Time Range 'All Time' while the main heading says Upcoming Elections and displays 506 of 537. The header search, Voter Information Lookup, AI Election Search and Local Election Search add competing discovery choices; the latter also offers 'Find All Missing Elections (2025-2026)' to signed-out users. Make one primary voter discovery path and name the displayed scope exactly. Keep administrative repair concepts out of voter decision flow. Acceptance: a first-time user can explain the current date/state scope and choose one primary search action without reading a tour.
3. **P2 — Simplify card hierarchy and align information, not just outer height.** The equal-height featured cards leave large varying blank areas between title/date, countdown and candidates; empty Alabama and populated Alaska have different visual rhythms. Every card repeats a large seconds-level countdown and multiple lower actions. Use aligned compact metadata rows; emphasize the race and next relevant date, with candidate coverage as a secondary factual status. Acceptance: scan three cards without having to hunt for date/candidate/action positions; missing candidates get explicit coverage copy rather than simply disappearing.
4. **P2 — Match action labels to destinations.** Actual View Trends click on Alabama navigated to /elections/1 with Overview selected; user must select Polling Trends separately. Details instead opens a dialog. Deep-link View Trends to its tab, and distinguish quick details from full race page. Acceptance: each card action lands on what its label promises; empty polling state retains the truthful no-data explanation.
5. **P2 — Finish mobile filter accessibility and touch review.** Mobile drawer visually labels options, but its checkbox entries lacked accessible descriptions in the observed AX tree whereas desktop had named checkboxes. The drawer duplicates the Filters title in AX and shows many tightly stacked choices. Investigate duplicate control IDs from hidden desktop plus mobile copies, bind names uniquely, and enlarge row tap targets. Acceptance: keyboard/screen-reader users hear each checkbox name/state unambiguously; complete filter rows are comfortable tap targets. This is an observed naming discrepancy, not a completed assistive-technology certification.

## Cognitive load

Failures: weak single primary action; duplicated featured and upcoming race content; unnecessary nested box boundaries; competing discovery tools; mobile filtering below long informational content. A decision group with more than four simultaneously visible choices is Political Party (six). Desktop also exposes state, four election types, three government levels and timeframe together: individually familiar, collectively a large setup cost before viewing local races. Progressive disclosure should keep State/Upcoming/Search primary and reveal advanced party/type filters on demand. Do not remove useful controls merely to hit an arbitrary count.

## Emotional journey and personas

Jordan (first-time voter): tour reassures with source honesty, then homepage introduces several ways to search and nationally ordered races before 'my' ballot. Red flag: 'Find All Missing Elections' sounds like the voter is responsible for completing the dataset.

Casey (distracted mobile user): readable single-column card and sticky navigation are useful; getting to filters requires passing three long featured cards. Red flag: scrolling effort and clipped toolbar make a short lookup feel like browsing a report.

Sam (keyboard/assistive-tech user): visible labels and inline validation are strengths; mobile checkbox AX naming differs from desktop. Red flag: anonymous controls in a long filter drawer undermine confidence. Only AX inspection and the sign-in focus response were observed; no claim of full keyboard or screen-reader coverage.

The high point is an honest race/countdown view. The low point is searching for a local scope or opening View Trends only to land on Overview. A stronger ending would show a clear next step after a missing-data state: checked source/last update if available, and a direct route back to other races.

## Latest lane-B distinction

Rendered assessment is current main426c709, not unmerged lane-B. Source-only comparison against origin/lane-b/client-ux0968cfd shows nine changed client files: list/listitem semantics, State/Time range labels, hidden mobile Congress link correction, plain-text AI rendering/validated source links, roster provenance additions and related labels. These changes are positive planned corrections but were not rendered in this preview. They do not alter the featured-stack-first mobile composition, cramped main toolbar or View Trends destination in the inspected diff. Do not attribute old main defects already addressed by lane-B source to a failed lane-B retest.

## Evidence and operating record

Screenshots: ux-preview/desktop-home.png, mobile-home.png, mobile-filters.png, auth-empty.png, detail-polling.png. Own Chrome tab456101924; root flow tab separate. Viewport override reset after mobile inspection. Preview is harness-owned disposable PostgreSQL/app/network, loopback5079; exec session62397. Stop file D:/projects/et-wt/lane-d/docs/evidence/et5/ux-preview/browser-done triggers cleanup; maximum five minutes. Root/Assessment B still using preview at handoff, so final cleanup verification remains with parent before final synthesis. No implementation edits.

Question for the next design pass: should the default home answer 'What is on my ballot?' or 'What is happening nationally?' The present layout prioritizes the latter while its voter lookup tooling promises the former.
