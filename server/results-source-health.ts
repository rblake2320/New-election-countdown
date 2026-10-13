import type {Pool,PoolClient} from 'pg';
import {ResultReportError,stableStringify,type ElectionContext,type ResultsPayload} from './results-reports';

export const AUTOMATIC_RESULTS_TTL_SECONDS=90;
export type SourceHealthOutcome='success'|'failed'|'not_published';
export interface SourceHealthEvent {electionId:number;sourceId:string;context:ElectionContext;outcome:SourceHealthOutcome;automatic:boolean;signal?:AbortSignal}
export interface SourceHealthRow {
 election_id:number;source_id:string;context_state:string;context_election_date:Date|string;context_type:string;context_level:string;context_office:string;
 outcome:SourceHealthOutcome;automatic:boolean;ttl_seconds:number;last_attempt_at:Date|string;last_success_at:Date|string|null;stale_since:Date|string|null;health_version:number|string;
}
export interface HealthRead {electionId:number;sourceIds:string[];context:ElectionContext}
export const healthCacheVersion=Symbol('source-health-cache-version');
export function sourceHealthCacheKey(payload:ResultsPayload):string {return (payload as ResultsPayload&{[healthCacheVersion]?:string})[healthCacheVersion]??'untracked';}
export function assertResultsNotAborted(signal?:AbortSignal):void {if(signal?.aborted)throw new ResultReportError(503,'ingestion_aborted','Result ingestion was intentionally stopped');}
const stamp=(v:Date|string)=>new Date(v).toISOString();
export function decorateSourceHealth(payload:ResultsPayload,health:SourceHealthRow|null,automaticFallback=false,now=Date.now()):ResultsPayload {
 let staleSince=health?.stale_since?stamp(health.stale_since):null;
 if(!payload.reportId&&health?.outcome==='failed')throw new ResultReportError(503,'source_unavailable','The admitted official results source is unavailable',{electionId:payload.electionId,sourceId:health.source_id});
 const automatic=health?.automatic??automaticFallback;
 const last=health?.last_success_at??(health?.outcome==='not_published'?health.last_attempt_at:null)??payload.retrievedAt;
 if(automatic&&last){const expires=new Date(last).getTime()+(health?.ttl_seconds??AUTOMATIC_RESULTS_TTL_SECONDS)*1000;if(now>=expires){const ttlSince=new Date(expires).toISOString();if(!staleSince||ttlSince<staleSince)staleSince=ttlSince;}}
 const decorated={...payload,stale:staleSince!==null,staleSince};
 Object.defineProperty(decorated,healthCacheVersion,{value:`${health?.health_version??0}:${automatic?'automatic':'manual'}:${staleSince??'fresh'}`,enumerable:false});
 return decorated;
}
export async function writeSourceHealth(q:Pick<PoolClient,'query'>,event:SourceHealthEvent):Promise<void>{
 assertResultsNotAborted(event.signal);
 const c=event.context;
 // Caller binds event to the authoritative current race; this query also refuses an intervening edit.
 const outcome=await q.query(`INSERT INTO result_source_health(election_id,source_id,context_state,context_election_date,context_type,context_level,context_office,outcome,automatic,ttl_seconds,last_attempt_at,last_success_at,stale_since)
 SELECT e.id,$2,$3,$4::date,$5,$6,$7,$8,$9,$10,clock_timestamp(),CASE WHEN $8='success' THEN clock_timestamp() ELSE NULL END,
 CASE WHEN $8='failed' OR ($8='not_published' AND EXISTS(SELECT 1 FROM election_result_reports r WHERE r.election_id=e.id AND r.source_id=$2 AND r.context_state=$3 AND r.context_election_date=$4::date AND r.context_type=$5 AND r.context_level=$6 AND r.context_office=$7)) THEN clock_timestamp() ELSE NULL END
 FROM elections e WHERE e.id=$1 AND e.state=$3 AND e.date::date=$4::date AND e.type=$5 AND e.level=$6 AND e.title=$7
 ON CONFLICT(election_id,source_id,context_state,context_election_date,context_type,context_level,context_office) DO UPDATE SET
 outcome=EXCLUDED.outcome,automatic=EXCLUDED.automatic,ttl_seconds=EXCLUDED.ttl_seconds,last_attempt_at=EXCLUDED.last_attempt_at,
 last_success_at=CASE WHEN EXCLUDED.outcome='success' THEN EXCLUDED.last_success_at ELSE result_source_health.last_success_at END,
 stale_since=CASE WHEN EXCLUDED.outcome='success' THEN NULL WHEN EXCLUDED.stale_since IS NOT NULL THEN coalesce(result_source_health.stale_since,EXCLUDED.stale_since) ELSE result_source_health.stale_since END,
 health_version=result_source_health.health_version+CASE WHEN result_source_health.outcome<>EXCLUDED.outcome OR result_source_health.automatic<>EXCLUDED.automatic OR (result_source_health.stale_since IS NOT NULL AND EXCLUDED.outcome='success') THEN 1 ELSE 0 END`,
 [event.electionId,event.sourceId,c.state,c.electionDate,c.type,c.level,c.office,event.outcome,event.automatic,AUTOMATIC_RESULTS_TTL_SECONDS]);
 if(outcome.rowCount!==1)throw new ResultReportError(409,'health_context_changed','Race context changed before source health was recorded');
 assertResultsNotAborted(event.signal);
}
/** At most one health row per requested race and at most600 races: one query, no N+1. */
export async function readSourceHealth(pool:Pool,reads:HealthRead[]):Promise<Map<number,SourceHealthRow>>{
 if(reads.length>600)throw new ResultReportError(400,'health_scope_too_large','Source health scope exceeds600 races');
 if(!reads.length)return new Map();
 try{
 const wanted=reads.map(r=>({election_id:r.electionId,source_ids:r.sourceIds,...r.context,election_date:r.context.electionDate}));
 const rows=await pool.query<SourceHealthRow>(`WITH wanted AS(SELECT * FROM jsonb_to_recordset($1::jsonb) AS w(election_id int,source_ids text[],state text,election_date date,type text,level text,office text))
 SELECT h.* FROM wanted w JOIN LATERAL(SELECT * FROM result_source_health h WHERE h.election_id=w.election_id AND h.source_id=ANY(w.source_ids) AND h.context_state=w.state AND h.context_election_date=w.election_date AND h.context_type=w.type AND h.context_level=w.level AND h.context_office=w.office ORDER BY h.last_attempt_at DESC,h.source_id LIMIT 1) h ON true`,[JSON.stringify(wanted)]);
 return new Map(rows.rows.map(r=>[r.election_id,r]));
 }catch(error){if(error instanceof ResultReportError)throw error;throw new ResultReportError(503,'source_health_unavailable','Official results source health is temporarily unavailable');}
}
export class MemSourceHealth {
 private readonly rows=new Map<string,SourceHealthRow>();
 private key(e:Pick<SourceHealthEvent,'electionId'|'sourceId'|'context'>):string{return stableStringify([e.electionId,e.sourceId,e.context]);}
 write(event:SourceHealthEvent,hasReport:boolean):void{
  assertResultsNotAborted(event.signal);const key=this.key(event),old=this.rows.get(key),at=new Date().toISOString(),c=event.context;
  const stale=event.outcome==='success'?null:event.outcome==='failed'||hasReport?old?.stale_since??at:old?.stale_since??null;
  this.rows.set(key,{election_id:event.electionId,source_id:event.sourceId,context_state:c.state,context_election_date:c.electionDate,context_type:c.type,context_level:c.level,context_office:c.office,outcome:event.outcome,automatic:event.automatic,ttl_seconds:AUTOMATIC_RESULTS_TTL_SECONDS,last_attempt_at:at,last_success_at:event.outcome==='success'?at:old?.last_success_at??null,stale_since:stale,health_version:old?Number(old.health_version)+(old.outcome!==event.outcome||old.automatic!==event.automatic||old.stale_since!==null&&event.outcome==='success'?1:0):1});
 }
 read(read:HealthRead):SourceHealthRow|null{return read.sourceIds.map(sourceId=>this.rows.get(this.key({electionId:read.electionId,sourceId,context:read.context}))).filter((r):r is SourceHealthRow=>!!r).sort((a,b)=>new Date(b.last_attempt_at).getTime()-new Date(a.last_attempt_at).getTime())[0]??null;}
}
