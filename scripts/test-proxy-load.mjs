import fs from 'node:fs/promises';
import path from 'node:path';

// This fixture runs only against containers created by test-container.mjs.
// It never accepts a network URL or targets a shared deployment.
export async function testProxyLoad({ docker, network, app, evidence, report }) {
  const proxy = `${app}-proxy`;
  const rps = Number(process.env.TEST_LOAD_RPS || 20);
  const seconds = Number(process.env.TEST_LOAD_SECONDS || 60);
  if (!Number.isInteger(rps) || rps < 1 || rps > 50 ||
      !Number.isInteger(seconds) || seconds < 1 || seconds > 120) {
    throw new Error('Local fixture limits: 1-50 RPS, 1-120 seconds');
  }
  const config = path.resolve(evidence, 'nginx.conf');
  await fs.writeFile(config, `events {}\nhttp { server { listen 80;
    location / { proxy_pass http://${app}:5000;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }}\n`);
  try {
    await docker('create', '--name', proxy, '--network', network, 'nginx:stable-alpine');
    await docker('cp', config, `${proxy}:/etc/nginx/nginx.conf`);
    await docker('start', proxy);
    const script = `
      const base='http://${proxy}';
      const html=await fetch(base).then(r=>r.text());
      const assets=[...html.matchAll(/(?:src|href)="(\\/assets\\/[^"?#]+)"/g)].map(x=>x[1]);
      if(assets.length<2)throw Error('Expected real built JS and CSS assets');
      const paths=['/',...assets];
      const statuses={},latencies=[];let errors=0,sent=0;
      const start=Date.now();
      for(let second=0;second<${seconds};second++){
        const requests=[];
        for(let i=0;i<${rps};i++){
          const target=paths[sent++%paths.length];
          requests.push((async()=>{
            const t=Date.now();
            try{const r=await fetch(base+target,{signal:AbortSignal.timeout(5000)});
              await r.arrayBuffer(); statuses[r.status]=(statuses[r.status]||0)+1;
            }catch{errors++;}finally{latencies.push(Date.now()-t);}
          })());
          await new Promise(r=>setTimeout(r,1000/${rps}));
        }
        await Promise.all(requests);
      }
      latencies.sort((a,b)=>a-b);
      console.log(JSON.stringify({fixture:'one proxy client, real landing/JS/CSS',
        targetRps:${rps},seconds:${seconds},sent,elapsedMs:Date.now()-start,
        statuses,errors,p95Ms:latencies[Math.ceil(latencies.length*.95)-1],
        passed:errors===0&&statuses[200]===sent}));
    `;
    report.proxyLoad = JSON.parse(await docker('exec', app, 'node', '--input-type=module', '-e', script));
    if (!report.proxyLoad.passed) throw new Error('Proxy load acceptance failed: every landing/asset request must return 200, zero 429');
  } finally {
    try { await fs.writeFile(path.join(evidence, 'nginx.log'), await docker('logs', proxy)); } catch {}
    try { await docker('rm', '-f', proxy); } catch {}
  }
}
