# Independent Chrome retest: lane B a05a860

Integrated with lanes A+C+D in `astra/production-verification`; compiled
Node24/Vite8 production image, disposable PostgreSQL, loopback5059. Browser
interactions used real application endpoints and a synthetic example.test account.
No shared database or external email service used.

## Worked

- Home shows506upcoming elections, beginning with November3 Alabama. Featured
  cards now show November3 elections instead of the September Delaware primary.
- Signed-out navigation omits Admin and Data Tools; Portals starts collapsed.
- Signed-out Watch navigates to `/auth?returnTo=%2F`.
- Creating an account through the UI returns home and automatically saves the
  selected Alabama election. Sidebar shows1saved election; card says Watching.
- Full browser reload retains the session and the saved election.
- Sign Out -> Watch Alaska -> existing-account Sign In returns home and saves
  Alaska. Sidebar shows2saved elections; both cards say Watching.
- Independent PostgreSQL query confirms2watchlist rows and2distinct election IDs.

## Remaining observed defects

- Immediately after logout the sidebar correctly says Sign in, but cards retain
  the previous user's Watching state. Opus notified to clear user-scoped caches
  on logout and account changes.
- Registration says Create Account -> Set Preferences -> Complete, but successful
  creation immediately redirects home, skipping the displayed preference steps.
  Opus notified; preserve Watch intent while making onboarding progress truthful.
- Build reports duplicate `skip` keys in apiLimiter. Last predicate overrides the
  new mounted `/health` predicate. Fabel notified; static load success alone is
  not a health-quota acceptance test.

Onboarding promise edits and summary/profile mapping were still in progress and
were not included in a05a860. Mobile changes were not scored in this desktop run.

Updated judgment for this snapshot: overall6/10, functionality7/10, desktop
flow7/10, production readiness4/10. Typecheck and remaining release gates remain
open. Earlier scores describe the earlier snapshot, not this retested build.
