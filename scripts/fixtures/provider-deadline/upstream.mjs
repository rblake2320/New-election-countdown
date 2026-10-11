import http from 'node:http';
const mode = process.env.PROVIDER_FIXTURE_MODE;
const stats = { mode, requests: 0, active: 0, closed: 0, aborted: 0, paths: {} };
http.createServer((req, res) => {
  const path = new URL(req.url, 'http://fixture').pathname;
  if (path === '/stats') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(stats));
  }
  stats.requests++; stats.active++;
  stats.paths[path] = (stats.paths[path] ?? 0) + 1;
  res.once('close', () => {
    stats.active--; stats.closed++;
    if (!res.writableFinished) stats.aborted++;
  });
  if (mode === 'broken') {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'explicit synthetic upstream failure' }));
  } else if (mode === 'hanging_body') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write('{"synthetic":');
    // Deliberately leave the real HTTP body stream open.
  } else if (mode !== 'hanging_headers') {
    res.writeHead(500); res.end('unknown fixture mode');
  }
}).listen(8080, '0.0.0.0');
