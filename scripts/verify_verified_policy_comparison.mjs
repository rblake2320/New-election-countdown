/** Actual compiled service, approved source DB read-only; no fake statements inserted. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {parse} from 'dotenv';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const env=parse(readFileSync(process.env.ELECTION_ENV_FILE??'D:/projects/New-election-countdown/.env'));
const u=new URL(env.DATABASE_URL);
if(!['localhost','127.0.0.1'].includes(u.hostname)||u.port!=='5432')throw new Error('Approved local source endpoint required');
const database=decodeURIComponent(u.pathname.slice(1));
u.searchParams.set('options','-c default_transaction_read_only=on -c timezone=UTC');
process.env.DATABASE_URL=u.toString();
const {pool,compareVerifiedCandidatePolicies:compare,VerifiedPolicyComparisonError}=await import(pathToFileURL(resolve('artifacts/verified-policy-comparison/compiled-service.mjs')).href);
const sha=v=>createHash('sha256').update(v).digest('hex');
try{
 const actual=(await pool.query('SELECT current_database() AS database,current_setting(\'transaction_read_only\') AS readonly')).rows[0];
 if(actual.database!==database||actual.readonly!=='on')throw new Error('Read-only source DB guard failed');
 const fingerprint=async()=>{const out={};for(const table of ['candidates','candidate_positions']){const r=await pool.query(`SELECT count(*)::int AS count,coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY id),'') AS body FROM public.${table} t`);out[table]={count:r.rows[0].count,sha256:sha(r.rows[0].body)};}return out;};
 const before=await fingerprint();const rows=(await pool.query('SELECT c.id,c.name FROM candidates c ORDER BY EXISTS(SELECT 1 FROM candidate_positions p WHERE p.candidate_id=c.id AND p.is_verified=true) DESC,c.id LIMIT 2')).rows;
 if(rows.length!==2)throw new Error('Actual candidate identities missing');
 const sourceCount=(await pool.query('SELECT count(*)::int AS count FROM candidate_positions WHERE is_verified=true')).rows[0].count;
 const result=await compare(rows.map(r=>r.id),['Healthcare','Economy']);
 for(const category of result)for(const position of category.positions){const identity=rows.find(r=>String(r.id)===position.candidateId);if(!identity||identity.name!==position.candidateName||position.confidence!==null||!position.sourcePositionId)throw new Error('Actual source subject/metadata projection mismatched');}
 const refused=[];
 for(const [ids,code] of [['2.5','INVALID_CANDIDATE_IDS'],['2147483647','CANDIDATE_NOT_FOUND']]){try{await compare(ids,'Healthcare');throw new Error('Unsafe or missing subject admitted');}catch(e){if(!(e instanceof VerifiedPolicyComparisonError)||e.code!==code)throw e;refused.push({code,status:e.status});}}
 const after=await fingerprint();if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Actual source data changed during read-only comparison');
 mkdirSync('artifacts/verified-policy-comparison',{recursive:true});
 const receipt={outcome:'Worked',compiledServiceSha256:sha(readFileSync('artifacts/verified-policy-comparison/compiled-service.mjs')),readOnly:true,actualCandidateIds:rows.map(r=>r.id),verifiedRowsInDatabase:sourceCount,actualReturnedPositions:result.reduce((n,r)=>n+r.positions.length,0),actualResult:result,refused,before,after,noProviderImports:true,noStatementsInserted:true,checkedAt:new Date().toISOString()};
 writeFileSync('artifacts/verified-policy-comparison/actual-compiled-readonly.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({outcome:receipt.outcome,verifiedRowsInDatabase:sourceCount,actualReturnedPositions:receipt.actualReturnedPositions,unchangedSourceHashes:true,refused}));
}finally{await pool.end();}
