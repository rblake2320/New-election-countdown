/**
 * ET-6 live official results — in-process source registry (contract v1.3, lane C deltas 1/4/5).
 *
 * Lane C registers the exact official sources it has reviewed (id, kind, name, state, allowed URLs or
 * hosts, and the election date/phase/role or election ids they are admitted for) at startup, next to the
 * adapters. The registry is independent of the C6 manifest (`officialResultsSource`), whose schema is
 * pinned to the 2026-11-03 target and can never describe a historical 2024 primary recording. Nothing in
 * here claims a publication: a registered source is "admitted" for polling, and only an accepted snapshot
 * from the writer changes what the UI shows.
 */
import type { ResultSource } from './results-store';

export type RegisteredSourceKind = ResultSource['kind'];

export interface RegisteredSource {
  /** stable source id used by adapters, reports (`source.id`) and the picker */
  id: string;
  kind: Exclude<RegisteredSourceKind, 'admin_manual'>;
  name: string;
  /** two-letter state the source publishes for */
  state: string;
  /** exact official URLs a report from this source may carry (https only) */
  allowedUrls?: string[];
  /** official hosts a report URL from this source may sit on (https only); used when exact URLs vary per race */
  allowedHosts?: string[];
  /** YYYY-MM-DD of the election day this source is admitted for (real date: a 2024 primary stays 2024) */
  electionDate?: string;
  /** election.type the source is admitted for ('primary' | 'general' | 'special' | 'runoff' …) */
  phase?: string;
  /** reviewer label for the role of the source in C's crosswalk (informational) */
  role?: string;
  /** explicit election ids the source is admitted for (private-clone replay rows carry real historical dates) */
  electionIds?: number[];
}

export interface AdmissionTarget { id: number; state: string | null; date: Date | string; type: string }

function dayOf(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function hostOf(url: string): string | null {
  try { const u = new URL(url); return u.protocol === 'https:' ? u.host.toLowerCase() : null; } catch { return null; }
}

export class ResultsSourceRegistry {
  private readonly sources = new Map<string, RegisteredSource>();

  /** Register (or replace) a reviewed source. Throws on an unusable entry so a bad startup fails loudly. */
  register(source: RegisteredSource): void {
    if (!/^[a-z0-9][a-z0-9._:-]{0,127}$/i.test(source.id)) throw new Error(`source id ${JSON.stringify(source.id)} is not a valid registry id`);
    if (source.id.startsWith('admin_manual:')) throw new Error('admin_manual:<ST> ids are reserved for admin posting');
    if (!/^[A-Z]{2}$/.test(source.state)) throw new Error(`source ${source.id}: state must be a two-letter code`);
    const urls = source.allowedUrls ?? [];
    const hosts = (source.allowedHosts ?? []).map((h) => h.toLowerCase());
    if (!urls.length && !hosts.length) throw new Error(`source ${source.id}: allowedUrls or allowedHosts is required`);
    for (const u of urls) if (hostOf(u) === null) throw new Error(`source ${source.id}: allowed URL must be https: ${u}`);
    if (source.electionDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(source.electionDate)) throw new Error(`source ${source.id}: electionDate must be YYYY-MM-DD`);
    if (!source.electionDate && !(source.electionIds?.length)) throw new Error(`source ${source.id}: electionDate or electionIds is required`);
    this.sources.set(source.id, { ...source, allowedUrls: urls, allowedHosts: hosts });
  }

  unregister(id: string): void { this.sources.delete(id); }
  clear(): void { this.sources.clear(); }
  get(id: string): RegisteredSource | undefined { return this.sources.get(id); }
  list(state?: string): RegisteredSource[] {
    return [...this.sources.values()].filter((s) => !state || s.state === state).sort((a, b) => a.state.localeCompare(b.state) || a.id.localeCompare(b.id));
  }

  /** Every declared constraint must match; explicit IDs narrow the state/date/phase scope. */
  admittedFor(election: AdmissionTarget): RegisteredSource[] {
    const day = dayOf(election.date);
    return this.list().filter((s) => {
      if (s.electionIds !== undefined && !s.electionIds.includes(election.id)) return false;
      if (s.state !== (election.state ?? '')) return false;
      if (s.electionDate !== undefined && s.electionDate !== day) return false;
      return s.phase === undefined || s.phase === election.type;
    });
  }

  /**
   * Does a report's `source` block match the registered entry? Returns null when it matches, else the reason.
   * Used by the writer so a caller cannot evade evidence rules by relabelling a kind or pointing at a foreign URL.
   */
  mismatch(source: { id: string; kind: string; url: string }): string | null {
    const reg = this.sources.get(source.id);
    if (!reg) return 'not_registered';
    if (source.kind !== reg.kind) return `kind ${source.kind} differs from registered kind ${reg.kind}`;
    const host = hostOf(source.url);
    if (host === null) return 'url must be https';
    if (reg.allowedUrls!.includes(source.url)) return null;
    if (reg.allowedHosts!.includes(host)) return null;
    return `url ${source.url} is not an allowed URL/host for ${reg.id}`;
  }
}

export const resultsSourceRegistry = new ResultsSourceRegistry();
