import {createHash} from 'node:crypto';
const base=new URL(process.env.BASE),upstream=new URL(process.env.UPSTREAM);
if(base.protocol!=='https:'||upstream.protocol!=='http:'||!/^et6-prod-\d+-[a-f0-9]{8}-app$/.test(upstream.hostname))throw Error('Wrong isolated endpoints');
const security=['content-security-policy','strict-transport-security','x-content-type-options','x-frame-options','referrer-policy','cross-origin-opener-policy','cross-origin-resource-policy','origin-agent-cluster','x-dns-prefetch-control','x-download-options','x-permitted-cross-domain-policies'];
const receipt={outcome:'Failed',checks:[]};
for(const path of ['/auth','/admin/results']){
 const raw=await fetch(new URL(path,upstream),{headers:{Host:base.host,'X-Forwarded-Proto':'https'}});
 const tls=await fetch(new URL(path,base));
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 const r={path,upstreamStatus:raw.status,proxyStatus:tls.status,upstreamHeaders:Object.fromEntries(security.map(k=>[k,raw.headers.get(k)])),proxyHeaders:Object.fromEntries(security.map(k=>[k,tls.headers.get(k)])),upstreamBodySha256:hash(Buffer.from(await raw.arrayBuffer())),proxyBodySha256:hash(Buffer.from(await tls.arrayBuffer()))};
 r.worked=r.upstreamStatus===200&&r.proxyStatus===200&&JSON.stringify(r.upstreamHeaders)===JSON.stringify(r.proxyHeaders)&&r.upstreamBodySha256===r.proxyBodySha256&&r.proxyHeaders['content-security-policy']?.includes('upgrade-insecure-requests')&&!!r.proxyHeaders['strict-transport-security'];
 receipt.checks.push(r);
}
if(receipt.checks.every(c=>c.worked))receipt.outcome='Worked';
console.log(JSON.stringify(receipt,null,2));process.exitCode=receipt.outcome==='Worked'?0:1;
