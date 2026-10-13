import pg from 'pg';
import {parse} from 'dotenv';
import {readFileSync,writeFileSync} from 'node:fs';
const database='et_sol_data_6c78a3148c6b';
const env=parse(readFileSync('D:/projects/New-election-countdown/.env'));
const u=new URL(env.DATABASE_URL);if(!['localhost','127.0.0.1'].includes(u.hostname)||u.port!=='5432')throw new Error('Exact private loopback required');
u.pathname='/'+database;u.searchParams.set('options','-c default_transaction_read_only=on -c timezone=UTC');
const pool=new pg.Pool({connectionString:u.toString()});
try{
 const actual=(await pool.query("SELECT current_database() AS database,current_setting('transaction_read_only') AS readonly")).rows[0];if(actual.database!==database||actual.readonly!=='on')throw new Error('Exact read-only private guard failed');
 const receipt=JSON.parse(readFileSync('artifacts/source-gap-private/private-apply-receipt.json'));
 const proposed=receipt.plan.rows.filter(r=>r.candidateId===null).map(r=>({...r,transientPrivateApplyId:receipt.apply.rows.find(a=>a.name===r.name&&a.electionId===r.electionId).candidateId}));
 const rows=(await pool.query(`SELECT c.id,c.election_id,c.name,c.party,c.fec_candidate_id,c.fec_status,c.data_source,c.source_status,s.source_url,s.source_file_sha256,s.metadata
 FROM candidates c LEFT JOIN candidate_source_records s ON s.candidate_id=c.id AND s.source_layer='fec_registration' AND s.is_current=true WHERE c.election_id=ANY($1::int[]) ORDER BY c.election_id,c.id`,[[423,424,425]])).rows;
 const out={outcome:'Worked',readOnly:true,database,capturedAt:new Date().toISOString(),newActions:proposed,currentCandidates:rows};
 writeFileSync('artifacts/source-gap-private/identity-readonly-summary.json',JSON.stringify(out,null,2)+'\n');
 console.log(JSON.stringify({newActions:proposed,currentFecCandidates:rows.map(r=>({id:r.id,electionId:r.election_id,name:r.name,party:r.party,fecId:r.fec_candidate_id,status:r.fec_status}))},null,2));
}finally{await pool.end();}
