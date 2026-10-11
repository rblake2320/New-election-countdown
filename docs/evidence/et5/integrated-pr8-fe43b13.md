# PR8 final approved CLI compiled acceptance

Snapshot2afc7c4 includes PR7ad9822c, PR8fe43b13 (core838b2e2), C3d8daa0b, Bbe01427 and the earlier integration receiving fixes. All compiled private-DB gates passed locally.

New receiving checks exercise the compiled CLI against the real private database: a file obstructing the receipt directory caused a receipt-directory-stage refusal before audit/candidate changes; a normal repeat apply returned applied status with a real committed audit ID and zero candidate/source changes. These checks use no shared database and no VM substitute for the importer.

The same run passed506 elections x6 poll metadata comparisons (3036 matches/0 mismatches), dry-run/rollback/idempotence, FEC16 checks and259 official roster records across91 compiled production HTTP endpoints. Prior fresh unit/type checks remain287 passed/3 skipped, client0/full963; final GitHub CI runs the full suite again at2afc7c4.

Shared apply remains held. Final receipt: integrated-pr8-fe43b13.json. Full-project type errors remain a production release gate.
