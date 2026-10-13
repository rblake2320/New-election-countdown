/**
 * ET-6 live official results — ingestion integration (contract v1.3 §3).
 *
 * A race is ADMITTED for polling when a reviewed source is registered for it (results-source-registry:
 * explicit election id, or same state + same election day + phase) OR its C6 manifest row has a worked
 * route — regardless of the manifest's publication status — AND lane C has registered an adapter for that
 * source id. The adapter fetches the admitted official source and returns a v1.2 snapshot or `null`
 * (not published yet). Snapshots go through the same writer as admin posting
 * (storage.recordResultReport), which binds context, requires evidence where the contract says so, and
 * refuses stale/pre-election/foreign data. Nothing here manufactures a publication status, fetches a
 * URL that is not registered, or decides a winner.
 *
 * Lifetime: one cycle in flight at a time (a tick that lands during a cycle is skipped and counted);
 * every adapter call receives an AbortSignal that stopPolling() trips, and stopPolling() drains the
 * in-flight cycle for a bounded time. A timed-out or aborted adapter is `failed`, never `not_published`.
 */
import { storage } from './storage';
import { BackgroundWork } from './background-work';
import { resultReportInputSchema, ResultReportError, type ResultReportInput } from './results-reports';
import { resultsSourceRegistry, type RegisteredSource } from './results-source-registry';
import type { OfficialResultsSource } from '@shared/official-results';

/** The race as the adapter sees it. `type`/`level`/`title` are the authoritative election-row values so lane C
 * can compare its reviewed contest binding with the CURRENT race after an admin edit (contract v1.2 §3).
 * `title` is the office (races have no separate office column). */
export interface AdapterElection {
  id: number;
  state: string | null;
  date: Date | string;
  type: string;
  level: string;
  title: string;
  officialResultsUrl: string | null;
  /** the C6 manifest row when the election has one; null for registry-only admissions (historical replay) */
  officialResultsSource: OfficialResultsSource | null;
}

/** The source the adapter was admitted through. `publication` is the manifest's claim ('none' when there is no manifest row). */
export interface AdmittedSource {
  id: string;
  kind: string;
  via: 'registry' | 'manifest';
  publication: 'none' | 'not_linked' | 'unknown' | 'published';
  registered: RegisteredSource | null;
}

export interface AdapterContext { signal: AbortSignal; source: AdmittedSource }

/** A per-source adapter (lane C): fetch the admitted official source and parse it to a snapshot, or
 *  return `null` when the source has not published a parseable feed for this race yet. Honour `ctx.signal`. */
export type ResultsAdapter = (election: AdapterElection, ctx: AdapterContext) => Promise<ResultReportInput | null>;

export type IngestOutcome =
  | { electionId: number; outcome: 'recorded'; sourceId: string; reportId: number; revision: string }
  | { electionId: number; outcome: 'unchanged'; sourceId: string }
  | { electionId: number; outcome: 'not_published'; sourceId: string; publication: AdmittedSource['publication'] }
  | { electionId: number; outcome: 'not_admitted'; reason: 'no_source' | 'route_blocked' | 'no_adapter'; sourceId: string | null }
  | { electionId: number; outcome: 'refused'; sourceId: string; code: string; message: string }
  | { electionId: number; outcome: 'failed'; sourceId: string; message: string; aborted: boolean };

export interface RaceCoverage {
  electionId: number; state: string | null; title: string; date: string;
  mode: 'automatic' | 'manual_only';
  reason: 'adapter_registered' | 'no_source' | 'route_blocked' | 'no_adapter';
  sourceId: string | null; admittedVia: 'registry' | 'manifest' | null;
  manifestStatus: 'none' | 'not_linked' | 'unknown' | 'published';
  officialResultsUrl: string | null;
}
export interface ResultsCoverage { date: string | null; counts: { total: number; automatic: number; manualOnly: number }; races: RaceCoverage[] }

type ElectionRow = {
  id: number; state: string | null; date: Date | string; type: string; level: string; title: string;
  officialResultsUrl?: string | null; officialResultsSource?: OfficialResultsSource | null;
};

type Admission =
  | { admitted: true; source: AdmittedSource; adapter: ResultsAdapter }
  | { admitted: false; reason: 'no_source' | 'route_blocked' | 'no_adapter'; sourceId: string | null; manifestStatus: RaceCoverage['manifestStatus'] };

export const STOP_DRAIN_MS = 10_000;

export class ResultsIngestionService {
  private pollingWork = new BackgroundWork();
  private isRunning = false;
  private readonly adapters = new Map<string, ResultsAdapter>();
  private lastCycle: { at: string; outcomes: IngestOutcome[] } | null = null;
  private inFlight: Promise<IngestOutcome[]> | null = null;
  private abort: AbortController | null = null;
  private overlapSkipped = 0;

  /** Lane C registers adapters by source id (registry id or the manifest's `officialResultsSource.publisher`). */
  registerAdapter(sourceId: string, adapter: ResultsAdapter): void {
    this.adapters.set(sourceId, adapter);
  }

  async startPolling(intervalSeconds: number = 30): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    const previous = this.pollingWork;
    if (previous.isStopped) {
      await previous.stop();
      if (!this.isRunning) return;
      this.pollingWork = new BackgroundWork();
    }
    const work = this.pollingWork;
    await work.run(async () => { await this.ingestResults(); });
    work.every(intervalSeconds * 1000, async () => { await this.ingestResults(); }, () => console.error('[results ingestion] scheduled cycle failed'));
  }

  /** Stops the timer, aborts every adapter call in the in-flight cycle, and waits (bounded) for that cycle to drain. */
  async stopPolling(): Promise<void> {
    this.isRunning = false;
    this.abort?.abort();
    await this.pollingWork.stop();
    if (this.inFlight) {
      await Promise.race([this.inFlight, new Promise<void>((r) => { const t = setTimeout(r, STOP_DRAIN_MS); t.unref?.(); })]);
    }
  }

  /** One cycle over every admitted election. A cycle that starts while another is in flight is skipped (counted), never overlapped. */
  async ingestResults(): Promise<IngestOutcome[]> {
    if (this.inFlight) { this.overlapSkipped += 1; return this.inFlight; }
    const controller = new AbortController();
    this.abort = controller;
    const run = (async () => {
      const outcomes: IngestOutcome[] = [];
      let elections: ElectionRow[];
      try {
        elections = (await storage.getElections({})) as ElectionRow[];
      } catch (error) {
        console.error('[results ingestion] could not list elections:', error);
        this.lastCycle = { at: new Date().toISOString(), outcomes };
        return outcomes;
      }
      for (const election of elections) {
        if (controller.signal.aborted) break;
        const admission = this.admit(election);
        if (!admission.admitted) {
          // Only races that have some official-source signal are worth reporting per cycle; the rest are manual-only by definition.
          if (admission.reason !== 'no_source') outcomes.push({ electionId: election.id, outcome: 'not_admitted', reason: admission.reason, sourceId: admission.sourceId });
          continue;
        }
        outcomes.push(await this.ingestOne(toAdapterElection(election), admission.source, admission.adapter, controller.signal));
      }
      this.lastCycle = { at: new Date().toISOString(), outcomes };
      return outcomes;
    })();
    this.inFlight = run;
    try { return await run; } finally { if (this.inFlight === run) { this.inFlight = null; this.abort = null; } }
  }

  /** Ingest one admitted race through one adapter. Exposed for tests and D's replay harness. */
  async ingestOne(election: AdapterElection, source: AdmittedSource, adapter: ResultsAdapter, signal: AbortSignal = new AbortController().signal): Promise<IngestOutcome> {
    const sourceId = source.id;
    try {
      const raw = await adapter(election, { signal, source });
      if (raw === null) return { electionId: election.id, outcome: 'not_published', sourceId, publication: source.publication };
      // Delta 5: the adapter's output must name THIS race and THIS source; a mismatch is refused, never overwritten.
      const claimedElection = (raw as { electionId?: unknown }).electionId;
      if (claimedElection !== undefined && claimedElection !== election.id) {
        return { electionId: election.id, outcome: 'refused', sourceId, code: 'foreign_election', message: `adapter output names election ${String(claimedElection)}, polled race is ${election.id}` };
      }
      const claimedSource = (raw as { source?: { id?: unknown } }).source?.id;
      if (claimedSource !== sourceId) {
        return { electionId: election.id, outcome: 'refused', sourceId, code: 'foreign_source', message: `adapter output names source ${String(claimedSource)}, admitted source is ${sourceId}` };
      }
      const input = resultReportInputSchema.parse({ ...(raw as object), schemaVersion: 1, electionId: election.id });
      if (input.source.kind === 'ap' && process.env.RESULTS_ALLOW_AP !== 'true') {
        return { electionId: election.id, outcome: 'refused', sourceId, code: 'ap_disabled', message: 'AP results are disabled by the owner' };
      }
      const result = await storage.recordResultReport(election.id, input, { postedBy: `ingest:${sourceId}`, idempotencyKey: null });
      if (!result.created) return { electionId: election.id, outcome: 'unchanged', sourceId };
      return { electionId: election.id, outcome: 'recorded', sourceId, reportId: result.payload.reportId!, revision: result.payload.revision! };
    } catch (error) {
      if (error instanceof ResultReportError) return { electionId: election.id, outcome: 'refused', sourceId, code: error.publicCode, message: error.message };
      if (error && typeof error === 'object' && 'issues' in error) return { electionId: election.id, outcome: 'refused', sourceId, code: 'invalid_report', message: 'adapter output failed contract validation' };
      const aborted = signal.aborted || (error instanceof Error && error.name === 'AbortError');
      return { electionId: election.id, outcome: 'failed', sourceId, message: error instanceof Error ? error.message : String(error), aborted };
    }
  }

  /** Admission decision for a race: registry binding first, then a worked manifest route; both need a registered adapter. */
  private admit(election: ElectionRow): Admission {
    const manifest = election.officialResultsSource ?? null;
    const manifestStatus: RaceCoverage['manifestStatus'] = manifest ? manifest.status : 'none';
    const registered = resultsSourceRegistry.admittedFor({ id: election.id, state: election.state ?? null, date: election.date, type: election.type });
    for (const reg of registered) {
      const adapter = this.adapters.get(reg.id);
      if (adapter) return { admitted: true, adapter, source: { id: reg.id, kind: reg.kind, via: 'registry', publication: manifest?.publisher === reg.id ? manifest.status : 'none', registered: reg } };
    }
    if (manifest) {
      if (manifest.routeVerification !== 'worked') return { admitted: false, reason: 'route_blocked', sourceId: manifest.publisher, manifestStatus };
      const adapter = this.adapters.get(manifest.publisher);
      if (adapter) return { admitted: true, adapter, source: { id: manifest.publisher, kind: 'manifest', via: 'manifest', publication: manifest.status, registered: resultsSourceRegistry.get(manifest.publisher) ?? null } };
      return { admitted: false, reason: 'no_adapter', sourceId: manifest.publisher, manifestStatus };
    }
    if (registered.length) return { admitted: false, reason: 'no_adapter', sourceId: registered[0].id, manifestStatus };
    return { admitted: false, reason: 'no_source', sourceId: null, manifestStatus };
  }

  /**
   * Honest per-race coverage for a date (B's wording source, D's drill set): `automatic` = admitted (a registered or
   * worked-route source with a registered adapter). `manifestStatus` says what the C6 manifest claims, so the UI can
   * word "awaiting first publication" vs "published" without anyone inventing a status.
   */
  async coverage(date?: string): Promise<ResultsCoverage> {
    const all = (await storage.getElections({})) as ElectionRow[];
    const races: RaceCoverage[] = all
      .filter((e) => !date || new Date(e.date).toISOString().slice(0, 10) === date)
      .map((e) => {
        const a = this.admit(e);
        const manifestStatus: RaceCoverage['manifestStatus'] = e.officialResultsSource ? e.officialResultsSource.status : 'none';
        const base = { electionId: e.id, state: e.state ?? null, title: e.title, date: new Date(e.date).toISOString(), manifestStatus, officialResultsUrl: e.officialResultsUrl ?? null };
        return a.admitted
          ? { ...base, mode: 'automatic' as const, reason: 'adapter_registered' as const, sourceId: a.source.id, admittedVia: a.source.via }
          : { ...base, mode: 'manual_only' as const, reason: a.reason, sourceId: a.sourceId, admittedVia: null };
      });
    const automatic = races.filter((r) => r.mode === 'automatic').length;
    return { date: date ?? null, counts: { total: races.length, automatic, manualOnly: races.length - automatic }, races };
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      pollingActive: this.pollingWork.hasTimers,
      cycleInFlight: this.inFlight !== null,
      overlapSkipped: this.overlapSkipped,
      adapters: [...this.adapters.keys()],
      registeredSources: resultsSourceRegistry.list().map((s) => s.id),
      apEnabled: process.env.RESULTS_ALLOW_AP === 'true',
      lastCycle: this.lastCycle,
    };
  }
}

function toAdapterElection(e: ElectionRow): AdapterElection {
  return { id: e.id, state: e.state ?? null, date: e.date, type: e.type, level: e.level, title: e.title, officialResultsUrl: e.officialResultsUrl ?? null, officialResultsSource: e.officialResultsSource ?? null };
}

export const resultsIngestionService = new ResultsIngestionService();
