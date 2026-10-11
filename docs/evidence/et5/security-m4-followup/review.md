# PR14 unavailable-vault receiving retest

TRAINING_OR_ENGINEERING_USE_ONLY

Worked: owner fix 448a6bc0875c8fea035f983e0e288a1f5f66c71b merged into receiving afcf3ad0c77ad9be6002f1cd58387e537a13797e. Production build succeeded in electiontracker:security-m4-followup-builder, image sha256:feb9706d9615f1af4cd094a31961cce0cf86d05c27b356b91b1909e8e04af44d. Full unit suite: 332 passed, 3 skipped across 36 files.

The actual initialize route handler with the actual unavailable service now returns 503, vault_unconfigured, the fixed configuration message, and vault.ready=false. This closes the false-success scenario found at M4. The original receiving test initially differed only because the fix added reason/vault fields; the expectation now asserts those exact fields too. The unchanged revised test was run against the prior M4 builder: it still FAILED on old 200 success, then PASSED as part of the repaired full suite. This demonstrates a behavioral regression rather than an expectation that merely matches both versions.

Evidence: build.log, unit.log, old-image-red.log and initial-receiving.log. This pass used isolated ordinary unit/route contracts and the production build. The earlier M4 compiled private database acceptance remains in ../security-m4/container/receipt.json; it was not rerun for this response-only follow-up. No external callbacks, security probes, shared database changes or Fabel worktree edits occurred.
