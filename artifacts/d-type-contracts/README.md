# D type and backup contracts — 2026-10-13

TRAINING_OR_ENGINEERING_USE_ONLY

Base: `8c0f45af0490e0b0a341bce2b97c8878d420bb71`. Isolated branch: `astra/type-contracts`.

## Observed checks

- **Worked:** fresh nonincremental TypeScript changed from 186 to 105 diagnostics. All 81 assigned diagnostics in six D files are removed; the remaining diagnostics are identical by file, code and message to baseline. No compiler, package or schema changes.
- **Worked:** the behavioral regression run against four baseline services produced 13 failures; candidate passes all 14 tests. Baseline synthetic-drill behavior was excluded because its undeclared `node-cron` import prevents loading it; candidate drill refusal is exercised directly.
- **Worked:** full unit suite passed 821 tests in 92 files; production Vite/server/import builds exited zero. A final targeted rerun passed after adding the typed drill-unavailable code.
- **Worked:** real local file streams, gzip and AES-256-GCM round-trip through an intercepted S3 transport, including a fresh service instance with the same persistent key. Corrupt ciphertext, checksum mismatch, missing requested checksum and legacy encryption metadata all refuse restoration and preserve the existing destination. Restore staging directories are removed.
- **Worked:** runbook creation/lookup uses the string natural runbook key for steps; execution insertion keeps the numeric runbook key. The regression fixture enforces both distinct foreign-key contracts. This test uses no database.
- **Worked:** event metrics use existing aggregate columns, numeric strings, byte values and duration seconds. Email delivery goes through the actual notification queue API with scheduling/retry fields; queue acceptance does not increment delivered counters.

Raw outputs and exact source hashes are retained in this directory. `receipt.json` includes the remaining file counts. No shared database writes, deployment, provider deliveries or external S3 access occurred.

## Behavior changes and remaining capabilities

- S3 local encryption now requires a persistent 32-byte hex `BACKUP_ENCRYPTION_KEY`; it never invents a transient key. New encrypted objects use versioned AES-GCM metadata. Legacy CBC/password-format objects are explicitly refused and require a separately reviewed migration with the original key. The test transport is local; an actual external S3 acceptance run requires an approved isolated bucket and credentials.
- Track4 monitoring configuration now accepts the persisted schema (`name`, monitoring scope, `alertChannels`, `alertEmails`) instead of fields that never existed in storage. The mounted route is admin-only through `server/routes.ts:188`. Old `configurationName`/`alertRules`/`notificationChannels` request shapes now receive validation errors. No client source references this route.
- The Track4 simulation endpoint now returns HTTP 503 with `SYNTHETIC_EVENT_DISABLED`; it no longer writes invented production backup metrics.
- Event alerts support dashboard records and configured email queueing. SMS/webhook/Slack do not have a verified backup-specific recipient/transport contract and are not advertised as successful delivery. Existing aggregate monitoring catches unavailable channel errors without falsely increasing sent counters. Delivery receipt reconciliation to a backup alert remains unavailable.
- Generic backup integrity checks lack a byte reader and format-aware scanner. They return `VERIFIER_UNAVAILABLE`, never a fabricated checksum/corruption pass. Their failure alert describes unavailable verification, not proven corruption. S3 restore checks above perform actual byte authentication/checksum verification independently.
- Synthetic drill scheduling and failover/restore/validate/health/cleanup operations have no configured real executor. They now return/reject with `DRILL_ADAPTER_UNAVAILABLE`; no invented RTO/RPO or successful drill result is emitted. No server/client module imports this service. No failover or destructive recovery was attempted.
- Source search likewise found no application imports of the generic backup-monitoring, runbook-management or S3-backup service modules. Their repaired contracts do not imply that these recovery features are wired into the live product. Track4's existing `/health` route is a process response and does not test backup storage or restore readiness.

These unavailable admin recovery capabilities remain open product work, not a readiness pass. Root owns final integration and Jira status.

## Lesson candidate for the engineering registry

Schema mismatch diagnostics can expose fabricated operational success. Preserve distinct natural and surrogate foreign keys; validate decimal database contracts; never equate queue acceptance, sleeps, metadata presence or compiler success with delivery, restored bytes or completed recovery.
