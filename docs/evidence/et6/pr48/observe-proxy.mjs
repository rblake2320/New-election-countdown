// Receiving-only transparent loopback observer. No response fixtures or rewrites.
import http from 'node:http';
import { appendFileSync } from 'node:fs';
const log = new URL('./browser-requests.ndjson', import.meta.url);
http.createServer((req, res) => {
  const started = Date.now();
  const upstream = http.request({ hostname: '127.0.0.1', port: 5087, path: req.url, method: req.method, headers: req.headers }, response => {
    res.writeHead(response.statusCode, response.headers);
    response.pipe(res);
    response.on('end', () => appendFileSync(log, JSON.stringify({at:new Date().toISOString(),method:req.method,url:req.url,status:response.statusCode,ms:Date.now()-started})+'\n'));
  });
  upstream.on('error', error => { res.writeHead(502); res.end('Receiving upstream unavailable'); appendFileSync(log,JSON.stringify({url:req.url,error:error.code})+'\n'); });
  req.pipe(upstream);
}).listen(5088, '127.0.0.1', () => console.log('Observing actual runtime 5087 through loopback 5088'));
