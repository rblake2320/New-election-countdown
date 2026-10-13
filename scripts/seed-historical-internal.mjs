import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import pg from 'pg';

// Executed only inside the labelled D disposable receiving app; credentials stay in its environment.
const base = 'http://127.0.0.1:5000';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const receipt = { outcome: 'Running', scope: 'D owned private historical source receiving', startedAt: new Date().toISOString(), races: [] };
const hash = b => createHash('sha256').update(b).digest('hex');
try {
  const u=new URL(process.env.DATABASE_URL);const h=process.env.ET6_EXPECTED_DB_HOST;if(!h||!/^et6-prod-\d+-[a-f0-9]{8}-db$/.test(h)||h==='et6-prod-109656-3a740d1d-db'||u.hostname!==h||u.port!=='5432'||u.pathname!=='/et6_receiving'||u.search||u.hash)throw Error('Wrong disposable target');
  const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'et6-admin@example.test', password: process.env.ET6_FIXTURE_PASSWORD }) });
  if (login.status !== 200) throw Error('Login failed');
  const cookie = login.headers.getSetCookie().map(s => s.split(';')[0]).join('; ');
  async function request(path, options = {}) {
    const r = await fetch(base + path, { ...options, headers: { Cookie: cookie, ...options.headers } });
    const text = await r.text();
    return { status: r.status, etag: r.headers.get('etag'), body: text ? JSON.parse(text) : null };
  }
  for (const state of ['nc', 'la']) {
    const dir = '/tmp/et6-manual/' + state + '-manual';
    const packet = JSON.parse(await readFile(dir + '/packet.json', 'utf8'));
    const parsed = JSON.parse(await readFile(dir + '/v1-receipt.json', 'utf8'));
    const target = JSON.parse(await readFile(dir + '/target-binding.json', 'utf8'));
    if (parsed.outcome !== 'Worked' || parsed.manifestSha256 !== hash(await readFile(dir + '/packet.json'))) throw Error('Parser manifest mismatch');
    for (const file of packet.files) if (hash(await readFile(dir + '/' + file.path)) !== file.sha256) throw Error('Raw source hash mismatch');
    const q = await pool.query('INSERT INTO elections (id,title,location,state,date,type,level,description) VALUES ($1,$2,$3,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING RETURNING id', [target.id,target.title,target.state,target.date,target.type,target.level,'Private receiving fixture for actual historical official source data']);
    const row = (await pool.query('SELECT id,title,state,to_char(date,\'YYYY-MM-DD\') AS date,type,level FROM elections WHERE id=$1', [target.id])).rows[0];
    for (const key of Object.keys(target)) if (row[key] !== target[key]) throw Error('Actual DB target mismatch ' + key);
    const r = { target: row, fixtureInserted: q.rowCount, before: await request('/api/results?ids=' + target.id) }; receipt.races.push(r);
    const payloadFile = packet.files.find(f => f.role === 'payload');
    const bytes = await readFile(dir + '/' + payloadFile.path);
    r.evidence = await request('/api/admin/results-evidence', { method: 'POST', headers: { 'Content-Type': state === 'la' ? 'application/json' : 'text/csv', 'X-Evidence-Filename': payloadFile.path.split('/').pop() }, body: bytes });
    if (![200,201].includes(r.evidence.status) || r.evidence.body.sha256 !== payloadFile.sha256) throw Error('Evidence upload failed ' + JSON.stringify(r.evidence));
    const stored = (await pool.query('SELECT bytes FROM result_evidence_blobs WHERE sha256=$1', [payloadFile.sha256])).rows;
    if (stored.length !== 1 || !stored[0].bytes.equals(bytes)) throw Error('Stored raw bytes mismatch');
    const input = structuredClone(parsed.input);
    // The publisher label in C's packet is preserved; the actual manual API uses its registered picker ID.
    r.sourceIdMapping = { packet: input.source.id, api: 'admin_manual:' + target.state };
    input.source.id = r.sourceIdMapping.api;
    if (input.totalVotes !== packet.expectedTotals.totalVotes || input.candidates.reduce((n,c) => n+c.votes,0) !== input.totalVotes) throw Error('Totals mismatch');
    const post = () => request('/api/elections/' + target.id + '/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    r.post = await post(); r.postedAt = new Date().toISOString();
    if (r.post.status !== 201 || r.post.body.totalVotes !== input.totalVotes) throw Error('Report post failed ' + JSON.stringify(r.post));
    r.repeat = await post();
    if (r.repeat.status !== 200 || r.repeat.body.reportId !== r.post.body.reportId) throw Error('Repeat not idempotent');
    r.changed = await request('/api/results?ids=' + target.id, { headers: { 'If-None-Match': r.before.etag } });
    r.cached = await request('/api/results?ids=' + target.id, { headers: { 'If-None-Match': r.changed.etag } });
    if (r.changed.status !== 200 || r.cached.status !== 304) throw Error('Changed snapshot cache failed');
    r.sql = (await pool.query('SELECT count(*)::int AS lines,sum(votes)::text AS total FROM candidate_result_lines WHERE report_id=$1', [r.post.body.reportId])).rows[0];
    if (Number(r.sql.total) !== input.totalVotes || r.sql.lines !== input.candidates.length) throw Error('Independent SQL counts mismatch');
  }
  receipt.outcome = 'Worked';
} catch (error) { receipt.outcome = 'Failed'; receipt.error = error.message; process.exitCode = 1; }
finally { await pool.end(); receipt.completedAt = new Date().toISOString(); console.log(JSON.stringify(receipt, null, 2)); }
