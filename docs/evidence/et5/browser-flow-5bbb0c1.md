# Independent Chrome retest: 5bbb0c1

Compiled production image with A+C+D, private disposable PostgreSQL, loopback5069.
Port5059 was occupied; the harness refused it and cleaned its test resources.
The retry used5069 and did not disturb the existing service.

- **Worked — logout cache:** selected Watch, created a synthetic account, then
  navigated home to establish one saved election. After Sign Out, the complete
  accessibility tree contained0Watching buttons,19Watch buttons, and the signed-out
  watchlist prompt. The previous stale-card defect is fixed in this run.
- **Failed — registration/preferences:** Watch -> `/auth?returnTo=%2F` -> Sign Up
  -> Create Account immediately navigated to `/dashboard`. Preferences and Complete
  were skipped. `OnboardingFlow` still calls `setLocation('/dashboard')` during
  render whenever authenticated; its completion handlers also override onComplete
  with an unconditional dashboard redirect. Sent exact component cause to Opus.
- **Failed — new-user dashboard:** displayed Failed to load dashboard data.
  Actual GET `/api/auth/dashboard` returned500. Server Zod validation rejected
  null firstName and lastName where optional strings were expected. Sent to Fabel.
- Revised welcome text describes published poll hours and checkable sources;
  the previous blanket live/AI-validation promises were absent from its first step.
- Integrated unit suite165passed/3skipped. This does not override the failed
  browser registration acceptance result above.

Only synthetic users were written to the disposable database. No shared DB writes.
