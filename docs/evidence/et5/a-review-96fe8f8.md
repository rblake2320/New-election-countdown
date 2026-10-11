# Lane A 96fe8f8 review: merge hold

Combined A96fe8f8+B4ad6a93+C932fb85+D passed GitHub verify, bundle-budget and container jobs in run38121097963 (draft integration PR6). Integrated unit suite:174 passed/3 skipped. The existing container smoke did not exercise the normal-user recommendations endpoint.

Expanded private-DB acceptance WORKED for registration, cookie-session /me with ordinary user role, and new-user dashboard with emailVerified=false. It FAILED on GET /api/recommendations with HTTP500. Source diagnosis: RecommendationService invokes getUserPreferences/getAllElections on the active storageFactory without those methods. Fabel owns the repair; a follow-up must test new accounts and saved preferences.

Source review also found server/routes/auth.ts logs email-verification tokens when SMTP is absent, including production. Requested removal or a development-only guard and focused regression. These two findings keep A review open.

The harness now has TEST_USER_FLOW=1. CI is expanded to run it and the listing and compiled timezone acceptances, so the known failing user flow becomes an enforced gate. This requires the C fixture script and B client fixes in the integrated branch. Individual lane D CI remains dependent on their merge.

No main merge, shared database mutation, or PR5 apply occurred. DraftPR6 is verification-only and must not be merged as a substitute for the agreed A-C-D-B sequence.
