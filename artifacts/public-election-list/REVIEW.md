A disabled database previously reached DatabaseStorage.getElections and resolved to200[]. Degraded memory similarly produced200[]. Public listing now uses existing getElectionsStrict; failures return503 with code listing_unavailable and a generic message. Valid empty results remain200; invalid listing filters remain400 before reads. Legacy getElections fallback remains only for other existing consumers; its old public red is retained separately.

Scope: main public list, enhanced search, by-location, counts and missing-candidates. Search registration now precedes electionsRouter, and missing-candidates precedes /:id. No generic catchall waiver. Counts derive their total/byType from one strict active dataset rather than a second fallback stats read. Actual private-PG count output matched legacy fresh database stats. Existing body shapes and byType aliases are preserved. Parent routes.ts was edited as bytes; reversing precisely the authorized transformations yields the original a743 bytes exactly.

Worked:22 targeted tests;1006 whole-unit tests;fresh full typecheck0;production build0. Actual compiled DatabaseStorage/nativepg/Express receiving uses15 scenarios in a disposable, labelled PostgreSQL container on an internal network with no exposed hostports. Five paths return typed503 for actual42P01 SQL failure; same process recovery restores the identical list. Native closed-portECONNREFUSED returns typed503. Real StorageFactory degraded memory yields old200[] and current503. Legitimate filtered empty200[], invalidfilter400, inactive-row exclusion, healthy reserved routes and counts pass.

The compiled harness reuses unchanged immutable production image dd9ede966d3704bd79353785cae270a919a293b993c78fd19b438ff3e01d8cc5 for physical Linux dependencies; it mounts the newly compiled receiving source, without image rebuilding or peer mutation. It is a scoped compiled handler acceptance. D owns the full production-entrypoint retake on the separately maintained real source-copy database. No shared database, production source copy, package, schema, provider or other fallback paths were modified.

Reproduce (physical npm ci, process-only download skips):
node scripts/build_public_election_list_receiving.mjs
python scripts/run_public_election_list_receiving.py
npm test
npm run check
npm run build

The actual retired image must exist locally for this pinned harness; it is not implicitly substituted. The runner checks its own target/label and destroys only the dedicated fixture it created. Its trust authentication is limited to that internal no-hostport synthetic container. No credential or shared URL is supplied to the runner.

Retained old-a743-red.json is actual real-DatabaseStorage/injected endpoint failure:2pass3fail. old-a743-shadow-red.json is actual receiving route-chain negative control:1pass5fail. Two earlier harness setup attempts had zero executed tests (jsdom/esbuild realm, then shared window setup); they are explicitly named unrun and retained. No unrun case is counted as product red or passed. Final tests transform actual captured registration bodies in a native Node child to avoid those environment errors.

Remaining public consumer sweep: recommendation/user-adaptation paths and global midterm/import pathways still call legacy getElections but are not equivalent public listing endpoints; they were not changed. Root owns any distinct followup. Replica getElectionsStrict already throws through its native query path; no fallback relaxation was introduced.
