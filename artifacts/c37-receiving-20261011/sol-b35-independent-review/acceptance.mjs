import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'file:///D:/projects/et-wt/lane-b-et36/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/fixture',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','HTMLInputElement','HTMLButtonElement','SVGElement','Element','Node','Document','DocumentFragment','Event','CustomEvent','MouseEvent','KeyboardEvent','MutationObserver','DOMException'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
dom.window.PointerEvent=dom.window.MouseEvent;globalThis.PointerEvent=dom.window.MouseEvent;
for(const key of ['scrollIntoView','releasePointerCapture'])if(!dom.window.HTMLElement.prototype[key])dom.window.HTMLElement.prototype[key]=()=>{};
if(!dom.window.HTMLElement.prototype.hasPointerCapture)dom.window.HTMLElement.prototype.hasPointerCapture=()=>false;
const app=await import('./runtime.mjs');
const rows=JSON.parse(await fs.readFile('members-response.json','utf8'));const receipts=JSON.parse(await fs.readFile('receipt.json','utf8'));
const scoped=app.apiScope.filterMembers(rows,'current');await fs.writeFile('actual-current-projection.json',JSON.stringify(scoped));
const checks=[],transport=[],clients=[];let plannedResponse=null;
globalThis.fetch=async(url,options={})=>{transport.push({url:String(url),method:options.method??'GET',credentials:options.credentials??null});if(plannedResponse && String(url)===plannedResponse.path)return new Response(JSON.stringify(plannedResponse.body),{status:plannedResponse.status,headers:{'Content-Type':'application/json'}});throw Error('Unexpected transport; live network prohibited: '+url);};
async function check(name,fn){try{const details=await fn();checks.push({name,outcome:'Worked',...(details?{details}:{})});}catch(e){checks.push({name,outcome:'Failed',error:e.stack});process.exitCode=1;}finally{app.cleanup();for(const client of clients.splice(0))client.clear();plannedResponse=null;}}
const defaults={search:'',party:'all',state:'',chamber:'all'};
const clientFor=(members=scoped)=>{const client=new app.QueryClient({defaultOptions:{queries:{staleTime:Infinity,gcTime:Infinity,retry:false,refetchOnWindowFocus:false},mutations:{retry:false,gcTime:Infinity}}});clients.push(client);client.setQueryData(['/api/members'],members);client.setQueryData(['/api/bills'],[]);client.setQueryData(['/api/bills','119'],[]);client.setQueryData(['/api/committees'],[]);return client;};
const renderWith=(component,client=clientFor())=>app.render(app.createElement(app.QueryClientProvider,{client},app.createElement(component)));
await check('real A current scope excludes legacy/history and retains539 source records',()=>{
  assert.equal(rows.length,541);assert.equal(scoped.length,539);assert(scoped.every(r=>r.congress===119 && /^[A-Z]\d{6}$/.test(r.bioguideId)));
  assert(!scoped.some(r=>r.party==='UNKNOWN'));assert.deepEqual(app.apiScope.filterMembers(rows,'legacy').map(r=>r.bioguideId),['IMPORT_D_FIXTURE']);assert.deepEqual(app.apiScope.filterMembers(rows,'history').map(r=>r.bioguideId),['HISTORY_D_FIXTURE']);
});
for(const [party,count] of [['R',274],['D',262],['I',3]])await check(`actual helper ${party} filter ${count}`,()=>{
  const filtered=app.filterMembers(scoped,{...defaults,party});assert.equal(filtered.length,count);assert(filtered.every(r=>r.party===party));
  const old=scoped.filter(r=>r.party.toLowerCase().includes(({R:'republican',D:'democratic',I:'independent'})[party]));assert.equal(old.length,0);
  return {newCount:filtered.length,oldLabelSubstringCount:old.length};
});
await check('actual helper counts433 voting/6 nonvoting/100 Senate and clean issues',()=>{
  const c=app.composition(scoped);assert.equal(c.total,539);assert.equal(c.houseVoting,433);assert.equal(c.houseNonVoting,6);assert.equal(c.senate,100);assert.deepEqual(c.byParty,{Republican:274,Democratic:262,Independent:3});assert.deepEqual(app.compositionIssues(c),[]);
  assert.deepEqual(scoped.filter(app.isNonVotingHouse).map(r=>r.state).sort(),['AS','DC','GU','MP','PR','VI']);assert.equal(app.SEATS.houseVoting-c.houseVoting,2);return c;
});
await check('raw retained backward-compatible response reports540 records/one issue, excludes history',()=>{
  const c=app.composition(rows);assert.equal(c.total,540);assert.equal(c.otherCongress,1);assert.equal(c.unrecognizedHouseSeat,1);assert.equal(c.byParty['Party not recorded'],1);assert.deepEqual(app.compositionIssues(c),['1 House record(s) with no recognized seat']);
});
await check('actual member labels preserve at-large/resident commissioner/delegate',()=>{
  const byId=id=>scoped.find(r=>r.bioguideId===id);assert.equal(app.seatLabel(byId('B001323')),'At-large district');assert.equal(app.seatLabel(byId('H001103')),'Resident Commissioner (nonvoting)');assert.equal(app.seatLabel(byId('N000147')),'Delegate (nonvoting)');
});
await check('real component / real QueryClient renders scoped539 with correct composition',async()=>{
  renderWith(app.CongressData);assert(app.screen.getByText('Showing 539 of 539 members'));assert(app.screen.getByText('119th Congress: 100 senators, 433 voting representatives, 6 nonvoting House members'));assert.equal(app.screen.queryByText('Synthetic legacy preservation fixture'),null);assert.equal(app.screen.queryByText('Synthetic historical preservation fixture'),null);
  await fs.writeFile('congress-scoped-dom.html',dom.window.document.body.innerHTML);return {noHookMocks:true,queryRows:539};
});
await check('real component party interactions showR274 D262 I3',async()=>{
  renderWith(app.CongressData);const user=app.userEvent.setup({document:dom.window.document});
  for(const [label,count] of [['Republican',274],['Democratic',262],['Independent',3]]){await user.click(app.screen.getByRole('combobox',{name:'Filter by party'}));await user.click(app.screen.getByRole('option',{name:label}));assert(app.screen.getByText(`Showing ${count} of 539 members`));}
});
await check('real component state interaction showsVT3 / exact source labels',async()=>{
  renderWith(app.CongressData);app.fireEvent.change(app.screen.getByPlaceholderText('State (e.g., CA, NY)'),{target:{value:'vt'}});assert(app.screen.getByText('Showing 3 of 539 members'));assert(app.screen.getByText('VT · At-large district'));assert(app.screen.getByText('Becca Balint'));assert(app.screen.getByText('Bernard Sanders'));
});
await check('real admin component counts539 and flags two vacancies honestly',()=>{
  renderWith(app.CongressAdminPage);assert(app.screen.getByText('119th Congress Member Records'));assert(app.screen.getByText('539'));assert(app.screen.getByText('433'));assert(app.screen.getByText(/2 voting seat\(s\) have no member record/));assert(app.screen.getByText('Republican: 274'));assert(app.screen.getByText('Democratic: 262'));assert(app.screen.getByText('Independent: 3'));assert.equal(app.screen.queryByText('Data Issues Detected:'),null);
});
for(const response of receipts.legacy)await check('real typed admin refusal '+response.path,async()=>{
  plannedResponse=response;await assert.rejects(app.postAdminAction(response.path),error=>error.message.includes('422') && error.message.includes(response.body.message) && error.message.includes(response.body.code));
});
for(const response of [...receipts.anonymous,...receipts.ordinary])await check(`real typed admin ${response.status} refusal ${response.path}`,async()=>{
  plannedResponse=response;await assert.rejects(app.postAdminAction(response.path),error=>error.message.includes(String(response.status))&&error.message.includes(response.body.message??response.body.error));
});
await check('real admin mutation422 does not report completed import',async()=>{
  plannedResponse=receipts.legacy.find(r=>r.path==='/api/congress/import');renderWith(app.CongressAdminPage);const user=app.userEvent.setup({document:dom.window.document});await user.click(app.screen.getByRole('button',{name:'Re-import Data'}));await app.waitFor(()=>assert(app.screen.getByText('Import not performed')));assert(app.screen.getByText(/Legacy Congress dataset has no reviewed source digest/));assert.equal(app.screen.queryByText('The importer accepted the request. Member counts below are re-read from the database.'),null);await fs.writeFile('admin-refusal-dom.html',dom.window.document.body.innerHTML);
});
await check('member search component has no obsolete sync mutation/control',()=>{
  renderWith(app.CongressMemberSearch);assert(app.screen.getByRole('button',{name:'Search members'}));assert.equal(app.screen.queryByText(/Sync to Database/i),null);
});
await check('real search component labels historical response rather than implying sitting',async()=>{
  const client=clientFor();client.setQueryData(['/api/members/search','Synthetic'],rows.filter(r=>r.bioguideId.endsWith('_D_FIXTURE')));renderWith(app.CongressMemberSearch,client);app.fireEvent.change(app.screen.getByRole('textbox',{name:'Member name'}),{target:{value:'Synthetic'}});assert(app.screen.getByText(/118th Congress/));assert(app.screen.getByText('Synthetic historical preservation fixture'));
});
const report={head:'dea5bf21967d742f6b8853653082dd370c8871d2',inputSha256:'4e2b8e72e1e56dc114f055e9e704bde76dd9fcda4ee0ee764e5c1ae9d8d1ebb0',outcome:checks.every(c=>c.outcome==='Worked')?'Worked':'Failed',passed:checks.filter(c=>c.outcome==='Worked').length,failed:checks.filter(c=>c.outcome==='Failed').length,checks,transport,liveNetworkCalls:0,hookMocks:0,browserUse:0,serverOrDBWrites:0,environment:'Native Node24/JSDOM and actual real React QueryClient; standard missing DOM pointer/scroll APIs shimmed only'};
await fs.writeFile('acceptance-receipt.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({outcome:report.outcome,passed:report.passed,failed:report.failed,transportCalls:transport.length}));
dom.window.close();
