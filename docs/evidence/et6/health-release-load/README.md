# Actual health-release production load — 2026-10-13

Target remained the root-owned `et6-prod-109656-3a740d1d-app` on its existing private network. Live image configuration and immutable ID were independently checked before and after: `sha256:dd9ede966d3704bd79353785cae270a919a293b993c78fd19b438ff3e01d8cc5`. No runtime replacement or database write occurred.

Receiving input is `receiving-input.json`; run `load-142312-68e287ba/receipt.json` and per-request JSONL retain actual results. Invocation: `node scripts/test-et6-load.mjs docs/evidence/et6/health-release-load/receiving-input.json`. Exit0, outcomeWorked, first attempt passed.

| Profile | Completed and valid | Missed / timeouts / 429 / 5xx | p95 | p99 |
| --- | ---: | --- | ---: | ---: |
| 20 RPS, 60 seconds | 1200/1200 | 0 / 0 / 0 / 0 | 53.867 ms | 81.513 ms |
| 40 RPS, 60 seconds | 2400/2400 | 0 / 0 / 0 / 0 | 19.881 ms | 25.847 ms |

10 real client containers/IPs; actual 506-election November3 batch. Mixed full batch, conditional304, and single-election reads. Status counts: 20RPS 800x200/400x304; 40RPS 1600x200/800x304. Every one of the ten workers made an explicit health request in its actual HTTP process before each timed phase; all returned200 before scheduled start. Warmup timing is retained per phase. The original 100ms lateness limit, 5-second request timeout, 2-second p95 limit and zero-error requirements were unchanged.

All ten owned load containers were removed after label checks. A post-run Docker check found none remaining; the application stayed running on the same image. Root noted that a few independent UI requests could occur during the profile. This is bounded 20/40RPS read evidence, not a replay/admission or broad capacity claim.
