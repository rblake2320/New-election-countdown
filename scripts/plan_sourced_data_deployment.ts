import { config } from 'dotenv';
import pg from 'pg';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { parseNomineeManifest, runNomineeRefresh } from '../server/candidate-nominee-sync';
import { runLouisianaHouseCorrection } from '../server/louisiana-house-catalog';
import { loadResultsManifest } from '../server/official-results-manifest';
import { syncOfficialResults } from '../server/official-results-sync';
import { pollHoursFor } from '../server/poll-hours-2026';

config({ path: process.env.ELECTION_ENV_FILE ?? '.env', quiet: true });
const destination = resolve(process.argv[2] ?? 'artifacts/data-deployment/current-dryrun.json');
const url = new URL(process.env.DATABASE_URL ?? '');
if (!['127.0.0.1','localhost','[::1]'].includes(url.hostname) || (url.port || '5432') !== '5432' || url.pathname !== '/elections') throw new Error('Shared dry-run requires the exact approved local elections target');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, options: '-c default_transaction_read_only=on', connectionTimeoutMillis: 10000 });
try {
  const identity = (await pool.query('SELECT current_database() AS database, current_setting(\'default_transaction_read_only\') AS read_only')).rows[0];
  if (identity.database !== 'elections' || identity.read_only !== 'on') throw new Error('Read-only database guard failed');
  const elections = (await pool.query(`SELECT e.id,e.state,e.title,e.type,e.level,e.date::text AS date,e.polls_open,e.polls_close,e.timezone,
      (SELECT count(*)::int FROM candidates c WHERE c.election_id=e.id) AS candidate_count,
      e.official_results_url,e.official_results_source
    FROM elections e WHERE e.date::date='2026-11-03' ORDER BY e.state,e.id`)).rows;
  const nomineePath = 'data/nominees/combined-2026-reviewed.json';
  const bytes = readFileSync(nomineePath);
  const manifestSha = createHash('sha256').update(bytes).digest('hex');
  const manifest = parseNomineeManifest(JSON.parse(bytes.toString('utf8')));
  const nominees = await runNomineeRefresh(pool, manifest, manifestSha, false);
  const catalog = await runLouisianaHouseCorrection(pool);
  const resultsManifest = await loadResultsManifest('data/official-results/2026-11-03.json');
  const links = await syncOfficialResults(pool, { ...resultsManifest, mode: 'dry-run' });
  const states: Record<string, unknown> = {};
  for (const state of [...new Set(elections.map(row => row.state))].sort()) {
    const races = elections.filter(row => row.state === state);
    const planned = nominees.actions.filter(action => action.record.state === state);
    const affected = new Set(planned.map(action => action.electionId));
    states[state] = {
      races: races.length, emptyBefore: races.filter(row => row.candidate_count === 0).length,
      plannedNomineeRows: planned.length, plannedCandidateInserts: planned.filter(action => action.candidateId == null).length,
      emptyRacesReceivingCandidates: races.filter(row => row.candidate_count === 0 && affected.has(row.id)).length,
      resultsLinkChanges: links.changes.filter(change => races.some(row => row.id === change.id)).length,
      hours: pollHoursFor(state, races[0].title),
    };
  }
  const receipt = {
    mode: 'read-only-dry-run', checkedAt: new Date().toISOString(), database: 'local5432/elections',
    readOnlyEnforced: true, races: elections.length, emptyBefore: elections.filter(row => row.candidate_count === 0).length,
    nomineeManifest: { path: nomineePath, sha256: manifestSha, records: manifest.candidates.length, sources: manifest.sources.length },
    nomineePlan: { actions: nominees.actions.length, inserts: nominees.actions.filter(action => action.candidateId == null).length, unresolved: nominees.unresolved },
    catalogPlan: catalog, resultsLinks: links, perState: states,
    emptyRaceIdsReceivingCandidates: elections.filter(row => row.candidate_count === 0 && nominees.actions.some(action => action.electionId === row.id)).map(row => row.id),
    backupKeyConfigured: (process.env.BACKUP_ENCRYPTION_KEY?.length ?? 0) >= 32,
  };
  mkdirSync(resolve(destination, '..'), { recursive: true });
  writeFileSync(destination, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ outcome: 'Worked', mode: receipt.mode, races: receipt.races, emptyBefore: receipt.emptyBefore, nomineeRecords: manifest.candidates.length, candidateInserts: receipt.nomineePlan.inserts, emptyRacesReceivingCandidates: receipt.emptyRaceIdsReceivingCandidates.length, unresolved: nominees.unresolved.length, catalogChanges: catalog.changes.length, links: links.changedCount, backupKeyConfigured: receipt.backupKeyConfigured, receipt: destination }));
} catch (error) {
  const code = (error as { code?: string }).code;
  console.error(JSON.stringify({ outcome: 'Failed', code: code ?? 'PLAN_ERROR', reason: code ? 'Read-only plan failed; private diagnostics required' : error instanceof Error ? error.message : 'Plan refused' }));
  process.exitCode = 1;
} finally { await pool.end(); }
