import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {JSDOM} from 'file:///D:/projects/et-wt/lane-b-et36/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/fixture',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','HTMLInputElement','HTMLButtonElement','SVGElement','Element','Node','Document','DocumentFragment','Event','CustomEvent','MouseEvent','KeyboardEvent','MutationObserver','DOMException'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
dom.window.PointerEvent=dom.window.MouseEvent;globalThis.PointerEvent=dom.window.MouseEvent;
for(const key of ['scrollIntoView','releasePointerCapture'])if(!dom.window.HTMLElement.prototype[key])dom.window.HTMLElement.prototype[key]=()=>{};if(!dom.window.HTMLElement.prototype.hasPointerCapture)dom.window.HTMLElement.prototype.hasPointerCapture=()=>false;
const old=await import('./old-runtime.mjs'),next=await import('./new-runtime.mjs');
const responses=JSON.parse(await fs.readFile('nonmember-responses.json','utf8')),members=JSON.parse(await fs.readFile('members-response.json','utf8'));
const missing=responses.find(r=>r.path==='/api/bills/119');assert.equal(missing.status,503);assert.equal(missing.body.reason,'missing_api_key');
const raw={};for(const [url,name] of [['/api/bills','bills'],['/api/committees','committees']]){const body=await fs.readFile(`raw-captures/${name}.body.json`);const headers=await fs.readFile(`raw-captures/${name}.headers.txt`,'utf8');const status=Number(/^HTTP\/1\.1 (\d{3})/.exec(headers)[1]);raw[url]={status,body:body.toString('utf8'),bodySha256:createHash('sha256').update(body).digest('hex')};assert.equal(status,200);assert.deepEqual(JSON.parse(body),[]);}
let routes=new Map(),requests=[],clients=[],errors=[];const originalError=console.error;
console.error=(...args)=>errors.push(args.map(a=>a instanceof Error?a.stack:typeof a==='string'?a:JSON.stringify(a)).join(' '));
globalThis.fetch=async(url,options={})=>{const path=String(url);requests.push({path,method:options.method??'GET',credentials:options.credentials??null});const entry=routes.get(path);if(!entry)throw Error('Unexpected endpoint; no 200empty fallback: '+path);if(typeof entry==='function')return entry();return new Response(entry.body,{status:entry.status,headers:{'Content-Type':'application/json'}});};
const checks=[];
function defaults(){routes=new Map(Object.entries(raw));routes.set('/api/bills/119',{status:missing.status,body:JSON.stringify(missing.body)});}
function render(app){const client=new app.QueryClient({defaultOptions:{queries:{staleTime:Infinity,gcTime:Infinity,retry:false,refetchOnWindowFocus:false},mutations:{retry:false,gcTime:Infinity}}});clients.push(client);client.setQueryData(['/api/members'],app.apiScope.filterMembers(members,'current'));const tree=app.createElement(app.QueryClientProvider,{client},app.createElement(app.ErrorBoundary,null,app.createElement(app.CongressData)));app.render(tree);return client;}
function open(app,name){const tab=app.screen.getByRole('tab',{name});app.fireEvent.mouseDown(tab,{button:0,ctrlKey:false});app.fireEvent.keyDown(tab,{key:'Enter'});app.fireEvent.click(tab);}
async function check(name,fn){defaults();requests=[];errors=[];try{const details=await fn();checks.push({name,outcome:'Worked',...(details?{details}:{}),requests:[...requests],consoleErrors:[...errors]});}catch(e){checks.push({name,outcome:'Failed',error:e.stack,requests:[...requests],consoleErrors:[...errors]});process.exitCode=1;}finally{old.cleanup();next.cleanup();for(const c of clients.splice(0))c.clear();}}
await check('old dea5 exact D503 crashes whole page even while Members tab is selected',async()=>{
  render(old);await old.screen.findByText('Something went wrong');assert.equal(old.screen.queryByText('Showing 539 of 539 members'),null);assert(errors.some(e=>/filter.*not a function/.test(e)));await fs.writeFile('old-whole-page-red-dom.html',dom.window.document.body.innerHTML);
  return {oldOutcome:'Failed',rootCause:'503 object admitted as query data; hidden Bills JSX eagerly calls .filter',exactD503Body:missing.body};
});
await check('new 962 actual D503 leaves Members539 mounted',async()=>{
  render(next);await next.screen.findByText('Showing 539 of 539 members');await next.waitFor(()=>assert(requests.some(r=>r.path==='/api/bills/119')));await new Promise(done=>setTimeout(done,30));assert.equal(next.screen.queryByText('Something went wrong'),null);assert(!errors.some(e=>/filter.*not a function/.test(e)));
});
await check('new Bills tab shows exact D503 missing-source error and captured200empty honestly',async()=>{
  render(next);open(next,'Bills');await next.screen.findByText('Bills by Congress are unavailable: no congressional data source is configured.');await next.screen.findByText('No bills are recorded yet.');assert.equal(next.screen.queryByText('Something went wrong'),null);await fs.writeFile('new-bills-real503-dom.html',dom.window.document.body.innerHTML);
});
await check('new Committees captured200array shows explicit empty state',async()=>{
  render(next);open(next,'Committees');await next.screen.findByText('No committees are recorded yet.');assert.equal(next.screen.queryByText(/Showing 0 of 0 committees/),null);assert.equal(next.screen.queryByText('Something went wrong'),null);
});
await check('new exact parsed D200null receipt bodies are errors, never successful empty lists',async()=>{
  for(const response of responses)routes.set(response.path,{status:response.status,body:JSON.stringify(response.body)});
  render(next);open(next,'Bills');await next.screen.findByText('Bills could not be loaded (200).');await next.screen.findByText('Bills by Congress are unavailable: no congressional data source is configured.');open(next,'Committees');await next.screen.findByText('Committees could not be loaded (200).');assert.equal(next.screen.queryByText('No committees are recorded yet.'),null);
  return {scope:'D parsed receipt carries null for200 bodies; separate raw captures are200[]; tested both explicitly without asserting they are byte-identical'};
});
await check('new Bills loading settles to actual captured empty list',async()=>{
  let release;routes.set('/api/bills',()=>new Promise(done=>{release=done;}));render(next);open(next,'Bills');await next.waitFor(()=>assert(release));const panel=next.screen.getByRole('tabpanel',{name:'Bills'});assert(panel.querySelector('[aria-busy="true"]'));assert.equal(next.screen.queryByText('No bills are recorded yet.'),null);release(new Response(raw['/api/bills'].body,{status:200,headers:{'Content-Type':'application/json'}}));await next.screen.findByText('No bills are recorded yet.');
});
await check('new Committees loading settles to actual captured empty list',async()=>{
  let release;routes.set('/api/committees',()=>new Promise(done=>{release=done;}));render(next);open(next,'Committees');await next.waitFor(()=>assert(release));const panel=next.screen.getByRole('tabpanel',{name:'Committees'});assert(panel.querySelector('[aria-busy="true"]'));release(new Response(raw['/api/committees'].body,{status:200,headers:{'Content-Type':'application/json'}}));await next.screen.findByText('No committees are recorded yet.');
});
await check('new Committees bad-list receipt retries to captured200array with real query',async()=>{
  const captured=responses.find(r=>r.path==='/api/committees');routes.set('/api/committees',{status:captured.status,body:JSON.stringify(captured.body)});render(next);open(next,'Committees');const text=await next.screen.findByText('Committees could not be loaded (200).');const alert=text.closest('[role="alert"]');routes.set('/api/committees',raw['/api/committees']);next.fireEvent.click(next.within(alert).getByRole('button',{name:'Try again'}));await next.screen.findByText('No committees are recorded yet.');assert.equal(requests.filter(r=>r.path==='/api/committees').length,2);
});
await check('new Bills-by-Congress actual503 retries without inventing records',async()=>{
  render(next);open(next,'Bills');const text=await next.screen.findByText('Bills by Congress are unavailable: no congressional data source is configured.');const alert=text.closest('[role="alert"]');routes.set('/api/bills/119',raw['/api/bills']);next.fireEvent.click(next.within(alert).getByRole('button',{name:'Try again'}));await next.screen.findByText('No bills are recorded for the 119th Congress.');assert.equal(requests.filter(r=>r.path==='/api/bills/119').length,2);
  return {scope:'finite receiver recovery control using captured200[]; no live provider configuration or successful production recovery claimed'};
});
await check('new nonnumeric Congress causes no invalid endpoint request',async()=>{
  render(next);open(next,'Bills');await next.screen.findByText('Bills by Congress are unavailable: no congressional data source is configured.');next.fireEvent.change(next.screen.getByRole('textbox',{name:'Congress number'}),{target:{value:'11a'}});await next.screen.findByText('Enter a Congress number, such as 119.');assert(!requests.some(r=>r.path.includes('11a')));
});
await check('typed actual503 status/reason survive loader and member counts unchanged',async()=>{
  await assert.rejects(next.fetchList('/api/bills/119',undefined,'Bills by Congress'),e=>e instanceof next.ListLoadError && e.status===503 && e.reason==='missing_api_key');const scoped=next.apiScope.filterMembers(members,'current'),c=next.composition(scoped);assert.equal(c.total,539);assert.deepEqual(c.byParty,{Republican:274,Democratic:262,Independent:3});assert.equal(c.houseVoting,433);assert.equal(c.houseNonVoting,6);assert.equal(c.senate,100);
});
const report={oldHead:'dea5bf21967d742f6b8853653082dd370c8871d2',newHead:'96201290851fe8e0e39dcece19a6891abc77fb6c',dEvidenceHead:'2252e667f6cd36c6c0a73445b8a2ae7047bcd191',oldWholePageOutcome:'Failed',newWholePageOutcome:checks.every(c=>c.outcome==='Worked')?'Worked':'Failed',passed:checks.filter(c=>c.outcome==='Worked').length,failed:checks.filter(c=>c.outcome==='Failed').length,checks,hookMocks:0,liveNetworkCalls:0,browserUse:0,serverOrDBWrites:0,fixtureBoundary:'Actual D parsed503 body/receipt plus separately pinned raw200[] captures; Promise delays and retry recovery are labelled finite receiving controls, not new production HTTP observations'};
await fs.writeFile('acceptance-receipt.json',JSON.stringify(report,null,2)+'\n');console.error=originalError;dom.window.close();console.log(JSON.stringify({passed:report.passed,failed:report.failed,oldWholePageOutcome:report.oldWholePageOutcome,newWholePageOutcome:report.newWholePageOutcome}));
