Louisiana's six November 3, 2026 U.S. House contests are open primaries under Act 7. The prior seed and existing rows classified them as general elections. The correction retains November 3, the six IDs and all candidate profiles; December 12 is conditional and no contest is created for it. Senate and other-state rows are unchanged.

The official [May 14 SOS notice](https://www.sos.la.gov/media/dcvl5ojl/051426-fall-house-races.pdf) and [current election-type page](https://www.sos.la.gov/elections-voting/types-of-elections) establish this rule. The notice also cancels the May 16/June 27 House races; approved EC read-only inspection found no such House rows, so this bounded correction only changes November classification/wording. The source document SHA256 is 3319c7cba10c5cd5cc74f2a4cfb2d42935e998cbbfb14746ece63050ee8bedb3.

The live read-only preimage is retained in artifacts/la-catalog/shared-readonly-before.json: IDs429–434, six general labels, no linked candidates; Senate13 and534 remain controls. The default dryrun produced plan SHA8229e8e520bf40065104aefe5d0bf7da7040e47fb7ec97270bc887aae5bc80e3. Re-run against the intended configured EC target before apply; changing a reviewed catalog field invalidates the hash.

```powershell
$env:ELECTION_ENV_FILE='D:/projects/New-election-countdown/.env'
node node_modules/tsx/dist/cli.mjs scripts/correct_louisiana_house_catalog.ts --dry-run
# Apply the additive audit migration through the team's migration workflow first.
node node_modules/tsx/dist/cli.mjs scripts/correct_louisiana_house_catalog.ts --apply --expect-plan-sha256=<newly-reviewed-plan-sha>
```

The correction runs under SERIALIZABLE isolation and the same advisory writer lock as candidate ingestion. Missing migration/hash, drift or unexpected six-district identity refuses mutation. Updates and source/audit receipt share one transaction. Repeats produce zero changes and no extra audit. Candidate and date/ID fields are never updated. Shared apply has not been run.

The General candidate API returns HTTP200/status not_applicable for primaries/runoffs and for the known Louisiana Nov3 House exception even while a legacy stored row says general. It reads no candidate/source rows on this path. General-list ingestion likewise cannot promote the misclassified primary; FEC registration can safely associate with only the corrected LA Nov3 House01–06 primary races, keeping nomination/certification flags false. Client consumers should render the phase as an open primary and respect not_applicable instead of presenting a missing General roster as a data failure.

Worked: immutable seed red6 wrong labels, three red API/importer/FEC contracts, then all201 unit tests with3 existing skips; build passed. Thirteen actual disposable PostgreSQL/HTTP checks cover read-only zero effect, wrong/missing gate refusal, real40001 concurrent writer, injected post-update audit rollback, idempotence, profile/control preservation, FEC source metadata. A full compiled application probe on this C-only base encountered the previously known seed-entrypoint bundling failure; the exact existing repair belongs to lane D commit721bb34, which extracts scripts/seed-database.ts. A15515fd alone retains the bad guard. Own C+A15515fd composition with the exact existing two-file D patch passed14 actual private checks including full compiled health10 and the registered LA API. No duplicate bootstrap implementation was added. Containers were removed after each run.

The C-only failing boot log is retained as an A composition dependency, not a Louisiana classification defect. No bootstrap or authentication repair is included in this branch.

Full typecheck still fails with1114 pre-existing errors on both immutable base and this branch. File/code occurrence counts are unchanged and added files have zero errors. The team's whole-project type gate remains open.

The current stacked branch applies only these Louisiana changes atop reviewed source expansion e6d74cc, preserving the latest FEC proof and all fifteen identity declarations. At 0d7e8e4, a fresh physical dependency install, 21 targeted unit checks, build, and thirteen independent private PostgreSQL/HTTP checks Worked. New receipts are prefixed current-independent; original captures remain unchanged. The final A/B/C/D compiled composition remains required before any shared application.
