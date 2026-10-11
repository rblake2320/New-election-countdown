import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';

export const OFFICIAL_CONGRESS_MANIFEST_SHA = 'b09efc0e8a2b98ffc1e5e4740c8c0ba03a381e745cdf8d53a501e053bfa8ad56';
export const CONGRESS_WRITER_LOCK = 2026110319;
const BIOGUIDE = /^[A-Z][0-9]{6}$/;
const DIGEST = /^[a-f0-9]{64}$/;
export class OfficialCongressImportError extends Error { readonly code = 'OFFICIAL_CONGRESS_IMPORT_REFUSED'; }
export class LegacyCongressImportRefused extends Error {
  readonly code = 'LEGACY_CONGRESS_SOURCE_UNVERIFIED';
  constructor() { super('Legacy Congress assets are unverified; use the reviewed official Congress dry-run/apply importer. No members were changed.'); }
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if (value && typeof value==='object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical((value as Record<string,unknown>)[k])).join(',')+'}';
  return JSON.stringify(value) ?? 'null';
}
export const congressHash = (value:unknown) => createHash('sha256').update(canonical(value)).digest('hex');
const memberSchema=z.object({sourceId:z.enum(['house-memberdata','senate-current-members']),congress:z.literal(119),chamber:z.enum(['House','Senate']),state:z.string().regex(/^[A-Z]{2}$/),district:z.string().regex(/^\d{2}$/).nullable(),role:z.enum(['representative','delegate','resident_commissioner','senator']),bioguideId:z.string().regex(BIOGUIDE),name:z.string().min(1),partyRaw:z.enum(['D','R','I']),seatRaw:z.string().optional(),districtRaw:z.string().optional(),senateClassRaw:z.string().optional()}).passthrough();
export type OfficialCongressMember=z.infer<typeof memberSchema>;
export interface OfficialCongressSnapshot {
  version:1; classification:string; sources:Record<string,unknown>[];
  counts:Record<string,unknown>; members:OfficialCongressMember[];
  vacancies:Array<Record<string,unknown>>; seatCoverage:Array<Record<string,unknown>>;
}
function refuse(condition:unknown,message:string):asserts condition { if(!condition) throw new OfficialCongressImportError(message); }
export function validateOfficialCongressSnapshot(value:unknown):OfficialCongressSnapshot {
  const snapshot=z.object({version:z.literal(1),classification:z.literal('official_current_members_and_seat_occupancy_not_general_election_nominees'),sources:z.array(z.record(z.unknown())).length(2),counts:z.record(z.unknown()),members:z.array(memberSchema).length(539),vacancies:z.array(z.record(z.unknown())).length(2),seatCoverage:z.array(z.record(z.unknown())).length(441)}).parse(value);
  const [house,senate]=snapshot.sources;
  refuse(house.url==='https://clerk.house.gov/xml/lists/MemberData.xml'&&house.finalUrl===house.url&&house.httpStatus===200&&house.congressRaw==='119'&&house.sha256==='01833c6c646873b2247950e8ab9c7ecc2c57fd2bf019d1014bd64a58b496ed3d','House source proof does not match reviewed119 snapshot');
  const context=senate.congressContextSource as Record<string,unknown>|undefined;
  refuse(senate.url==='https://www.senate.gov/general/contact_information/senators_cfm.xml'&&senate.finalUrl===senate.url&&senate.httpStatus===200&&senate.sha256==='01459d6977e9b5590e7d27cb333ff062cf9cf0783c934373393512fe2542b5e2'&&context?.url==='https://www.senate.gov/senators/index.htm'&&context?.finalUrl===context?.url&&context?.httpStatus===200&&context?.sha256==='b64290195afc62f2e7a3b3f2bd6fe936cf5f91d121a9dd74c1b97580c6607c0b'&&senate.congressContextRetainedText==='119th Congress','Senate source/context proof does not match reviewed119 snapshot');
  const ids=new Set<string>(),seats=new Set<string>(),counts:Record<string,number>={representative:0,delegate:0,resident_commissioner:0,senator:0};
  for(const member of snapshot.members){
    refuse(!ids.has(member.bioguideId),'Duplicate official bioguide identity');ids.add(member.bioguideId);
    refuse(!/\b(?:former|outgoing|vacant)\b/i.test(member.name),'Noncurrent/ambiguous name marker refused');
    const isSenate=member.chamber==='Senate';
    refuse(isSenate?(member.sourceId==='senate-current-members'&&member.role==='senator'&&member.district===null&&/^Class (?:I|II|III)$/.test(member.senateClassRaw??'')):(member.sourceId==='house-memberdata'&&member.role!=='senator'&&!!member.seatRaw),'Member chamber/role/source/seat mismatch');
    const key=isSenate?member.state+':'+member.senateClassRaw:member.seatRaw!;
    refuse(!seats.has(key),'Duplicate occupied source seat');seats.add(key);counts[member.role]++;
    if(member.role==='representative') refuse(member.district!==null,'Representative district missing');
    if(member.role==='delegate'||member.role==='resident_commissioner') refuse(member.district===null,'Nonvoting district scope mismatch');
  }
  refuse(canonical(counts)===canonical({representative:433,delegate:5,resident_commissioner:1,senator:100}),'Reviewed occupied role counts do not match');
  const senateStates=new Map<string,number>();
  for(const member of snapshot.members.filter(m=>m.chamber==='Senate'))senateStates.set(member.state,(senateStates.get(member.state)??0)+1);
  refuse(senateStates.size===50&&[...senateStates.values()].every(n=>n===2),'Senate reviewed scope requires two distinct class seats for each of50 states');
  const coverage=new Map<string,Record<string,unknown>>();
  for(const seat of snapshot.seatCoverage){refuse(typeof seat.seatRaw==='string'&&!coverage.has(seat.seatRaw),'Duplicate/missing coverage seat');coverage.set(seat.seatRaw,seat);}
  for(const member of snapshot.members.filter(m=>m.chamber==='House')){
    const seat=coverage.get(member.seatRaw!);refuse(seat?.occupied===true&&seat.state===member.state&&seat.district===member.district&&seat.role===member.role,'Occupied member does not match source seat coverage');
  }
  const vacancySeats=new Set<string>();
  for(const vacancy of snapshot.vacancies){
    refuse((vacancy.seatRaw==='FL20'||vacancy.seatRaw==='TX23')&&!vacancySeats.has(vacancy.seatRaw),'Unreviewed/duplicate vacant seat');vacancySeats.add(vacancy.seatRaw);
    const seat=coverage.get(vacancy.seatRaw);refuse(seat?.occupied===false&&seat.state===vacancy.state&&seat.district===vacancy.district&&seat.role==='representative'&&vacancy.bioguideId===null&&vacancy.name===null&&vacancy.partyRaw===null&&typeof vacancy.vacancyEvidence==='string'&&vacancy.vacancyEvidence.startsWith('Vacancy due to '),'Vacancy does not have explicit reviewed null-identity proof');
  }
  refuse(snapshot.counts.houseOccupiedMembers===439&&snapshot.counts.senateOccupiedMembers===100&&snapshot.counts.occupiedIncludingNonVoting===539&&snapshot.counts.houseVotingOccupied===433&&snapshot.counts.houseNonVotingOccupied===6&&snapshot.counts.houseExplicitVacancies===2,'Source scope/count mismatch');
  return snapshot;
}
export function loadOfficialCongressSnapshot(path=resolve('data/congress/119/official-current-members.json')):{snapshot:OfficialCongressSnapshot;manifestSha256:string} {
  const bytes=readFileSync(path);const hash=createHash('sha256').update(bytes).digest('hex');
  refuse(hash===OFFICIAL_CONGRESS_MANIFEST_SHA,'Official Congress snapshot SHA differs from reviewed immutable source');
  return {snapshot:validateOfficialCongressSnapshot(JSON.parse(bytes.toString('utf8'))),manifestSha256:hash};
}
type Row=Record<string,unknown>&{id:number;bioguide_id:string;congress:number|null};
const projected=(member:OfficialCongressMember)=>({bioguide_id:member.bioguideId,name:member.name,party:member.partyRaw,state:member.state,district:member.district,chamber:member.chamber,congress:119});
const approvedKeys=['bioguide_id','name','party','state','district','chamber','congress'] as const;
const approved=(row:Record<string,unknown>)=>Object.fromEntries(approvedKeys.map(k=>[k,row[k]??null]));
const unrelated=(row:Record<string,unknown>)=>Object.fromEntries(Object.entries(row).filter(([k])=>!approvedKeys.some(a=>a===k)));
export const legacyRemovalPlanSchema=z.object({version:z.literal(1),reviewed:z.literal(true),rows:z.array(z.object({id:z.number().int().positive(),bioguideId:z.string().min(1),rowSha256:z.string().regex(DIGEST)}).strict()).min(1)}).strict();
export type LegacyRemovalPlan=z.infer<typeof legacyRemovalPlanSchema>;
export interface CongressImportOptions {
  mode?:'dry-run'|'apply'; manifestPath?:string; expectedManifestSha256?:string;expectedPreimageSha256?:string;
  legacyRemovalPlan?:LegacyRemovalPlan;expectedLegacyRemovalPlanSha256?:string;
  // Finite private acceptance only; the production CLI never exposes these.
  faultAfterWrites?:number;
}
export interface CongressImportReceipt {
  version:1;mode:'dry-run'|'apply';manifestSha256:string;preimageSha256:string;postimageSha256:string|null;runId:string|null;
  sourceScope:'all_current_members_including_nonvoting';sourceMemberCount:539;sourceRoleCounts:{representatives:433;delegates:5;residentCommissioners:1;senators:100};vacancies:Array<Record<string,unknown>>;
  insertedCount:number;updatedCount:number;removedCount:number;changedCount:number;unreviewedLegacyRowIds:number[];
  removalPlanSha256:string|null;sourceCoverageComplete:boolean;catalogComplete:boolean;committed:boolean;
}
async function readRows(client:PoolClient):Promise<Row[]> {return (await client.query<{row:Row}>('SELECT to_jsonb(m) AS row FROM public.congress_members m ORDER BY m.id')).rows.map(r=>r.row);}
export function sourceCoverageComplete(rows:Record<string,unknown>[],snapshot:OfficialCongressSnapshot):boolean {
  const current=rows.filter(r=>r.congress===119);if(current.length<539)return false;
  const byId=new Map(current.map(r=>[r.bioguide_id,r]));
  return byId.size===current.length&&snapshot.members.every(m=>canonical(approved(byId.get(m.bioguideId)??{}))===canonical(projected(m)));
}
export async function syncOfficialCongress(pool:Pool,options:CongressImportOptions={}):Promise<CongressImportReceipt> {
  // Validate immutable source + explicit removal plan before even connecting.
  const {snapshot,manifestSha256}=loadOfficialCongressSnapshot(options.manifestPath);
  const mode=options.mode??'dry-run';const removal=options.legacyRemovalPlan?legacyRemovalPlanSchema.parse(options.legacyRemovalPlan):null;
  refuse(mode==='dry-run'||mode==='apply','Unknown Congress import mode refused');
  const removalPlanSha256=removal?congressHash(removal):null;
  refuse(!options.expectedLegacyRemovalPlanSha256||removal,'Removal-plan guard supplied without a plan');
  if(mode==='apply'){
    refuse(DIGEST.test(options.expectedManifestSha256??'')&&options.expectedManifestSha256===manifestSha256,'Apply requires exact reviewed manifest SHA');
    refuse(DIGEST.test(options.expectedPreimageSha256??''),'Apply requires exact preimage SHA');
    refuse(!removal||options.expectedLegacyRemovalPlanSha256===removalPlanSha256,'Apply requires exact reviewed removal-plan SHA');
  }
  const client=await pool.connect();
  try{
    await client.query(mode==='apply'?'BEGIN ISOLATION LEVEL SERIALIZABLE':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL TIME ZONE 'UTC'");await client.query("SET LOCAL statement_timeout='30s'");await client.query("SET LOCAL lock_timeout='5s'");
    const tables=await client.query("SELECT to_regclass('public.congress_members') members,to_regclass('public.congress_official_import_runs') audit");
    refuse(tables.rows[0]?.members&&tables.rows[0]?.audit,'Run migrations/20261011_congress_official_import.sql before import');
    if(mode==='apply'){await client.query('SELECT pg_advisory_xact_lock($1)',[CONGRESS_WRITER_LOCK]);await client.query('LOCK TABLE public.congress_members IN SHARE ROW EXCLUSIVE MODE');}
    const before=await readRows(client);const preimageSha256=congressHash(before);
    if(mode==='apply')refuse(preimageSha256===options.expectedPreimageSha256,'Congress catalog preimage changed; apply refused');
    const byId=new Map(before.map(r=>[r.bioguide_id,r]));
    const inserts:OfficialCongressMember[]=[],updates:Array<{member:OfficialCongressMember;row:Row}>=[];
    for(const member of snapshot.members){const existing=byId.get(member.bioguideId);if(!existing)inserts.push(member);else{
      refuse(existing.congress===119,'Official ID belongs to another Congress; historical row must not be overwritten');
      if(canonical(approved(existing))!==canonical(projected(member)))updates.push({member,row:existing});
    }}
    const remove:Row[]=[];const removalIds=new Set<number>();
    for(const entry of removal?.rows??[]){const row=before.find(r=>r.id===entry.id);refuse(row&&row.congress===119&&row.bioguide_id===entry.bioguideId&&!BIOGUIDE.test(row.bioguide_id)&&congressHash(row)===entry.rowSha256&&!removalIds.has(row.id),'Reviewed legacy removal plan does not exactly match an unverified current row');removalIds.add(row.id);remove.push(row);}
    const acceptedIds=new Set(snapshot.members.map(m=>m.bioguideId));
    const unreviewedLegacyRowIds=before.filter(r=>r.congress===119&&!acceptedIds.has(r.bioguide_id)&&!removalIds.has(r.id)).map(r=>r.id);
    const receipt:CongressImportReceipt={version:1,mode,manifestSha256,preimageSha256,postimageSha256:null,runId:null,sourceScope:'all_current_members_including_nonvoting',sourceMemberCount:539,sourceRoleCounts:{representatives:433,delegates:5,residentCommissioners:1,senators:100},vacancies:snapshot.vacancies,insertedCount:inserts.length,updatedCount:updates.length,removedCount:remove.length,changedCount:inserts.length+updates.length+remove.length,unreviewedLegacyRowIds,removalPlanSha256,sourceCoverageComplete:mode==='apply'||sourceCoverageComplete(before,snapshot),catalogComplete:mode==='apply'?unreviewedLegacyRowIds.length===0:(before.filter(r=>r.congress===119).length===539&&sourceCoverageComplete(before,snapshot)),committed:false};
    if(mode==='apply'){
      let written=0;const fault=()=>{written++;if(options.faultAfterWrites!==undefined&&written===options.faultAfterWrites)throw new OfficialCongressImportError('Acceptance injected write failure');};
      for(const member of inserts){const p=projected(member);await client.query('INSERT INTO public.congress_members(bioguide_id,name,party,state,district,chamber,congress) VALUES($1,$2,$3,$4,$5,$6,$7)',approvedKeys.map(k=>p[k]));fault();}
      for(const {member,row} of updates){const p=projected(member);await client.query('UPDATE public.congress_members SET name=$1,party=$2,state=$3,district=$4,chamber=$5,congress=$6 WHERE id=$7',[p.name,p.party,p.state,p.district,p.chamber,p.congress,row.id]);fault();}
      for(const row of remove){await client.query('DELETE FROM public.congress_members WHERE id=$1',[row.id]);fault();}
      const after=await readRows(client);const afterIds=new Map(after.map(r=>[r.bioguide_id,r]));
      refuse(snapshot.members.every(m=>canonical(approved(afterIds.get(m.bioguideId)??{}))===canonical(projected(m))),'Actual official member readback differs; rolling back');
      for(const row of before){if(removalIds.has(row.id)){refuse(!after.some(r=>r.id===row.id),'Removal readback mismatch');continue;}const actual=after.find(r=>r.id===row.id);refuse(actual&&canonical(unrelated(actual))===canonical(unrelated(row)),'Unrelated member fields changed');if(!updates.some(u=>u.row.id===row.id))refuse(canonical(actual)===canonical(row),'Unrelated/legacy member row changed');}
      receipt.postimageSha256=congressHash(after);receipt.runId=randomUUID();receipt.catalogComplete=after.filter(r=>r.congress===119).length===539&&sourceCoverageComplete(after,snapshot);
      await client.query(`INSERT INTO public.congress_official_import_runs(id,manifest_sha256,preimage_sha256,postimage_sha256,removal_plan_sha256,receipt,preimage,postimage) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb)`,[receipt.runId,manifestSha256,preimageSha256,receipt.postimageSha256,removalPlanSha256,JSON.stringify({...receipt,committed:true}),JSON.stringify(before),JSON.stringify(after)]);
      await client.query('COMMIT');receipt.committed=true;
    }else await client.query('ROLLBACK');
    return receipt;
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}
