import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {projectOfficialResultsForElection} from './new/shared/official-results';
import {officialResultsFieldsSchema as oldSchema} from './old/shared/official-results';
const base='C:/Users/techai/.codex/tmp/sol-c6-context-projection-review';
const fixture=JSON.parse(readFileSync(base+'/acceptance-cases.json','utf8'));
const detailBytes=readFileSync(fixture.sourcePayloadPath);const details=JSON.parse(detailBytes.toString());
if(createHash('sha256').update(detailBytes).digest('hex')!==fixture.sourcePayloadSha256)throw Error('Original retained payload changed');
const same=(a:any,b:any)=>JSON.stringify(a)===JSON.stringify(b);
const select=(e:any)=>({officialResultsUrl:e.officialResultsUrl??null,officialResultsSource:e.officialResultsSource??null});
const nullFields={officialResultsUrl:null,officialResultsSource:null};
const cases=[...fixture.cases];const baseline=fixture.cases.find((c:any)=>c.scenario==='ISO same date').context;
cases.push({scenario:'Finite UTC Date object same day',context:{...baseline,date:new Date('2026-11-03T00:00:00Z')},expectedProjection:'preserve'});
cases.push({scenario:'Invalid Date object',context:{...baseline,date:new Date('invalid')},expectedProjection:'null'});
cases.push({scenario:'Missing undefined date',context:{...baseline,date:undefined},expectedProjection:'null'});
const results=cases.map((c:any)=>{
 let output:any=null;let exception:string|null=null;
 try{output=projectOfficialResultsForElection(c.context);}catch(e:any){exception=e.message;}
 const expected=c.expectedProjection==='null'?nullFields:select(c.context);
 let oldOutput:any=null;let oldException:string|null=null;
 try{oldOutput=oldSchema.parse(c.context);}catch(e:any){oldException=e.message;}
 return {scenario:c.scenario,expectedProjection:c.expectedProjection,outcome:!exception&&same(output,expected)?'Worked':'Failed',exception,actualFields:output,oldFieldsMatched:same(oldOutput,expected),oldException,newFieldsMatchExpected:same(output,expected)};
});
const originalPayloadChecks=details.map((e:any)=>{
 try{const fields=projectOfficialResultsForElection(e);return {id:e.id,state:e.state,outcome:same(fields,select(e))?'Worked':'Failed',changed:!same(fields,select(e))};}
 catch(e2:any){return {id:e.id,state:e.state,outcome:'Failed',error:e2.message};}
});
const report={checkedAt:new Date().toISOString(),newHead:JSON.parse(readFileSync(base+'/new-source-receipt.json','utf8')).head,oldHead:'554ab9020a0c2937a2df5bbc56a5e963444a3be9',receivingScope:'Pure actual exported receiving projection plus exact old detail receiving expression; no HTTP/browser/database execution claimed',sourcePayloadSha256:fixture.sourcePayloadSha256,edgeCases:results,originalPayloadChecks,summary:{edgeCases:results.length,edgeCasesWorked:results.filter(r=>r.outcome==='Worked').length,edgeCasesFailed:results.filter(r=>r.outcome==='Failed').length,oldStaleContextControlsReproduced:results.filter(r=>r.expectedProjection==='null'&&!r.oldFieldsMatched&&!r.oldException).length,originalPayloads:originalPayloadChecks.length,originalPayloadsUnchanged:originalPayloadChecks.filter(r=>r.outcome==='Worked').length,originalPayloadsChanged:originalPayloadChecks.filter(r=>r.outcome==='Failed').length,noProjectionThrows:results.every(r=>r.exception===null)},scope:{offlineOnly:true,networkUsed:false,browserUsed:false,dbWrites:false,peerFileEdits:false}};
writeFileSync(base+'/new-projection-acceptance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));for(const r of results.filter(r=>r.outcome==='Failed'))console.log(JSON.stringify(r));
process.exitCode=report.summary.edgeCasesFailed||report.summary.originalPayloadsChanged?1:0;
