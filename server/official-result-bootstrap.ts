import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { z } from 'zod';
import targetBindings from '../data/official-results/live/2026-nc-la-target-bindings.json';
import waInitial from '../data/official-results/live/replay/wa/initial.packet.json';
import waRecount from '../data/official-results/live/replay/wa/recount.packet.json';
import { storage } from './storage';
import type { ResultsIngestionService, ResultsAdapter } from './results-ingestion-service';
import type { ResultsSourceRegistry, RegisteredSource } from './results-source-registry';
import { resultReportInputSchema, ResultReportError, stableStringify } from './results-reports';
import { resultsTimestamp } from '../shared/official-results';
import { officialTargetBindingSchema } from './official-result-adapters/bridge';
import { officialSourcePacketSchema, parseOfficialSourcePacket, loadReviewedPacketBytes } from './official-result-adapters/packet';
import { authoritativeTarget, requireAuthoritativeTarget, preserveAcceptedCaptureClock, createOfficialLiveAdapter, createLiveTransportPool, reviewedLiveUrls, type LiveSourceDefinition, type LiveAdapterDependencies } from './official-result-adapters/live';

const reviewed = z.object({ version: z.literal(1), reviewedAt: resultsTimestamp, sourceSnapshotSha256: z.string().regex(/^[a-f0-9]{64}$/), targets: z.array(officialTargetBindingSchema).length(22) }).strict().parse(targetBindings);
const ncIds: Record<string, string> = { '01':'1369','02':'1370','03':'1371','04':'1372','05':'1373','06':'1374','07':'1375','08':'1376','09':'1377','10':'1378','11':'1379','12':'1380','13':'1381','14':'1382' };
const laIds: Record<string, string> = { '01':'70195','02':'70196','03':'70197','04':'70198','05':'70199','06':'70200' };
export function reviewedDefaultLiveDefinitions(): LiveSourceDefinition[] {
  if (new Set(reviewed.targets.map(target => target.id)).size !== 22) throw new Error('Reviewed live target IDs are duplicated');
  return reviewed.targets.map(target => {
    if (!['NC','LA'].includes(target.state) || target.date !== '2026-11-03' || target.level !== 'federal') throw new Error('Reviewed live target has unsupported state/date/level');
    const state = target.state === 'NC' ? 'NC' : 'LA';
    const house = new RegExp('^U\\.S\\. House Election - ' + state + '-(\\d{2})$').exec(target.title);
    const isSenate = target.title === 'U.S. Senate Election - ' + (state === 'NC' ? 'North Carolina' : 'Louisiana');
    const district = house?.[1] ?? null;
    const contest = isSenate ? (state === 'NC' ? '1383' : '67997') : district ? (state === 'NC' ? ncIds[district] : laIds[district]) : undefined;
    const phase = state === 'LA' && !isSenate ? 'primary' : 'general';
    if (!contest || target.type !== phase) throw new Error('Reviewed live title/phase has no actual publisher contest mapping');
    const urls = reviewedLiveUrls[state]['2026-11-03'];
    const id = (state === 'NC' ? 'nc-enr-2026-general' : 'la-enr-2026-november') + ':' + contest;
    return { state, publisher: { id, kind: 'official_state_enr', name: state === 'NC' ? 'North Carolina State Board of Elections' : 'Louisiana Secretary of State', url: urls[0] }, payloadUrl: urls[0], companionUrl: urls[1], targets: [{ target, context: { state, electionDate: target.date, phase, level: 'federal', office: isSenate ? 'U.S. Senate' : 'U.S. House', district, party: null }, sourceContestId: contest, localContestId: state === 'NC' ? contest : null }] };
  });
}

const replayCatalog = [
  { key: 'wa/initial.packet.json', sha256: 'c829680c33da6d5e1eb8a4caf1b3ac489d2906d5284aade91d1bf24bea747660', metadata: waInitial },
  { key: 'wa/recount.packet.json', sha256: '637e7671bc1cbc71c859e160aac2393c26a646342f9c81f292be0d838066bff2', metadata: waRecount },
];
export function privateReplayTargetFingerprint(configuredUrl: string): string {
  const url = new URL(configuredUrl);
  if (!['postgres:','postgresql:'].includes(url.protocol)) throw new Error('Private replay database protocol is invalid');
  const value = { host: url.hostname.toLowerCase(), port: url.port || '5432', database: decodeURIComponent(url.pathname.slice(1)) };
  if (!value.database || (['localhost','127.0.0.1','[::1]'].includes(value.host) && ['5432','5433','5434'].includes(value.port))) throw new Error('Private replay cannot target shared local database services');
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}
function replayPlan(env: NodeJS.ProcessEnv, deps: LiveAdapterDependencies): { source: RegisteredSource; adapter: ResultsAdapter } | null {
  const requested = env.OFFICIAL_RESULTS_SOURCE_PACKET;
  if (!requested) {
    if (env.OFFICIAL_RESULTS_REPLAY === 'private_fixture') throw new Error('Private replay requires an explicitly selected reviewed packet');
    return null;
  }
  if (env.OFFICIAL_RESULTS_REPLAY !== 'private_fixture' || !env.DATABASE_URL || !env.OFFICIAL_RESULTS_REPLAY_TARGET_SHA256 || privateReplayTargetFingerprint(env.DATABASE_URL) !== env.OFFICIAL_RESULTS_REPLAY_TARGET_SHA256) throw new Error('Source replay requires an explicit matching private fixture database target');
  const selected = replayCatalog.find(item => requested === item.key || resolve(requested) === fileURLToPath(new URL('../data/official-results/live/replay/' + item.key, import.meta.url)));
  if (!selected || env.OFFICIAL_RESULTS_SOURCE_PACKET_SHA256 !== selected.sha256) throw new Error('Source replay packet path/SHA is not an explicitly reviewed packaged recording');
  const packet = officialSourcePacketSchema.parse(selected.metadata);
  if (packet.publisher.kind === 'admin_manual') throw new Error('Reserved manual sources cannot be automatic replay adapters');
  const packetPath = fileURLToPath(new URL('../data/official-results/live/replay/' + selected.key, import.meta.url));
  const urls = packet.files.flatMap(file => file.url === null ? [] : [file.url]);
  const source: RegisteredSource = { id: packet.publisher.id, kind: packet.publisher.kind, name: packet.publisher.name, state: packet.context.state, allowedUrls: [...new Set(urls)], electionDate: packet.context.electionDate, phase: packet.targetBinding.type, electionIds: [packet.targetBinding.id], role: 'Explicit private fixture replay of actual historical official source; no C6 publication claim' };
  const adapter: ResultsAdapter = async (election, ctx) => {
    if (ctx.signal.aborted) throw new DOMException('Source replay aborted', 'AbortError');
    const target = authoritativeTarget(election); requireAuthoritativeTarget(target, packet.targetBinding);
    if (ctx.source.id !== packet.publisher.id || ctx.source.kind !== packet.publisher.kind) throw new ResultReportError(422, 'official_source_mismatch', 'Replay admitted source does not match reviewed publisher');
    // Raw parse and filesystem I/O happen only on polling, never at boot.
    const parsed = await parseOfficialSourcePacket(packetPath, selected.sha256, target);
    const raw = loadReviewedPacketBytes(packetPath, selected.sha256);
    let input = resultReportInputSchema.parse(parsed.input);
    input = preserveAcceptedCaptureClock(input, await deps.current(target.id), target);
    for (const file of raw.files) {
      if (ctx.signal.aborted) throw new DOMException('Source replay aborted', 'AbortError');
      const contentType = file.path.endsWith('.pdf') ? 'application/pdf' : file.path.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/json';
      const stored = await deps.evidence(file.bytes, contentType, file.path, 'ingest:' + packet.publisher.id);
      if (stored.sha256 !== file.sha256) throw new ResultReportError(422, 'official_evidence_mismatch', 'Replay evidence does not match reviewed raw bytes');
    }
    if (ctx.signal.aborted) throw new DOMException('Source replay aborted', 'AbortError');
    return input;
  };
  return { source, adapter };
}
const health = new Map<string, () => unknown>();
export function officialResultsBootstrapHealth() { return [...health].map(([id, read]) => ({ id, capture: read() })); }

/** Pure registration at boot. JSON metadata is bundled inline; all raw reads,
 * HTTP requests and evidence persistence are deferred until a matched poll. */
export function registerReviewedOfficialResults(ingestion: ResultsIngestionService, registry: ResultsSourceRegistry, options?: { dependencies?: LiveAdapterDependencies; env?: NodeJS.ProcessEnv }): void {
  const deps = options?.dependencies ?? { evidence: (bytes, contentType, filename, uploadedBy) => storage.storeResultEvidence(bytes, contentType, filename, uploadedBy), current: id => storage.getResultsPayload(id) };
  const env = options?.env ?? process.env;
  const replay = replayPlan(env, deps);
  if (env.OFFICIAL_RESULTS_NETWORK_ENABLED === 'false' && !replay) throw new Error('Disabling official network adapters requires explicit private replay mode');
  const pool = createLiveTransportPool();
  const plans = env.OFFICIAL_RESULTS_NETWORK_ENABLED === 'false' ? [] : reviewedDefaultLiveDefinitions().map(def => {
    const live = createOfficialLiveAdapter(def, deps, pool), scope = def.targets[0];
    if (!scope) throw new Error('Reviewed source has no target');
    const source: RegisteredSource = { id: def.publisher.id, kind: 'official_state_enr', name: def.publisher.name, state: def.state, allowedUrls: [def.payloadUrl, def.companionUrl], electionDate: scope.target.date, phase: scope.target.type, electionIds: [scope.target.id], role: scope.target.title };
    return { source, adapter: live.adapter, health: live.health };
  });
  // Validate all plans before mutating registry state; no partial source plan.
  for (const plan of plans) { registry.register(plan.source); ingestion.registerAdapter(plan.source.id, plan.adapter); health.set(plan.source.id, plan.health); }
  if (replay) { registry.register(replay.source); ingestion.registerAdapter(replay.source.id, replay.adapter); }
}
