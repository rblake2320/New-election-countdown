/** Reviewed official general-list manifest; default database-enforced read-only. */
import { config } from 'dotenv';
import { readFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import pg from 'pg';
import { parseNomineeManifest, runNomineeRefresh } from '../server/candidate-nominee-sync';
import { persistFecManifest } from '../server/fec-source-artifacts';
config({path:process.env.ELECTION_ENV_FILE||'.env'});
let stage='configuration';
async function main(){
  const args=process.argv.slice(2),file=args.find(a=>!a.startsWith('--'));
  if(!file || args.some(a=>a!==file && !['--apply','--dry-run'].includes(a) && !/^--expect-sha256=[a-f0-9]{64}$/.test(a)))throw new Error('Pass one reviewed manifest and --dry-run (default), or --apply --expect-sha256=<hash>');
  const apply=args.includes('--apply');if(apply&&args.includes('--dry-run'))throw new Error('Choose apply or dry-run');
  const expected=args.find(a=>a.startsWith('--expect-sha256='))?.slice('--expect-sha256='.length);
  if(apply&&!expected)throw new Error('Apply requires reviewed manifest SHA256');
  stage='manifest-load';
  const bytes=readFileSync(resolve(file));if(bytes.length>10*1024*1024)throw new Error('Manifest exceeds byte limit');
  const sha=createHash('sha256').update(bytes).digest('hex');if(expected&&expected!==sha)throw new Error('Manifest changed since review');
  stage='manifest-validation';
  const manifest=parseNomineeManifest(JSON.parse(bytes.toString('utf8')));
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');
  // Local path creation must fail before any database effect, not after commit.
  stage='receipt-directory';
  const directory=resolve('election-data-2026');mkdirSync(directory,{recursive:true});
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:10_000,options:apply?undefined:'-c default_transaction_read_only=on'});
  try{
    stage='database-sync';
    const plan=await runNomineeRefresh(pool,manifest,sha,apply);
    const plannedNew=apply?plan.candidateInserts??0:plan.actions.filter(a=>a.candidateId==null).length;
    const receipt={mode:apply?'applied':'read-only-dry-run',database_audit_id:plan.auditId??null,manifest_sha256:sha,sourceIds:manifest.sources.map(s=>s.id),records:manifest.candidates.length,candidateInserts:plan.candidateInserts??null,sourceChanges:plan.sourceChanges??null,plannedNew,plannedExisting:plan.actions.length-plannedNew,unresolved:plan.unresolved,ballotStatusChanged:false,profilesOverwritten:false};
    stage='receipt-file';
    const persisted=persistFecManifest(directory,sha,receipt);
    console.log(JSON.stringify({...persisted,...receipt}));
  }finally{await pool.end();}
}
main().catch(error=>{const code=(error as {code?:string}).code;console.error(JSON.stringify({outcome:'failed',stage,code,message:code?`General-list ${stage} operation failed`:error instanceof Error?error.message:'General-list refresh failed'}));process.exitCode=1;});
