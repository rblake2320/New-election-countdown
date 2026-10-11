/** Isolated future-shape acceptance. No live publication or returns claim. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import pg from 'pg';
import { loadResultsManifest, manifestFromReviews, sha256 } from '../server/official-results-manifest';
import { syncOfficialResults, catalogHash } from '../server/official-results-sync';
import { projectOfficialResultsForElection } from '../shared/official-results';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || new URL(databaseUrl).pathname !== '/et_c6_phase_test' || new URL(databaseUrl).username !== 'et_c6_phase_test') throw new Error('Owned disposable et_c6_phase_test DB required');
const pool = new pg.Pool({ connectionString: databaseUrl });
const evidence = '/app/artifacts/c6-phase';
const baseline = await loadResultsManifest('/review/data/official-results/2026-11-03.json');
const initial = await readFile('/review/data/official-results/source-reviews/initial-14.json');
const remainingBytes = await readFile('/review/data/official-results/source-reviews/remaining-36.json');
const input = JSON.parse(await readFile('/review/artifacts/c6-private-43588-2e2b84/independent-sql-results-fields.json', 'utf8'));
const rows = input.map((row: any) => ({ id: row.id, state: row.state, date: row.date, type: row.type,
  official_results_url: row.officialResultsUrl, official_results_source: row.officialResultsSource,
  untouched: row.state + ':' + row.id }));
for (const row of rows) if (row.state === 'LA' && row.id >= 429 && row.id <= 434) row.type = 'primary';
const senate = rows.find((row: any) => row.state === 'LA' && row.date.startsWith('2026-11-03') && row.type === 'general');
assert.equal(senate.id, 13);
const primaryIds = [429, 430, 431, 432, 433, 434];
async function fixture(phase: 'general' | 'primary') {
  const remaining = JSON.parse(remainingBytes.toString('utf8'));
  const record = remaining.records.find((record: any) => record.state === 'LA');
  const checkedAt = '2026-11-04T06:00:00.000Z';
  const context = { state: 'LA', outcome: 'worked', electionDate: '2026-11-03', electionPhase: phase,
    destinationUrl: record.recommendedUrl, sourceUrl: record.officialGovernmentPage, contextVerified: true,
    resultsObserved: true, observedElectionLabel: `FIXTURE ONLY future-shape LA ${phase}; no real returns claim`, checkedAt };
  const receiving = { ...context, sourceUrl: record.recommendedUrl };
  const contextBytes = Buffer.from(JSON.stringify(context)), receivingBytes = Buffer.from(JSON.stringify(receiving));
  record.routeType = 'election_specific_results'; record.generalPublicationStatus = 'published_for_target_election';
  record.publicationEvidence = { state: 'LA', electionDate: '2026-11-03', electionPhase: phase,
    destinationUrl: record.recommendedUrl, officialElectionLabel: context.observedElectionLabel, officialContextVerified: true,
    officialContextReceiptSha256: sha256(contextBytes), receivingOutcome: 'worked', receivingResultsObserved: true,
    receivingReceiptSha256: sha256(receivingBytes), receivingCheckedAt: checkedAt };
  record.publicationReceipts = { officialContext: phase + '-context.json', receiving: phase + '-receiving.json' };
  const manifest = manifestFromReviews([{ file: 'initial-14.json', bytes: initial },
    { file: 'remaining-36.json', bytes: Buffer.from(JSON.stringify(remaining)), publicationReceipts: new Map([
      [phase + '-context.json', contextBytes], [phase + '-receiving.json', receivingBytes],
    ]) }]);
  const bytes = JSON.stringify(manifest, null, 2) + '\n';
  await writeFile(evidence + '/' + phase + '-fixture-manifest.json', bytes);
  await writeFile(evidence + '/' + phase + '-context.json', contextBytes);
  await writeFile(evidence + '/' + phase + '-receiving.json', receivingBytes);
  return { manifest, manifestSha256: sha256(bytes) };
}
const fixtures = { general: await fixture('general'), primary: await fixture('primary') };
const snapshot = async () => (await pool.query('SELECT to_jsonb(e) AS row FROM elections e ORDER BY id')).rows.map(result => result.row);
const versions = async () => new Map<number, string>((await pool.query('SELECT id,xmin::text AS version FROM elections ORDER BY id')).rows.map(row => [row.id, row.version]));
async function refusal(operation: () => Promise<unknown>, message: RegExp) {
  let caught = '';
  try { await operation(); } catch (error) { caught = (error as Error).message; }
  assert.match(caught, message); return caught;
}
const report: Record<string, unknown> = { outcome: 'Failed', fixtureOnly: true, realReturnsClaim: false,
  currentManifestSha256: baseline.manifestSha256, currentPublishedStates: baseline.manifest.states.filter(entry => entry.source.status === 'published').length };
try {
  await pool.query(`CREATE TABLE elections(id int PRIMARY KEY,state text NOT NULL,date timestamp NOT NULL,type text NOT NULL,
    official_results_url text,official_results_source jsonb,untouched text);`);
  await pool.query(await readFile('/review/migrations/20261011_official_results_routes.sql', 'utf8'));
  for (const row of rows) await pool.query('INSERT INTO elections VALUES($1,$2,$3::timestamp,$4,$5,$6::jsonb,$7)',
    [row.id, row.state, row.date, row.type, row.official_results_url, row.official_results_source === null ? null : JSON.stringify(row.official_results_source), row.untouched]);
  const outcomes = [];
  for (const order of [['general', 'primary'], ['primary', 'general']] as const) {
    const beforeOrder = await snapshot();
    const runs: { runId: string; proof: typeof fixtures.general }[] = [];
    for (const phase of order) {
      const proof = fixtures[phase];
      const before = await snapshot(), beforeVersions = await versions();
      const dry = await syncOfficialResults(pool, proof);
      const expectedMatched = phase === 'general' ? [13] : primaryIds;
      const expectedSkipped = phase === 'general' ? primaryIds : [13];
      assert.equal(dry.stateCounts.LA, expectedMatched.length);
      assert.deepEqual(dry.phaseSkipped.map(row => row.id), expectedSkipped);
      assert.equal(dry.phaseSkippedCount, expectedSkipped.length);
      assert.ok(dry.phaseSkipped.every(row => row.state === 'LA' && row.sourcePhase === phase));
      await refusal(() => syncOfficialResults(pool, { ...proof, mode: 'apply', expectedManifestSha256: proof.manifestSha256,
        expectedPreimageSha256: '0'.repeat(64) }), /preimage guard/);
      const skippedRow = before.find(row => row.id === expectedSkipped[0])!;
      await pool.query('UPDATE elections SET untouched=NULL WHERE id=$1', [skippedRow.id]);
      await refusal(() => syncOfficialResults(pool, { ...proof, mode: 'apply', expectedManifestSha256: proof.manifestSha256,
        expectedPreimageSha256: dry.preimageSha256 }), /preimage guard/);
      await pool.query('UPDATE elections SET untouched=$1 WHERE id=$2', [skippedRow.untouched, skippedRow.id]);
      const versionsAfterRestore = await versions();
      const applied = await syncOfficialResults(pool, { ...proof, mode: 'apply', expectedManifestSha256: proof.manifestSha256,
        expectedPreimageSha256: dry.preimageSha256 });
      const after = await snapshot(), afterVersions = await versions();
      for (const id of expectedSkipped) {
        assert.deepEqual(after.find(row => row.id === id), before.find(row => row.id === id));
        assert.equal(afterVersions.get(id), versionsAfterRestore.get(id));
      }
      assert.deepEqual(applied.changes.filter(change => before.find(row => row.id === change.id)?.state === 'LA').map(change => change.id), expectedMatched);
      for (const row of after) {
        const original = before.find(old => old.id === row.id)!;
        const { official_results_url: _a, official_results_source: _b, ...outsideSource } = row;
        const { official_results_url: _c, official_results_source: _d, ...originalOutsideSource } = original;
        assert.deepEqual(outsideSource, originalOutsideSource);
      }
      for (const row of after.filter(row => row.state === 'LA' && row.date.startsWith('2026-11-03'))) {
        const fields = projectOfficialResultsForElection({ ...row, officialResultsUrl: row.official_results_url, officialResultsSource: row.official_results_source });
        if (expectedMatched.includes(row.id)) {
          assert.equal(fields.officialResultsSource?.status, 'published');
          assert.equal(fields.officialResultsSource?.electionPhase, row.type);
        } else if (fields.officialResultsSource?.status === 'published') assert.equal(fields.officialResultsSource.electionPhase, row.type);
      }
      const repeatVersions = await versions();
      const repeat = await syncOfficialResults(pool, { ...proof, mode: 'apply', expectedManifestSha256: proof.manifestSha256,
        expectedPreimageSha256: applied.postimageSha256 });
      assert.equal(repeat.changedCount, 0); assert.deepEqual(await versions(), repeatVersions);
      runs.push({ runId: applied.runId!, proof });
      outcomes.push({ order: order.join(' then '), phase, targetCount: applied.targetCount, matchedIds: expectedMatched,
        changedLAIds: applied.changes.filter(change => before.find(row => row.id === change.id)?.state === 'LA').map(change => change.id),
        totalSourceFieldChanges: applied.changedCount, phaseSkipped: applied.phaseSkipped,
        skippedBytesAndXminPreserved: true, entireCatalogStaleGuard: true, repeatChanges: repeat.changedCount });
      await writeFile(evidence + '/' + order.join('-') + '-' + phase + '-apply.json', JSON.stringify(applied, null, 2));
    }
    const both = await snapshot();
    for (const row of both.filter(row => row.state === 'LA' && row.date.startsWith('2026-11-03'))) {
      assert.equal(row.official_results_source.status, 'published'); assert.equal(row.official_results_source.electionPhase, row.type);
    }
    const oldest = runs[0];
    await refusal(() => syncOfficialResults(pool, { rollbackRunId: oldest.runId }), /catalog changed/);
    for (const run of [...runs].reverse()) {
      const dry = await syncOfficialResults(pool, { rollbackRunId: run.runId });
      await syncOfficialResults(pool, { mode: 'apply', rollbackRunId: run.runId, expectedManifestSha256: run.proof.manifestSha256,
        expectedPreimageSha256: dry.preimageSha256 });
    }
    assert.equal(catalogHash(await snapshot()), catalogHash(beforeOrder));
  }
  await pool.query('DELETE FROM elections WHERE id=13');
  report.zeroMatchingState = await refusal(() => syncOfficialResults(pool, fixtures.general), /No November 3 receiving elections.*LA/);
  report.orders = outcomes;
  report.outcome = 'Worked';
} catch (error) { report.error = (error as Error).message; process.exitCode = 1; }
finally {
  await pool.end();
  const after = await loadResultsManifest('/review/data/official-results/2026-11-03.json');
  assert.equal(after.manifestSha256, baseline.manifestSha256);
  report.currentManifestUnchanged = true;
  await writeFile(evidence + '/phase-routing-receipt.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
