import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,chownSync,chmodSync,unlinkSync,rmdirSync} from 'node:fs';
import {spawnSync,spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {pool} from '../server/db';
import {CongressImportService} from '../server/congress-import-service';
import {syncOfficialCongress,loadOfficialCongressSnapshot,congressHash,CONGRESS_WRITER_LOCK,LegacyCongressImportRefused,type CongressImportOptions,type LegacyRemovalPlan} from '../server/congress-official-import';

const target=new URL(process.env.DATABASE_URL??'');
assert.equal(target.pathname,'/et_congress_official_test');assert.equal(target.username,'et_congress_official_test');
const evidence=process.env.CONGRESS_EVIDENCE_DIR??'/evidence';
const checks:Array<Record<string,unknown>>=[];
const {snapshot,manifestSha256}=loadOfficialCongressSnapshot();
const state=async()=>{
  const q=await pool.query('SELECT to_jsonb(m) row,xmin::text xmin FROM public.congress_members m ORDER BY id');
  return {rows:q.rows.map(r=>r.row),xmin:q.rows.map(r=>[r.row.id,r.xmin])};
};
const same=async(before:Awaited<ReturnType<typeof state>>)=>assert.deepEqual(await state(),before);
const auditCount=async()=>Number((await pool.query('SELECT count(*) FROM public.congress_official_import_runs')).rows[0].count);
const opts=(preimageSha256:string,extra:CongressImportOptions={}):CongressImportOptions=>({mode:'apply',expectedManifestSha256:manifestSha256,expectedPreimageSha256:preimageSha256,...extra});
function cli(args:string[]){const r=spawnSync(process.execPath,['dist/sync_official_congress.js',...args],{env:process.env,encoding:'utf8'});return {status:r.status,stdout:r.stdout,stderr:r.stderr};}
try{
  const migration=readFileSync('migrations/20261011_congress_official_import.sql','utf8');await pool.query(migration);await pool.query(migration);
  checks.push({scenario:'additive-migration-twice',outcome:'Worked'});
  await pool.query('ALTER TABLE public.congress_members ADD COLUMN retained_note text');
  const first=snapshot.members[0];
  await pool.query(`INSERT INTO public.congress_members(bioguide_id,name,party,state,district,chamber,congress,created_at,updated_at,retained_note) VALUES
    ('IMPORT_1','SYNTHETIC_UNVERIFIED_LEGACY','R','FL','20','House',119,'2025-01-03','2025-01-03','SYNTHETIC_KEEP_LEGACY'),
    ('SYNTHETIC_OLD_2','SYNTHETIC_UNVERIFIED_SECOND','D','TX','23','House',119,'2025-01-03','2025-01-03','SYNTHETIC_KEEP_SECOND'),
    ('SYNTHETIC_HISTORY','SYNTHETIC_OTHER_CONGRESS','D','AL','01','House',118,'2024-01-03','2024-01-03','SYNTHETIC_KEEP_HISTORY')`);
  await pool.query('INSERT INTO public.congress_members(bioguide_id,name,party,state,district,chamber,congress,created_at,updated_at,retained_note) VALUES($1,$2,$3,$4,$5,$6,119,$7,$7,$8)',[first.bioguideId,'SYNTHETIC_OUTDATED_SOURCE_FIELD',first.partyRaw,first.state,first.district,first.chamber,'2025-01-03','SYNTHETIC_KEEP_UNKNOWN_COLUMN']);
  const original=await state();
  await assert.rejects(new CongressImportService().importFromCompleteDataset(),LegacyCongressImportRefused);await same(original);
  checks.push({scenario:'compiled-legacy-entrypoint-refuses-with-prior-rows-xmin-preserved',outcome:'Worked'});
  const dry=await syncOfficialCongress(pool);assert.equal(dry.insertedCount,538);assert.equal(dry.updatedCount,1);assert.equal(dry.changedCount,539);await same(original);assert.equal(await auditCount(),0);
  checks.push({scenario:'default-dry-run-no-member-audit-or-xmin-writes',outcome:'Worked',receipt:dry});
  await assert.rejects(syncOfficialCongress(pool,opts(dry.preimageSha256,{faultAfterWrites:100})),/injected write failure/);await same(original);assert.equal(await auditCount(),0);
  checks.push({scenario:'actual-PG-100-writes-then-error-full-rollback',outcome:'Worked',restoredRows:original.rows.length});
  await pool.query(`CREATE FUNCTION public.synthetic_bad_readback() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.bioguide_id='${snapshot.members[1].bioguideId}' THEN NEW.party='?'; END IF; RETURN NEW; END $$`);
  await pool.query('CREATE TRIGGER synthetic_bad_readback BEFORE INSERT ON congress_members FOR EACH ROW EXECUTE FUNCTION synthetic_bad_readback()');
  await assert.rejects(syncOfficialCongress(pool,opts(dry.preimageSha256)),/readback differs/);await same(original);assert.equal(await auditCount(),0);
  await pool.query('DROP TRIGGER synthetic_bad_readback ON congress_members');await pool.query('DROP FUNCTION public.synthetic_bad_readback()');
  checks.push({scenario:'real-PG-trigger-readback-mismatch-rolls-back-all-539-writes',outcome:'Worked'});
  const conflict=snapshot.members[2];await pool.query('INSERT INTO public.congress_members(bioguide_id,name,party,state,chamber,congress) VALUES($1,$2,$3,$4,$5,118)',[conflict.bioguideId,'SYNTHETIC_HISTORY_ID_COLLISION',conflict.partyRaw,conflict.state,conflict.chamber]);
  const conflicting=await state();await assert.rejects(syncOfficialCongress(pool),/another Congress/);await same(conflicting);await pool.query('DELETE FROM congress_members WHERE bioguide_id=$1',[conflict.bioguideId]);
  checks.push({scenario:'real-official-ID-collision-with-history-refuses-no-overwrite',outcome:'Worked'});
  const badPath=resolve(evidence,'wrong-snapshot.json');writeFileSync(badPath,JSON.stringify(snapshot));await assert.rejects(syncOfficialCongress(pool,{manifestPath:badPath}),/snapshot SHA/);await same(original);
  checks.push({scenario:'wrong-snapshot-bytes-refuse-no-DB-mutation',outcome:'Worked'});
  const cliDry=cli(['--receipt',resolve(evidence,'cli-default-dry.json')]);assert.equal(cliDry.status,0,cliDry.stderr);await same(original);
  const cliApply=cli(['--apply','--expect-manifest-sha',manifestSha256,'--expect-preimage-sha',dry.preimageSha256,'--receipt',resolve(evidence,'cli-apply.json')]);assert.equal(cliApply.status,0,cliApply.stderr);
  const applied=JSON.parse(readFileSync(resolve(evidence,'cli-apply.json'),'utf8'));assert.equal(applied.changedCount,539);assert.equal(applied.catalogComplete,false);assert.equal(applied.sourceCoverageComplete,true);assert.equal(applied.unreviewedLegacyRowIds.length,2);assert.equal(await auditCount(),1);
  const after=await state();for(const row of original.rows.filter(r=>r.bioguide_id!==first.bioguideId)){assert.deepEqual(after.rows.find(r=>r.id===row.id),row);assert.deepEqual(after.xmin.find(x=>x[0]===row.id),original.xmin.find(x=>x[0]===row.id));}
  const existing=after.rows.find(r=>r.bioguide_id===first.bioguideId)!;assert.equal(existing.retained_note,'SYNTHETIC_KEEP_UNKNOWN_COLUMN');assert.equal(existing.created_at,original.rows.find(r=>r.bioguide_id===first.bioguideId).created_at);assert.equal(existing.updated_at,original.rows.find(r=>r.bioguide_id===first.bioguideId).updated_at);
  assert.equal(after.rows.filter(r=>r.congress===119&&/^[A-Z]\d{6}$/.test(r.bioguide_id)).length,539);assert.equal(after.rows.some(r=>r.name==='(vacant)'),false);
  checks.push({scenario:'compiled-CLI-apply-539-real-IDs-with-legacy-history-fullfields-xmin-preserved',outcome:'Worked',receipt:applied,cliOutput:cliApply.stdout});
  const repeatDry=await syncOfficialCongress(pool);assert.equal(repeatDry.sourceCoverageComplete,true);assert.equal(repeatDry.catalogComplete,false);const repeat=await syncOfficialCongress(pool,opts(repeatDry.preimageSha256));assert.equal(repeat.changedCount,0);await same(after);
  checks.push({scenario:'repeat-zero-member-writes-full-xmin-unchanged',outcome:'Worked',auditOnlyRunId:repeat.runId});
  const staleDry=await syncOfficialCongress(pool);await pool.query("UPDATE congress_members SET retained_note='SYNTHETIC_STALE' WHERE bioguide_id='IMPORT_1'");const stale=await state();await assert.rejects(syncOfficialCongress(pool,opts(staleDry.preimageSha256)),/preimage changed/);await same(stale);
  checks.push({scenario:'stale-whole-catalog-unrelated-field-guard-refuses',outcome:'Worked'});
  const blocker=await pool.connect();await blocker.query('SELECT pg_advisory_lock($1)',[CONGRESS_WRITER_LOCK]);const lockedDry=await syncOfficialCongress(pool);let completed=false;const waiting=syncOfficialCongress(pool,opts(lockedDry.preimageSha256)).finally(()=>{completed=true;});await new Promise(r=>setTimeout(r,300));assert.equal(completed,false);const waitingLocks=await pool.query("SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND granted=false");assert.ok(Number(waitingLocks.rows[0].count)>0);await same(stale);await blocker.query('SELECT pg_advisory_unlock($1)',[CONGRESS_WRITER_LOCK]);blocker.release();assert.equal((await waiting).changedCount,0);await same(stale);
  checks.push({scenario:'Congress-writer-advisory-lock-really-blocks-then-releases',outcome:'Worked',waitingLocks:Number(waitingLocks.rows[0].count)});
  const currentDry=await syncOfficialCongress(pool);const current=await state();
  const plan:LegacyRemovalPlan={version:1,reviewed:true,rows:current.rows.filter(r=>r.congress===119&&!/^[A-Z]\d{6}$/.test(r.bioguide_id)).map(r=>({id:r.id,bioguideId:r.bioguide_id,rowSha256:congressHash(r)}))};
  const wrong=structuredClone(plan);wrong.rows[0].rowSha256='0'.repeat(64);await assert.rejects(syncOfficialCongress(pool,{legacyRemovalPlan:wrong}),/removal plan/);await same(current);
  await assert.rejects(syncOfficialCongress(pool,opts(currentDry.preimageSha256,{legacyRemovalPlan:plan})),/removal-plan SHA/);await same(current);
  const planSha=congressHash(plan);writeFileSync(resolve(evidence,'reviewed-private-legacy-removal-plan.json'),JSON.stringify(plan,null,2));
  await assert.rejects(syncOfficialCongress(pool,opts(currentDry.preimageSha256,{legacyRemovalPlan:plan,expectedLegacyRemovalPlanSha256:planSha,faultAfterWrites:1})),/injected/);await same(current);
  const removed=await syncOfficialCongress(pool,opts(currentDry.preimageSha256,{legacyRemovalPlan:plan,expectedLegacyRemovalPlanSha256:planSha}));assert.equal(removed.removedCount,2);assert.equal(removed.catalogComplete,true);const cleaned=await state();assert.equal(cleaned.rows.filter(r=>r.congress===119).length,539);assert.deepEqual(cleaned.rows.find(r=>r.congress===118),original.rows.find(r=>r.congress===118));
  checks.push({scenario:'only-exact-reviewed-plan-removes-two-private-legacy-rows-rollback-guarded',outcome:'Worked',receipt:removed});
  const validation=await new CongressImportService().validateImport();assert.equal(validation.isComplete,true);assert.equal(validation.total,540);assert.equal(validation.expectedCounts.total,539);
  checks.push({scenario:'compiled-service-counts-match-source-not535-people',outcome:'Worked',validation});
  const finalDry=await syncOfficialCongress(pool);const concurrent=await Promise.allSettled([syncOfficialCongress(pool,opts(finalDry.preimageSha256)),syncOfficialCongress(pool,opts(finalDry.preimageSha256))]);assert.ok(concurrent.some(r=>r.status==='fulfilled'));await same(cleaned);
  checks.push({scenario:'two-concurrent-repeat-applications-preserve-all-rows-and-xmin',outcome:'Worked',outcomes:concurrent.map(r=>r.status==='fulfilled'?{outcome:'Applied',changedCount:r.value.changedCount}:{outcome:'Refused',message:(r.reason as Error).message})});
  // Real Linux output permission failure after preflight/while DB writer waits.
  // The child runs nonroot; only this owned temporary directory is chmodded.
  await pool.query("UPDATE congress_members SET name='SYNTHETIC_POSTCOMMIT_SOURCE_FIELD' WHERE bioguide_id=$1",[first.bioguideId]);
  const exportDry=await syncOfficialCongress(pool);const directory=mkdtempSync(resolve(tmpdir(),'et-congress-export-'));chownSync(directory,1001,1001);chmodSync(directory,0o755);
  const exportFile=resolve(directory,'receipt.json');const guard=await pool.connect();await guard.query('SELECT pg_advisory_lock($1)',[CONGRESS_WRITER_LOCK]);
  const child=spawn(process.execPath,['dist/sync_official_congress.js','--apply','--expect-manifest-sha',manifestSha256,'--expect-preimage-sha',exportDry.preimageSha256,'--receipt',exportFile],{env:process.env,uid:1001,gid:1001});
  let output='',errorOutput='';child.stdout.on('data',b=>{output+=b;});child.stderr.on('data',b=>{errorOutput+=b;});const exited=new Promise<number|null>((done,reject)=>{child.on('error',reject);child.on('exit',done);});
  let blocked=false;for(let i=0;i<100;i++){const wait=await pool.query("SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND granted=false");if(Number(wait.rows[0].count)>0){blocked=true;break;}await new Promise(r=>setTimeout(r,20));}
  assert.equal(blocked,true,'CLI did not reach writer lock after receipt preflight');chmodSync(directory,0o555);await guard.query('SELECT pg_advisory_unlock($1)',[CONGRESS_WRITER_LOCK]);guard.release();const exportStatus=await exited;chmodSync(directory,0o755);
  const exportOutcome=JSON.parse(errorOutput.trim());assert.equal(exportStatus,1);assert.equal(exportOutcome.outcome,'Applied');assert.equal(exportOutcome.committed,true);assert.equal(exportOutcome.receiptExport,'Failed');assert.equal(exportOutcome.errorCode,'EACCES');assert.equal(exportOutcome.temporaryReceipt,null);
  const durable=await pool.query('SELECT receipt FROM congress_official_import_runs WHERE id=$1',[exportOutcome.runId]);assert.equal(durable.rows[0].receipt.committed,true);assert.equal(durable.rows[0].receipt.changedCount,1);
  assert.equal((await pool.query('SELECT name FROM congress_members WHERE bioguide_id=$1',[first.bioguideId])).rows[0].name,first.name);
  unlinkSync(exportFile);rmdirSync(directory);
  checks.push({scenario:'real-nonroot-postcommit-receipt-EACCES-reports-Applied-and-durable-audit-ID',outcome:'Worked',exportOutcome,stdout:output});
  const audits=await pool.query('SELECT id,manifest_sha256,receipt,preimage,postimage FROM congress_official_import_runs ORDER BY id');assert.ok(audits.rows.every(r=>r.manifest_sha256===manifestSha256&&r.receipt.committed===true));
  const receipt={outcome:'Worked',manifestSha256,sourceScope:'all_current_members_including_nonvoting',checks,auditRows:audits.rows.length,auditRowsSha256:congressHash(audits.rows),memberRows:cleaned.rows.length,contactsRetained:false,governmentFetchCalls:0,sharedWrites:0,fixtureScope:'Actual pinned government member projection; labelled synthetic legacy/history/fault records exist only in dedicated disposable PG.'};
  writeFileSync(resolve(evidence,'private-receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({outcome:'Worked',checks:checks.length,auditRows:audits.rows.length}));
}finally{await pool.end();}
