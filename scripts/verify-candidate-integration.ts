import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { parseNomineeManifest, runNomineeRefresh } from '../server/candidate-nominee-sync';
import { runFecSync } from '../server/fec-candidate-sync';
import { runFecSync as runLegacyFecSync } from '../artifacts/fec-first/original-core/server/fec-candidate-sync';
import { expectedManifestRaces, assertManifestReceiving } from './candidate-ci-expectations';
import { expectedLouisianaRegistrations, assertRegistrationActions } from './candidate-ci-registration';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const origin = process.env.INTERNAL_APP_ORIGIN;
assert(origin && /^http:\/\/et-app-[\w-]+:5000$/.test(origin), 'Only the harness-owned app is allowed');
try {
  assert.equal((await pool.query('select current_database() as name')).rows[0].name, 'et_test');
  for (const file of ['20261011_candidate_source_records.sql', '20261011_general_candidate_list_snapshots.sql']) {
    await pool.query(readFileSync(`migrations/${file}`, 'utf8'));
    await pool.query(readFileSync(`migrations/${file}`, 'utf8'));
  }
  const bytes = readFileSync('data/nominees/combined-2026-reviewed.json');
  const manifest = parseNomineeManifest(JSON.parse(bytes.toString()));
  const hash = createHash('sha256').update(bytes).digest('hex');
  const expectedRaces = await expectedManifestRaces(pool, manifest);
  const wrongRace = structuredClone(manifest);
  wrongRace.candidates[0].raceTitle = 'Acceptance check: absent exact race';
  await assert.rejects(expectedManifestRaces(pool, wrongRace), /missing or ambiguous race/);
  const projectionBytes = readFileSync('tests/fixtures/fec/2026-reviewed-identity-projection.json');
  assert.equal(createHash('sha256').update(projectionBytes).digest('hex'),
    '677e8eb2118af3f492ddcdc572a1a0c7e2f14bd0c9bef012813ac68b0d04a2d0', 'Unreviewed FEC projection');
  const projection = JSON.parse(projectionBytes.toString());
  assert.equal(projection.sourceZipSha256, '6062f203fd5dd90a7e33e487088a4d496bd9634cc1e560f94b0f5e7ff8ea0126');
  assert.equal(createHash('sha256').update(readFileSync('artifacts/fec-first/original-core/server/fec-candidate-sync.ts')).digest('hex'),
    '879a76af10971a270023d843d98de978ecde47ffc34b590b19643fc5774d14cf', 'Historical ingest implementation changed');
  const editorialRows = (await pool.query('select count(*)::int n from candidates')).rows[0].n;
  // Replay the actual historical ingest, then require the current source-proof producer.
  // This is parsed real-source replay, distinct from the separate synthetic FEC fixture gate.
  const legacy = await runLegacyFecSync(pool, projection.rows, projection.sourceZipSha256, true);
  const ids = (await pool.query('select id from candidates order by id')).rows.map(r => r.id);
  const digest = async () => (await pool.query("select md5(string_agg(row_to_json(c)::text,'' order by id)) as digest from candidates c where id=any($1::int[])", [ids])).rows[0].digest;
  let before = await digest();
  const legacyIds = [...ids];
  const legacyBefore = before;
  const legacyDigest = async () => (await pool.query("select md5(string_agg(row_to_json(c)::text,'' order by id)) as digest from candidates c where id=any($1::int[])", [legacyIds])).rows[0].digest;
  const allState = async () => {
    const result: Record<string, unknown> = {};
    for (const table of ['candidates','candidate_source_records','general_candidate_list_snapshots','candidate_ingest_runs']) {
      result[table] = (await pool.query(`SELECT count(*)::int n, md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY id),'')) digest FROM ${table} t`)).rows[0];
    }
    return result;
  };
  const beforeProofless = await allState();
  const proofless = await runNomineeRefresh(pool, manifest, hash, false);
  assert(proofless.unresolved.length > 0, 'Actual FEC-first admission must require source proof');
  await assert.rejects(runNomineeRefresh(pool, manifest, hash, true), /conflict/);
  assert.deepEqual(await allState(), beforeProofless);
  const registrationExpected = await expectedLouisianaRegistrations(pool, projection.rows);
  const registrationOutcomes = [];
  if (registrationExpected.length) {
    const registrationRows = registrationExpected.map(e=>e.record);
    const registrationDry = await runFecSync(pool, registrationRows, projection.sourceZipSha256, false);
    assert.deepEqual(await allState(), beforeProofless);
    assert.equal(registrationDry.unmatched.length,0);
    assertRegistrationActions(registrationDry.actions,registrationExpected);
    const registered = await runFecSync(pool,registrationRows,projection.sourceZipSha256,true);
    assertRegistrationActions(registered.actions,registrationExpected);
    assert.equal(await legacyDigest(),legacyBefore,'LA registrations cannot modify any legacy profile');
    for (const expected of registrationExpected) {
      const rows = (await pool.query(`SELECT c.*,s.source_layer,s.source_url,s.source_file_sha256 AS proof_sha,s.metadata
        FROM candidates c JOIN candidate_source_records s ON s.candidate_id=c.id
        WHERE c.fec_candidate_id=$1 AND s.is_current=true`,[expected.record.candId])).rows;
      assert.equal(rows.length,1,'Exactly one registration source, no nominee source');
      const actual=rows[0];
      assert(!legacyIds.includes(actual.id));
      assert.equal(actual.election_id,expected.electionId);
      assert.equal(actual.party,expected.record.party);
      assert.equal(actual.fec_status,expected.record.status);
      assert.equal(actual.name,expected.record.displayName);
      assert.equal(actual.source_status,'fec_registered');
      assert.equal(actual.data_source,'fec_bulk');
      assert.equal(actual.ballot_status,'not_certified');
      assert.equal(actual.ballot_source_url,null);
      assert.equal(actual.source_layer,'fec_registration');
      assert.equal(actual.source_url,projection.sourceUrl);
      assert.equal(actual.source_file_sha256,projection.sourceZipSha256);
      assert.equal(actual.proof_sha,projection.sourceZipSha256);
      for (const [key,value] of Object.entries({fecCandidateId:expected.record.candId,partyRaw:expected.record.partyRaw,
        state:'LA',office:'H',district:expected.record.district,electionId:expected.electionId,electionDate:'2026-11-03',
        electionYear:2026,sourceStatus:'fec_registered',ballotCertification:false,generalElectionNomination:false})) {
        assert.deepEqual(actual.metadata[key],value,`LA registration metadata ${key}`);
      }
      ids.push(actual.id);
      registrationOutcomes.push({candidateId:actual.id,fecCandidateId:expected.record.candId,electionId:actual.election_id,party:actual.party,registrationOnly:true});
    }
    const registrationRepeat=await runFecSync(pool,registrationRows,projection.sourceZipSha256,true);
    assert.equal(registrationRepeat.actions.length,0);
    before=await digest(); // Protect new registrations as well throughout nominee admission.
  }
  const proof = await runFecSync(pool, projection.rows, projection.sourceZipSha256, true);
  assert(proof.actions.length > 0);
  assert(proof.actions.every(a => a.kind === 'source_refresh'));
  assert.equal(await digest(), before, 'Proof refresh must preserve all full candidate profiles');
  assert.equal(await legacyDigest(),legacyBefore);
  const beforeDry = await allState();
  const dry = await runNomineeRefresh(pool, manifest, hash, false);
  assert.deepEqual(await allState(), beforeDry);
  assert.equal(dry.unresolved.length, 0);
  assert.equal(dry.actions.length, manifest.candidates.length);
  assert.deepEqual([...new Set(dry.actions.map(a => a.electionId))].sort((a,b)=>a-b), [...expectedRaces.keys()].sort((a,b)=>a-b));
  assert.equal(await digest(), before);
  await pool.query(`CREATE FUNCTION ci_reject_nominee() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.source_layer='general_candidate_list' THEN RAISE EXCEPTION 'injected nominee acceptance rollback'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER ci_reject_nominee BEFORE INSERT ON candidate_source_records FOR EACH ROW EXECUTE FUNCTION ci_reject_nominee()`);
  await assert.rejects(runNomineeRefresh(pool, manifest, hash, true), /injected nominee acceptance rollback/);
  assert.deepEqual(await allState(), beforeDry);
  await pool.query('DROP TRIGGER ci_reject_nominee ON candidate_source_records; DROP FUNCTION ci_reject_nominee()');
  const first = await runNomineeRefresh(pool, manifest, hash, true);
  assert.equal(await digest(), before, 'Existing profiles/provenance must be preserved');
  const repeat = await runNomineeRefresh(pool, manifest, hash, true);
  assert.equal(repeat.candidateInserts, 0);
  assert.equal(repeat.sourceChanges, 0);
  const cli = path.resolve('nominee-cli-acceptance.mjs');
  const manifestPath = path.resolve('data/nominees/combined-2026-reviewed.json');
  const auditCount = async () => (await pool.query('select count(*)::int as n from candidate_ingest_runs')).rows[0].n;
  const beforePreflight = await auditCount();
  const blockedDirectory = mkdtempSync(path.join(tmpdir(), 'et-receipt-preflight-'));
  try {
    writeFileSync(path.join(blockedDirectory, 'election-data-2026'), 'fixture blocks directory creation');
    const refused = spawnSync(process.execPath, [cli, manifestPath, '--apply', `--expect-sha256=${hash}`], { cwd: blockedDirectory, encoding: 'utf8' });
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /"stage":"receipt-directory"/);
    assert.equal(await auditCount(), beforePreflight);
    assert.equal(await digest(), before);
  } finally { rmSync(blockedDirectory, { recursive: true, force: true }); }
  const appliedCli = spawnSync(process.execPath, [cli, manifestPath, '--apply', `--expect-sha256=${hash}`], { encoding: 'utf8' });
  assert.equal(appliedCli.status, 0, appliedCli.stderr);
  const cliReceipt = JSON.parse(appliedCli.stdout.trim().split('\n').at(-1)!);
  assert.equal(cliReceipt.mode, 'applied');
  assert.equal(cliReceipt.candidateInserts, 0);
  assert.equal(cliReceipt.sourceChanges, 0);
  assert(cliReceipt.database_audit_id);
  assert.equal(await auditCount(), beforePreflight + 1);
  const races = [...expectedRaces.keys()];
  const outcomes = [];
  let records = 0;
  for (const id of races) {
    // Functional full-catalog checks stay below the production 300/minute API budget.
    // Never disable or increase the application's limiter for this acceptance test.
    await delay(250);
    const response = await fetch(`${origin}/api/elections/${id}/general-candidates`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, 'sourced');
    const expected = (await pool.query("select distinct c.id from candidates c join candidate_source_records s on s.candidate_id=c.id where c.election_id=$1 and s.source_layer='general_candidate_list' and s.is_current=true order by c.id", [id])).rows.map(r => r.id);
    assert.deepEqual(body.candidates.map(c => c.id).sort((a,b) => a-b), expected);
    assertManifestReceiving(expectedRaces.get(id)!, body.candidates);
    assert(['complete', 'scoped', 'unspecified'].includes(body.coverage));
    for (const candidate of body.candidates) {
      assert(candidate.generalListSourceUrl.startsWith('https://'));
      assert.equal(candidate.generalListSource.ballotCertificationPromoted, false);
      const stored = (await pool.query(`SELECT c.*,s.metadata,s.source_url,s.source_file_sha256 AS snapshot_sha
        FROM candidates c JOIN candidate_source_records s ON s.candidate_id=c.id
        WHERE c.id=$1 AND s.source_layer='general_candidate_list' AND s.is_current=true`, [candidate.id])).rows;
      assert.equal(stored.length, 1, 'Fixture must have one current reviewed source per identity');
      const row = stored[0];
      assert.deepEqual(candidate.generalListSource, row.metadata);
      assert.equal(candidate.generalListSourceUrl,row.source_url);
      assert.equal(candidate.generalListSnapshotSha256,row.snapshot_sha);
      for (const [field,column] of Object.entries({description:'description',website:'website',profileImageUrl:'profile_image_url',isVerified:'is_verified',fecCandidateId:'fec_candidate_id',ballotStatus:'ballot_status'})) {
        assert.deepEqual(candidate[field],row[column], `Profile receiving ${id}/${candidate.id}/${field}`);
      }
      assert.equal(candidate.party,row.metadata.partyValue);
    }
    records += body.candidates.length;
    outcomes.push({ electionId: id, rows: body.candidates.length, coverage: body.coverage });
  }
  assert.equal(races.length, expectedRaces.size);
  assert.equal(records, manifest.candidates.length);
  assert.equal(await digest(), before);
  assert.equal((await fetch(`${origin}/api/elections/nope/general-candidates`)).status,400);
  assert.equal((await fetch(`${origin}/api/elections/999999999/general-candidates`)).status,404);
  const reviewedIdentities = manifest.candidates.filter(row => row.identityResolution);
  for (const row of reviewedIdentities) {
    const candidate = (await pool.query('SELECT id,party FROM candidates WHERE fec_candidate_id=$1', [row.identityResolution!.fecCandidateId])).rows;
    assert.equal(candidate.length, 1);
    await pool.query("UPDATE candidates SET party='R' WHERE id=$1", [candidate[0].id]);
    const changed = await allState();
    try {
      await assert.rejects(runNomineeRefresh(pool, manifest, hash, true), /conflict/);
      assert.deepEqual(await allState(), changed);
    } finally { await pool.query('UPDATE candidates SET party=$2 WHERE id=$1', [candidate[0].id,candidate[0].party]); }
  }
  assert.equal(await digest(), before);
  console.log(JSON.stringify({ migrationsAppliedTwice: true, manifestSha256: hash,
    mode: 'actual parsed FEC projection -> historical ingest -> pinned proof refresh -> reviewed nominees',
    sourceZipSha256: projection.sourceZipSha256, projectionSha256: createHash('sha256').update(projectionBytes).digest('hex'),
    editorialRows, actualFecRows: projection.rows.length, legacyActions: legacy.actions.length,
    legacyProfiles:legacyIds.length,legacyProfilesUnchanged:await legacyDigest()===legacyBefore,
    louisianaRegistrationInserts:registrationOutcomes.length,louisianaRegistrations:registrationOutcomes,
    prooflessAdmissionRefused: true, sourceProofRefreshActions: proof.actions.length,
    manifestRecords: manifest.candidates.length, independentSqlRaces: expectedRaces.size,
    exactRaceNegativeRefused: true, injectedNomineeRollback: true,
    opposingPartyRefusals: reviewedIdentities.length, invalidAndMissingHttpCases: 2,
    originalCandidates: ids.length, originalProfilesPreserved: true,
    candidateInserts: first.candidateInserts, sourceChanges: first.sourceChanges,
    repeatCandidateInserts: 0, repeatSourceChanges: 0,
    compiledCliPreflightRefusedWithoutWrites: true, compiledCliRepeatAuditCommitted: true,
    compiledHttpRaces: races.length,
    compiledHttpRecords: records, outcomes }));
} finally { await pool.end(); }
