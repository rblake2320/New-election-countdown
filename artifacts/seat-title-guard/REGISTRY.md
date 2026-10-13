# Candidate lesson (Part 5 capture)

Deduplication checked the engineering registry's existing target/field-parity
rules; no entry there describes the observed activity-prefix exception plus
exact full-base enforcement. This candidate does not alter global policy.

| id | title | rule | rationale | origin | scope | severity | enforcement | status |
|---|---|---|---|---|---|---|---|---|
| CAND-20261013-SEAT-VOLATILE-PREFIX | Preserve exact terminal identity across observed title animation | Normalize only explicitly observed activity prefixes and revalidate a fresh unique full normalized title plus HWND/PID/executable/class before every input and readback. | Literal animation titles refused the valid B seat; substring-only guards also accepted changed title bases. | Parent directive, before/after executable probes and native B ACK, 2026-10-13, ElectionTracker canonical seat helper | project:SelfConnect-seat-helper | required | artifacts/seat-title-guard/verify_title_guard.py and retained canonical-native ACK | candidate |
