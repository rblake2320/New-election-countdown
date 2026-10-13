import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {verifyBrowserWire} from './verify-browser-wire.mjs';
import {loadReplay} from './audit-mixed-browser-wire.mjs';
const replay=loadReplay();
const cli=fileURLToPath(new URL('./audit-mixed-browser-wire.mjs',import.meta.url));
const repo=fileURLToPath(new URL('../',import.meta.url));
for(const [name,cwd] of [['repository',repo],['unrelated directory',tmpdir()]])test('real CLI no-argument replay from '+name,()=>{
 const result=spawnSync(process.execPath,[cli],{cwd,encoding:'utf8',timeout:10000});
 assert.ifError(result.error);assert.equal(result.status,0);assert.equal(result.stderr,'');
 const body=JSON.parse(result.stdout);assert.equal(body.outcome,'Worked');assert.equal(body.results.length,4);
 assert.ok(body.results.every(row=>row.outcome==='Worked'&&row.wire304Count===4&&row.changed200Count===1));
});
for(const arg of ['C:/__et_audit_input_that_does_not_exist__','--help',''])test('real CLI refuses unexpected argument '+JSON.stringify(arg),()=>{
 const result=spawnSync(process.execPath,[cli,arg],{cwd:tmpdir(),encoding:'utf8',timeout:10000});
 assert.ifError(result.error);assert.equal(result.status,2);assert.equal(result.stdout,'');
 assert.match(result.stderr,/accepts no arguments/);
});
function packet(engine='webkit',width=1280){
 const p=structuredClone(replay.packets.find(p=>p.expected.engine===engine&&p.expected.width===width));
 return [p.polls,p.timeline,replay.wireLog,p.controller,p.expected];
}
for(const engine of ['firefox','webkit'])for(const width of [1280,390])test(`actual retained ${engine}/${width}`,()=>assert.equal(verifyBrowserWire(...packet(engine,width)).wire304Count,4));
test('reject only three failed-window304s',()=>{const p=packet();p[2]=p[2].split('\n').map(x=>x.includes('rid=et6-webkit-1280-2')?x.replace('/api/results 304','/api/results 200'):x).join('\n');assert.throws(()=>verifyBrowserWire(...p),/four/);});
test('reject duplicate RID',()=>{const p=packet();p[0][1].rid=p[0][0].rid;assert.throws(()=>verifyBrowserWire(...p),/duplicate/);});
test('reject duplicate server log match',()=>{const p=packet();p[2]+=p[2];assert.throws(()=>verifyBrowserWire(...p),/exactly one/);});
test('reject changed failed-window body',()=>{const p=packet();p[0][1].bodySha256='different';assert.throws(()=>verifyBrowserWire(...p),/body identity/);});
test('reject changed failed-window validator',()=>{const p=packet();p[0][1].responseEtag='different';assert.throws(()=>verifyBrowserWire(...p),/validator/);});
test('reject arbitrary changed200 before controller recovery',()=>{const p=packet();p[3].recoveredAt='2026-10-13T23:00:00.000Z';assert.throws(()=>verifyBrowserWire(...p),/changed wire200/);});
test('reject unchanged recovered body',()=>{const p=packet();p[0].at(-1).bodySha256=p[0][0].bodySha256;assert.throws(()=>verifyBrowserWire(...p),/changed wire200/);});
test('reject recovered body joined to server304',()=>{const p=packet();const rid=p[0].at(-1).rid;p[2]=p[2].split('\n').map(x=>x.includes('rid='+rid)?x.replace('/api/results 200','/api/results 304'):x).join('\n');assert.throws(()=>verifyBrowserWire(...p),/changed wire200/);});
test('reject cross-engine RID substitution',()=>{const p=packet('firefox');p[0][1]=packet('webkit')[0][1];assert.throws(()=>verifyBrowserWire(...p),/Wrong engine/);});
test('reject recovered browser500',()=>{const p=packet();p[0].at(-1).status=500;assert.throws(()=>verifyBrowserWire(...p),/changed wire200/);});
test('reject empty UI as recovery',()=>{const p=packet();p[1].at(-1).cards=0;p[1].at(-1).healthy=0;assert.throws(()=>verifyBrowserWire(...p),/No browser recovery/);});

for(const [name,mutate] of [
 ['never observed failed UI',row=>{row.healthy=506;row.errCards=[];}],
 ['wrong failed race',row=>{row.errCards=[25];}],
 ['wrong failed healthy count',row=>{row.healthy=504;}],
 ['wrong failed total count',row=>{row.cards=505;}],
 ['loading instead of failed UI',row=>{row.loading=1;}],
 ['failed UI observed after hold polls',row=>{row.t=130;}],
])test('reject '+name,()=>{const p=packet();mutate(p[1][0]);assert.throws(()=>verifyBrowserWire(...p),/failed UI/);});
