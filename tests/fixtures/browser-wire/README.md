# Recorded browser-wire replay

This compact fixture is a projection of actual production-image receiving run 155624-654a31f1 at evidence commit `1fbc062e00c218f99a394f35b281ec04b8f97a9a` on astra/et6-final-production. It retains the four browser poll arrays and timelines, both controller fault/recovery timestamps, and the 24 exact matching timestamped server log lines. No generated browser observations, credentials, screenshots, source dataset, or browser binaries. JSON serialization changes formatting only. The loader pins the complete fixture SHA256 and Git preserves its bytes.

Original evidence: docs/evidence/et6/mixed-browser-internal/155624-654a31f1/ at that commit; B-independent-signoff.md records independent joins. Old run 146988 remains RED. WebKit browser200/server304 discrepancy is reproduced but its cause remains unproven.

Run from any working directory with Node 24: node <repo>/scripts/audit-mixed-browser-wire.mjs. CI also runs node --test scripts/verify-browser-wire.test.mjs (four actual replays plus 11 altered-evidence refusal controls). These are offline verifier regression checks, not a new browser/runtime/DB run or deployment clearance.
