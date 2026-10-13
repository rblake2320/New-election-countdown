import { createHash } from 'node:crypto';
import { z } from 'zod';
import { bridgeOfficialContest, officialTargetBindingSchema, reviewedPublisherSchema, type OfficialTargetBinding } from './bridge';
import { officialContestContextSchema, OfficialResultParseError } from './types';
import { parseNcOfficialResults } from './nc';
import { parseLaOfficialResults } from './la';
import { ResultReportError, resultReportInputSchema, stableStringify, type ResultReportInput } from '../results-reports';
import type { AdapterElection, AdapterContext, ResultsAdapter } from '../results-ingestion-service';
import type { LiveElectionResultsResponse } from '../../shared/live-election-results';

export const LIVE_BODY_LIMIT = 16 * 1024 * 1024;
export const LIVE_TIMEOUT_MS = 15_000;
export const LIVE_CACHE_TTL_MS = 25_000;
export const reviewedLiveUrls = Object.freeze({
  NC: {
    '2026-03-03': ['https://er.ncsbe.gov/enr/20260303/data/results_0.txt', 'https://er.ncsbe.gov/enr/20260303/data/county.txt'],
    '2026-11-03': ['https://er.ncsbe.gov/enr/20261103/data/results_0.txt', 'https://er.ncsbe.gov/enr/20261103/data/county.txt'],
  },
  LA: {
    '2026-06-27': ['https://voterportal.sos.la.gov/ElectionResults/ElectionResults/Data?blob=20260627/Votes_Multiparish.htm', 'https://voterportal.sos.la.gov/ElectionResults/ElectionResults/Data?blob=20260627/RacesCandidates_Multiparish.htm'],
    '2026-11-03': ['https://voterportal.sos.la.gov/ElectionResults/ElectionResults/Data?blob=20261103/Votes_Multiparish.htm', 'https://voterportal.sos.la.gov/ElectionResults/ElectionResults/Data?blob=20261103/RacesCandidates_Multiparish.htm'],
  },
});
export const liveSourceDefinitionSchema = z.object({
  state: z.enum(['NC', 'LA']), publisher: reviewedPublisherSchema,
  payloadUrl: z.string(), companionUrl: z.string(),
  targets: z.array(z.object({ target: officialTargetBindingSchema, context: officialContestContextSchema,
    sourceContestId: z.string().regex(/^\d+$/), localContestId: z.string().regex(/^\d+$/).nullable(),
  }).strict()).min(1).max(100),
}).strict();
export type LiveSourceDefinition = z.infer<typeof liveSourceDefinitionSchema>;
export interface LiveAdapterDependencies {
  fetch?: typeof globalThis.fetch; now?: () => Date;
  evidence: (bytes: Buffer, contentType: string, filename: string | null, uploadedBy: string) => Promise<{ sha256: string }>;
  current: (id: number) => Promise<LiveElectionResultsResponse | null>;
}
interface Capture { bytes: Buffer; sha256: string; retrievedAt: string; contentType: string }
interface Pair { payload: Capture; companion: Capture; completeAt: number }
function hash(bytes: Uint8Array): string { return createHash('sha256').update(bytes).digest('hex'); }
function abortError(): DOMException { return new DOMException('Official source request aborted', 'AbortError'); }
function active(signal: AbortSignal): void { if (signal.aborted) throw abortError(); }
function cancellable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  active(signal);
  return new Promise<T>((resolve, reject) => {
    const stop = () => { cleanup(); reject(abortError()); };
    const cleanup = () => signal.removeEventListener('abort', stop);
    signal.addEventListener('abort', stop, { once: true });
    work.then(value => { cleanup(); if (signal.aborted) reject(abortError()); else resolve(value); }, error => { cleanup(); reject(error); });
    if (signal.aborted) stop();
  });
}
function refused(code: string, message: string): never { throw new ResultReportError(422, code, message); }
export function authoritativeTarget(election: AdapterElection): OfficialTargetBinding {
  let day = '';
  if (election.date instanceof Date) {
    if (Number.isFinite(election.date.getTime())) day = election.date.toISOString().slice(0, 10);
  } else if (typeof election.date === 'string' && /^\d{4}-\d{2}-\d{2}(?:$|T| )/.test(election.date)) {
    const d = new Date(election.date); if (Number.isFinite(d.getTime())) day = d.toISOString().slice(0, 10);
  }
  const target = officialTargetBindingSchema.safeParse({ id: election.id, state: election.state, date: day, type: election.type, level: election.level, title: election.title });
  if (!target.success) return refused('official_target_invalid', 'Authoritative election tuple is malformed');
  return target.data;
}
export function requireAuthoritativeTarget(actual: OfficialTargetBinding, expected: OfficialTargetBinding): void {
  for (const key of ['id','state','date','type','level','title'] as const) if (actual[key] !== expected[key]) refused('official_target_mismatch', 'Authoritative election differs from its reviewed source tuple');
}
function candidateIdentityOrder(a: ResultReportInput['candidates'][number], b: ResultReportInput['candidates'][number]): number {
  return a.sourceCandidateId < b.sourceCandidateId ? -1 : a.sourceCandidateId > b.sourceCandidateId ? 1 : 0;
}
export function preserveAcceptedCaptureClock(input: ResultReportInput, prior: LiveElectionResultsResponse | null, target: OfficialTargetBinding): ResultReportInput {
  // Normalise the FIRST submitted order to match the store's votesDESC view,
  // with a stable exact source-identity tie-break. Never drop/merge any option.
  const normalized = resultReportInputSchema.parse({ ...input, candidates: [...input.candidates].sort((a, b) => b.votes - a.votes || candidateIdentityOrder(a, b)) });
  if (!prior || prior.status === 'none' || !prior.electionContext || !prior.source || !prior.retrievedAt) return normalized;
  const c = prior.electionContext;
  if (c.state !== target.state || c.electionDate !== target.date || c.type !== target.type || c.level !== target.level || c.office !== target.title) return normalized;
  const fields = ['status','reporting','source','sourcePayloadSha256','asOf','asOfBasis','totalVotes','winnerCalledBy','certification'] as const;
  const a: Record<string, unknown> = {}, b: Record<string, unknown> = {};
  for (const field of fields) { a[field] = normalized[field]; b[field] = prior[field]; }
  // Every candidate field participates; source ID disambiguates equal names.
  // The count/array is preserved so duplicate/missing identities cannot vanish.
  a.candidates = [...normalized.candidates].sort(candidateIdentityOrder);
  b.candidates = [...prior.candidates].sort(candidateIdentityOrder);
  if (stableStringify(a) !== stableStringify(b)) return normalized;
  // Match the actual accepted receiving order and original capture instant.
  return resultReportInputSchema.parse({ ...normalized, candidates: prior.candidates, retrievedAt: prior.retrievedAt });
}

/** One shared, bounded, cancellable capture per state definition. Each waiter
 * keeps its own abort lifetime; the underlying request aborts when none remain. */
function transport(def: LiveSourceDefinition, deps: LiveAdapterDependencies) {
  const fetcher = deps.fetch ?? globalThis.fetch, now = deps.now ?? (() => new Date());
  const allowed = new Set([def.payloadUrl, def.companionUrl]);
  let cache: Pair | null = null;
  let flight: { promise: Promise<Pair>; controller: AbortController; waiters: number } | null = null;
  let lastFetchedAt: string | null = null;
  async function capture(initial: string, signal: AbortSignal): Promise<Capture> {
    let url = initial;
    for (let redirect = 0; redirect <= 2; redirect++) {
      active(signal);
      const response = await cancellable(fetcher(url, { signal, redirect: 'manual', headers: { Accept: 'application/json, text/plain' } }), signal);
      active(signal);
      if (response.url && !allowed.has(response.url)) return refused('official_redirect_refused', 'Official response destination is outside the exact source allowlist');
      if ([301,302,303,307,308].includes(response.status)) {
        const location = response.headers.get('location');
        void response.body?.cancel().catch(() => undefined);
        if (!location) return refused('official_redirect_refused', 'Official redirect has no destination');
        const next = new URL(location, url).href;
        if (!allowed.has(next) || redirect === 2) return refused('official_redirect_refused', 'Official redirect is outside the exact source allowlist or exceeds its bound');
        url = next; continue;
      }
      if (!response.ok) { void response.body?.cancel().catch(() => undefined); throw new Error('Official source returned HTTP ' + response.status); }
      const length = response.headers.get('content-length');
      if (length !== null && (!/^\d+$/.test(length) || Number(length) > LIVE_BODY_LIMIT)) { void response.body?.cancel().catch(() => undefined); return refused('official_body_bound', 'Official source body exceeds its declared size bound'); }
      if (!response.body) return refused('official_body_invalid', 'Official source response has no body');
      const reader = response.body.getReader(), chunks: Buffer[] = []; let size = 0;
      const stop = () => { void reader.cancel().catch(() => undefined); };
      signal.addEventListener('abort', stop, { once: true });
      try {
        while (true) {
          active(signal); const part = await cancellable(reader.read(), signal); active(signal);
          if (part.done) break;
          size += part.value.byteLength;
          if (size > LIVE_BODY_LIMIT) { void reader.cancel().catch(() => undefined); return refused('official_body_bound', 'Official source streamed body exceeds its size bound'); }
          chunks.push(Buffer.from(part.value));
        }
      } finally { signal.removeEventListener('abort', stop); reader.releaseLock(); }
      active(signal);
      if (size === 0) return refused('official_body_invalid', 'Official source body is empty');
      const bytes = Buffer.concat(chunks, size);
      return { bytes, sha256: hash(bytes), retrievedAt: now().toISOString(), contentType: response.headers.get('content-type') ?? 'application/json' };
    }
    return refused('official_redirect_refused', 'Official redirect limit exceeded');
  }
  async function get(signal: AbortSignal): Promise<Pair> {
    active(signal);
    if (cache && now().getTime() - cache.completeAt < LIVE_CACHE_TTL_MS) return cache;
    if (!flight) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS); timeout.unref?.();
      const own: { controller: AbortController; waiters: number; promise: Promise<Pair> } = { controller, waiters: 0, promise: Promise.all([capture(def.payloadUrl, controller.signal), capture(def.companionUrl, controller.signal)]).then(([payload, companion]) => {
        active(controller.signal); const completeAt = now().getTime();
        cache = { payload, companion, completeAt }; lastFetchedAt = new Date(completeAt).toISOString(); return cache;
      }).catch(error => { controller.abort(); throw error; }).finally(() => { clearTimeout(timeout); if (flight === own) flight = null; }) };
      flight = own;
    }
    const joined = flight; joined.waiters++;
    return new Promise<Pair>((resolve, reject) => {
      let settled = false;
      const finish = () => { if (settled) return false; settled = true; signal.removeEventListener('abort', stop); joined.waiters--; return true; };
      const stop = () => { if (finish()) { reject(abortError()); if (joined.waiters === 0) joined.controller.abort(); } };
      signal.addEventListener('abort', stop, { once: true });
      joined.promise.then(pair => { if (finish()) resolve(pair); }, error => { if (finish()) reject(error); });
      if (signal.aborted) stop();
    });
  }
  return { get, health: () => ({ state: def.state, lastFetchedAt, inFlight: flight !== null }) };
}

export function createLiveTransportPool() { return new Map<string, ReturnType<typeof transport>>(); }
export function createOfficialLiveAdapter(definition: LiveSourceDefinition, deps: LiveAdapterDependencies, pool = createLiveTransportPool()): { adapter: ResultsAdapter; health: () => { state: string; lastFetchedAt: string | null; inFlight: boolean } } {
  const def = liveSourceDefinitionSchema.parse(definition);
  if (def.publisher.kind !== 'official_state_enr' || def.publisher.url !== def.payloadUrl) return refused('official_source_invalid', 'Live source must be its reviewed official ENR payload');
  const ids = new Set<number>(), contests = new Set<string>();
  for (const scope of def.targets) {
    if (scope.context.state !== def.state || scope.target.state !== def.state || scope.context.electionDate !== scope.target.date || scope.context.level !== scope.target.level || scope.target.type.toLowerCase().replace(/[ _]+/g, '') !== scope.context.phase.replaceAll('_', '') || ids.has(scope.target.id) || contests.has(scope.sourceContestId)) return refused('official_source_invalid', 'Reviewed live source has conflicting or duplicated target scopes');
    ids.add(scope.target.id); contests.add(scope.sourceContestId);
    const pairs: Readonly<Record<string, readonly string[]>> = reviewedLiveUrls[def.state];
    const urls = pairs[scope.target.date];
    if (!urls || urls[0] !== def.payloadUrl || urls[1] !== def.companionUrl) return refused('official_source_uri_refused', 'Live source is not one of the actually reviewed exact dated endpoints');
  }
  const key = def.state + ':' + def.payloadUrl + ':' + def.companionUrl;
  let shared = pool.get(key);
  if (!shared) { shared = transport(def, deps); pool.set(key, shared); }
  const capture = shared, now = deps.now ?? (() => new Date());
  const adapter: ResultsAdapter = async (election, ctx) => {
    active(ctx.signal);
    const target = authoritativeTarget(election), scope = def.targets.find(item => item.target.id === target.id);
    if (!scope) return refused('official_target_mismatch', 'Election is outside the reviewed source target set');
    requireAuthoritativeTarget(target, scope.target);
    if (ctx.source.id !== def.publisher.id || ctx.source.kind !== def.publisher.kind) return refused('official_source_mismatch', 'Admitted source differs from the reviewed live publisher');
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: def.state === 'NC' ? 'America/New_York' : 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now());
    const today = ['year','month','day'].map(type => parts.find(part => part.type === type)?.value).join('-');
    if (today < scope.target.date) return null;
    const pair = await capture.get(ctx.signal); active(ctx.signal);
    let parsed;
    try {
      parsed = def.state === 'NC' ? parseNcOfficialResults(pair.payload.bytes, pair.companion.bytes, { context: scope.context, sourceContestId: scope.sourceContestId, localContestId: scope.localContestId ?? '', resultsUrl: def.payloadUrl, countyUrl: def.companionUrl, resultsSha256: pair.payload.sha256, countySha256: pair.companion.sha256 })
        : parseLaOfficialResults(pair.payload.bytes, pair.companion.bytes, { context: scope.context, sourceContestId: scope.sourceContestId, votesUrl: def.payloadUrl, rosterUrl: def.companionUrl, votesSha256: pair.payload.sha256, rosterSha256: pair.companion.sha256 });
    } catch (error) {
      if (error instanceof OfficialResultParseError && error.code === 'STAGING_DATA') return null;
      if (error instanceof OfficialResultParseError) return refused('official_' + error.code.toLowerCase(), error.message);
      throw error;
    }
    const body = bridgeOfficialContest(parsed, { publisher: def.publisher, retrievedAt: pair.payload.retrievedAt, target, reviewedTarget: scope.target, reviewedContext: scope.context, reviewedBinding: { target: scope.target, sourceContext: scope.context }, rawPayload: pair.payload.bytes, rawCertificates: [] });
    let input = resultReportInputSchema.parse(body);
    const prior = await deps.current(target.id); active(ctx.signal);
    input = preserveAcceptedCaptureClock(input, prior, target);
    for (const [role, capture] of [['payload', pair.payload], ['companion', pair.companion]] as const) {
      active(ctx.signal);
      const stored = await deps.evidence(capture.bytes, capture.contentType, `${def.state}-${scope.target.date}-${role}.json`, 'ingest:' + def.publisher.id);
      if (stored.sha256 !== capture.sha256) return refused('official_evidence_mismatch', 'Retained source evidence does not match captured bytes');
    }
    active(ctx.signal); return input;
  };
  return { adapter, health: capture.health };
}
export function createNcLiveAdapter(definition: LiveSourceDefinition, deps: LiveAdapterDependencies, pool = createLiveTransportPool()) {
  if (definition.state !== 'NC') return refused('official_source_invalid', 'NC factory requires a reviewed NC source');
  return createOfficialLiveAdapter(definition, deps, pool);
}
export function createLaLiveAdapter(definition: LiveSourceDefinition, deps: LiveAdapterDependencies, pool = createLiveTransportPool()) {
  if (definition.state !== 'LA') return refused('official_source_invalid', 'LA factory requires a reviewed LA source');
  return createOfficialLiveAdapter(definition, deps, pool);
}
