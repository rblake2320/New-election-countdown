# Security engineering review and backup acceptance

TRAINING_OR_ENGINEERING_USE_ONLY

2026-10-11. Review reference: integrated snapshot `2afc7c4`. Jira tracking: [ET-22](https://rob47595-1791122756383.atlassian.net/browse/ET-22), child of ET-5. Orange, Yellow and Blue/Green completed defensive source/configuration reviews; detailed remediation records remain in the local team reports and Jira. This is not formal assurance or release approval.

Deployment and packaged backup repairs are in `da676e6` plus compatibility correction `a88a24e`; receiving integration is `66d07f1`. Both Compose variants now bind the app to loopback, require candidate signing/origin configuration, include healthchecks and persist backups on a dedicated local volume. Backup subprocesses use fixed argument arrays, a restricted process environment and sanitized errors. PostgreSQL 16 clients are included in the production image. Local backup persistence is not off-host recovery.

Worked: compiled administrator backup HTTP 200, restore into a fresh harness-owned private PostgreSQL database, all 85 public table digests matching, and application database query returning 537 elections. Latest receipt: `security-backup-restore-final.json`. Final focused regression 7/7 passed; integrated full suite before the parsing-only correction was 294 passed/3 skipped. Final client/global type boundary is 0 and full-project diagnostics remain 963 (no increase). Both image builds passed. Owning branch reconciled the team's main merge without conflict; its unit suite passed 281/3 and build passed (it lacks the integration-only PR8 suite).

Failed before repair: production image lacked pg_dump/pg_restore; alternate Compose failed seven of eight configuration checks. After repair all eight passed, including refusal for missing required configuration. Backup acceptance is now required by the compiled CI harness.

Open release work stays assigned in ET-22: server authorization and secret-management repairs, error/decision telemetry, shutdown handling, development dependency findings (12 affected nodes, runtime audit 0), supply-chain and full-project type gates. Shared database and deployment were not changed. Three peer seats received the review and owner assignments with SelfConnect delivery read-back.

PostgreSQL reference used for the client/archive contract: [pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html) and [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html). Actual compatibility was exercised by the private restore above.

Final CI: PR9 head019c95d, run38136575115 passed verify52s, bundle-budget18s and compiled container52s including required backup/restore. Result saved in Jira ET-22.
