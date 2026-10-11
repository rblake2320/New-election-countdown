import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { OfficialResultsError } from './official-results-error';
import { officialResultsFieldsSchema, officialResultsSourceSchema } from '../shared/official-results';
import { canonical, sha256, RESULTS_DATE, RESULTS_STATES, sourceForElection, resultsManifestSchema, type ResultsManifest } from './official-results-manifest';

export const RESULTS_WRITER_LOCK = 2026110301;
type CatalogRow = Record<string, unknown> & { id: number; state: string; date: string; type: string };
type Fields = { official_results_url: unknown; official_results_source: unknown };
type Change = { id: number; before: Fields; after: Fields };
export interface ResultsPlan {
  version: 1; operation: 'apply' | 'rollback'; manifestSha256: string;
  preimageSha256: string; postimageSha256: string; targetCount: number;
  stateCounts: Record<string, number>; changes: Change[]; rollbackOf: string | null;
}
export interface ResultsReceipt extends ResultsPlan {
  mode: 'dry-run' | 'apply'; changedCount: number; runId: string | null;
}
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const fields = (row: Record<string, unknown>): Fields => ({
  official_results_url: row.official_results_url ?? null,
  official_results_source: row.official_results_source ?? null,
});
const jsonParameter = (value: unknown) => value === null ? null : JSON.stringify(value);
export function catalogHash(rows: CatalogRow[]): string { return sha256(canonical(rows)); }
function afterChanges(rows: CatalogRow[], changes: Change[]): CatalogRow[] {
  const updates = new Map(changes.map(change => [change.id, change.after]));
  return rows.map(row => updates.has(row.id) ? { ...row, ...updates.get(row.id)! } : row);
}
export function planResults(rows: CatalogRow[], manifest: ResultsManifest, manifestSha256: string): ResultsPlan {
  digestSchema.parse(manifestSha256);
  manifest = resultsManifestSchema.parse(manifest);
  const entries = new Map(manifest.states.map(entry => [entry.state, entry]));
  const stateCounts = Object.fromEntries(RESULTS_STATES.map(state => [state, 0]));
  const changes: Change[] = [];
  for (const row of rows) {
    if (row.date.slice(0, 10) !== RESULTS_DATE || !entries.has(row.state)) continue;
    stateCounts[row.state]++;
    const entry = entries.get(row.state)!;
    const source = sourceForElection(entry, row.type);
    const before = fields(row);
    if (before.official_results_source !== null) {
      const previous = officialResultsSourceSchema.parse(before.official_results_source);
      if (new Date(previous.checkedAt).getTime() > new Date(source.checkedAt).getTime()) {
        throw new OfficialResultsError(`Newer results-source evidence exists for election ${row.id}`);
      }
    }
    const after: Fields = { official_results_url: entry.officialResultsUrl, official_results_source: source };
    if (canonical(before) !== canonical(after)) changes.push({ id: row.id, before, after });
  }
  const missing = RESULTS_STATES.filter(state => stateCounts[state] === 0);
  if (missing.length) throw new OfficialResultsError('No November 3 receiving elections for reviewed states: ' + missing.join(','));
  return { version: 1, operation: 'apply', manifestSha256,
    preimageSha256: catalogHash(rows), postimageSha256: catalogHash(afterChanges(rows, changes)),
    targetCount: Object.values(stateCounts).reduce((sum, count) => sum + count, 0),
    stateCounts, changes, rollbackOf: null };
}
async function snapshot(client: PoolClient): Promise<CatalogRow[]> {
  const result = await client.query<{ row: CatalogRow }>(
    'SELECT to_jsonb(e) AS row FROM public.elections e ORDER BY e.id');
  return result.rows.map(record => record.row);
}
async function requireMigration(client: PoolClient): Promise<void> {
  const result = await client.query(`SELECT to_regclass('public.elections') AS elections,
    to_regclass('public.official_results_sync_runs') AS audit,
    (SELECT count(*)::int FROM information_schema.columns WHERE table_schema='public'
      AND table_name='elections' AND is_nullable='YES' AND
      ((column_name='official_results_url' AND data_type='text') OR
       (column_name='official_results_source' AND data_type='jsonb'))) AS columns`);
  if (!result.rows[0].elections || !result.rows[0].audit || result.rows[0].columns !== 2) {
    throw new OfficialResultsError('Run migrations/20261011_official_results_routes.sql before source sync');
  }
}
async function rollbackPlan(client: PoolClient, rows: CatalogRow[], runId: string): Promise<ResultsPlan> {
  const result = await client.query('SELECT * FROM public.official_results_sync_runs WHERE id=$1', [runId]);
  const run = result.rows[0];
  if (!run || run.operation !== 'apply') throw new OfficialResultsError('Rollback requires a committed apply run');
  const rolledBack = await client.query('SELECT id FROM public.official_results_sync_runs WHERE rollback_of=$1', [runId]);
  if (rolledBack.rowCount) throw new OfficialResultsError('Apply run has already been rolled back');
  if (catalogHash(rows) !== run.postimage_sha256) throw new OfficialResultsError('Rollback refused: catalog changed after this run');
  const changes: Change[] = run.changes.map((change: Change) => ({ id: change.id, before: change.after, after: change.before }));
  const postimageSha256 = catalogHash(afterChanges(rows, changes));
  if (postimageSha256 !== run.preimage_sha256) throw new OfficialResultsError('Rollback audit preimage mismatch');
  return { version: 1, operation: 'rollback', manifestSha256: run.manifest_sha256,
    preimageSha256: run.postimage_sha256, postimageSha256,
    targetCount: run.target_count, stateCounts: {}, changes, rollbackOf: runId };
}
export interface SyncResultsOptions {
  mode?: 'dry-run' | 'apply'; manifest?: ResultsManifest; manifestSha256?: string;
  expectedManifestSha256?: string; expectedPreimageSha256?: string;
  rollbackRunId?: string;
  // Acceptance-only fault injection. Not exposed by the production CLI.
  faultAfterWrites?: number;
}
export async function syncOfficialResults(pool: Pool, options: SyncResultsOptions): Promise<ResultsReceipt> {
  const mode = options.mode ?? 'dry-run';
  if (mode === 'apply') {
    digestSchema.parse(options.expectedManifestSha256);
    digestSchema.parse(options.expectedPreimageSha256);
  }
  if (!options.rollbackRunId && (!options.manifest || !options.manifestSha256)) throw new OfficialResultsError('Source manifest required');
  if (options.rollbackRunId && options.manifest) throw new OfficialResultsError('Rollback does not consume a new source manifest');
  const client = await pool.connect();
  try {
    await client.query(mode === 'apply' ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    await client.query("SET LOCAL statement_timeout = '30s'");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await requireMigration(client);
    if (mode === 'apply') {
      await client.query('SELECT pg_advisory_xact_lock($1)', [RESULTS_WRITER_LOCK]);
      // Also exclude election writers that do not participate in the shared lock.
      await client.query('LOCK TABLE public.elections IN SHARE ROW EXCLUSIVE MODE');
    }
    const before = await snapshot(client);
    const plan = options.rollbackRunId
      ? await rollbackPlan(client, before, options.rollbackRunId)
      : planResults(before, options.manifest!, options.manifestSha256!);
    if (mode === 'apply' && options.expectedManifestSha256 !== plan.manifestSha256) throw new OfficialResultsError('Manifest SHA guard rejected this apply');
    if (mode === 'apply' && options.expectedPreimageSha256 !== plan.preimageSha256) throw new OfficialResultsError('Catalog preimage guard rejected this apply');
    const runId = mode === 'apply' ? randomUUID() : null;
    if (mode === 'apply') {
      let written = 0;
      for (const change of plan.changes) {
        officialResultsFieldsSchema.parse({ officialResultsUrl: change.after.official_results_url,
          officialResultsSource: change.after.official_results_source });
        const result = await client.query(`UPDATE public.elections
          SET official_results_url=$1, official_results_source=$2::jsonb WHERE id=$3
          AND official_results_url IS NOT DISTINCT FROM $4
          AND official_results_source IS NOT DISTINCT FROM $5::jsonb RETURNING id`,
        [change.after.official_results_url, jsonParameter(change.after.official_results_source), change.id,
          change.before.official_results_url, jsonParameter(change.before.official_results_source)]);
        if (result.rowCount !== 1) throw new OfficialResultsError('Results fields changed while applying election ' + change.id);
        if (++written === options.faultAfterWrites) throw new OfficialResultsError('Injected C6 rollback acceptance failure');
      }
      const after = await snapshot(client);
      if (catalogHash(after) !== plan.postimageSha256) throw new OfficialResultsError('Postimage differs: unrelated fields or catalog membership changed');
      await client.query(`INSERT INTO public.official_results_sync_runs
        (id,operation,manifest_sha256,preimage_sha256,postimage_sha256,target_count,changed_count,changes,rollback_of)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
      [runId, plan.operation, plan.manifestSha256, plan.preimageSha256, plan.postimageSha256,
        plan.targetCount, plan.changes.length, JSON.stringify(plan.changes), plan.rollbackOf]);
      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }
    return { ...plan, mode, changedCount: plan.changes.length, runId };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* Preserve the first failure. */ }
    throw error;
  } finally { client.release(); }
}
