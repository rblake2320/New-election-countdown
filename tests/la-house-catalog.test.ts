import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import {getGeneralCandidateList} from '../server/general-candidate-list';
import {parseNomineeManifest,planNomineeRefresh} from '../server/candidate-nominee-sync';
import {parseFecMaster,buildFecSyncPlan} from '../server/fec-candidate-sync';
const race={id:429,state:'LA',title:'U.S. House Election - LA-01',level:'federal',type:'general',date:'2026-11-03',offices:['U.S. House of Representatives']};
it('does not publish a misclassified LA open-primary candidate through the general roster',async()=>{
 const queries:string[]=[];const pool={query:async(sql:string)=>{queries.push(sql);if(sql.includes('to_regclass'))return {rows:[{elections:'elections',candidates:'candidates',sources:'candidate_source_records',snapshots:'general_candidate_list_snapshots'}],rowCount:1};if(sql.includes('FROM elections WHERE id'))return {rows:[race],rowCount:1};if(sql.includes('FROM candidates'))return {rows:[{id:9,name:'Fixture primary candidate'}],rowCount:1};return {rows:[],rowCount:0};}};
 const result=await getGeneralCandidateList(pool as any,429);expect(result.status).toBe('not_applicable');expect(result.candidates).toEqual([]);expect(queries.some(s=>s.includes('FROM candidates'))).toBe(false);
});
it('does not ingest a General-list claim into the known LA Nov3House open primary even before DB correction',()=>{
 const m=parseNomineeManifest({version:1,sources:[{id:'la',state:'LA',kind:'official_general_candidate_list',name:'Fixture',url:'https://www.sos.la.gov/fixture.pdf',sha256:null,publishedAt:null,retrievedAt:'2026-10-11T00:00:00Z',electionDate:'2026-11-03',completeScopes:[],expectedRowCount:1}],candidates:[{sourceId:'la',state:'LA',office:'H',district:'01',date:'2026-11-03',name:'Fixture primary candidate',partyRaw:'',incumbent:null}]});expect(planNomineeRefresh(m,[race],[]).actions).toHaveLength(0);
});
it('links current FEC registration to corrected LA open-primary race without certifying nomination',()=>{
 const raw=['H6LA01001','FIXTURE, ALEX','DEM','2026','LA','H','01','C','C','','','','','',''].join('|');const p=buildFecSyncPlan(parseFecMaster(raw).rows,[{...race,type:'primary'}],[],'a'.repeat(64));expect(p.actions).toHaveLength(1);expect(p.actions[0]).not.toHaveProperty('ballotStatus');
});

import {houseRaces} from '../server/house-races-2026';
import {planLouisianaHouseCorrection,runLouisianaHouseCorrection,louisianaHouseDescription} from '../server/louisiana-house-catalog';
const actualOld=JSON.parse(readFileSync('artifacts/la-catalog/shared-readonly-before.json','utf8')).elections;
it('keeps435 House seed contests anddates, with exactlysix LA openprimaries and no speculativeDec12 contest',()=>{
 const all=houseRaces();expect(all).toHaveLength(435);expect(all.every(r=>r.date==='2026-11-03')).toBe(true);
 expect(all.filter(r=>r.type==='primary').map(r=>r.title)).toEqual(Array.from({length:6},(_,i)=>`U.S. House Election - LA-0${i+1}`));expect(all.filter(r=>r.state!=='LA').every(r=>r.type==='general')).toBe(true);expect(all.filter(r=>r.state==='LA').every(r=>r.description.includes('If needed'))).toBe(true);
});
it('plans exactactualIDs429–434 and leaves Senate/date/activeflag unchanged',()=>{
 const p=planLouisianaHouseCorrection(actualOld);expect(p.changes.map(c=>c.id)).toEqual([429,430,431,432,433,434]);expect(p.before.every(r=>r.date.startsWith('2026-11-03'))).toBe(true);expect(p.changes.every(r=>Object.keys(r).sort().join(',')==='description,id,subtitle,type')).toBe(true);
});
it('does not plan anotherwrite aftercorrectedtype andwording',()=>{
 const corrected=actualOld.map((r:any)=>r.id>=429&&r.id<=434?{...r,type:'primary',subtitle:`LA District ${r.id-428} — open primary`,description:louisianaHouseDescription(r.id-428)}:r);expect(planLouisianaHouseCorrection(corrected).changes).toEqual([]);
});
it.each(['missing','duplicate','wrong district','customdescription','mixedoffice'])('refuses %s drift before mutation',scenario=>{
 let rows=structuredClone(actualOld);if(scenario==='missing')rows=rows.filter((r:any)=>r.id!==429);if(scenario==='duplicate')rows.push({...rows.find((r:any)=>r.id===429),id:999});if(scenario==='wrong district')rows.find((r:any)=>r.id===429).title='U.S. House Election - LA-07';if(scenario==='customdescription')rows.find((r:any)=>r.id===429).description='Editorial detail requiring review';if(scenario==='mixedoffice')rows.find((r:any)=>r.id===429).offices.push('U.S. Senate');expect(()=>planLouisianaHouseCorrection(rows)).toThrow();
});
it('requires reviewedsha before opening apply connection',async()=>{let opened=false;await expect(runLouisianaHouseCorrection({connect:async()=>{opened=true;throw new Error('unexpected')}} as any,{apply:true})).rejects.toThrow(/SHA256/);expect(opened).toBe(false)});
it.each([{state:'TX',type:'primary',date:'2026-11-03'},{state:'LA',type:'primary',date:'2026-05-16'},{state:'LA',type:'primary',date:'2026-12-12'}])('does not broaden FEC linking beyond LA Nov3House openprimary %j',override=>{
 const raw=['H6'+override.state+'01001','FIXTURE, ALEX','DEM','2026',override.state,'H','01','C','C','','','','','',''].join('|');expect(buildFecSyncPlan(parseFecMaster(raw).rows,[{...race,...override,title:`U.S. House Election - ${override.state}-01`}],[],'a'.repeat(64)).actions).toHaveLength(0);
});
