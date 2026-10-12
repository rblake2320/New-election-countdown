/**
 * ET-6 live official results — ingestion integration (contract v1.2 §3).
 *
 * Elections whose official_results_source (lane C's manifest) is `published` are polled through a
 * registered per-source ADAPTER that returns a v1.2 snapshot; the snapshot goes through the same
 * writer as admin posting (storage.recordResultReport). No adapter → the election is reported as
 * `no_adapter` and nothing is written. Nothing here fetches a URL that is not in the manifest, and
 * nothing here ever decides a winner (the old determineWinner heuristic is gone).
 */
import { storage } from './storage';
import { BackgroundWork } from './background-work';
import { resultReportInputSchema, ResultReportError, type ResultReportInput } from './results-reports';
import type { OfficialResultsSource } from '@shared/official-results';

export interface AdapterElection {
  id: number;
  state: string | null;
  date: Date | string;
  officialResultsUrl: string | null;
  officialResultsSource: OfficialResultsSource;
}

/** A per-source adapter (lane C): fetch the admitted official source and parse it to a snapshot, or
 *  return `null` when the source has not published a parseable feed for this race yet. */
export type ResultsAdapter = (election: AdapterElection) => Promise<ResultReportInput | null>;

export type IngestOutcome =
  | { electionId: number; outcome: 'recorded'; reportId: number; revision: string }
  | { electionId: number; outcome: 'unchanged' }
  | { electionId: number; outcome: 'not_published' }
  | { electionId: number; outcome: 'no_adapter'; sourceId: string | null }
  | { electionId: number; outcome: 'refused'; code: string; message: string }
  | { electionId: number; outcome: 'failed'; message: string };

export class ResultsIngestionService {
  private pollingWork = new BackgroundWork();
  private isRunning = false;
  private readonly adapters = new Map<string, ResultsAdapter>();
  private lastCycle: { at: string; outcomes: IngestOutcome[] } | null = null;

  /** Lane C registers adapters by the manifest's publisher id (`officialResultsSource.publisher`). */
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

  async stopPolling(): Promise<void> {
    this.isRunning = false;
    await this.pollingWork.stop();
  }

  /** One cycle over every election with a published official source. Returns per-election outcomes. */
  async ingestResults(): Promise<IngestOutcome[]> {
    const outcomes: IngestOutcome[] = [];
    let elections: AdapterElection[];
    try {
      elections = await this.publishedElections();
    } catch (error) {
      console.error('[results ingestion] could not list elections:', error);
      this.lastCycle = { at: new Date().toISOString(), outcomes };
      return outcomes;
    }
    for (const election of elections) {
      outcomes.push(await this.ingestOne(election));
    }
    this.lastCycle = { at: new Date().toISOString(), outcomes };
    return outcomes;
  }

  async ingestOne(election: AdapterElection): Promise<IngestOutcome> {
    const sourceId = election.officialResultsSource?.publisher ?? null;
    const adapter = sourceId ? this.adapters.get(sourceId) : undefined;
    if (!adapter) return { electionId: election.id, outcome: 'no_adapter', sourceId };
    try {
      const raw = await adapter(election);
      if (raw === null) return { electionId: election.id, outcome: 'not_published' };
      // The election being ingested is authoritative for schemaVersion/electionId; adapters supply the rest.
      const input = resultReportInputSchema.parse({ ...(raw as object), schemaVersion: 1, electionId: election.id });
      if (input.source.kind === 'ap' && process.env.RESULTS_ALLOW_AP !== 'true') {
        return { electionId: election.id, outcome: 'refused', code: 'ap_disabled', message: 'AP results are disabled by the owner' };
      }
      const result = await storage.recordResultReport(election.id, input, { postedBy: `ingest:${sourceId}`, idempotencyKey: null });
      if (!result.created) return { electionId: election.id, outcome: 'unchanged' };
      return { electionId: election.id, outcome: 'recorded', reportId: result.payload.reportId!, revision: result.payload.revision! };
    } catch (error) {
      if (error instanceof ResultReportError) return { electionId: election.id, outcome: 'refused', code: error.publicCode, message: error.message };
      if (error && typeof error === 'object' && 'issues' in error) return { electionId: election.id, outcome: 'refused', code: 'invalid_report', message: 'adapter output failed contract validation' };
      return { electionId: election.id, outcome: 'failed', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async publishedElections(): Promise<AdapterElection[]> {
    const all = await storage.getElections({});
    return all
      .filter((e) => e.officialResultsSource && e.officialResultsSource.status === 'published')
      .map((e) => ({ id: e.id, state: e.state ?? null, date: e.date, officialResultsUrl: e.officialResultsUrl ?? null, officialResultsSource: e.officialResultsSource! }));
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      pollingActive: this.pollingWork.hasTimers,
      adapters: [...this.adapters.keys()],
      apEnabled: process.env.RESULTS_ALLOW_AP === 'true',
      lastCycle: this.lastCycle,
    };
  }
}

export const resultsIngestionService = new ResultsIngestionService();
