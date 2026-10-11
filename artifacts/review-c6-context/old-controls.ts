import {readFileSync,writeFileSync} from 'node:fs';
import {officialResultsFieldsSchema} from './old/shared/official-results';
const base='C:/Users/techai/.codex/tmp/sol-c6-context-projection-review';
const fixture=JSON.parse(readFileSync(base+'/acceptance-cases.json','utf8'));
const results=fixture.cases.map((c:any)=>{
 try{
  const fields=officialResultsFieldsSchema.parse(c.context);
  const empty=fields.officialResultsUrl===null&&fields.officialResultsSource===null;
  return {scenario:c.scenario,expectedProjection:c.expectedProjection,oldProjectedNull:empty,oldOutcomeMatchesExpected:c.expectedProjection==='null'?empty:!empty,oldProjectedUrl:fields.officialResultsUrl,oldSourceDate:fields.officialResultsSource?.targetElectionDate??null,oldSourcePhase:fields.officialResultsSource?.electionPhase??null};
 }catch(e:any){return {scenario:c.scenario,oldThrow:e.message,oldOutcomeMatchesExpected:false};}
});
const report={oldHead:'554ab9020a0c2937a2df5bbc56a5e963444a3be9',receivingExpression:'officialResultsFieldsSchema.parse(election) used by immutable detail handler; old listing passes stored fields through unchanged',sourcePayloadSha256:fixture.sourcePayloadSha256,controls:results,staleContextExposures:results.filter((r:any)=>r.expectedProjection==='null'&&!r.oldProjectedNull&&!r.oldThrow).length,correctBaselineControls:results.filter((r:any)=>r.expectedProjection==='preserve'&&r.oldOutcomeMatchesExpected).length,throwCount:results.filter((r:any)=>r.oldThrow).length,scope:{offlineOnly:true,browserUsed:false,dbWrites:false}};
writeFileSync(base+'/old-negative-control-receipt.json',JSON.stringify(report,null,2));console.log(JSON.stringify({cases:results.length,staleContextExposures:report.staleContextExposures,correctBaselineControls:report.correctBaselineControls,throwCount:report.throwCount}));
