# Lane B UX snapshots — 2026-10-11

Branch `lane-b/client-ux`, captured with Playwright Chromium against the local dev
server and the real (read-only) elections database. Captures were rejected
automatically if the page was a rate-limit error.

| File | View |
|---|---|
| `home-desktop.png` | Home at 1280×900: nav, filters column, Featured (upcoming only), countdown |
| `home-mobile.png` | Home at 390×844: menu drawer button, search, results-first |
| `filters-drawer-mobile.png` | Mobile filter drawer (codes sent to the API, labels shown) |
| `list-view-desktop.png` | List view, now virtualized (ET-26) |
| `election-detail-desktop.png` / `-mobile.png` | Detail page: phase badge + countdown on shared timing (labelled when poll hours are unpublished) |
| `candidate-profile-desktop.png` | Candidate profile: editorial summary with source label, honest provenance |

Known open items from the owner UX review (Jira ET-28 … ET-32): search/filters above
Featured on mobile, URL-backed state for Back/Trends, voter-first discovery.
