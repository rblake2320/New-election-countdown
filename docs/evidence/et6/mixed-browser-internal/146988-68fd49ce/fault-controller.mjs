// Controlled internal health-row fixture only. No external outage is claimed.
import pg from 'pg';
import { writeFile } from 'node:fs/promises';
const marker = '/tmp/et6-mixed-state.json';
const url = new URL(process.env.DATABASE_URL ?? '');
const expectedHost = process.env.ET6_EXPECTED_DB_HOST;
if (!/^et6-prod-\d+-[a-f0-9]{8}-db$/.test(url.hostname) || url.hostname !== expectedHost || url.port !== '5432' || url.pathname !== '/et6_receiving' || url.search || url.hash)
  throw new Error('Refuse non-generated or unexpected internal receiving database');
const holdSeconds = Number(process.env.ET6_RECEIVING_HOLD_SECONDS ?? 150);
if (!Number.isInteger(holdSeconds) || holdSeconds < 0 || holdSeconds > 600) throw new Error('Hold must be 0..600 seconds');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const receipt = { startedAt: new Date().toISOString(), scope: 'Controlled internal NC24 source-health fixture; no external outage claim', outcome: 'Running', checks: {} };
let inserted, transaction = false;
const path = '/api/results?date=2026-11-03';
const request = async (path, headers = {}) => {
  const response = await fetch('http://127.0.0.1:5000' + path, { headers, signal: AbortSignal.timeout(15000) });
  const text = await response.text();
  return { status: response.status, etag: response.headers.get('etag'), body: text ? JSON.parse(text) : null };
};
const count = async table => (await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE election_id=24`)).rows[0].n;
const healthy = r => r.status === 200 && r.body?.results?.length === 506 && (r.body?.errors ?? []).length === 0 && r.body.results.filter(x => x.electionId === 24).length === 1;
function check(name, value) { receipt.checks[name] = Boolean(value); if (!value) throw new Error(name); }
try {
  // One connection pool client is required for transaction/row lock ownership.
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); transaction = true;
    const target = (await client.query("SELECT id,state,date::date::text AS date,type,level,title,official_results_source FROM elections WHERE id=24 FOR UPDATE")).rows[0];
    check('exact NC24 current context', target?.id === 24 && target.state === 'NC' && target.date === '2026-11-03' && typeof target.official_results_source?.publisher === 'string' && target.official_results_source.publisher.length > 0);
    receipt.target = target;
    const counts = (await client.query('SELECT (SELECT count(*)::int FROM election_result_reports WHERE election_id=24) reports, (SELECT count(*)::int FROM result_source_health WHERE election_id=24) health')).rows[0];
    receipt.beforeCounts = counts;
    check('initial report0 health0', counts.reports === 0 && counts.health === 0);
    receipt.before = await request(path);
    check('initial date506 noerrors', healthy(receipt.before));
    check('initial etag present', Boolean(receipt.before.etag));
    inserted = (await client.query(`INSERT INTO result_source_health(election_id,source_id,context_state,context_election_date,context_type,context_level,context_office,outcome,automatic,ttl_seconds,last_attempt_at,last_success_at,stale_since)
      SELECT id,official_results_source->>'publisher',state,date::date,type,level,title,'failed',true,90,clock_timestamp(),NULL,clock_timestamp() FROM elections WHERE id=24 AND state='NC'
      RETURNING to_jsonb(result_source_health) AS row`)).rows[0]?.row;
    check('one controlled health row inserted', Boolean(inserted));
    await client.query('COMMIT'); transaction = false;
  } catch (error) {
    if (transaction) { await client.query('ROLLBACK'); transaction = false; inserted = undefined; }
    throw error;
  } finally { client.release(); }
  receipt.inserted = inserted; // PostgreSQL JSON retains timestamp microseconds; never round-trip through JS Date.
  receipt.failed = await request(path, { 'If-None-Match': receipt.before.etag });
  receipt.singleFailed = await request('/api/elections/24/results');
  receipt.cached = await request(path, { 'If-None-Match': receipt.failed.etag ?? '' });
  check('failed date505 plus NC24 source_unavailable', receipt.failed.status === 200 && receipt.failed.body?.results?.length === 505 && !receipt.failed.body.results.some(x => x.electionId === 24) && receipt.failed.body.errors?.length === 1 && receipt.failed.body.errors[0].electionId === 24 && receipt.failed.body.errors[0].code === 'source_unavailable');
  check('health change invalidates etag', Boolean(receipt.failed.etag) && receipt.failed.etag !== receipt.before.etag);
  check('single503', receipt.singleFailed.status === 503);
  check('unchanged mixed batch304', receipt.cached.status === 304 && receipt.cached.body === null);
  receipt.browserWindow = { startedAt: new Date().toISOString(), holdSeconds };
  const visible = { phase: 'failure-visible', ...receipt.browserWindow, electionId: 24, results: 505, errors: 1 };
  await writeFile(marker, JSON.stringify(visible));
  console.log(JSON.stringify(visible));
  await new Promise(resolve => setTimeout(resolve, holdSeconds * 1000));
} catch (error) { receipt.error = error.message; }
finally {
  try {
    if (inserted) {
      const deleted = await pool.query('DELETE FROM result_source_health AS h WHERE election_id=$1 AND source_id=$2 AND to_jsonb(h)=$3::jsonb RETURNING to_jsonb(h) AS row', [24, inserted.source_id, JSON.stringify(inserted)]);
      receipt.cleanup = { deletedRows: deleted.rowCount, exactReturnedRowMatched: deleted.rowCount === 1 };
      check('exact controlled row deleted', deleted.rowCount === 1);
      receipt.afterCounts = { reports: await count('election_result_reports'), health: await count('result_source_health') };
      check('restored report0 health0', receipt.afterCounts.reports === 0 && receipt.afterCounts.health === 0);
      receipt.after = await request(path, receipt.failed?.etag ? { 'If-None-Match': receipt.failed.etag } : {});
      check('recovered date506 noerrors', healthy(receipt.after));
      check('recovery invalidates failed etag', Boolean(receipt.after.etag) && receipt.after.etag !== receipt.failed?.etag);
      receipt.recoveryCached = await request(path, { 'If-None-Match': receipt.after.etag });
      check('recovered unchanged304', receipt.recoveryCached.status === 304 && receipt.recoveryCached.body === null);
      receipt.recoveredAt = new Date().toISOString();
      const recovered = { phase: 'recovered', at: receipt.recoveredAt, electionId: 24, results: 506, errors: 0 };
      await writeFile(marker, JSON.stringify(recovered));
      console.log(JSON.stringify(recovered));
    }
  } catch (error) { receipt.cleanupError = error.message; }
  try { await pool.end(); } catch (error) { receipt.poolCloseError = error.message; }
  receipt.outcome = inserted && !receipt.error && !receipt.cleanupError && !receipt.poolCloseError && Object.values(receipt.checks).every(Boolean) ? 'Worked' : 'Failed';
  receipt.completedAt = new Date().toISOString();
  if (receipt.outcome !== 'Worked') await writeFile(marker, JSON.stringify({ phase: 'failed', error: receipt.error, cleanupError: receipt.cleanupError })).catch(() => {});
  console.log(JSON.stringify(receipt));
  if (receipt.outcome !== 'Worked') process.exitCode = 1;
}
