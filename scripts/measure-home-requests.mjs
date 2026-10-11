import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage(); const counts = {};
p.on('request', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/')) { const k = u.pathname.replace(/\/\d+/g, '/:id'); counts[k] = (counts[k]||0)+1; } });
await p.goto('http://localhost:5055/', { waitUntil: 'networkidle', timeout: 60000 }).catch(()=>{});
await p.waitForTimeout(4000);
const total = Object.values(counts).reduce((a,b)=>a+b,0);
console.log(JSON.stringify({ total_api_requests_first_load: total, by_path: counts }, null, 0));
await b.close();
