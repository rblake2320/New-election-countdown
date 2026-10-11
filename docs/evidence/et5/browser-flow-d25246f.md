# Independent Chrome retest: d25246f

Production image built with A+C+D; fresh disposable PostgreSQL on loopback5069.

**Worked:** Watch Alabama -> Sign Up -> Create Account remained on
`/auth?returnTo=%2F` and displayed preferences step1. Selected Alabama, proceeded
through interests step2 and election types step3. After completion the browser
returned to `/`, showed Added to Watchlist and1saved election, and the card said
Watching. Independent database reads confirmed1watchlist row/1distinct election
and saved preference stateAL. This closes the child render-time redirect defect.

**Failed:** clicking Next on step3of4 immediately submitted
`POST /api/user/preferences/onboarding` (HTTP200) and displayed All Set. Step4
notification/privacy choices were never presented for review. Saved
analytics_opt_out was false (the default). The same conditional button switches
from type=button to type=submit at the last step; DOM reuse during the click is a
suspected cause, not yet confirmed by an isolated regression test. Opus received
the exact action sequence and requested guard/button-identity regression.

Completion copy still says redirecting to personalized dashboard even though the
requested return destination `/` works. The full preferences journey remains open
until step4 is shown and saving requires the explicit Complete Setup action.

Only a synthetic account and preferences were written to the private test DB.
