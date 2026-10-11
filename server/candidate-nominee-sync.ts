import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { z } from 'zod';
import { normalizedCandidateName, type RaceRow, type ExistingCandidate } from './fec-candidate-sync';

const states = new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}, 'Invalid calendar date');
const stateCode = z.string().refine(value => states.has(value), 'Expected a US state');
const access = z.enum(['printed','write_in','not_specified']);
const scopeSchema = z.object({ office:z.enum(['H','S','G']), district:z.string().regex(/^\d{2}$/), partyRaw:z.string().optional(),ballotAccessType:access.optional(),expectedCount:z.number().int().nonnegative() }).strict();
const sourceSchema = z.object({
  id:z.string().min(1), state:stateCode, kind:z.literal('official_general_candidate_list'),
  name:z.string().min(1), url:z.string().url().refine(value => {
    const u = new URL(value);
    const ncOfficialBucket=u.hostname==='s3.amazonaws.com' && u.pathname.startsWith('/dl.ncsbe.gov/Elections/2026/');
    return u.protocol === 'https:' && !u.username && !u.password && (u.hostname.endsWith('.gov') || /\.state\.[a-z]{2}\.us$/i.test(u.hostname) || ncOfficialBucket);
  }, 'Expected an official government HTTPS source'),
  sha256:z.string().regex(/^[a-f0-9]{64}$/).nullable(), publishedAt:day.nullable(),
  retrievedAt:z.string().refine(value => Number.isFinite(new Date(value).getTime()), 'Invalid retrieval timestamp'),
  electionDate:day.refine(value=>value.startsWith('2026-'), 'Expected 2026 source'),
  completeScopes:z.array(scopeSchema), expectedRowCount:z.number().int().nonnegative(),
}).strict();
const rowSchema = z.object({
  sourceId:z.string(),state:stateCode,office:z.enum(['H','S','G']),district:z.string().regex(/^\d{2}$/),date:day,
  name:z.string().trim().min(1).max(200),partyRaw:z.string(),incumbent:z.boolean().nullable().optional(),
  sourcePage:z.number().int().positive().optional(),ticketText:z.string().optional(),raceTitle:z.string().optional(),ballotAccessType:access.optional(),
  aliases:z.array(z.string().min(1).max(200)).optional(),ballotName:z.string().min(1).max(200).optional(),
}).strict();
const manifestSchema = z.object({version:z.literal(1),sources:z.array(sourceSchema).min(1),candidates:z.array(rowSchema)}).strict();
export type NomineeManifest = z.infer<typeof manifestSchema>;
type NomineeRow = NomineeManifest['candidates'][number];
type NomineeSource = NomineeManifest['sources'][number];
export interface NomineeAction { electionId:number;candidateId?:number;party:string;record:NomineeRow;source:NomineeSource;versionSha:string }
export interface NomineePlan {actions:NomineeAction[];unresolved:Array<{name:string;reason:string}>;auditId?:number;candidateInserts?:number;sourceChanges?:number}

export function parseNomineeManifest(raw:unknown):NomineeManifest {
  const m=manifestSchema.parse(raw), sourceIds=new Set<string>(), identities=new Set<string>();
  const completed:Array<{state:string,date:string,office:string,district:string,party?:string,access?:string}>=[];
  for(const s of m.sources){
    if(sourceIds.has(s.id))throw new Error('duplicate source ID');sourceIds.add(s.id);
    const count=m.candidates.filter(r=>r.sourceId===s.id).length;
    if(count===0 && !s.completeScopes.length)throw new Error('Empty source requires an explicitly complete zero-candidate scope');
    if(s.expectedRowCount!=null && count!==s.expectedRowCount)throw new Error('source row count mismatch');
    for(const scope of s.completeScopes){
      const next={state:s.state,date:s.electionDate,office:scope.office,district:scope.district,party:scope.partyRaw?partyKey(scope.partyRaw):undefined,access:scope.ballotAccessType};
      if(completed.some(p=>p.state===next.state&&p.date===next.date&&p.office===next.office&&p.district===next.district&&(!p.party||!next.party||p.party===next.party)&&(!p.access||!next.access||p.access===next.access)))throw new Error('overlapping complete source scopes');
      completed.push(next);
      const actual=m.candidates.filter(r=>r.sourceId===s.id && r.office===scope.office && r.district===scope.district && (!scope.partyRaw || partyKey(r.partyRaw)===partyKey(scope.partyRaw)) && (!scope.ballotAccessType || r.ballotAccessType===scope.ballotAccessType)).length;
      if(actual!==scope.expectedCount)throw new Error('source complete-scope row count mismatch');
    }
  }
  for(const r of m.candidates){
    const source=m.sources.find(s=>s.id===r.sourceId);
    if(!source || source.state!==r.state || source.electionDate!==r.date)throw new Error('candidate does not match its source state/date');
    if(r.office!=='H' && r.district!=='00')throw new Error('Statewide office must use district 00');
    const key=`${r.state}|${r.office}|${r.district}|${r.date}|${normalizedCandidateName(r.name)}`;
    if(identities.has(key))throw new Error('duplicate candidate input');identities.add(key);
  }
  return m;
}
function party(raw:string):string|undefined {
  const p=raw.trim(),preference=p.match(/^\(Prefers (.+) Party\)$/i);
  const key=(preference?.[1]??p).toLowerCase().replace(/\s+party$/,'');
  if(key==='by petition')return undefined; // A filing method does not establish affiliation.
  return ({republican:'R',rep:'R',democratic:'D',democrat:'D',dem:'D','democratic-npl':'D','democratic-nonpartisan league':'D','democratic-farmer-labor':'D',independent:'I',ind:'I',green:'G',gre:'G',libertarian:'L',lib:'L',constitution:'CON',conservative:'CRV'} as Record<string,string>)[key] ?? p;
}
function partyKey(raw:string):string{return (party(raw)??'method:by petition').toLowerCase();}
function snapshotVersion(m:NomineeManifest,s:NomineeSource):string {
  return createHash('sha256').update(JSON.stringify({url:s.url,documentSha:s.sha256,publishedAt:s.publishedAt,electionDate:s.electionDate,completeScopes:s.completeScopes,expectedRowCount:s.expectedRowCount,rows:m.candidates.filter(r=>r.sourceId===s.id).slice().sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))})).digest('hex');
}
function raceKey(e:RaceRow):string|undefined {
  const date=typeof e.date==='string'?e.date.slice(0,10):e.date.toISOString().slice(0,10);
  if(!['general','special'].includes(e.type.toLowerCase()))return;
  if(e.offices?.includes('U.S. Senate'))return `${e.state}|S|00|${date}`;
  if(e.offices?.includes('U.S. House of Representatives')){const d=e.title.match(/\b([A-Z]{2})-(\d{2}|AL)\b/);if(d&&d[1]===e.state)return `${e.state}|H|${d[2]==='AL'?'00':d[2]}|${date}`;}
  if(e.offices?.some(o=>/^governor$/i.test(o)))return `${e.state}|G|00|${date}`;
}
export function planNomineeRefresh(m:NomineeManifest,elections:RaceRow[],candidates:ExistingCandidate[]):NomineePlan {
  const plan:NomineePlan={actions:[],unresolved:[]};
  const sourceHashes=new Map(m.sources.map(s=>[s.id,snapshotVersion(m,s)]));
  for(const row of m.candidates){
    const key=`${row.state}|${row.office}|${row.district}|${row.date}`;
    const races=elections.filter(e=>raceKey(e)===key && (!row.raceTitle || e.title===row.raceTitle));
    if(races.length!==1){plan.unresolved.push({name:row.name,reason:races.length?'ambiguous-race':'missing-race'});continue;}
    const names=[row.name,row.ballotName,...(row.aliases??[])].filter((name):name is string=>typeof name==='string').map(normalizedCandidateName);
    const matches=candidates.filter(c=>c.election_id===races[0].id && names.includes(normalizedCandidateName(c.name)));
    const affiliation=party(row.partyRaw);
    const sameParty=matches.filter(c=>affiliation===undefined || affiliation==='' || party(c.party??'')===affiliation);
    if(sameParty.length>1){plan.unresolved.push({name:row.name,reason:'ambiguous-identity'});continue;}
    if(matches.length && !sameParty.length){plan.unresolved.push({name:row.name,reason:'party-conflict'});continue;}
    const source=m.sources.find(s=>s.id===row.sourceId)!;
    plan.actions.push({electionId:races[0].id,candidateId:sameParty[0]?.id,party:affiliation===undefined || affiliation===''?sameParty[0]?.party??'':affiliation,record:row,source,versionSha:sourceHashes.get(source.id)!});
  }
  const sharedIdentities=new Set(plan.actions.filter(a=>a.candidateId!=null && plan.actions.filter(b=>b.candidateId===a.candidateId).length>1).map(a=>a.candidateId));
  for(const a of plan.actions.filter(a=>sharedIdentities.has(a.candidateId)))plan.unresolved.push({name:a.record.name,reason:'shared-existing-identity'});
  plan.actions=plan.actions.filter(a=>!sharedIdentities.has(a.candidateId));
  return plan;
}

/** A retrieval timestamp cannot make an older (or undated) publication newer. */
function assertPublicationFresh(incoming:string|null,previous:unknown,observed:string,previousObserved:unknown):void {
  const previousPublication=typeof previous==='string' && /^\d{4}-\d{2}-\d{2}$/.test(previous)?previous:null;
  if(previousPublication && (!incoming || incoming<previousPublication))throw new Error('Older or undated publication cannot replace a newer current general list');
  // When publication dates cannot distinguish snapshots, an older observation
  // cannot undo newer list facts. Publication precedence wins when dates differ.
  const previousTime=previousObserved instanceof Date?previousObserved.getTime():typeof previousObserved==='string'?new Date(previousObserved).getTime():NaN;
  if(incoming===previousPublication && Number.isFinite(previousTime) && new Date(observed).getTime()<previousTime)throw new Error('Older source observation cannot replace a newer general-list snapshot');
}

async function runNomineeRefreshOnce(pool:Pool,m:NomineeManifest,manifestSha:string,apply:boolean):Promise<NomineePlan>{
  if(!/^[a-f0-9]{64}$/.test(manifestSha))throw new Error('Reviewed manifest SHA256 required');
  const client=await pool.connect();
  try{
    await client.query(apply?'BEGIN ISOLATION LEVEL SERIALIZABLE':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL statement_timeout='30s'");await client.query("SET LOCAL lock_timeout='5s'");
    if(apply)await client.query('SELECT pg_advisory_xact_lock($1)',[2026110301]); // Shared identity writer lock with FEC.
    const tables=(await client.query("SELECT to_regclass('public.elections') AS elections,to_regclass('public.candidates') AS candidates,to_regclass('public.candidate_source_records') AS sources,to_regclass('public.candidate_ingest_runs') AS audit,to_regclass('public.general_candidate_list_snapshots') AS snapshots")).rows[0];
    if(!tables.elections || !tables.candidates)throw new Error('ElectionTracker schema absent');
    if(apply && (!tables.sources || !tables.audit || !tables.snapshots))throw new Error('Candidate source and general-list snapshot migrations required');
    const elections=(await client.query<RaceRow>('SELECT id,state,title,level,type,date::text AS date,offices FROM elections ORDER BY id')).rows;
    const candidates=(await client.query<ExistingCandidate>('SELECT id,election_id,name,party,fec_candidate_id,fec_status,source_file_sha256,data_source,source_status FROM candidates ORDER BY id')).rows;
    const plan=planNomineeRefresh(m,elections,candidates);
    if(plan.unresolved.length){
      if(apply)throw new Error('Resolve all identity/race conflicts before applying a complete nominee snapshot');
      await client.query('ROLLBACK');return plan;
    }
    const previousByAction=new Map<NomineeAction,Array<{id:number,source_file_sha256:string,source_synced_at:Date,metadata:Record<string,unknown>}>>();
    for(const a of plan.actions){
      const previous=a.candidateId!=null && tables.sources?(await client.query('SELECT id,source_file_sha256,source_url,source_synced_at,metadata FROM candidate_source_records WHERE candidate_id=$1 AND source_layer=$2 AND is_current=true',[a.candidateId,'general_candidate_list'])).rows:[];
      for(const record of previous)assertPublicationFresh(a.source.publishedAt,record.metadata?.publishedAt,a.source.retrievedAt,record.source_synced_at);
      previousByAction.set(a,previous);
    }
    // Preflight every receiving scope before inserting even a disjoint new identity.
    const receivingScopes=[];
    for(const source of m.sources)for(const scope of source.completeScopes){
      const raceIds=elections.filter(e=>raceKey(e)===`${source.state}|${scope.office}|${scope.district}|${source.electionDate}`).map(e=>e.id);
      if(raceIds.length!==1)throw new Error('Complete scope has no unique receiving race');
      const electionId=raceIds[0];
      const current=tables.sources?(await client.query(`SELECT s.metadata,s.source_synced_at FROM candidate_source_records s JOIN candidates c ON c.id=s.candidate_id WHERE c.election_id=$1 AND s.source_layer='general_candidate_list' AND s.is_current=true
        AND ($2::text IS NULL OR s.metadata->>'partyKey'=$2) AND ($3::text IS NULL OR s.metadata->>'ballotAccessType'=$3)`,[electionId,scope.partyRaw?partyKey(scope.partyRaw):null,scope.ballotAccessType??null])).rows:[];
      for(const record of current)assertPublicationFresh(source.publishedAt,record.metadata?.publishedAt,source.retrievedAt,record.source_synced_at);
      // Superseded broad scopes remain freshness watermarks for untouched facets.
      const snapshots=tables.snapshots?(await client.query('SELECT id,scope_key,source_url,source_file_sha256,source_synced_at,is_current,metadata FROM general_candidate_list_snapshots WHERE election_id=$1',[electionId])).rows:[];
      const overlappingHistory=snapshots.filter(record=>{
        const old=record.metadata.scope;
        return old.office===scope.office && old.district===scope.district && (!old.partyRaw || !scope.partyRaw || partyKey(old.partyRaw)===partyKey(scope.partyRaw)) && (!old.ballotAccessType || !scope.ballotAccessType || old.ballotAccessType===scope.ballotAccessType);
      });
      for(const record of overlappingHistory)assertPublicationFresh(source.publishedAt,record.metadata.publishedAt,source.retrievedAt,record.source_synced_at);
      const overlaps=overlappingHistory.filter(record=>record.is_current===true);
      receivingScopes.push({source,scope,electionId,overlaps});
    }
    if(!apply){await client.query('ROLLBACK');return plan;}
    let inserted=0,sourceChanges=0;
    for(const a of plan.actions){
      if(a.candidateId==null){
        const added=await client.query<{id:number}>(`INSERT INTO candidates(name,party,election_id,is_incumbent,data_source,source_status,normalized_name,ballot_status,source_file_sha256,source_synced_at,polling_support,polling_trend)
          VALUES($1,$2,$3,$4,'state_general_list','general_list_record',$5,'not_certified',$6,$7,NULL,NULL) RETURNING id`,[a.record.name,a.party,a.electionId,a.record.incumbent??null,normalizedCandidateName(a.record.name),a.versionSha,a.source.retrievedAt]);
        a.candidateId=added.rows[0].id;inserted++;
      }
      // Existing profile, FEC and ballot fields are never overwritten.
      const previous=previousByAction.get(a)??[];
      if(previous.length===1 && previous[0].source_file_sha256===a.versionSha){
        if(new Date(a.source.retrievedAt).getTime()>new Date(previous[0].source_synced_at).getTime()){
          await client.query('UPDATE candidate_source_records SET source_synced_at=$2 WHERE id=$1',[previous[0].id,a.source.retrievedAt]);sourceChanges++;
        }
        continue;
      }
      await client.query("UPDATE candidate_source_records SET is_current=false WHERE candidate_id=$1 AND source_layer='general_candidate_list' AND source_url=$2 AND is_current=true",[a.candidateId,a.source.url]);
      const metadata={electionId:a.electionId,state:a.record.state,office:a.record.office,district:a.record.district,electionDate:a.record.date,sourceId:a.source.id,sourceName:a.source.name,sourceKind:a.source.kind,documentSha256:a.source.sha256,publishedAt:a.source.publishedAt,partyRaw:a.record.partyRaw,partyValue:party(a.record.partyRaw)??'',partyKey:partyKey(a.record.partyRaw),partyBasis:/^\(Prefers /i.test(a.record.partyRaw)?'preference':a.record.partyRaw.toLowerCase()==='by petition'?'filing_method':'source_label',incumbent:a.record.incumbent??null,sourcePage:a.record.sourcePage??null,ticketText:a.record.ticketText??null,ballotName:a.record.ballotName??null,legalName:a.record.name,aliases:a.record.aliases??[],ballotAccessType:a.record.ballotAccessType??'not_specified',ballotCertificationPromoted:false};
      await client.query(`INSERT INTO candidate_source_records(candidate_id,source_layer,source_url,source_file_sha256,source_synced_at,metadata,is_current)
        VALUES($1,'general_candidate_list',$2,$3,$4,$5::jsonb,true) ON CONFLICT(candidate_id,source_layer,source_url,source_file_sha256)
        DO UPDATE SET is_current=true,source_synced_at=EXCLUDED.source_synced_at,metadata=EXCLUDED.metadata`,[a.candidateId,a.source.url,a.versionSha,a.source.retrievedAt,JSON.stringify(metadata)]);sourceChanges++;
    }
    // Only an explicitly complete office/party scope establishes absence from the latest list.
    for(const {source,scope,electionId,overlaps} of receivingScopes){
      const actions=plan.actions.filter(a=>a.source.id===source.id && a.record.office===scope.office && a.record.district===scope.district && (!scope.partyRaw || partyKey(a.record.partyRaw)===partyKey(scope.partyRaw)) && (!scope.ballotAccessType || a.record.ballotAccessType===scope.ballotAccessType));
      const keep=actions.map(a=>a.candidateId!);
      const versionSha=snapshotVersion(m,source);
      const scopeKey=[scope.office,scope.district,scope.partyRaw?partyKey(scope.partyRaw):'*',scope.ballotAccessType??'*'].join('|');
      const deactivated=await client.query(`UPDATE candidate_source_records s SET is_current=false FROM candidates c WHERE s.candidate_id=c.id AND c.election_id=$1 AND s.source_layer='general_candidate_list' AND s.is_current=true
        AND (NOT(c.id=ANY($2::int[])) OR s.source_url<>$4 OR s.source_file_sha256<>$5) AND ($3::text IS NULL OR s.metadata->>'partyKey'=$3)
        AND ($6::text IS NULL OR s.metadata->>'ballotAccessType'=$6)`,[electionId,keep,scope.partyRaw?partyKey(scope.partyRaw):null,source.url,versionSha,scope.ballotAccessType??null]);sourceChanges+=deactivated.rowCount??0;
      if(overlaps.length===1 && overlaps[0].scope_key===scopeKey && overlaps[0].source_url===source.url && overlaps[0].source_file_sha256===versionSha){
        if(new Date(source.retrievedAt).getTime()>new Date(overlaps[0].source_synced_at).getTime())await client.query('UPDATE general_candidate_list_snapshots SET source_synced_at=$2 WHERE id=$1',[overlaps[0].id,source.retrievedAt]);
        continue;
      }
      if(overlaps.length)await client.query('UPDATE general_candidate_list_snapshots SET is_current=false WHERE id=ANY($1::int[])',[overlaps.map(r=>r.id)]);
      await client.query(`INSERT INTO general_candidate_list_snapshots(election_id,scope_key,source_url,source_file_sha256,source_synced_at,metadata,is_current)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,true) ON CONFLICT(election_id,scope_key,source_url,source_file_sha256)
        DO UPDATE SET is_current=true,source_synced_at=EXCLUDED.source_synced_at,metadata=EXCLUDED.metadata`,[electionId,scopeKey,source.url,versionSha,source.retrievedAt,JSON.stringify({sourceId:source.id,sourceName:source.name,sourceKind:source.kind,publishedAt:source.publishedAt,documentSha256:source.sha256,state:source.state,electionDate:source.electionDate,scope})]);
    }
    plan.candidateInserts=inserted;plan.sourceChanges=sourceChanges;
    const receipt=await client.query<{id:number}>(`INSERT INTO candidate_ingest_runs(source_layer,source_url,source_file_sha256,applied_at,receipt)
      VALUES('general_candidate_list','urn:electiontracker:reviewed-general-list-manifest',$1,now(),$2::jsonb) RETURNING id`,[manifestSha,JSON.stringify({candidateInserts:inserted,sourceChanges,unresolved:plan.unresolved,sources:m.sources.map(s=>({id:s.id,url:s.url,publishedAt:s.publishedAt,completeScopes:s.completeScopes}))})]);
    plan.auditId=receipt.rows[0].id;
    await client.query('COMMIT');return plan;
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}

export async function runNomineeRefresh(pool:Pool,m:NomineeManifest,manifestSha:string,apply:boolean):Promise<NomineePlan>{
  for(let attempt=0;;attempt++){
    try{return await runNomineeRefreshOnce(pool,m,manifestSha,apply);}
    catch(error){if(attempt>=2 || !['40001','40P01'].includes((error as {code?:string}).code??''))throw error;await new Promise(resolve=>setTimeout(resolve,50*(attempt+1)));}
  }
}
