# Astra independent functionality and flow review — 2026-10-11

**Overall: 5/10. Functionality: 6/10. User flow: 5/10. Production readiness: 3/10.**
These are engineering judgments, not percentages of tests passed. This is a
release-blocking assessment of the tested snapshot, not a rating of unfinished
changes in another seat's working directory.

## Tested snapshot and method

Disposable PostgreSQL and compiled Node24 production images; integrated lane D
at a51e9d7, lane A fetched PR2, and lane B through 3af5590. Browser reviewed at
loopback port5059 against that private database. Sol's C4/C5 receipt was inspected
separately; lane C and later lane B mobile commits were not in this browser image.
No shared database changes.

## Worked

- Real home render, election link to `/elections/32`, candidate modal, modal close,
  polling tab and return-home navigation worked in Chrome.
- Signed-out Watch showed an explicit sign-in-required message; it did not claim
  that an election was saved.
- Countdown explicitly labels missing polling hours. Polling tab says no data
  rather than drawing fabricated polls.
- Integrated Vite8 bundle gate passed: entry226345bytes against400000.
- Database stop/restart: readiness503/ok:false in5276ms; recovery200 in296ms.
  All537election rows preserved; home, health and election HTTP200 after recovery.

## Observed blockers and receiving owners

1. **Fabel + Astra:** nginx static/landing fixture at20RPS for60seconds returned
   999HTTP200 and201HTTP429 out of1200requests; p95=38ms. This is a bounded local
   workload, not a claimed production2x test. Global API quota consumes static
   traffic. Fabel owns server correction; Astra owns the repeated acceptance test.
2. **Opus + Sol:** a September15 Delaware primary is the first featured item and
   appears under Upcoming Elections on October11, while the card itself correctly
   says Election held. Upcoming selection/order must use the same timing policy.
3. **Opus + Sol:** homepage candidate summary contains a biography, but the same
   candidate's detail modal says Background Not Available and0%completion. The
   detail experience loses useful existing information; map summary/profile fields
   and distinguish missing data from unverified data.
4. **Opus:** onboarding promises live results and that all data is AI-validated;
   actual polling tab is empty, and the inspected candidate modal is Pending.
   Replace blanket claims with feature/data-specific states and provenance.
5. **Opus:** signed-out navigation exposes Admin, Data Steward, monitoring and
   multiple search tools alongside the core voter journey. Watch gives a toast
   but no direct sign-in/return-to-election action. Reduce distraction and preserve
   user intent through authentication. Backend authorization remains mandatory.
6. **Fabel:** combined unit suite136passed/3skipped/2failed. Both failures are old
   tests expecting the removed admin email/environment bypass. Replace their
   expectations with explicit denial; do not restore the bypass to make tests pass.

## Required next acceptance outcomes

- Zero429 for legitimate landing/static traffic through nginx at the agreed
  load; API limits separately verified against expected visitor/request mix.
- Upcoming list excludes past elections; history remains deliberately accessible.
- Election-to-candidate flow preserves available fields and displays provenance.
- Signed-out watch -> sign-in -> original election -> saved watchlist round trip.
- Combined A+B+C+D unit/build/browser gates; no separate-lane green substituted
  for integrated behavior. Production typecheck, migrations/restore, full browser
  execution, capacity and soak remain release gates in ET-5.

Evidence: `integrated-outage.json`, `proxy-load-red.json`, and live Chrome
accessibility observations retained in the session. Runtime recovery handling was
checked against https://node-postgres.com/apis/pool ; Docker healthcheck behavior
against https://docs.docker.com/reference/dockerfile/#healthcheck .
