# Official current Congress import

The legacy attached-assets method now refuses with `LegacyCongressImportRefused`, code `LEGACY_CONGRESS_SOURCE_UNVERIFIED`, before reading those files or calling a writer. It cannot manufacture `IMPORT_n` identities, clear the table or report a successful empty import. No route, generic storage writer, package or build configuration was changed here; route receiving belongs to lane A.

The new method is `CongressImportService.importReviewedOfficialSnapshot(options)` / `syncOfficialCongress(pool, options)`. Its default mode is dry-run. The CLI uses only a process-injected database URL, no provider key or network fetch. The reviewed source is frozen October11,2026 current-member data, not future election nominees or results.

## Reviewed scope and provenance

`data/congress/119/official-current-members.json` byte SHA256 is `fecec614bf47f875ab7aa8c78f15ea7d8e0e4a6f736b452d9ba317cc6c866191`. The loader admits only these exact bytes and additionally checks source context, uniqueness, roles and vacancy coverage. House XML whole-document SHA is `01833c6c646873b2247950e8ab9c7ecc2c57fd2bf019d1014bd64a58b496ed3d`; Senate XML is `01459d6977e9b5590e7d27cb333ff062cf9cf0783c934373393512fe2542b5e2`. Exact official URLs, retrieved timestamps, source metadata and Senate119 landing binding are retained. Contact-bearing raw XML/HTML was parsed/hashed in memory and discarded; no contacts are stored in the committed projection.

There are539 occupied current people:433 voting Representatives,5 Delegates,1 Resident Commissioner and100 Senators. The House file's441 entries include two expressly vacant seats, FL20/TX23. Vacancies have null person/name/party/bioguide values and never become database members. At-large House districts map from the official label to `00`; delegates/resident commissioner retain a null district, with the exact role in the source/audit; Senators retain null district. Party codes remain exact D/R/I. All actual bioguide identities are distinct. The selected scope includes nonvoting members; it is never labelled435 occupied voting Representatives or535 occupied people.

`validateImport` still reports actual stored record counts, but `isComplete` requires exact approved current119 source identities/fields and no extra unreviewed current records. `expectedCounts` describes this pinned source scope439 House/100 Senate/539 total. Historical records contribute to recorded totals and are preserved; those totals are distinct from current-source expected counts. Missing or changed source assets return sourceStatus unavailable/incomplete. No missing person is inferred from a count.

## Atomicity and legacy preservation

Apply requires exact manifest and whole-catalog preimage hashes. One SERIALIZABLE transaction takes Congress advisory lock2026110319 plus SHARE ROW EXCLUSIVE table lock, then checks the preimage, upserts approved member fields under real bioguide IDs, verifies actual readback and full unrelated fields, and writes the durable audit before commit. Repeat performs zero member writes, preserving xmin, and records its own audit run. Unknown columns, existing row IDs/created_at/updated_at and unrelated Congress rows stay unchanged. An official ID already stored for another Congress refuses instead of overwriting history.

Legacy rows are never automatically removed or relabelled. An optional removal plan must declare `version:1`, `reviewed:true`, exact current unverified row ID/bioguide ID/full row hash, and an explicit matching removal-plan digest on apply. Real official-format IDs cannot be removed with this legacy plan. A stale/mismatched/duplicate plan refuses. Receipts expose unreviewedLegacyRowIds and `catalogComplete:false` while such current rows remain, even when all539 official people were correctly received. Review of real existing legacy removals remains a separate owner operation; this branch performs none on shared data.

The additive migration creates `congress_official_import_runs`. Its exact checks/types are also declared in shared/schema.ts so normal Drizzle sync retains committed audits. Each audit contains source manifest hash, whole pre/post images, removal plan digest and receipt with scope/vacancies/roles. No migration runs at web boot.

## Reproducible operations

Run the reviewed migration as a separate release operation before import. Build the standalone entrypoint and its contact-free assets:

```powershell
node scripts/build-congress-import.mjs
node dist/sync_official_congress.js --manifest dist/congress-data/official-current-members.json --receipt dry-run.json
```

`DATABASE_URL` must already be injected into that process. Apply requires the two hashes from the reviewed dry-run:

```powershell
node dist/sync_official_congress.js --manifest dist/congress-data/official-current-members.json --apply --expect-manifest-sha <reviewed-sha> --expect-preimage-sha <dry-run-preimage> --receipt apply.json
```

Every receipt path must be new. Directory reservation/write/rename preflight occurs before database acquisition. Receipt writes use a same-directory temporary file, fsync and rename. If the database committed and local receipt export subsequently fails, the CLI reports **Applied**, committed=true and the durable audit run ID; it never calls that transaction failed or retries it. It reports a temporary receipt only if that file exists.

Ordinary npm build/config and production Docker packaging were deliberately not edited. The release owner must invoke the standalone build and ship its reviewed source assets/migration along with the existing build before exposing a new receiving route. Current lane A legacy routes receive the explicit refusal until lane A adapts them.

The loader default is deterministic and independent of working directory. Compiled modules first use `./congress-data/official-current-members.json` relative to import.meta.url; source-tree modules fall back to `../data/congress/119/official-current-members.json` relative to that same module URL only after a native stat reports ENOENT. EACCES and ENOTDIR propagate without fallback. An existing malformed packaged file refuses its SHA check even if a valid source copy exists. Explicit `--manifest` remains supported. Node's URL constructor is imported explicitly so test/browser asset rewriting cannot change server path semantics.

Private acceptance is one command, using a new physical builder image, internal network, owned disposable PostgreSQL and no published ports:

```powershell
node scripts/test-congress-import-container.mjs
```

The script refuses another database/user in its compiled verifier. Actual source projection is used for all539 import members. Only labelled legacy/history/fault controls are synthetic; they exist solely in the private fixture. No government fetch, browser, provider key or shared write occurs during acceptance.

## Observed acceptance

Original unsafe behavior remains immutable on investigation branch commit `fc723a6a91e21dbe6d26d80826c2c752425dc86d`; this is a distinct repair branch basedmain8b49. Source unit tests reject empty/missing/duplicate/fabricated/former/vacant/role/source/context/scope inputs before a writer. The final compiled private run retained under artifacts/congress-import/private-17264-0188cd executed15 checks: migration twice; legacy refusal; dry-run no writes; actual100-write failure rollback; real PG trigger readback mismatch rollback; historical-ID collision refusal; changed source byte refusal; compiled CLI539-member apply with legacy/history/unrelated fields preserved; zero-write repeat/xmin; stale full preimage refusal; advisory lock wait/release; exact reviewed private legacy removal with rollback/refusal controls; service source completeness; concurrent repeat conservation; real nonroot postcommit EACCES Applied/audit outcome. All Worked.

The private outer harness then ran actual Drizzle schema sync and preserved all7 audit rows and their aggregate byte digest. The synthetic unmodelled test column was explicitly removed after importer preservation checks before full schema sync; its schema removal is not credited as importer preservation. An unreachable database sentinel with an invalid receipt directory returned ENOENT first, confirming preflight order. Both images/receipts are retained; no production source/data mutation is claimed.

The interim dry-run reporting defect was independently reproduced using retained old image source with all539 actual member rows plus one labelled synthetic unverified row: sourceCoverageComplete=true incorrectly also yielded catalogComplete=true. The exact same offline probe on the final image returns catalogComplete=false, and final compiled PG acceptance asserts this while preserving those rows. The old red and new green are retained separately. Final unit run533 passed/3 skipped, application and standalone builds passed; whole-project type diagnostics903 before/903 after with zero new diagnostics and zero strict diagnostics in owned importer/service/CLI/private verifier.

Separate resource-path repair acceptance is retained at artifacts/congress-import/private-72980-b61d85. Four compiled controls pass: packaged default, changed packaged bytes refused despite valid source fallback, alternate cwd, and explicit manifest. The15 compiled private PostgreSQL controls then pass with all five named root source JSON files absent, relying solely on dist/congress-data assets; all7 audit rows still survive Drizzle.534 unit tests pass/3 skip and application/standalone builds pass. The initial resource unit red (Vite's static URL rewrite) and owned overlay-directory EXDEV fixture red are preserved alongside repaired receipts. Production packaging/HTTP integration remains lane D's separate gate.

Independent Linux uid1001 review then reproduced an escaped boundary: existsSync returned false for EACCES and ENOTDIR and95ceff incorrectly accepted valid source fallback. Runtime fix0616a699b00be0bde009550ab2eac048ebdd7539 uses native stat and falls back only on ENOENT. The exact two reviewer inputs now refuse with their actual errors; six normal/negative path cases also pass independently. Old/new receipts are retained under artifacts/congress-import/loader-error-delta. The bounded compiled15-check PG/CLI and four resource checks were retaken at private-83560-3dd645 with source JSON absent; seven audits remain intact. Independent SD clearance applies to0616, while D production receiving stays separate.

The current projection corrects one source-field display derivation. Senate XML retains first_name `Angus S., Jr.`, last_name `King`, member_full `King (I-ME)`; the official listing prints `King, Angus S., Jr.`. The reviewed natural display is `Angus S. King, Jr.`. The general Senate derivation moves only an explicit comma-delimited Jr./Sr. suffix after the actual surname; it accepts no member ID or alias. All439 House rows, including11 comma-delimited suffix names and Everton Blair Jr., remain byte/value unchanged;538 whole member rows and all non-name identity/party/state/district/chamber/role/seat fields are unchanged. Fresh Senate XML and official listing whole-document hashes are asserted equal to original source bindings before the correction script can write. Only the derived name and its truthful derivation note change in the539-row source; oldB09 bytes and old red receipts remain historical evidence.

At artifacts/congress-import/private-88824-49ea0a, compiled SQL acceptance stages the actual previous539-source names, then the new reviewed source plans/updates exactly one K000383 name, preserves every other full row/xmin and all unrelated fields, and repeats with zero writes. The oldB09 manifest is now refused by the current loader. All16 private checks, four compiled resource checks and preservation of nine audit rows Worked. Source-field Python regressions6/6 and the full628-unit suite/3skip pass; application build passes. D owns separate new-name production receiving verification.
