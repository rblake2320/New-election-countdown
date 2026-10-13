import { createHash } from 'node:crypto';
import type { Pool } from 'pg';

export const LOUISIANA_HOUSE_SOURCE = Object.freeze({
  name:'Louisiana Secretary of State — DETAILS FOR U.S. HOUSE RACES IN FALL FINALIZED',
  url:'https://www.sos.la.gov/media/dcvl5ojl/051426-fall-house-races.pdf',
  sha256:'3319c7cba10c5cd5cc74f2a4cfb2d42935e998cbbfb14746ece63050ee8bedb3',
  publishedAt:'2026-05-14',
  ruleUrl:'https://www.sos.la.gov/elections-voting/types-of-elections',
});
export interface ElectionPhaseRow {state:string;date:Date|string;level:string;offices:string[]|null}
export function isLouisiana2026HouseOpenPrimary(e:ElectionPhaseRow):boolean {
  const day=e.date instanceof Date?e.date.toISOString().slice(0,10):e.date.slice(0,10);
  return e.state==='LA' && day==='2026-11-03' && e.level.toLowerCase()==='federal' && Boolean(e.offices?.includes('U.S. House of Representatives'));
}
export function louisianaHouseDescription(district:number):string {
  return `LA District ${district} U.S. House seat — open primary November 3, 2026. All qualified candidates run together; a majority elects the winner. If needed, the top two advance to a December 12, 2026 general election. Source: ${LOUISIANA_HOUSE_SOURCE.url}`;
}
export interface LouisianaCatalogRow extends ElectionPhaseRow {id:number;title:string;subtitle:string|null;type:string;description:string|null;is_active:boolean|null}
export interface LouisianaCatalogPlan {version:1;source:typeof LOUISIANA_HOUSE_SOURCE;before:LouisianaCatalogRow[];changes:Array<{id:number;type:'primary';subtitle:string;description:string}>;planSha256:string;auditId?:number}

/** Exact six-row preimage; refuse drift/duplicates instead of silently rewriting another contest. */
export function planLouisianaHouseCorrection(rows:LouisianaCatalogRow[]):LouisianaCatalogPlan {
  const target=rows.filter(isLouisiana2026HouseOpenPrimary).sort((a,b)=>a.id-b.id);
  if(target.length!==6)throw new Error('Expected exactly six LA November 3 House contests');
  for(let district=1;district<=6;district++){
    const title=`U.S. House Election - LA-${String(district).padStart(2,'0')}`;
    const found=target.filter(r=>r.title===title);
    if(found.length!==1)throw new Error('Expected one canonical LA House contest per district');
    const row=found[0],subtitle=`LA District ${district}`,description=`LA District ${district} U.S. House seat — general election November 3, 2026.`;
    if(!['general','primary'].includes(row.type) || row.offices?.length!==1 || ![subtitle,`${subtitle} — open primary`].includes(row.subtitle??'') || ![description,louisianaHouseDescription(district)].includes(row.description??''))throw new Error('LA House catalog differs from the reviewed seed; review drift before correction');
  }
  const before=target.map(r=>({...r,date:r.date instanceof Date?r.date.toISOString():r.date}));
  const changes=before.flatMap(r=>{
    const d=Number(r.title.slice(-2)),next={id:r.id,type:'primary' as const,subtitle:`LA District ${d} — open primary`,description:louisianaHouseDescription(d)};
    return r.type===next.type && r.subtitle===next.subtitle && r.description===next.description?[]:[next];
  });
  const payload={version:1 as const,source:LOUISIANA_HOUSE_SOURCE,before,changes};
  return {...payload,planSha256:createHash('sha256').update(JSON.stringify(payload)).digest('hex')};
}

/** Default read-only; mutation requires the reviewed exact preimage hash and an atomic audit table. */
export async function runLouisianaHouseCorrection(pool:Pool,options:{apply?:boolean;expectedPlanSha256?:string}={}):Promise<LouisianaCatalogPlan>{
  const apply=options.apply===true;
  if(apply && !/^[a-f0-9]{64}$/.test(options.expectedPlanSha256??''))throw new Error('Apply requires reviewed plan SHA256');
  const client=await pool.connect();
  try{
    await client.query(apply?'BEGIN ISOLATION LEVEL SERIALIZABLE':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL statement_timeout='30s'");await client.query("SET LOCAL lock_timeout='5s'");
    if(apply)await client.query('SELECT pg_advisory_xact_lock($1)',[2026110301]);
    const schema=(await client.query("SELECT to_regclass('public.elections') AS elections,to_regclass('public.election_catalog_correction_runs') AS audit")).rows[0];
    if(!schema.elections)throw new Error('Election schema unavailable');
    if(apply&&!schema.audit)throw new Error('Catalog correction audit migration required before apply');
    const rows=(await client.query<LouisianaCatalogRow>("SELECT id,state,title,subtitle,type,level,date::text AS date,offices,description,is_active FROM elections WHERE state='LA' AND date>='2026-01-01' AND date<'2027-01-01' ORDER BY id")).rows;
    const plan=planLouisianaHouseCorrection(rows);
    if(options.expectedPlanSha256 && options.expectedPlanSha256!==plan.planSha256)throw new Error('Catalog changed since the reviewed dry-run plan');
    if(!apply){await client.query('ROLLBACK');return plan;}
    for(const change of plan.changes){
      const updated=await client.query('UPDATE elections SET type=$2,subtitle=$3,description=$4 WHERE id=$1 RETURNING id',[change.id,change.type,change.subtitle,change.description]);
      if(updated.rowCount!==1)throw new Error('Catalog contest changed during correction');
    }
    if(plan.changes.length){
      const audit=(await client.query<{id:number}>(`INSERT INTO election_catalog_correction_runs(plan_sha256,source_url,source_file_sha256,receipt) VALUES($1,$2,$3,$4::jsonb) RETURNING id`,[plan.planSha256,LOUISIANA_HOUSE_SOURCE.url,LOUISIANA_HOUSE_SOURCE.sha256,JSON.stringify({...plan,datesChanged:false,idsChanged:false,candidateProfilesChanged:false,conditionalContestsCreated:false})])).rows[0];
      plan.auditId=audit.id;
    }
    await client.query('COMMIT');return plan;
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}
