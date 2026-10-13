import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

// Read-only, bounded load against an explicitly owned ET6 receiving environment.
// No proxy-header fabrication, result writes, limiter changes or official-feed claim.
const exec = promisify(execFile);
const ownerLabel = 'org.electiontracker.et6-receiving';
const loadLabel = 'org.electiontracker.et6-load';
const loadDate = process.env.ET6_LOAD_DATE ?? '2026-11-03';
if (!/^\d{4}-\d{2}-\d{2}$/.test(loadDate) || !Number.isFinite(Date.parse(`${loadDate}T00:00:00Z`)) ||
    new Date(`${loadDate}T00:00:00Z`).toISOString().slice(0, 10) !== loadDate) throw new Error('ET6_LOAD_DATE must be a valid yyyy-mm-dd calendar date');
const loadElectionIdText = process.env.ET6_LOAD_ELECTION_ID ?? '2';
if (!/^[1-9]\d*$/.test(loadElectionIdText) || !Number.isSafeInteger(Number(loadElectionIdText))) throw new Error('ET6_LOAD_ELECTION_ID must be a positive safe integer');
const loadElectionId = Number(loadElectionIdText);
const paths = { batch: `/api/results?date=${loadDate}`, single: `/api/elections/${loadElectionId}/results` };
if (process.argv.length !== 3) throw new Error('Usage: node scripts/test-et6-load.mjs receiving-receipt.json');
const input = resolve(process.argv[2]);
const receipt = JSON.parse(await readFile(input, 'utf8'));
const runId = `${process.pid}-${randomBytes(4).toString('hex')}`;
const evidence = resolve(dirname(input), `load-${runId}`);
await mkdir(evidence, { recursive: true });
const report = { outcome: 'Running', startedAt: new Date().toISOString(), input, runId, evidence, sourceReplay: false,
  scope: 'Read-only private compiled application; actual current results, not official-feed replay',
  selection: { date: loadDate, electionId: loadElectionId, paths },
  workload: { clients: 10, phasesRps: [20, 40], durationSecondsEach: 60, timeoutMs: 5000, maxScheduleLatenessMs: 100 },
  identities: [], phases: [], cleanup: [] };
const clients = [];
async function save() {
  const path = resolve(evidence, 'receipt.json');
  await writeFile(`${path}.tmp`, JSON.stringify(report, null, 2));
  await rename(`${path}.tmp`, path);
}
async function docker(...args) {
  try { return (await exec('docker', args, { timeout: 100000, maxBuffer: 12 * 1024 * 1024 })).stdout.trim(); }
  catch (error) { throw new Error(`Docker ${args[0]} failed (${error.code ?? 'unknown'}); inspect owned client receipt`); }
}
function requireThat(good, message) { if (!good) throw new Error(message); }
const percentile = (values, q) => values.length ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * q) - 1] : null;

// Function serialized into the same pinned runtime image; one real network client/IP.
async function worker(config) {
  const os = await import('node:os');
  const addresses = Object.values(os.networkInterfaces()).flat().filter(x => x && !x.internal && x.family === 'IPv4').map(x => x.address);
  if (!addresses.includes(config.ip)) throw new Error('Client interface identity mismatch');
  const records = [];
  const tasks = [];
  const interval = 1000 * config.clients / config.rps;
  const count = config.rps * config.seconds / config.clients;
  const wait = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));
  // Initialize each real client's HTTP stack before the measured schedule.
  // Warm-up is retained separately and never counted toward the requested RPS.
  const warmupStart = Date.now();
  const warmupResponse = await fetch(config.base + '/api/health', { signal: AbortSignal.timeout(5000) });
  await warmupResponse.arrayBuffer();
  if (warmupResponse.status !== 200) throw new Error('Client warm-up health check failed');
  const warmup = { startedAt: warmupStart, completedAt: Date.now(), status: warmupResponse.status };
  async function request(i, scheduledAt, startedAt) {
    const mode = (i + config.index) % 3;
    const path = mode === 2 ? config.paths.single : config.paths.batch;
    const expectedStatus = mode === 1 ? 304 : 200;
    const headers = mode === 1 ? { 'If-None-Match': config.baseline.etag } : {};
    const record = { client: config.name, sourceIp: config.ip, sequence: i, path, mode: mode === 1 ? 'conditional' : 'full',
      scheduledAt, startedAt, scheduleLatenessMs: startedAt - scheduledAt, expectedStatus, status: null, bytes: 0,
      latencyMs: null, completedAt: null, valid: false, error: null };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const start = performance.now();
    try {
      const response = await fetch(config.base + path, { headers, signal: controller.signal, redirect: 'error' });
      record.status = response.status;
      const bytes = Buffer.from(await response.arrayBuffer());
      record.bytes = bytes.length;
      if (response.status !== expectedStatus) throw new Error('unexpected_status');
      if (mode === 1) {
        if (bytes.length !== 0) throw new Error('conditional_body_not_empty');
      } else {
        const body = JSON.parse(bytes.toString());
        if (mode === 0) {
          record.resultCount = body.results?.length;
          if (!Array.isArray(body.results) || body.results.length !== config.baseline.count ||
              JSON.stringify(body.results.map(x => x.electionId).sort((a, b) => a - b)) !== JSON.stringify(config.baseline.ids)) throw new Error('baseline_membership_changed');
        } else {
          record.single = { electionId: body.electionId, status: body.status, reportId: body.reportId, totalVotes: body.totalVotes, revision: body.revision };
          if (Object.keys(record.single).some(key => record.single[key] !== config.baseline.single[key])) throw new Error('single_contract_changed');
        }
      }
      record.valid = true;
    } catch (error) { record.error = controller.signal.aborted ? 'timeout' : ['unexpected_status', 'conditional_body_not_empty', 'baseline_membership_changed', 'single_contract_changed'].includes(error.message) ? error.message : 'transport_or_payload_error'; }
    finally {
      clearTimeout(timeout);
      record.completedAt = Date.now();
      record.latencyMs = Math.round((performance.now() - start) * 1000) / 1000;
      records.push(record);
    }
  }
  for (let i = 0; i < count; i++) {
    const scheduledAt = config.startAt + config.index * 1000 / config.rps + i * interval;
    await wait(scheduledAt - Date.now());
    const startedAt = Date.now();
    // Never catch up by bursting missed schedule slots; a miss makes the gate fail.
    if (startedAt - scheduledAt > config.maxLatenessMs) {
      records.push({ client: config.name, sourceIp: config.ip, sequence: i, scheduledAt, startedAt,
        scheduleLatenessMs: startedAt - scheduledAt, missed: true, valid: false, error: 'schedule_missed' });
    } else tasks.push(request(i, scheduledAt, startedAt));
  }
  await Promise.all(tasks);
  await wait(config.startAt + config.seconds * 1000 - Date.now());
  return { name: config.name, ip: config.ip, addresses, warmup, scheduled: count, records: records.sort((a, b) => a.sequence - b.sequence) };
}

try {
  const { resources, image, imageId } = receipt;
  requireThat(receipt.outcome === 'Worked' && receipt.resourcesRetained === true, 'Receiving receipt must retain successful owned resources');
  requireThat(resources && /^\d+-[a-f0-9]{8}$/.test(resources.runId), 'Invalid receiving run ID');
  const prefix = `et6-prod-${resources.runId}`;
  requireThat(resources.network === prefix && resources.app === `${prefix}-app`, 'Receiving resource names mismatch');
  requireThat(typeof image === 'string' && /:[^/:]+$/.test(image) && !image.endsWith(':latest') && /^sha256:[a-f0-9]{64}$/.test(imageId), 'Versioned runtime image and immutable ID required');
  // Select metadata only; never retrieve Config.Env containing credentials.
  const app = JSON.parse(await docker('inspect', '--format', '{"labels":{{json .Config.Labels}},"running":{{json .State.Running}},"imageId":{{json .Image}},"image":{{json .Config.Image}},"networks":{{json .NetworkSettings.Networks}}}', resources.app));
  requireThat(app.labels?.[ownerLabel] === resources.runId && app.running === true, 'Application ownership/running state mismatch');
  requireThat(app.imageId === imageId && app.image === image, 'Application runtime image mismatch');
  requireThat(app.networks?.[resources.network], 'Application is outside owned network');
  const network = JSON.parse(await docker('network', 'inspect', '--format', '{"Labels":{{json .Labels}},"Driver":{{json .Driver}}}', resources.network));
  requireThat(network.Labels?.[ownerLabel] === resources.runId && network.Driver === 'bridge', 'Network ownership/driver mismatch');
  requireThat(await docker('image', 'inspect', '--format', '{{.Id}}', image) === imageId, 'Runtime image tag moved since receiving receipt');
  report.image = image; report.imageId = imageId;
  report.target = { app: resources.app, network: resources.network, appIp: app.networks[resources.network].IPAddress, parentRunId: resources.runId };
  await save();
  for (let index = 0; index < 10; index++) {
    const name = `et6-load-${runId}-${index}`;
    clients.push(name);
    await docker('run', '-d', '--name', name, '--label', `${loadLabel}=${runId}`, '--label', `${ownerLabel}=${resources.runId}`,
      '--network', resources.network, '--no-healthcheck', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
      '--entrypoint', 'node', image, '-e', 'setInterval(()=>{},1000)');
    const ip = await docker('inspect', '--format', `{{(index .NetworkSettings.Networks "${resources.network}").IPAddress}}`, name);
    requireThat(ip && !report.identities.some(x => x.ip === ip), 'Client source IP missing or duplicated');
    report.identities.push({ name, ip });
  }
  const base = `http://${resources.app}:5000`;
  const baselineCode = `const base=${JSON.stringify(base)},paths=${JSON.stringify(paths)},electionId=${loadElectionId}; const a=await fetch(base+paths.batch,{signal:AbortSignal.timeout(5000)});const batch=await a.json();const etag=a.headers.get('etag');if(a.status!==200||!etag||!Array.isArray(batch.results)||batch.results.length===0)throw Error('Invalid actual batch baseline');const b=await fetch(base+paths.single,{signal:AbortSignal.timeout(5000)});const single=await b.json();if(b.status!==200||single.electionId!==electionId||!batch.results.some(x=>x.electionId===electionId)||!['reportId','totalVotes','revision'].every(key=>Object.hasOwn(single,key)))throw Error('Invalid actual single baseline');console.log(JSON.stringify({count:batch.results.length,ids:batch.results.map(x=>x.electionId).sort((a,b)=>a-b),etag,single:{electionId:single.electionId,status:single.status,reportId:single.reportId,totalVotes:single.totalVotes,revision:single.revision},context:{electionContext:single.electionContext,source:single.source,asOf:single.asOf,retrievedAt:single.retrievedAt}}));`;
  report.baseline = JSON.parse(await docker('exec', clients[0], 'node', '--input-type=module', '-e', baselineCode));
  requireThat(new Set(report.baseline.ids).size === report.baseline.count, 'Baseline contains duplicate election IDs');
  await save();
  for (const rps of [20, 40]) {
    const startAt = Date.now() + 10000;
    const outcomes = await Promise.allSettled(report.identities.map(({ name, ip }, index) => {
      const config = { name, ip, index, base, paths, baseline: report.baseline, startAt, rps, seconds: 60, clients: 10, maxLatenessMs: 100 };
      return docker('exec', name, 'node', '--input-type=module', '-e', `const out=await (${worker.toString()})(${JSON.stringify(config)});console.log(JSON.stringify(out));`).then(JSON.parse);
    }));
    const records = [];
    const workerErrors = [];
    outcomes.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        records.push(...result.value.records);
        (report.warmups ??= []).push({ rps, client: result.value.name, ...result.value.warmup });
      }
      else workerErrors.push({ name: clients[index], error: result.reason.message });
    });
    await writeFile(resolve(evidence, `${rps}rps-requests.jsonl`), records.map(x => JSON.stringify(x)).join('\n') + '\n');
    const completed = records.filter(x => !x.missed);
    const latencies = completed.map(x => x.latencyMs);
    const phase = { rps, durationSeconds: 60, startAt, endScheduledAt: startAt + 60000, scheduled: rps * 60,
      observedSlots: records.length, completed: completed.length, missed: records.filter(x => x.missed).length + rps * 60 - records.length,
      workerErrors, valid: completed.filter(x => x.valid).length, statuses: {}, bytes: completed.reduce((n, x) => n + x.bytes, 0),
      timeouts: completed.filter(x => x.error === 'timeout').length, p50Ms: percentile(latencies, .5), p95Ms: percentile(latencies, .95), p99Ms: percentile(latencies, .99) };
    for (const record of completed) phase.statuses[record.status ?? 'transport_error'] = (phase.statuses[record.status ?? 'transport_error'] ?? 0) + 1;
    phase.passed = phase.workerErrors.length === 0 && phase.missed === 0 && phase.completed === phase.scheduled && phase.valid === phase.scheduled && phase.timeouts === 0 && !phase.statuses[429] && !Object.keys(phase.statuses).some(x => /^5\d\d$/.test(x)) && phase.p95Ms <= 2000;
    report.phases.push(phase);
    await save();
    requireThat(phase.passed, `${rps} RPS acceptance failed; inspect per-request evidence`);
  }
  report.outcome = 'Worked';
} catch (error) { report.outcome = 'Failed'; report.error = error.message; process.exitCode = 1; }
finally {
  for (const name of clients) {
    try {
      const exists = (await docker('container', 'ls', '-a', '--format', '{{.Names}}')).split(/\r?\n/).includes(name);
      if (!exists) { report.cleanup.push({ name, outcome: 'absent' }); continue; }
      requireThat(new RegExp(`^et6-load-${runId}-[0-9]$`).test(name), 'Cleanup client name mismatch');
      requireThat(await docker('inspect', '--format', `{{index .Config.Labels "${loadLabel}"}}`, name) === runId, 'Cleanup load ownership mismatch');
      requireThat(await docker('inspect', '--format', `{{index .Config.Labels "${ownerLabel}"}}`, name) === receipt.resources.runId, 'Cleanup parent ownership mismatch');
      await docker('rm', '-f', name);
      report.cleanup.push({ name, outcome: 'removed' });
    } catch (error) { report.cleanup.push({ name, outcome: 'Failed', error: error.message }); report.outcome = 'Failed'; process.exitCode = 1; }
  }
  report.completedAt = new Date().toISOString();
  await save();
}
console.log(JSON.stringify({ receipt: resolve(evidence, 'receipt.json'), outcome: report.outcome, phases: report.phases, error: report.error }, null, 2));
