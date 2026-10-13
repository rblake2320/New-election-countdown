/** Side-effect-free source snapshot/coverage library; no CLI dispatch. */
import type pg from 'pg';
import {guard,snapshot,requirePrivateDatabase,type SourceSnapshot,type DatabaseAuthorization} from './source_data_rollback';

export async function captureSourceSnapshot(pool:pg.Pool,database:string,authorize:DatabaseAuthorization=requirePrivateDatabase,allowMissing=false):Promise<SourceSnapshot>{
 const client=await pool.connect();
 try{await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const result=await snapshot(client,database,allowMissing,authorize);await client.query('ROLLBACK');return result;}
 catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
 finally{client.release();}
}

export function stateCoverage(s:SourceSnapshot):Record<string,Record<string,number>>{const out:Record<string,Record<string,number>>={};for(const e of s.tables.elections.filter(r=>String(r.date).slice(0,10)==='2026-11-03')){const state=String(e.state);out[state]??={elections:0,emptyElections:0,candidates:0,officialGeneralSourceRecords:0,officialListScopes:0,pollHoursRows:0,pollCloseUnknownRows:0,resultsMetadataRows:0,actualResultsURLRows:0};const o=out[state];o.elections++;const cs=s.tables.candidates.filter(c=>c.election_id===e.id);o.candidates+=cs.length;if(!cs.length)o.emptyElections++;const ids=new Set(cs.map(c=>c.id));o.officialGeneralSourceRecords+=s.tables.candidate_source_records.filter(r=>r.is_current&&r.source_layer==='general_candidate_list'&&ids.has(r.candidate_id)).length;o.officialListScopes+=s.tables.general_candidate_list_snapshots.filter(r=>r.is_current&&r.election_id===e.id).length;if(e.timezone&&e.poll_hours_basis)o.pollHoursRows++;if(e.polls_close==null)o.pollCloseUnknownRows++;if(e.official_results_source)o.resultsMetadataRows++;if(typeof e.official_results_url==='string'&&e.official_results_url.trim())o.actualResultsURLRows++;}return out;}
