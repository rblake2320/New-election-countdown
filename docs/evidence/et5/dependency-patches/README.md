# Targeted build dependency remediation candidate

TRAINING_OR_ENGINEERING_USE_ONLY

Base: origin/main 18f0357d4f35318c53d0bb34c9e8934a50ed5f88. Branch: lane-d/dependency-patches. No shared database or provider writes. Candidate is held for root review, not pushed.

Changed only dependency overrides and lock graph: postcss-selector-parser7.1.6 for its existing consumers; esbuild0.28.2 scoped under @esbuild-kit/core-utils. Lock retains all unrelated package versions. It updates one surviving node and removes24 obsolete nested parser/esbuild/platform package nodes. No runtime direct dependency version changed.

Worked:

- Fresh npm ci completes. Installed-tree receipt confirms actual parser7.1.6 and core-utils esbuild0.28.2 resolution, not merely override declarations.
- Audit12 ->5 affected nodes: seven moderate findings eliminated, five high development nodes remain via braces3.0.3/Tailwind3. Production audit remains zero. Remaining work is tracked in security-dependency-plan.md in the owning D lane; no full security closure claimed.
- Baseline and candidate production CSS are byte-identical: SHA256 9C86F41B6D8E4E5094513980CC4A98ECC304DDE33D25836F2B3B761827AD6414. Same source, Node/npm toolchain and command, separate clean baseline/candidate installs. baseline.css and both hash receipts retained.
- Full unit281 passed/3 skipped, build passes, entry bundle225872bytes below400000budget. Client/global type0; whole-project963 errors remains unchanged from integrated baseline.
- New production/builder images built. Real private PostgreSQL drizzle-kit TS-config load and schema push succeed. Production HTTP root/health/elections200;537 unique elections. Listing contract counts/membership match independent SQL (default507,upcoming506,next30506,federal470,D55,invalid400).
- All16 private FEC ingestion checks pass, including migration refusal/idempotence, atomic apply, repeat0, provenance preservation, rollback and concurrent identity handling.
- Private nominee gate reports skipped because base18f0357 lacks scripts/refresh_general_candidates.ts. Re-run the gate when composing with PR8; this report does not claim nominee integration acceptance.

Initial lockfile-only npm install retained stale nested esbuild despite the override. npm ls identified the invalid resolution. A fresh scratch resolution seeded from the existing lock (excluding only obsolete nested esbuild entries) repaired this without unrelated updates. An unseeded exploratory lock showed broad upgrades and was not adopted. Actual npm ci/audit/installed tree above use the adopted scoped lock.

An attempted recursive removal of the stale nested install was rejected by automatic command review with a generic policy reason; no deletion retry occurred. Fresh scratch resolution preserved the existing directories and provided a safer path.

Sources: parser patch behavior [publisher changelog](https://github.com/postcss/postcss-selector-parser/blob/main/CHANGELOG.md); esbuild fix [publisher advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99). Overrides cross the parent dependency ranges; the observed build/CSS/private migration results establish this candidate's tested compatibility for the checked base, not arbitrary downstream versions.
