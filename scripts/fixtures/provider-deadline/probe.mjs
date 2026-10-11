const controls = JSON.parse(process.env.PROFILE_CONTROLS);
const paths = ['/api/health', '/api/elections?timeframe=upcoming', '/api/elections/37/candidates', '/api/elections/37/general-candidates'];
const expectedIds = controls.map(c => c.id).sort((a,b) => a-b);
const stored = new Map(controls.map(c => [c.id, c]));
const comparisons = { description: 'description', campaign_bio: 'campaign_bio', website: 'website', profile_image_url: 'profile_image_url', is_verified: 'is_verified', party: 'party' };
const sourceFields = ['data_source','source_status','ballot_status','fec_status'];
const outcomes = await Promise.all(Array.from({ length: 120 }, async (_, index) => {
  const path = paths[index % paths.length], started = Date.now();
  try {
    const response = await fetch('http://127.0.0.1:5000' + path, { signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    let valid = true, checks = [];
    if (path === '/api/health') valid = body.ok === true;
    if (path.includes('?')) valid = Array.isArray(body) && body.length > 0;
    if (path.endsWith('/general-candidates')) valid = body.electionId === 37 && body.status === 'not_recorded' && body.candidates.length === 0;
    if (path.endsWith('/candidates')) {
      valid = Array.isArray(body) && JSON.stringify(body.map(c => c.id).sort((a,b) => a-b)) === JSON.stringify(expectedIds);
      for (const candidate of body) {
        const sql = stored.get(candidate.id);
        for (const [key,column] of Object.entries(comparisons)) checks.push({id:candidate.id,field:key,equal: candidate[key] === sql?.[column]});
        for (const field of sourceFields) checks.push({id:candidate.id,field:'source.'+field,equal:candidate.source?.[field] === sql?.[field]});
        checks.push({id:candidate.id,field:'external_ids.fec_id',equal:candidate.external_ids?.fec_id === sql?.fec_candidate_id});
      }
      valid = valid && checks.every(check => check.equal);
    }
    return { path, status: response.status, elapsedMs: Date.now()-started, valid, checks };
  } catch(error) { return { path, elapsedMs: Date.now()-started, error: error.message }; }
}));
const times = outcomes.map(row => row.elapsedMs).sort((a,b) => a-b);
console.log(JSON.stringify({ requests:120, concurrency:120, deadlineMs:15000, maxMs:times.at(-1), p95Ms:times[Math.ceil(times.length*.95)-1], expectedRace37Ids:expectedIds, passed:outcomes.every(row=>row.status===200&&row.valid), outcomes }));
