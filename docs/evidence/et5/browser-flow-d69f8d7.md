# Independent Chrome acceptance: lane-b d69f8d7

Worked: the compiled production image with integrated A+C+D was exercised in Chrome at 127.0.0.1:5069 against a fresh disposable PostgreSQL database.

Watch Alabama -> Sign Up -> Create Account -> preferences steps 1, 2, 3 -> Next displayed step 4, Notifications & Privacy. Before Complete Setup, the server recorded zero POST /api/user/preferences/onboarding requests and PostgreSQL contained zero user_preferences rows.

On step 4, Opt Out of Analytics was enabled and Election Reminder Alerts disabled. Clicking Complete Setup produced exactly one onboarding POST, HTTP 200 in 17 ms. PostgreSQL independently returned state AL and analytics_opt_out=true. Completion copy read Ready to explore elections / Taking you back now, with no dashboard claim.

The browser returned to / (the preserved returnTo), displayed Added to Watchlist and 1 saved election, and marked the Alabama card Watching. PostgreSQL confirmed one watchlist row and one distinct election. This closes the step-three implicit-submit regression observed at d25246f.

Integrated unit suite: 168 passed, 3 skipped, 15 test files passed. Runtime smoke: /, /api/health, /api/elections all HTTP 200; 537 unique elections. Image: sha256:84381b7ce51421968b26528927cef89f2bba665a7cdd42017030dbacc30ce8bc.

Only synthetic data was written to the isolated test database. Harness completed and removed its disposable containers/network. Raw local receipts: test-results/b-d69f8d7-browser and test-results/b-d69f8d7-unit.txt. This acceptance covers the registration/preferences/Watch journey; global production release gates remain tracked separately.
