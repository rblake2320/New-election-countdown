# Congress production packaging: baseline Failed

Main425510a fresh actual production Docker image a1c9deffc63f0fdf4ebd0d3fbf23e9ed9ce46289365b0507b22caec19d8210e3 lacks dist/sync_official_congress.js. The check ran nonroot without source mounts; no database was created before refusal. The existing builder tag was identified but not executed in this baseline check.

D owns build invocation and actual runtime receiving under ET37. Integration awaits C confirmation of exact loader/manifest/migration/schema head and A refusal-code receiving alignment. No shared writes. The new D harness requires explicit production and builder image tags; builder use is restricted to schema setup in an owned disposable database, while CLI and HTTP execute only inside the production image.

## HOLD on 95ceff26 loader

Packet manifest SHA and original shared/schema blob were verified. Local D composition3eeddc9 preserves both C audit schema and merged main C6/LA declarations (only import-list conflict, preserving uuid and foreignKey). C standalone emitter and existing server emitter remain unchanged; pending D package invocation appends the Congress emitter. Actual runtime image f17853148dce0dd8a00484f28376fd9e6f830ed9efd20496ed86d3eb77abd89a and builder bb71450858a6974e37896d59203fc7a8403018fb66edc38a06975984f96656e1 built. One harness attempt ran before builder export completed and refused before database setup; retained. No successful receiving claim.

Owner subsequently put95ceff26 on HOLD: SD real uid1001 EACCES case silently falls back through existsSync. D verified the supplied receipt hash40111e466fa4b2a677236cc901473be912a62f4e0e156a22ded8bee736004fad; receipt retained. NC owns ENOENT-only repair; SD same-input retake required before D resumes integration. No integration PR or release, no shared apply, no owned test containers left running. The build/CI changes are retained only as held draft work.

## Corrected0616 actual runtime gate: Worked

Adopted immutable C0616a699 after packet hash/schema checks and SD clearance. Exact composition b3a11a6 (C0616 plus maincebb1a with A31) and D build invocation. Actual runtime image13f2761c553f0d7152c635b33b91044ac8839abd33cfc85acb024ddfaa0f4211; builder e1953c8dc8507ebbb19be4debe41adf7def8964fe484b157bc21940d820b8865. Runtime uid1001, no source mounts, no root Congress data, no server/shared/scripts/build tooling. Existing merged C6 intentionally ships data/official-results; initial overly broad no-data assertion failed and is retained, then the Congress-specific boundary was used. This is not a claim that all runtime data directories are absent.

12 receiving assertions Worked: healthy actual server; CLI default loader from /tmp receives539 members/hashb09efc; dry-run preserves full catalog and audits; apply without hashes refuses; altered bytes refuse; absent audit migration refuses; shipped migration applies twice; postmigration dryrun works; authenticated legacy refusals preserve full catalog and zero audits. Both real HTTP endpoints return anonymous401, ordinary403, admin422 with LEGACY_CONGRESS_SOURCE_UNVERIFIED and no result body. No successful apply was performed. The builder only initializes schema in the owned disposable PostgreSQL; CLI and HTTP use only the runtime image. All owned containers/network removed.

Existing server and C6 emitted hashes remain byte-identical across added emitter invocation (emitter-parity.json). Existing server builder and C standalone emitter files unchanged. Composed unit suite610 passed/3 skipped. No global type/readiness claim; shared apply hold persists. Loader EACCES red remains retained alongside supplied SD clearance.

## Guarded production apply and repeat: Worked

Extended the same runtime image13f2761c gate (no rebuild or builder verifier). Twenty assertions plus six HTTP requests pass. Private fixture: one existing real official ID needing approved-field repair, one labelled synthetic legacy row and one labelled synthetic historical row; an unknown JSON column and old timestamps exercise full unrelated-field preservation. Actual CLI default assets from /tmp, exact manifest+preimage guards:538 inserts +1 update. Independent PostgreSQL JSON projection from the pinned source compares all seven approved fields:539 distinct expected real IDs,539 received,0 mismatches;541 total including preserved legacy/history. No importer helper participates in that SQL oracle. Catalog completeness remains false while legacy row exists.

Repeat dryrun0 and guarded apply0; entire catalog and every member xmin unchanged. Separate fresh connection verifies two committed audit records, full pre/post scope3->541 and541->541, matching guards/runIDs/changed counts. Reapplying shipped migration preserves every audit-row byte digest. All owned containers/network removed; shared hold remains. This supersedes the earlier no-successful-apply boundary only for the explicitly owned private database.

C final evidence head fetched as7b99f8568642d4fa3f417c4deffc58ef3298df89 (the handoff omitted one9). Its server/scripts/shared/data/migrations diff from0616 is empty; same runtime pins. D did not run the15-check builder verifier.
