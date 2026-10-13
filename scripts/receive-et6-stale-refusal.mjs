import fs from 'node:fs';
const base = 'http://127.0.0.1:5000';
const result = { outcome: 'Running', scenario: 'Stale source display-name edit; official votes and evidence unchanged' };
try {
  const l = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'et6-admin@example.test', password: process.env.ET6_FIXTURE_PASSWORD }) });
  if (l.status !== 200) throw Error('login');
  const cookie = l.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
  const input = JSON.parse(fs.readFileSync('/tmp/et6-manual/nc-manual/v1-receipt.json')).input;
  input.source.id = 'admin_manual:NC';
  input.source.name += ' (private stale submission)';
  input.idempotencyKey = 'D-real-NC-stale-displayname-refusal-20261013';
  input.expectedRevision = 'r0-stale';
  const before = await (await fetch(base + '/api/elections/4242404/results')).json();
  const r = await fetch(base + '/api/elections/4242404/results', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  result.status = r.status; result.body = await r.json();
  const after = await (await fetch(base + '/api/elections/4242404/results')).json();
  result.unchanged = JSON.stringify(before) === JSON.stringify(after);
  if (r.status !== 409 || result.body.code !== 'stale_revision' || !result.unchanged) throw Error('stale refusal failed');
  result.outcome = 'Worked';
} catch (e) { result.outcome = 'Failed'; result.error = e.message; process.exitCode = 1; }
result.at = new Date().toISOString(); console.log(JSON.stringify(result));
