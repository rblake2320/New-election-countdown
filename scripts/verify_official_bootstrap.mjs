import {build} from 'esbuild';
import{resolve,join}from'node:path';
import{mkdirSync,cpSync,writeFileSync,readFileSync}from'node:fs';
import{spawnSync}from'node:child_process';
const root=resolve('artifacts/live-bootstrap/portable-'+Date.now());mkdirSync(join(root,'dist'),{recursive:true});mkdirSync(join(root,'outside'),{recursive:true});
cpSync('data/official-results/live',join(root,'data/official-results/live'),{recursive:true});
const entry=`
import{registerOfficialFeedAdapters}from'./server/official-feed-adapters.ts';
import{registerReviewedOfficialResults,privateReplayTargetFingerprint}from'./server/official-result-bootstrap.ts';
import{ResultsIngestionService}from'./server/results-ingestion-service.ts';
import{ResultsSourceRegistry}from'./server/results-source-registry.ts';
import{createHash}from'node:crypto';import{writeFileSync}from'node:fs';
const state=globalThis.__bootTest,checks=[];
const service=new ResultsIngestionService(),registry=new ResultsSourceRegistry();
const boot=registerOfficialFeedAdapters(service,registry);
if(boot.error||boot.sources.length!==22||boot.adapters.length!==22||state.fetches||state.evidence)throw new Error('Default boot counts or noIO gate failed');
checks.push({scenario:'actual compiled A hook+C body22sources/22adapters no network/evidence/rawload atboot',outcome:'Worked'});
const dataTarget='postgres://fixture@et6-prod-109656-3a740d1d-db:5432/et6_receiving';
const env={DATABASE_URL:dataTarget,OFFICIAL_RESULTS_REPLAY:'private_fixture',OFFICIAL_RESULTS_REPLAY_TARGET_ID:'et6-d-source-copy-20261013',OFFICIAL_RESULTS_REPLAY_TARGET_SHA256:privateReplayTargetFingerprint(dataTarget),OFFICIAL_RESULTS_NETWORK_ENABLED:'false',OFFICIAL_RESULTS_SOURCE_PACKET:'wa/initial.packet.json',OFFICIAL_RESULTS_SOURCE_PACKET_SHA256:'c829680c33da6d5e1eb8a4caf1b3ac489d2906d5284aade91d1bf24bea747660'};
const replayService=new ResultsIngestionService(),replayRegistry=new ResultsSourceRegistry();
registerReviewedOfficialResults(replayService,replayRegistry,{env});
if(state.evidence)throw new Error('Replay read/evidence performed atboot');
const source=replayRegistry.list()[0],adapter=Reflect.get(replayService,'adapters').get(source.id);
const target={id:4242401,state:'WA',date:'2024-08-06',type:'Primary',level:'state',title:'Washington Commissioner of Public Lands Primary',officialResultsUrl:null,officialResultsSource:null};
const input=await adapter(target,{signal:new AbortController().signal,source:{id:source.id,kind:source.kind,via:'registry',publication:'none',registered:source}});
if(input.totalVotes!==1903073||input.status!=='certified'||state.evidence!==3||state.fetches)throw new Error('Actual packaged WA replay bridge/evidence failed');
checks.push({scenario:'compiled replay loads only packaged rawfiles frommodule-relative data while cwdoutside; real1903073/8options/certified/no network',outcome:'Worked'});
const receipt={outcome:'Worked',checks,boot,privateDestinationId:env.OFFICIAL_RESULTS_REPLAY_TARGET_ID,rawHash:input.sourcePayloadSha256,evidenceCalls:state.evidence,networkCalls:state.fetches,cwd:process.cwd(),noRealDatabaseOrDeliveryClaim:true};
writeFileSync(process.argv[2],JSON.stringify(receipt,null,2)+String.fromCharCode(10),{flag:'wx'});console.log(JSON.stringify(receipt));
`;
await build({stdin:{contents:entry,resolveDir:process.cwd(),sourcefile:'actual-boot-entry.ts'},outfile:join(root,'dist/index.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',target:'node24',banner:{js:'globalThis.__bootTest={fetches:0,evidence:0};globalThis.fetch=async()=>{globalThis.__bootTest.fetches++;throw new Error("NETWORK_FORBIDDEN")};'},plugins:[{name:'only-storage-boundary',setup(b){
b.onResolve({filter:/^\.\/storage$/},()=>({path:'storage',namespace:'fixture'}));
b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'import{createHash}from"node:crypto";export const storage={getElections:async()=>[],getResultsPayload:async()=>null,storeResultEvidence:async(bytes)=>{globalThis.__bootTest.evidence++;return{sha256:createHash("sha256").update(bytes).digest("hex")};}};',loader:'js'}));
}}]});
const receipt=resolve(process.argv[2]??'artifacts/live-bootstrap/portable-receipt-'+Date.now()+'.json');
// Package externals resolve from the owning real installation via this ancestor
// directory; no dependency junction or source-tree resource fallback is used.
const run=spawnSync(process.execPath,[join(root,'dist/index.mjs'),receipt],{cwd:join(root,'outside'),encoding:'utf8'});
writeFileSync(resolve('artifacts/live-bootstrap/portable-run-'+Date.now()+'.log'),run.stdout+run.stderr);
process.stdout.write(run.stdout);process.stderr.write(run.stderr);if(run.error)throw run.error;process.exitCode=run.status??1;
