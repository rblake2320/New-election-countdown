// Correlate actual server status with browser observations; no cache-cause claim.
export function verifyBrowserWire(polls,timeline,log,controller,expected){
 if(!['firefox','webkit'].includes(expected?.engine)||![1280,390].includes(expected?.width))throw Error('Expected engine and width required');
 const prefix=`et6-${expected.engine}-${expected.width}-`;
 for(const rows of [polls,timeline])for(let i=0;i<rows.length;i++)if(!Number.isFinite(rows[i].t)||rows[i].t<0||(i&&rows[i].t<rows[i-1].t))throw Error('Invalid observation chronology');
 const start=Date.parse(controller?.browserWindow?.startedAt), recovery=Date.parse(controller?.recoveredAt);
 if(!Number.isFinite(start)||!Number.isFinite(recovery)||recovery<=start)throw Error('Missing controller fault/recovery window');
 const lines=[...log.matchAll(/^(\S+Z) [^\r\n]*GET \/api\/results (\d{3}) in [^\r\n]*?rid=([A-Za-z0-9._-]+)/gm)];
 const recovered=timeline.find((row,i)=>i>0&&row.errCards?.length===0&&row.loading===0&&row.cards===506&&row.healthy===506&&row.dateAlerts===0);
 if(!recovered)throw Error('No browser recovery timeline');
 const seen=new Set();
 const joined=polls.map((p,index)=>{
  if(p.query!=='?date=2026-11-03')throw Error('Unexpected batch scope in browser poll');
  if(typeof p.rid!=='string'||!/^et6-[A-Za-z0-9._-]+$/.test(p.rid)||seen.has(p.rid))throw Error('Missing or duplicate poll request identity');
  if(p.rid!==prefix+(index+1))throw Error('Wrong engine/width or sequence in RID');
  seen.add(p.rid);const matches=lines.filter(m=>m[3]===p.rid);
  if(matches.length!==1)throw Error('Poll needs exactly one real server log match: '+p.rid);
  const wireAt=matches[0][1];if(!Number.isFinite(Date.parse(wireAt)))throw Error('Invalid wire timestamp');
  return {...p,wireStatus:Number(matches[0][2]),wireAt};
 });
 const initial=joined.find(p=>p.ifNoneMatch==='none'&&p.wireStatus===200);
 const validBody=p=>p.status===200&&/^[a-f0-9]{64}$/.test(p.bodySha256??'')&&Number.isInteger(p.bodyBytes)&&p.bodyBytes>0;
 if(!initial?.responseEtag||!validBody(initial))throw Error('Missing original snapshot identity');
 if(Date.parse(initial.wireAt)<start||Date.parse(initial.wireAt)>=recovery)throw Error('Original snapshot outside fault window');
 const held=joined.filter(p=>Date.parse(p.wireAt)>=start&&Date.parse(p.wireAt)<recovery&&p.wireStatus===304);
 if(held.length!==4)throw Error('Expected exactly four correlated wire304s during fault window; found '+held.length);
 for(const p of held){
  if(p.t>=recovered.t||p.ifNoneMatch!=='sent'||p.ifNoneMatchValue!==initial.responseEtag||p.responseEtag!==initial.responseEtag)throw Error('Unstable failed-window validator');
  if(p.status===200?(p.bodySha256!==initial.bodySha256||p.bodyBytes!==initial.bodyBytes):(p.status!==304||p.bodySha256!==null))throw Error('Unstable failed-window body identity');
 }
 const changed=joined.filter(p=>Date.parse(p.wireAt)>=recovery&&p.t>held.at(-1).t&&p.t<=recovered.t&&p.wireStatus===200&&validBody(p)&&p.ifNoneMatch==='sent'&&p.ifNoneMatchValue===initial.responseEtag&&p.responseEtag&&p.responseEtag!==initial.responseEtag&&p.bodySha256!==initial.bodySha256);
 if(!changed.length)throw Error('No correlated changed wire200 leading to browser recovery');
 return {outcome:'Worked',controllerFailureAt:controller.browserWindow.startedAt,controllerRecoveryAt:controller.recoveredAt,recoveredAtSeconds:recovered.t,wire304Count:held.length,changed200Count:changed.length,initialBodySha256:initial.bodySha256,changedBodySha256:changed[0].bodySha256,causalExplanation:'Not established; correlation only',joined};
}
