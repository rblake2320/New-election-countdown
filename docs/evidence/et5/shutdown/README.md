# Graceful shutdown acceptance

Base main18f0357. One lifecycle owner now stops admissions, drains accepted HTTP requests and scheduled polling/storage work, then closes the database. Repeated signals reuse cleanup. Failure or an eight-second timeout exits nonzero. Polling status reflects actual scheduled timers.

Failed baseline: packaged process needed forced termination, 13,325ms exit137. An intermediate attempt exposed competing signal handlers closing the pool twice; those handlers were removed.

Worked final: compiled SIGTERM shutdown486ms, exit0 and completion recorded. Private normal registration/session/dashboard/recommendations/watchlist, and84-table backup/restore with matching digests/537 elections also passed. Full unit290passed/3skipped; production build passed; client/global types0 and whole-project963 unchanged. Nine new tests cover admitted HTTP completion, repeated signals, timeout/failure, asynchronous background startup, queue/poll/sync draining and timer cleanup. CI now requires the compiled shutdown gate.

Evidence records observed local results. The remaining963 legacy type diagnostics are an open release gate, not waived by this change. Shared database untouched.
