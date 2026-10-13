import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({evidence:vi.fn(),current:vi.fn(),fetch:vi.fn()}));
vi.mock('../../server/storage',()=>({storage:{getElections:vi.fn(async()=>[]),storeResultEvidence:state.evidence,getResultsPayload:state.current}}));
import { createOfficialLiveAdapter, createLiveTransportPool, reviewedLiveUrls, type LiveSourceDefinition } from '../../server/official-result-adapters/live';
import { registerReviewedOfficialResults, reviewedDefaultLiveDefinitions, privateReplayTargetFingerprint } from '../../server/official-result-bootstrap';
import { ResultsIngestionService } from '../../server/results-ingestion-service';
import { ResultsSourceRegistry } from '../../server/results-source-registry';
const raw=(name:string)=>readFileSync('tests/fixtures/official-result-adapters/'+name);
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const primaryTarget=JSON.parse(readFileSync('artifacts/source-packet/nc-manual/target-binding.json','utf8'));
const historical:LiveSourceDefinition={state:'NC',publisher:{id:'nc-enr-2026-primary-dem',kind:'official_state_enr',name:'North Carolina State Board of Elections',url:reviewedLiveUrls.NC['2026-03-03'][0]},payloadUrl:reviewedLiveUrls.NC['2026-03-03'][0],companionUrl:reviewedLiveUrls.NC['2026-03-03'][1],targets:[{target:primaryTarget,context:{state:'NC',electionDate:'2026-03-03',phase:'primary',level:'federal',office:'U.S. Senate',district:null,party:'DEM'},sourceContestId:'2147',localContestId:'2147'}]};
const election=(target:typeof primaryTarget)=>({id:target.id,state:target.state,date:target.date,type:target.type,level:target.level,title:target.title,officialResultsUrl:null,officialResultsSource:null});
const context=(def:LiveSourceDefinition,signal=new AbortController().signal)=>({signal,source:{id:def.publisher.id,kind:def.publisher.kind,via:'registry' as const,publication:'none' as const,registered:null}});
const deps=()=>({fetch:state.fetch,now:()=>new Date(),evidence:state.evidence,current:state.current});
beforeEach(()=>{vi.clearAllMocks();state.current.mockResolvedValue(null);state.evidence.mockImplementation(async(bytes:Buffer)=>({sha256:digest(bytes)}));state.fetch.mockImplementation(async(url:string)=>new Response(url.includes('county.txt')?raw('NC-primary-counties.txt'):raw('NC-primary-results.txt'),{status:200,headers:{'content-type':'application/json'}}));});
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
});
