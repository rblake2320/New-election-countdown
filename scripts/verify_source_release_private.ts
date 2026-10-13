/** Reuses the exact protected original snapshot; private prefix required before any access. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'dotenv';
import pg from 'pg';
import { privateConnection, main } from './source_data_release';
import { requirePrivateDatabase,loadPrivateSnapshot,rollbackSourceRows } from './source_data_rollback';
const database=process.argv[2];requirePrivateDatabase(database);
const original=JSON.parse(readFileSync('artifacts/source-data-release/rehearsal-1.json','utf8'));
if(original.database!==database||original.outcome!=='Worked')throw new Error('Original private receipt mismatch');
const directory=join('C:/.codex/private/election-source-backups',original.privateBackupRunId);
const env=parse(readFileSync(process.env.ELECTION_ENV_FILE??'D:/projects/New-election-countdown/.env'));
const pool=new pg.Pool({connectionString:privateConnection(env.DATABASE_URL,database),max:1});
console.log(JSON.stringify({privateEndpoint:(await pool.query('SELECT current_database() AS database,inet_server_addr()::text AS address,inet_server_port() AS port')).rows[0]}));
try{const restored=await rollbackSourceRows(pool,loadPrivateSnapshot(join(directory,'before.json')),loadPrivateSnapshot(join(directory,'final-post.json')));console.log(JSON.stringify({scenario:'restore exact original before generic pipeline retake',hash:restored.hash}));}finally{await pool.end();}
await main(['--database',database,'--fec-zip',process.argv[3],'--receipt','artifacts/source-data-release/exported-pipeline-rehearsal.json','--rehearse']);
