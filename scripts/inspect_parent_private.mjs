import './parent-route-private-env.mjs';
import pg from 'pg';
import { mkdirSync, writeFileSync } from 'node:fs';
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});
try {
 const identity=(await pool.query('SELECT current_database() AS database,inet_server_addr()::text AS address,inet_server_port() AS port')).rows[0];
 if(identity.database!=='et_sol_data_6c78a3148c6b'||identity.port!==5432)throw new Error('Actual private database identity refused');
 const columns=(await pool.query("SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1) ORDER BY table_name,ordinal_position",[['users','auth_sessions','candidate_positions','user_voting_intentions','elections','candidates','candidate_profiles']])).rows;
 const counts=[];for(const name of ['users','auth_sessions','candidate_positions','user_voting_intentions','elections','candidates','candidate_profiles']){
  if(columns.some(c=>c.table_name===name))counts.push({table:name,count:(await pool.query('SELECT count(*)::int AS n FROM '+name)).rows[0].n});
 }
 const receipt={outcome:'Worked',identity,columns,counts,noWrites:true};mkdirSync('artifacts/parent-route-private',{recursive:true});writeFileSync('artifacts/parent-route-private/preflight.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({outcome:'Worked',identity,counts}));
}finally{await pool.end();}
