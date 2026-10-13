/** Owner-authorized C source release only; deploy/result posting are separate. */
import { config } from 'dotenv';
import pg from 'pg';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { loadReviewedReleaseSources, captureSourceSnapshot, runSourceRelease, stateCoverage } from './source_data_release';
import { guard, snapshot, createPrivateDirectory, savePrivateSnapshot, rollbackSourceRows, SourceReleaseRefused, sourceHash, type SourceSnapshot } from './source_data_rollback';

const EXPECTED = 'f96fbee688ecb420d9e91b02558aede045b9d405d145b972deb5636053bf3da0';
const args = process.argv.slice(2);
if (args.length !== 3 || args[0] !== '--apply-owner-approved-data' || args[1] !== '--expect-preimage-sha256' || args[2] !== EXPECTED) throw new Error('Explicit owner-approved source-data apply and exact reviewed preimage required');
if (!process.env.ELECTION_ENV_FILE) throw new Error('Explicit approved source environment is required');
config({ path: process.env.ELECTION_ENV_FILE, quiet: true });
const target = new URL(process.env.DATABASE_URL ?? '');
if (!['postgres:', 'postgresql:'].includes(target.protocol) || !['localhost','127.0.0.1'].includes(target.hostname) || (target.port || '5432') !== '5432' || target.pathname !== '/elections') throw new Error('Exact approved local5432/elections target required');
const authorize = (database: string): void => { if (database !== 'elections') throw new SourceReleaseRefused('UNAPPROVED_DATABASE','Only the explicitly approved elections source target is writable'); };
const receiptPath = resolve('artifacts/data-deployment/shared-apply-20261013.json');
if (existsSync(receiptPath)) throw new Error('Retained apply receipt already exists; inspect it before any retry');
const backupReceipt = JSON.parse(readFileSync('artifacts/data-deployment/backup-receipt.json', 'utf8'));
if (backupReceipt.outcome !== 'Worked' || backupReceipt.privateRestore !== 'Worked' || backupReceipt.dpapiReadback !== 'identical') throw new Error('Verified protected backup and fresh private restore required');
const rehearsal = JSON.parse(readFileSync('artifacts/source-data-release/final-per-state.json', 'utf8'));
if (!rehearsal.rollbackExact || !rehearsal.rollbackFaultAtomic || !rehearsal.actualPostimageDriftRefused || rehearsal.baselineSourceHash !== EXPECTED) throw new Error('Exact private apply/repeat/rollback acceptance required');
const pool = new pg.Pool({ connectionString: target.toString(), max: 2, connectionTimeoutMillis: 10000 });
const sources = await loadReviewedReleaseSources('C:/Users/techai/.codex/tmp/sol-fec-first-physical/artifacts/fec-first/cn26.zip');
const backup = join('C:/.codex/private/election-source-backups', 'shared-' + randomUUID());
createPrivateDirectory(backup);
mkdirSync(resolve(receiptPath, '..'), { recursive: true });
const receipt: Record<string, any> = { mode:'owner-approved-shared-source-apply', database:'local5432/elections', startedAt:new Date().toISOString(), stages:[], backupVerified:true, reviewedPreimageSha256:EXPECTED, rawRowBackupDirectory:backup, sourceManifestSha256:sources.manifestSha, fecZipSha256:sources.fecSha, resultsManifestSha256:sources.links.manifestSha256, deploymentPerformed:false };
const retain = (): void => writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { mode:0o600 });
let before: SourceSnapshot | null = null;
try {
  // Prove no source rows drifted before additive schema preparation.
  const c = await pool.connect();
  try {
    await guard(c, 'elections', authorize);
    await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const original = await snapshot(c, 'elections', true, authorize);
    await c.query('ROLLBACK');
    if (original.hash !== EXPECTED) throw new SourceReleaseRefused('PREIMAGE_DRIFT','Current shared rows differ from the published private rehearsal baseline');
    savePrivateSnapshot(join(backup, 'pre-schema.json'), original);
    const migrations = ['20261011_candidate_source_records.sql','20261011_general_candidate_list_snapshots.sql','20261011_la_house_catalog_corrections.sql','20261011_official_results_routes.sql','20261011_poll_hours_metadata.sql'];
    for (const file of migrations) await c.query(readFileSync(join('migrations',file),'utf8'));
    receipt.sourceMigrations = migrations;
  } finally { c.release(); }
  before = await captureSourceSnapshot(pool,'elections',authorize);
  if (before.hash !== EXPECTED) throw new SourceReleaseRefused('SCHEMA_CHANGED_SOURCE_ROWS','Additive source schema changed original data');
  savePrivateSnapshot(join(backup,'before.json'), before); retain();
  const result = await runSourceRelease(pool,{database:'elections',authorizeDatabase:authorize,expectedPreimageSha256:EXPECTED},sources,'shared-apply', stage => { receipt.stages.push(stage); retain(); });
  savePrivateSnapshot(join(backup,'after.json'),result.after);
  receipt.summary = result.summary; receipt.perState = stateCoverage(result.after); receipt.postimageSha256 = result.after.hash;
  const expectedStates = Object.fromEntries(rehearsal.states.map((row: { state: string; after: unknown }) => [row.state, row.after]));
  if (expectedStates && sourceHash(receipt.perState) !== sourceHash(expectedStates)) throw new SourceReleaseRefused('RECEIVING_COUNTS_DIFFER','Shared per-state counts differ from the actual private rehearsal');
  receipt.outcome='Worked'; receipt.finishedAt=new Date().toISOString(); retain();
  console.log(JSON.stringify({outcome:receipt.outcome,summary:receipt.summary,receipt:receiptPath,deploymentPerformed:false}));
} catch (error) {
  receipt.outcome='Failed'; receipt.errorCode=error instanceof SourceReleaseRefused?error.code:'SHARED_SOURCE_RELEASE_ERROR';
  if (before) {
    const current = await captureSourceSnapshot(pool,'elections',authorize);
    savePrivateSnapshot(join(backup,'failed-post.json'),current);
    receipt.rollback=await rollbackSourceRows(pool,before,current,{authorizeDatabase:authorize});
    receipt.rollbackExact=receipt.rollback.hash===before.hash;
  }
  receipt.finishedAt=new Date().toISOString(); retain();
  console.error(JSON.stringify({outcome:'Failed',code:receipt.errorCode,rollbackExact:receipt.rollbackExact,receipt:receiptPath})); process.exitCode=1;
} finally { await pool.end(); }
