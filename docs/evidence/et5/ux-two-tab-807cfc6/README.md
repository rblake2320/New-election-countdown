# Two-tab ordinary browse acceptance — Worked

2026-10-11, Astra EC. Lane B 807cfc6712e99c4cc039010073b441f140385a43 composed with merged main 426c7095b900795c8e6fdc3a18e58f123a584a9e at 2707653ea5b82bd9bb306786d2cc03be62a854e4. Production Docker image, disposable isolated PostgreSQL (537 elections), Chrome at 1366x900, localhost:5079.

- Worked: both tabs opened List; each settled at 599 DOM elements, 3 mounted list rows/countdowns.
- Worked: tab 1 searched Alaska, opened Senate detail, Back restored `?q=Alaska&view=list` and search text. Trends opened `?tab=polling`, selecting Polling Trends and displaying the honest empty polling state.
- Worked: tab 2 filtered Federal (470 upcoming), scrolled, opened Colorado Senate detail, Back restored `?level=federal&view=list`, then switched to Grid retaining Federal.
- Worked: zero HTTP 429 across 87 logged requests over startup plus this ordinary two-tab session. Statuses: 66x200, 17x304, 2x401 anonymous auth/me, 2x404 general-candidates. No rate-limit increase was applied.
- The two general-candidates 404s are an integration dependency: this composition has no C8 roster route; useGeneralRoster explicitly handles a missing route as null. Election detail pages rendered successfully. This receipt does not clear the pending C8 composed roster acceptance; retain the actual FEC-first + proof-refresh gate.
- Production image and builder build succeeded. Unit suite: 357 passed, 3 skipped, 44 files.
- Harness exited 0 and removed its app/database containers. Shared DB untouched. Temporary browser viewport reset.

The whole-session request count includes initial wide-viewport Grid rendering and navigation. It is not a claim of only 3 candidate requests for the entire session. DOM measurement is this fixture/viewport, not a replication of Opus's 834-element measurement. Tailwind 4 branch is not included.

Evidence: browser.json (UI measurements and navigation), requests.json (method/path/status/server handler time only), container.json (image/fixture receipt), trends.jpg (visible receiving page). Full local build/unit output retained under test-results/ux-retest/.
