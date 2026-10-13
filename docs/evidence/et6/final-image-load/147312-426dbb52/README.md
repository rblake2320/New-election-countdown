# Final-image workload retake — Worked

Exact production image: `sha256:4fd2c2f8427c1271b3502824dce782006257b0f77a3d88524ecc936867f403f1`.
Builder: `sha256:1b0a3a14c046439e9ffccd359e912ec5fa765e00f98a4e64c77323d50498ff6c`.
Source-only seven-table digest before/after: `769c35bb4b850257f9409ee567da95e00b271855d510cbb0015e8557e431f93a`.

Existing `scripts/test-et6-load.mjs` unchanged: ten real container clients/IPs, direct internal HTTP to shipped entrypoint,20 then40 aggregate RPS,60 seconds each. Traffic mixes full506-race batch200, conditional304, and election2 detail200. Five-second timeout,100ms maximum scheduling lateness, p95 acceptance<=2000ms unchanged. No browser traffic or outside requests participated.

| RPS | Valid/scheduled | 200 /304 | Missed/timeouts/429/5xx | p95 ms | p99 ms |
|---|---|---|---|---|---|
|20|1200/1200|800/400|0/0/0/0|27.893|40.263|
|40|2400/2400|1600/800|0/0/0/0|23.584|30.908|

Baseline506 races; all source rows unchanged after load. All ten clients, app, PG, restore container and internal network removed. No host ports or shared DB access; existing5094 remained healthy and untouched. No extra full-unit/browser run. Older7495 load measurements remain a separate receipt; these numbers apply only to this final-image workload and fixture.

`executed-wrapper.mjs` retains the actual supervisor used (240-second child deadline, not reached). A review found that forcibly killing the child could preempt its cleanup; the reusable wrapper now waits for the existing load harness's independently bounded operations and finally cleanup instead. No timed workload code, limits, source data, image, or running test changed.
