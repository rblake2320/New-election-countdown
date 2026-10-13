import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
const folder = resolve('artifacts/c38'); mkdirSync(folder, { recursive: true });
const mode = process.argv[2] ?? 'current';
const receiptOutput = resolve(process.argv[3] ?? `artifacts/c38/compiled-${mode}-${Date.now()}-receipt.json`);
if (!['current', 'old'].includes(mode)) throw new Error('Use current or old');
const sourceFiles = ['server/candidate-position-api.ts', 'server/enhanced-position-service.ts', 'server/michigan-candidate-service.ts', 'server/services/event-processor-service.ts'];
const oldHead = '8c0f45af0490e0b0a341bce2b97c8878d420bb71';
const oldBytes = new Map(mode === 'old' ? sourceFiles.map(file => [resolve(file), execFileSync('git', ['show', oldHead + ':' + file], { encoding: 'utf8' })]) : []);
const output = resolve(folder, `compiled-${mode}.mjs`);
const imports = sourceFiles.map((file, index) => `import * as mod${index} from ${JSON.stringify('./' + file)};`).join('\n');
const harness = `
${imports}
import { readFileSync, writeFileSync } from 'node:fs';
const proof = JSON.parse(readFileSync('tests/fixtures/c38/actual-statement-proof.json', 'utf8'));
const state = globalThis.__c38;
const checks = [];
async function check(scenario, fn) {
 try { if (!(await fn())) throw new Error('Expected behavior absent'); checks.push({scenario,outcome:'Worked'}); }
 catch(error) { checks.push({scenario,outcome:'Failed',reason:error.message}); }
}
async function refused(fn, code) { try { await fn(); return false; } catch(error) { return error.code === code; } }
await check('No party, tenure, committee or website-derived policy', async () => (await new mod0.CandidatePositionAPI().getPositionsForCandidate(1)).length === 0);
state.outage = true;
await check('Position source outage is explicit typed unavailable', () => refused(() => new mod0.CandidatePositionAPI().getPositionsForCandidate(1), 'POSITION_SOURCE_UNAVAILABLE'));
state.outage = false;
await check('Michigan unsupported legacy names are refused', () => refused(() => new mod2.MichiganCandidateService().fetchMichiganCandidates(1), 'LEGACY_MICHIGAN_SOURCE_UNVERIFIED'));
const election = { id: 1, title: 'Isolated receiving context', state: 'CA', date: new Date('2026-11-03T00:00:00Z'), type: 'general', level: 'state' };
await check('Stored date survives actual election-event projection', async () => {
 await new mod3.EventProcessorService().processElectionEvent(election,{electionId:1,eventType:'voting_started'});
 return state.alerts.at(-1)?.[1].electionDate?.toISOString() === election.date.toISOString();
});
await check('Missing scheduler is explicit refusal, no invented deadlines', () => refused(() => new mod3.EventProcessorService().scheduleDeadlineReminders(election), 'SCHEDULER_UNAVAILABLE'));
await check('No empty simulated enhanced source is presented as a position', async () => (await new mod1.EnhancedPositionService().getEnhancedPositions(1)).length === 0);
if (${JSON.stringify(mode)} === 'current') {
 state.rows = [{id:1,candidateId:1,category:'Healthcare',position:proof.retainedExactExcerpt,isVerified:true,sourceUrl:proof.sourceUrl,lastUpdated:null,createdAt:null}];
 await check('Actual source words and row provenance retained without confidence or date invention', async () => {
  const p=(await new mod0.CandidatePositionAPI().getPositionsForCandidate(1))[0];
  return p.position===proof.retainedExactExcerpt && p.confidence===null && p.sources[0].sourcePositionId===1 && p.sources[0].url===proof.sourceUrl && p.sources[0].date===null;
 });
 await check('Enhanced receiver shares exact source, unsupported providers stay unavailable', async () => {
  const p=await new mod1.EnhancedPositionService().enrichCandidateWithPositions({id:1});
  return p.enhancedPositions[0].position===proof.retainedExactExcerpt && p.positionSummary.averageConfidence===null && p.positionSummary.lastUpdated===null && p.positionSummary.sourceAvailability.votingRecord.code==='PROVIDER_NOT_CONFIGURED';
 });
 const before=state.alerts.length;
 await check('Cross-race event is refused before alert publication', async () => (await refused(() => new mod3.EventProcessorService().processElectionEvent(election,{electionId:2,eventType:'results_update'}),'INVALID_EVENT_CONTEXT')) && before===state.alerts.length);
}
const receipt={mode:${JSON.stringify(mode)},oldSourceHead:${JSON.stringify(oldHead)},execution:'Actual bundled modules; isolated DB/storage/alert/timer boundary fixtures, no real PG or delivery claim',networkCalls:state.networkCalls,checks};
writeFileSync(process.argv[2], JSON.stringify(receipt,null,2)+String.fromCharCode(10),{flag:'wx'});
console.log(JSON.stringify(receipt));
if (state.networkCalls!==0 || (${JSON.stringify(mode)}==='current' && checks.some(check=>check.outcome==='Failed'))) process.exitCode=1;
`;
const db = `const state=globalThis.__c38;
export const db={select(projection){if(state.outage)throw new Error('isolated DB outage');
const rows=projection?.candidate ? [{candidate:{id:1,party:'D',website:'https://example.invalid/'},congressMember:{committees:['Education'],chamber:'House',yearsInOffice:12}}] : state.rows;
const q={from(){return q},leftJoin(){return q},where(){return q},orderBy(){return q},limit(){return Promise.resolve(rows)},then(ok,no){return Promise.resolve(rows).then(ok,no)}};return q}};`;
await build({stdin:{contents:harness,resolveDir:process.cwd(),sourcefile:'c38-harness.ts'},outfile:output,bundle:true,platform:'node',format:'esm',packages:'external',target:'node24',
 banner:{js:`globalThis.__c38={rows:[],outage:false,alerts:[],networkCalls:0};globalThis.setInterval=()=>({unref(){}});process.env.OPENFEC_API_KEY='';globalThis.fetch=async()=>{globalThis.__c38.networkCalls++;throw new Error('NETWORK_FORBIDDEN')};`},
 plugins:[{name:'explicit-offline-boundaries',setup(b){
 b.onResolve({filter:/^(?:\.\.?\/)(?:db|storage|alert-engine-service)$/},args=>({path:args.path.split('/').at(-1),namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='db'?db:args.path==='storage'?`export const storage={getElections:async()=>[]};`:`export const alertEngineService={processEvent:async(...args)=>{globalThis.__c38.alerts.push(args);return undefined;}};`,loader:'js'}));
 if(mode==='old')b.onLoad({filter:/server[\\/].*\.ts$/},args=>oldBytes.has(args.path)?{contents:oldBytes.get(args.path),loader:'ts',resolveDir:resolve(args.path,'..')}:undefined);
 }}]});
const run=spawnSync(process.execPath,[output, receiptOutput],{stdio:'inherit'});if(run.error)throw run.error;process.exitCode=run.status??1;
