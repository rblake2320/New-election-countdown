import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({evidence:vi.fn(),current:vi.fn(),fetch:vi.fn()}));
vi.mock('../../server/storage',()=>({storage:{getElections:vi.fn(async()=>[]),storeResultEvidence:state.evidence,getResultsPayload:state.current}}));
import { createOfficialLiveAdapter, createLiveTransportPool, reviewedLiveUrls, LIVE_BODY_LIMIT, type LiveSourceDefinition } from '../../server/official-result-adapters/live';
import { registerReviewedOfficialResults, reviewedDefaultLiveDefinitions, privateReplayTargetFingerprint } from '../../server/official-result-bootstrap';
import { ResultsIngestionService } from '../../server/results-ingestion-service';
import { MemResultReportStore } from '../../server/results-store';
import { canonicalInputHash } from '../../server/results-reports';
import { ResultsSourceRegistry, resultsSourceRegistry } from '../../server/results-source-registry';
const raw=(name:string)=>readFileSync('tests/fixtures/official-result-adapters/'+name);
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const primaryTarget=JSON.parse(readFileSync('artifacts/source-packet/nc-manual/target-binding.json','utf8'));
const historical:LiveSourceDefinition={state:'NC',publisher:{id:'nc-enr-2026-primary-dem',kind:'official_state_enr',name:'North Carolina State Board of Elections',url:reviewedLiveUrls.NC['2026-03-03'][0]},payloadUrl:reviewedLiveUrls.NC['2026-03-03'][0],companionUrl:reviewedLiveUrls.NC['2026-03-03'][1],targets:[{target:primaryTarget,context:{state:'NC',electionDate:'2026-03-03',phase:'primary',level:'federal',office:'U.S. Senate',district:null,party:'DEM'},sourceContestId:'2147',localContestId:'2147'}]};
const election=(target:typeof primaryTarget)=>({id:target.id,state:target.state,date:target.date,type:target.type,level:target.level,title:target.title,officialResultsUrl:null,officialResultsSource:null});
const context=(def:LiveSourceDefinition,signal=new AbortController().signal)=>({signal,source:{id:def.publisher.id,kind:def.publisher.kind,via:'registry' as const,publication:'none' as const,registered:null}});
const deps=()=>({fetch:state.fetch,now:()=>new Date(),evidence:state.evidence,current:state.current});
beforeEach(()=>{resultsSourceRegistry.clear();vi.clearAllMocks();state.current.mockResolvedValue(null);state.evidence.mockImplementation(async(bytes:Buffer)=>({sha256:digest(bytes)}));state.fetch.mockImplementation(async(url:string)=>new Response(url.includes('county.txt')?raw('NC-primary-counties.txt'):raw('NC-primary-results.txt'),{status:200,headers:{'content-type':'application/json'}}));});
describe('actual official live factory and startup registration',()=>{
 it('boot registers22 reviewed exact scopes without network or raw-file/evidence reads',()=>{
  const service=new ResultsIngestionService(),registry=new ResultsSourceRegistry();
  registerReviewedOfficialResults(service,registry,{dependencies:deps(),env:{}});
  expect(registry.list()).toHaveLength(22);expect(service.getStatus().adapters).toHaveLength(22);
  expect(state.fetch).not.toHaveBeenCalled();expect(state.evidence).not.toHaveBeenCalled();expect(state.current).not.toHaveBeenCalled();
 });
 it('real NC historical bytes traverse fetch/body/hash/parser/bridge/evidence with original827755total',async()=>{
  const factory=createOfficialLiveAdapter(historical,deps());
  const result=await factory.adapter(election(primaryTarget),context(historical));
  expect(result?.totalVotes).toBe(827755);expect(result?.candidates).toHaveLength(6);
  expect(result?.candidates[0]).toMatchObject({name:'Roy Cooper',votes:761345,candidateId:null,isWinner:false});
  expect(result?.asOf).toBeNull();expect(result?.status).toBe('unofficial');
  expect(result?.sourcePayloadSha256).toBe(digest(raw('NC-primary-results.txt')));
  expect(state.evidence).toHaveBeenCalledTimes(2);expect(state.fetch).toHaveBeenCalledTimes(2);
  expect(factory.health().lastFetchedAt).not.toBeNull();
 });
 it('currentbeforeNov3 never fetches or admits stagednonzero',async()=>{
  const def=reviewedDefaultLiveDefinitions().find(item=>item.state==='NC')!;
  const result=await createOfficialLiveAdapter(def,deps()).adapter(election(def.targets[0].target),context(def));
  expect(result).toBeNull();expect(state.fetch).not.toHaveBeenCalled();expect(state.evidence).not.toHaveBeenCalled();
 });
 it('actual futurezero bytes afterdaygate are notpublished and have no evidence/report write',async()=>{
  const def=reviewedDefaultLiveDefinitions().find(item=>item.state==='NC')!;
  state.fetch.mockImplementation(async(url:string)=>new Response(raw(url.includes('county.txt')?'NC-20261103-county.txt':'NC-20261103-results_0.txt')));
  const result=await createOfficialLiveAdapter(def,{...deps(),now:()=>new Date('2026-11-04T12:00:00Z')}).adapter(election(def.targets[0].target),context(def));
  expect(result).toBeNull();expect(state.evidence).not.toHaveBeenCalled();
 });
 it.each([{state:'LA'},{date:'2026-11-03'},{type:'general'},{level:'state'},{title:'Unreviewed role'},{id:13}])('refuses altered authoritative tuple%j beforefetch',async changed=>{
  await expect(createOfficialLiveAdapter(historical,deps()).adapter({...election(primaryTarget),...changed},context(historical))).rejects.toMatchObject({publicCode:'official_target_mismatch'});
  expect(state.fetch).not.toHaveBeenCalled();
 });
 it('shared-state coalescing performsonepayload+companion fetch forconcurrent consumers',async()=>{
  const pool=createLiveTransportPool(),a=createOfficialLiveAdapter(historical,deps(),pool),b=createOfficialLiveAdapter(historical,deps(),pool);
  const results=await Promise.all([a.adapter(election(primaryTarget),context(historical)),b.adapter(election(primaryTarget),context(historical))]);
  expect(results[0]?.totalVotes).toBe(827755);expect(results[1]?.totalVotes).toBe(827755);expect(state.fetch).toHaveBeenCalledTimes(2);
 });
 it('redirectoutside exactgovallowlist refusesbeforebody/evidence',async()=>{
  state.fetch.mockResolvedValue(new Response(null,{status:302,headers:{location:'https://example.invalid/foreign'}}));
  await expect(createOfficialLiveAdapter(historical,deps()).adapter(election(primaryTarget),context(historical))).rejects.toMatchObject({publicCode:'official_redirect_refused'});
  expect(state.evidence).not.toHaveBeenCalled();
 });
 it('parent abort remains active until delayedbody isconsumed',async()=>{
  const abort=new AbortController();
  state.fetch.mockImplementation(async()=>new Response(new ReadableStream({start(){}})));
  const pending=createOfficialLiveAdapter(historical,deps()).adapter(election(primaryTarget),context(historical,abort.signal));
  await Promise.resolve();await Promise.resolve();abort.abort();
  await expect(pending).rejects.toMatchObject({name:'AbortError'});expect(state.evidence).not.toHaveBeenCalled();
 });
 it('replay requestcannot activatewithout explicitprivate flag/target/SHA',()=>{
  expect(()=>registerReviewedOfficialResults(new ResultsIngestionService(),new ResultsSourceRegistry(),{dependencies:deps(),env:{OFFICIAL_RESULTS_SOURCE_PACKET:'wa/initial.packet.json'}})).toThrow(/explicit matching private/);
 });
 it('pure fingerprint refusesknownshared localdatabase targets',()=>{
  expect(()=>privateReplayTargetFingerprint('postgres://fixture@127.0.0.1:5432/elections')).toThrow(/shared local/);
 });
 it('real LA runoff traversesfactorywith196212votes and1900sourceclock remainsunknown',async()=>{
  const target=JSON.parse(readFileSync('artifacts/source-packet/la-manual/target-binding.json','utf8'));
  const urls=reviewedLiveUrls.LA['2026-06-27'];
  const def:LiveSourceDefinition={state:'LA',publisher:{id:'la-enr-2026-runoff-dem',kind:'official_state_enr',name:'Louisiana Secretary of State',url:urls[0]},payloadUrl:urls[0],companionUrl:urls[1],targets:[{target,context:{state:'LA',electionDate:'2026-06-27',phase:'primary_runoff',level:'federal',office:'U.S. Senate',district:null,party:'DEM'},sourceContestId:'70156',localContestId:null}]};
  state.fetch.mockImplementation(async(url:string)=>new Response(raw(url.includes('RacesCandidates')?'LA-Jun27-races.raw.json':'LA-Jun27-votes.raw.json')));
  const result=await createOfficialLiveAdapter(def,deps()).adapter(election(target),context(def));
  expect(result?.totalVotes).toBe(196212);expect(result?.candidates.map(row=>[row.name,row.votes])).toEqual([['"Jamie" Davis',156789],['Gary Crockett',39423]]);
  expect(result?.asOf).toBeNull();expect(result?.asOfBasis).toBe('not_provided');expect(result?.candidates.every(row=>row.percent===null&&!row.isWinner&&row.candidateId===null)).toBe(true);
 });
 it('freshsamebytes/samecounts reuseacceptedcapturetimeafter25scacheexpiry',async()=>{
  let clock=new Date();const own={...deps(),now:()=>clock};const factory=createOfficialLiveAdapter(historical,own);
  const first=await factory.adapter(election(primaryTarget),context(historical));expect(first).not.toBeNull();
  state.current.mockResolvedValue({...first,reportId:1,revision:'isolated-accepted-source',electionContext:{state:primaryTarget.state,electionDate:primaryTarget.date,type:primaryTarget.type,level:primaryTarget.level,office:primaryTarget.title},history:[],stale:false,staleSince:null});
  clock=new Date(clock.getTime()+26000);
  const repeat=await factory.adapter(election(primaryTarget),context(historical));
  expect(state.fetch).toHaveBeenCalledTimes(4);expect(repeat?.retrievedAt).toBe(first?.retrievedAt);expect(factory.health().lastFetchedAt).toBe(clock.toISOString());
 });
 it('evidencefailure preventsreturningarecordableinput',async()=>{
  state.evidence.mockRejectedValue(new Error('isolated evidence failure'));
  await expect(createOfficialLiveAdapter(historical,deps()).adapter(election(primaryTarget),context(historical))).rejects.toThrow('isolated evidence failure');
 });
 it('declaredoversizedbody refusesbeforeevidence',async()=>{
  state.fetch.mockResolvedValue(new Response('x',{headers:{'content-length':String(LIVE_BODY_LIMIT+1)}}));
  await expect(createOfficialLiveAdapter(historical,deps()).adapter(election(primaryTarget),context(historical))).rejects.toMatchObject({publicCode:'official_body_bound'});
  expect(state.evidence).not.toHaveBeenCalled();
 });
 it('truncatedactualJSON refusesdespitefreshdynamichash',async()=>{
  state.fetch.mockImplementation(async(url:string)=>new Response(url.includes('county.txt')?raw('NC-primary-counties.txt'):raw('NC-primary-results.txt').subarray(0,100)));
  await expect(createOfficialLiveAdapter(historical,deps()).adapter(election(primaryTarget),context(historical))).rejects.toMatchObject({publicCode:'official_invalid_json'});
  expect(state.evidence).not.toHaveBeenCalled();
 });
 it('packagedWAinitialandrecountreplaykeepreal2024scopeanddifferentcountsonsamepayloadhash',async()=>{
  const db='postgres://fixture@private-source-pg:5432/et_source_fixture';
  const env={DATABASE_URL:db,OFFICIAL_RESULTS_REPLAY:'private_fixture',OFFICIAL_RESULTS_REPLAY_TARGET_ID:'unit-isolated-target',OFFICIAL_RESULTS_REPLAY_TARGET_SHA256:privateReplayTargetFingerprint(db),OFFICIAL_RESULTS_NETWORK_ENABLED:'false',OFFICIAL_RESULTS_SOURCE_PACKET:'wa/initial.packet.json',OFFICIAL_RESULTS_SOURCE_PACKET_SHA256:'c829680c33da6d5e1eb8a4caf1b3ac489d2906d5284aade91d1bf24bea747660'};
  const privateDestinations=[{id:'unit-isolated-target',host:'private-source-pg',port:'5432',database:'et_source_fixture',reviewedContainerLabel:'unit-only explicit target',authority:'isolated boundary fixture; not a production destination'}];
  const initialService=new ResultsIngestionService(),initialRegistry=new ResultsSourceRegistry();registerReviewedOfficialResults(initialService,initialRegistry,{dependencies:deps(),env,privateDestinations});
  const initialDef=initialRegistry.list()[0];
  const map:Map<string,Function>=Reflect.get(initialService,'adapters');
  const target=JSON.parse(readFileSync('data/official-results/live/replay/wa/initial.packet.json','utf8')).targetBinding;
  const ctx={signal:new AbortController().signal,source:{id:initialDef.id,kind:initialDef.kind,via:'registry',publication:'none',registered:initialDef}};
  const first=await map.get(initialDef.id)!(election(target),ctx);
  expect(first.status).toBe('certified');expect(first.totalVotes).toBe(1903073);expect(first.certification.certifiedAt).toBeNull();
  state.current.mockResolvedValue({...first,reportId:1,revision:'isolated-initial-acceptance',electionContext:{state:target.state,electionDate:target.date,type:target.type,level:target.level,office:target.title},history:[],stale:false,staleSince:null});
  const recountService=new ResultsIngestionService(),recountRegistry=new ResultsSourceRegistry();registerReviewedOfficialResults(recountService,recountRegistry,{dependencies:deps(),privateDestinations,env:{...env,OFFICIAL_RESULTS_SOURCE_PACKET:'wa/recount.packet.json',OFFICIAL_RESULTS_SOURCE_PACKET_SHA256:'637e7671bc1cbc71c859e160aac2393c26a646342f9c81f292be0d838066bff2'}});
  const recountMap:Map<string,Function>=Reflect.get(recountService,'adapters');const recount=await recountMap.get(initialDef.id)!(election(target),ctx);
  expect(recount.totalVotes).toBe(1903115);expect(recount.sourcePayloadSha256).toBe(first.sourcePayloadSha256);expect(recount.candidates).not.toEqual(first.candidates);
  expect(state.fetch).not.toHaveBeenCalled();expect(state.evidence).toHaveBeenCalled();
 });

 it.each(['postgres://fixture@127.0.0.1:55991/et_fixture?host=host.docker.internal&port=5432&database=elections','postgres://fixture@host.docker.internal:5432/elections','postgres://fixture@localhost.:5432/elections','postgres://fixture@2130706433:5432/elections','postgres://fixture@private-pg/et_fixture'])('refusesambiguous/shared replay target %s',url=>{
  expect(()=>privateReplayTargetFingerprint(url)).toThrow();
 });

 it('actual LA writer receivingorder roundtrip repeats0 newreports afterfreshcapture',async()=>{
  const target=JSON.parse(readFileSync('artifacts/source-packet/la-manual/target-binding.json','utf8')),urls=reviewedLiveUrls.LA['2026-06-27'];
  const def:LiveSourceDefinition={state:'LA',publisher:{id:'la-enr-2026-runoff-dem',kind:'official_state_enr',name:'Louisiana Secretary of State',url:urls[0]},payloadUrl:urls[0],companionUrl:urls[1],targets:[{target,context:{state:'LA',electionDate:'2026-06-27',phase:'primary_runoff',level:'federal',office:'U.S. Senate',district:null,party:'DEM'},sourceContestId:'70156',localContestId:null}]};
  const storedContext={state:target.state,electionDate:target.date,type:target.type,level:target.level,office:target.title};
  const writer=new MemResultReportStore(id=>id===target.id,()=>false,()=>[target.id],()=>target.date,()=>storedContext,()=>[]);
  resultsSourceRegistry.register({id:def.publisher.id,kind:'official_state_enr',name:def.publisher.name,state:'LA',allowedUrls:[urls[0]],electionDate:target.date,phase:target.type,electionIds:[target.id]});
  let clock=new Date();
  state.fetch.mockImplementation(async(url:string)=>new Response(raw(url.includes('RacesCandidates')?'LA-Jun27-races.raw.json':'LA-Jun27-votes.raw.json')));
  const factory=createOfficialLiveAdapter(def,{fetch:state.fetch,now:()=>clock,evidence:(...args)=>writer.storeResultEvidence(...args),current:id=>writer.getResultsPayload(id)});
  const first=await factory.adapter(election(target),context(def));expect(first).not.toBeNull();
  const accepted=await writer.recordResultReport(target.id,first!,{postedBy:'isolated-adapter',idempotencyKey:null});expect(accepted.created).toBe(true);
  expect(accepted.payload.candidates.map(row=>row.name)).toEqual(['"Jamie" Davis','Gary Crockett']);
  clock=new Date(clock.getTime()+26000);
  const repeated=await factory.adapter(election(target),context(def));expect(repeated?.retrievedAt).toBe(first?.retrievedAt);expect(canonicalInputHash(repeated!)).toBe(canonicalInputHash(first!));
  const outcome=await writer.recordResultReport(target.id,repeated!,{postedBy:'isolated-adapter',idempotencyKey:null});expect(outcome.created).toBe(false);expect(outcome.payload.reportId).toBe(accepted.payload.reportId);
 });
 it('timeoutbounds noncooperativeheader transport and doesnotpublish',async()=>{
  vi.useFakeTimers();
  try{
   state.fetch.mockImplementation(()=>new Promise<Response>(()=>{}));
   const pending=createOfficialLiveAdapter(historical,deps()).adapter(election(primaryTarget),context(historical));
   const refused=expect(pending).rejects.toMatchObject({name:'AbortError'});
   await vi.advanceTimersByTimeAsync(15001);await refused;expect(state.evidence).not.toHaveBeenCalled();
  }finally{vi.useRealTimers();}
 });
 it('oneabortedcoalescedwaiter doesnotcanceltheotherlivewaiter',async()=>{
  const pool=createLiveTransportPool(),aborted=new AbortController();
  state.fetch.mockImplementation(async(url:string)=>{await new Promise(resolve=>setTimeout(resolve,5));return new Response(raw(url.includes('county.txt')?'NC-primary-counties.txt':'NC-primary-results.txt'));});
  const a=createOfficialLiveAdapter(historical,deps(),pool).adapter(election(primaryTarget),context(historical,aborted.signal));
  const b=createOfficialLiveAdapter(historical,deps(),pool).adapter(election(primaryTarget),context(historical));
  const refused=expect(a).rejects.toMatchObject({name:'AbortError'});aborted.abort();await refused;
  expect((await b)?.totalVotes).toBe(827755);expect(state.fetch).toHaveBeenCalledTimes(2);
 });

});
