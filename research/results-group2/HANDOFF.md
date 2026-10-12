# Restart checkpoint

Owner restart/monitor hold received; research/fetching stopped. No automatic browser or native capture resume.

17-state inventory and independent recordings are complete for the assigned bounded source survey. Offline count/hash verification succeeded. Public-access blockers remain explicit, as recorded in REPORT.md and INVENTORY-17-states.json. No app/DB/provider credentials or display changes.

## Hash-binding repair

Initial source commit `424a41e` retains the observed red: `finalize-inventory.py` rewrote response JSON dictionaries while pruning metadata, so LA/ND response file hashes no longer matched original source SHA evidence. Counts and parsed objects remained unchanged. The metadata sanitizer now skips response dictionaries.

Before the owner stop, nine actual bodies were fetched again: **all nine raw SHA values matched the earlier source SHA exactly and all parsed objects matched**. Original body bytes were restored to their original `.json` filenames. Additional exact raw bytes and fresh status/time/hash proof are retained:

* `LA-Jun27-races.raw.json`, `LA-Jun27-votes.raw.json`
* `LA-Nov3-races.raw.json`, `LA-Nov3-votes.raw.json`
* `ND-results346.raw.json`, `ND-results348.raw.json`
* `ND-contests346.raw.json`, `ND-election346.raw.json`, `ND-election348.raw.json`

Each has a matching `<name>-raw-proof.json`. Offline verifier explicitly checks all nine raw-byte hashes, equality with original-path recordings and earlier-source match flags. Non-vote portal configuration/date copies are documented as JSON formatting transforms with separate recording hashes; they are semantic context, not falsely labelled original bytes.

Source-only owning branch: `lane-c/results-sources-group2`, worktree `C:/Users/techai/.codex/tmp/sol-results-sources-group2`. No merge required for app behavior. Root owns adapter implementation; hand it exact raw paths above and preserved historical dates/phases. Certified and real correction fixtures are separately listed in REPORT.md. Do not relabel them Nov. 3, 2026.
