# PR7 then PR8 compiled integration acceptance

Integration source55b320a includes PR7 0bfa392, then PR8 3df515b, then B82acfd6 and A15515fd. The new lane-D verification script was included in the builder image. Production image sha256:44efe3779fb368a4537e6073fc829c1d4f5b9f17cf253dfba86e66609b255361 built and booted against a harness-owned disposable PostgreSQL database with no published ports.

Worked: candidate_source_records/candidate_ingest_runs and general_candidate_list_snapshots migrations each executed twice. Compiled FEC acceptance passed all16 private-DB checks, including missing-migration refusal, rollback, concurrency, provenance and committed-audit receipt handling.

Worked: reviewed259-row nominee manifest applied to the private compiled server's database; original136 candidate profiles retained their full-row digest. Repeat application inserted0 candidates and changed0 source versions. All91 compiled-server general-candidates endpoints returned259 records whose candidate IDs matched independent SQL, with explicit coverage and official-list provenance. See integrated-c2-3df515b.json for counts and per-race outcomes. This test used the production server, not an isolated Express router.

Worked: register201, me/dashboard/recommendations/watchlist200. The previously observed recommendations500 is closed for the new-account scenario at A15515fd. Election-night query fixtures and eight compiled listing contracts also passed.

Integrated unit suite270 passed/3 skipped; client/global types0 errors, whole-project963 diagnostics. Shared DB and PR5 apply remain untouched. The initial orchestration attempt started before the builder image existed, ran no app acceptance, and its setup-failure receipt is retained locally; the completed-build rerun above passed. Disposable containers/network were cleaned up.

CI now requires TEST_CANDIDATE_INGESTION=1 alongside the existing compiled user/listing/timezone checks. Full-project type cleanup and the remaining release gates still apply.
