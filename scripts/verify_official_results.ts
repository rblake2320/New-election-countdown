import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import pg from 'pg';
import { canonical, loadResultsManifest, RESULTS_DATE } from '../server/official-results-manifest';
import { catalogHash, planResults, RESULTS_WRITER_LOCK, syncOfficialResults } from '../server/official-results-sync';
import { officialResultsFieldsSchema } from '../shared/official-results';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || new URL(databaseUrl).pathname !== '/et_c6_test' || new URL(databaseUrl).username !== 'et_c6_test') {
  throw new Error('Acceptance is restricted to the harness-owned disposable et_c6_test database');
}
const origin = process.env.INTERNAL_APP_ORIGIN;
if (!origin || !/^http:\/\/et-c6-app-[a-z0-9-]+:5000$/.test(origin)) throw new Error('Internal harness origin required');
const pool = new pg.Pool({ connectionString: databaseUrl });
const evidence = '/app/artifacts/c6-acceptance';
const proof = await loadResultsManifest('/app/data/official-results/2026-11-03.json');
const report: Record<string, unknown> = { manifestSha256: proof.manifestSha256, outcome: 'Failed' };
const snapshot = async () => (await pool.query('SELECT to_jsonb(e) AS row FROM public.elections e ORDER BY id')).rows.map(r => r.row);
const auditCount = async () => Number((await pool.query('SELECT count(*)::int AS n FROM public.official_results_sync_runs')).rows[0].n);
const candidateHash = async () => canonical((await pool.query('SELECT to_jsonb(c) AS row FROM public.candidates c ORDER BY id')).rows.map(r => r.row));
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const expectRefusal = async (call: () => Promise<unknown>, pattern: RegExp) => {
  let message = '';
  try { await call(); } catch (error) { message = (error as Error).message; }
  assert.match(message, pattern);
  return message;
};
async function readHttp(path: string): Promise<unknown> {
  const response = await fetch(origin + path, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, path);
  return response.json();
}
try {
  const original = await snapshot();
  assert.ok(original.length > 500, 'Real application seed catalog must be populated');
  assert.ok(original.every(row => row.official_results_url === null && row.official_results_source === null));
  const nullList = await readHttp('/api/elections') as Record<string, unknown>[];
  assert.ok(nullList.length > 0);
  for (const row of nullList) {
    assert.ok(Object.hasOwn(row, 'officialResultsUrl') && Object.hasOwn(row, 'officialResultsSource'));
    assert.deepEqual(officialResultsFieldsSchema.parse(row), { officialResultsUrl: null, officialResultsSource: null });
  }
  const nullDetail = await readHttp('/api/elections/' + original[0].id) as Record<string, unknown>;
  assert.equal(nullDetail.officialResultsUrl, null);
  assert.equal(nullDetail.officialResultsSource, null);
  report.nullDefaults = { sqlRecords: original.length, httpRecords: nullList.length, outcome: 'Worked' };

  // Real LA-01 correction context supplied by lane C, kept as an isolated fixture.
  // The importer itself never edits election type or the catalog.
  const laFixture = JSON.parse(await readFile('/review/data/official-results/acceptance/LA-429-context.json', 'utf8'));
  assert.equal(laFixture.receipt.electionContext.title, 'U.S. House Election - LA-01');
  await pool.query('UPDATE public.elections SET type=$1 WHERE title=$2 AND state=$3 AND date=$4::date',
    [laFixture.receipt.electionContext.type, laFixture.receipt.electionContext.title, 'LA', RESULTS_DATE]);
  // A future nullable DB column must survive full-preimage and two-field writes.
  await pool.query('ALTER TABLE public.elections ADD COLUMN c6_acceptance_extra text');
  await pool.query('UPDATE public.elections SET c6_acceptance_extra=title');
  const before = await snapshot();
  const candidatesBefore = await candidateHash();
  const dry = await syncOfficialResults(pool, proof);
  assert.equal(dry.mode, 'dry-run');
  assert.equal(dry.runId, null);
  assert.equal(catalogHash(await snapshot()), catalogHash(before));
  assert.equal(await auditCount(), 0);
  assert.equal(Object.keys(dry.stateCounts).length, 50);
  assert.ok(dry.changedCount > 450);
  await writeFile(evidence + '/dry-run.json', JSON.stringify(dry, null, 2));
  report.dryRun = { outcome: 'Worked', targetCount: dry.targetCount, proposedChanges: dry.changedCount, catalogUnchanged: true, auditRows: 0 };

  report.manifestGuard = await expectRefusal(() => syncOfficialResults(pool, { ...proof, mode: 'apply',
    expectedManifestSha256: '0'.repeat(64), expectedPreimageSha256: dry.preimageSha256 }), /Manifest SHA guard/);
  report.preimageGuard = await expectRefusal(() => syncOfficialResults(pool, { ...proof, mode: 'apply',
    expectedManifestSha256: proof.manifestSha256, expectedPreimageSha256: '0'.repeat(64) }), /Catalog preimage guard/);
  report.missingReceivingState = await expectRefusal(async () => planResults(before.filter(row => row.state !== 'WY'), proof.manifest, proof.manifestSha256), /No November 3 receiving elections.*WY/);
  // Source/schema fields unknown to this version are refused, not discarded.
  const unknownProof = structuredClone(proof.manifest);
  (unknownProof.states[0].source as unknown as Record<string, unknown>).unreviewedStatus = 'published';
  report.unknownManifestFields = await expectRefusal(async () => planResults(before, unknownProof, proof.manifestSha256), /Unrecognized key/);
  assert.equal(catalogHash(await snapshot()), catalogHash(before));
  assert.equal(await auditCount(), 0);

  // Exercise a real intervening change without inventing user-visible facts.
  const first = before.find(row => row.description !== null)!;
  await pool.query('UPDATE public.elections SET description=NULL WHERE id=$1', [first.id]);
  report.interveningChange = await expectRefusal(() => syncOfficialResults(pool, { ...proof, mode: 'apply',
    expectedManifestSha256: proof.manifestSha256, expectedPreimageSha256: dry.preimageSha256 }), /Catalog preimage guard/);
  await pool.query('UPDATE public.elections SET description=$1 WHERE id=$2', [first.description, first.id]);
  assert.equal(catalogHash(await snapshot()), dry.preimageSha256);

  report.injectedRollback = await expectRefusal(() => syncOfficialResults(pool, { ...proof, mode: 'apply',
    expectedManifestSha256: proof.manifestSha256, expectedPreimageSha256: dry.preimageSha256, faultAfterWrites: 3 }), /Injected C6 rollback/);
  assert.equal(catalogHash(await snapshot()), dry.preimageSha256);
  assert.equal(await auditCount(), 0);

  // Shared writer-lock contention must refuse rather than race another importer.
  const lock = await pool.connect();
  try {
    await lock.query('BEGIN');
    await lock.query('SELECT pg_advisory_xact_lock($1)', [RESULTS_WRITER_LOCK]);
    report.writerLock = await expectRefusal(() => syncOfficialResults(pool, { ...proof, mode: 'apply',
      expectedManifestSha256: proof.manifestSha256, expectedPreimageSha256: dry.preimageSha256 }), /lock timeout/);
  } finally { await lock.query('ROLLBACK'); lock.release(); }
  assert.equal(catalogHash(await snapshot()), dry.preimageSha256);
  assert.equal(await auditCount(), 0);

  const applied = await syncOfficialResults(pool, { ...proof, mode: 'apply',
    expectedManifestSha256: proof.manifestSha256, expectedPreimageSha256: dry.preimageSha256 });
  const after = await snapshot();
  assert.equal(catalogHash(after), applied.postimageSha256);
  assert.equal(await auditCount(), 1);
  assert.equal(await candidateHash(), candidatesBefore);
  const changedIds = new Set(applied.changes.map(change => change.id));
  for (let index = 0; index < after.length; index++) {
    const expected = before[index]; const actual = after[index];
    const { official_results_url: _a, official_results_source: _b, ...unchanged } = actual;
    const { official_results_url: _c, official_results_source: _d, ...old } = expected;
    assert.deepEqual(unchanged, old);
    if (!changedIds.has(actual.id)) assert.deepEqual(actual, expected);
  }
  const nh = after.filter(row => row.state === 'NH' && row.date.startsWith(RESULTS_DATE));
  assert.ok(nh.length > 0 && nh.every(row => row.official_results_url === null && row.official_results_source.status === 'unknown'));
  const mi = after.filter(row => row.state === 'MI' && row.date.startsWith(RESULTS_DATE));
  assert.ok(mi.every(row => row.official_results_url.includes('michigan.gov') && row.official_results_source.status === 'unknown' && row.official_results_source.advertisedGeneralUrl.includes('11-3-2026')));
  const la = after.find(row => row.title === 'U.S. House Election - LA-01')!;
  assert.equal(la.type, 'primary');
  assert.equal(la.official_results_source.electionPhase, 'primary');
  assert.equal(la.official_results_source.status, 'unknown');
  assert.ok(!la.official_results_url.includes('--environment--'));
  report.apply = { outcome: 'Worked', targetCount: applied.targetCount, changedCount: applied.changedCount,
    historicalRowsUnchanged: before.length - applied.targetCount, futureColumnPreserved: true,
    candidateRowsUnchanged: true, nhUnknown: nh.length, miGateway: mi.length, laPrimaryUnknown: true, runId: applied.runId };
  await writeFile(evidence + '/apply.json', JSON.stringify(applied, null, 2));

  const versionsBeforeRepeat = (await pool.query('SELECT id,xmin::text AS version FROM public.elections ORDER BY id')).rows;
  const repeat = await syncOfficialResults(pool, { ...proof, mode: 'apply', expectedManifestSha256: proof.manifestSha256,
    expectedPreimageSha256: applied.postimageSha256 });
  assert.equal(repeat.changedCount, 0);
  assert.equal(catalogHash(await snapshot()), applied.postimageSha256);
  assert.deepEqual((await pool.query('SELECT id,xmin::text AS version FROM public.elections ORDER BY id')).rows, versionsBeforeRepeat);
  report.repeat = { outcome: 'Worked', changedCount: 0, rowVersionsUnchanged: true };

  // Read every real receiving detail, respecting (rather than bypassing) quota.
  let quotaWaits = 0;
  const actualDetails: Record<string, unknown>[] = [];
  const started = Date.now();
  for (const row of after) {
    let response: Response = await fetch(origin + '/api/elections/' + row.id, { signal: AbortSignal.timeout(15000) });
    if (response.status === 429) {
      quotaWaits++;
      const seconds = Number(response.headers.get('retry-after'));
      assert.ok(Number.isFinite(seconds) && seconds >= 0 && seconds <= 60);
      await sleep((seconds + 1) * 1000);
      response = await fetch(origin + '/api/elections/' + row.id, { signal: AbortSignal.timeout(15000) });
    }
    assert.equal(response.status, 200, 'receiving detail ' + row.id);
    const body = await response.json() as Record<string, unknown>;
    if (body.officialResultsUrl === undefined) {
      report.failedReceivingBody = body;
      throw new Error('Receiving detail omitted officialResultsUrl for election ' + row.id);
    }
    officialResultsFieldsSchema.parse(body);
    assert.equal(body.officialResultsUrl, row.official_results_url);
    assert.deepEqual(body.officialResultsSource, row.official_results_source);
    actualDetails.push(body);
  }
  const list = await readHttp('/api/elections?timeframe=upcoming') as Record<string, unknown>[];
  const byId = new Map(after.map(row => [row.id, row]));
  for (const row of list) {
    const sql = byId.get(row.id)!;
    assert.equal(row.officialResultsUrl, sql.official_results_url);
    assert.deepEqual(row.officialResultsSource, sql.official_results_source);
  }
  await writeFile(evidence + '/actual-detail-payloads.json', JSON.stringify(actualDetails, null, 2) + '\n');
  await writeFile(evidence + '/actual-upcoming-payloads.json', JSON.stringify(list, null, 2) + '\n');
  await writeFile(evidence + '/independent-sql-results-fields.json', JSON.stringify(after.map(row => ({
    id: row.id, state: row.state, date: row.date, type: row.type,
    officialResultsUrl: row.official_results_url, officialResultsSource: row.official_results_source,
  })), null, 2) + '\n');
  report.compiledReceivingHttp = { outcome: 'Worked', details: after.length, listings: list.length,
    fieldComparisons: 2 * (after.length + list.length), mismatches: 0, quotaWaits, durationMs: Date.now() - started };

  await pool.query('UPDATE public.elections SET description=NULL WHERE id=$1', [first.id]);
  report.staleRollback = await expectRefusal(() => syncOfficialResults(pool, { rollbackRunId: applied.runId! }), /catalog changed after this run/);
  await pool.query('UPDATE public.elections SET description=$1 WHERE id=$2', [first.description, first.id]);
  const rollbackDry = await syncOfficialResults(pool, { rollbackRunId: applied.runId! });
  assert.equal(catalogHash(await snapshot()), applied.postimageSha256);
  const rolled = await syncOfficialResults(pool, { mode: 'apply', rollbackRunId: applied.runId!,
    expectedManifestSha256: proof.manifestSha256, expectedPreimageSha256: rollbackDry.preimageSha256 });
  assert.equal(catalogHash(await snapshot()), dry.preimageSha256);
  assert.equal(await candidateHash(), candidatesBefore);
  assert.equal(await auditCount(), 3);
  report.operatorRollback = { outcome: 'Worked', changedCount: rolled.changedCount, restoredExactPreimage: true, runId: rolled.runId };
  report.duplicateRollback = await expectRefusal(() => syncOfficialResults(pool, { rollbackRunId: applied.runId! }), /already been rolled back/);
  const final = await syncOfficialResults(pool, proof);
  report.readyForPackagedApply = { manifestSha256: proof.manifestSha256, preimageSha256: final.preimageSha256,
    postimageSha256: applied.postimageSha256, changedCount: final.changedCount, auditRows: await auditCount() };
  report.outcome = 'Worked';
} catch (error) {
  report.error = (error as Error).message;
  process.exitCode = 1;
} finally {
  await pool.end();
  await writeFile(evidence + '/receipt.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
