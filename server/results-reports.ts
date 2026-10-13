/**
 * ET-6 live official results — contract v1.2 (Team/workmap/msg/20261011-et6-results-contract-A-confirmed.md).
 *
 * The DTO and its validators are lane C's `shared/live-election-results.ts`; this module adds the
 * server-side pieces: the writer input type, row shapes, payload building, revision/etag helpers
 * and the error type. No projections exist anywhere in this contract: a winner is only ever an
 * explicit official declaration carried by the source.
 */
import { z } from 'zod';
import { createHash } from 'node:crypto';
import {sourceHealthCacheKey} from './results-source-health';
import {
  liveResultReportInputSchema, liveResultSourceKinds, liveResultReportingBases, liveResultAsOfBases,
  type LiveElectionResultsResponse, type LiveResultReportInput,
} from '@shared/live-election-results';

export const RESULTS_SCHEMA_VERSION = 1 as const;
export { liveResultSourceKinds as resultSourceKinds };
export type ResultSourceKind = (typeof liveResultSourceKinds)[number];
export type ResultStatus = 'unofficial' | 'certified';
export type AsOfBasis = (typeof liveResultAsOfBases)[number];
export type ReportingBasis = (typeof liveResultReportingBases)[number];

/** Admin POST body = lane C's input DTO (expectedRevision + idempotencyKey included). */
export const adminResultPostSchema = liveResultReportInputSchema;
export type AdminResultPost = LiveResultReportInput;

/**
 * What the writer takes (admin route after stripping its two fields, ingestion adapters directly).
 * C's DTO types the provenance fields as nullable because the same object shape also carries
 * `status: none` responses; `validateRecorded` guarantees they are present on a recorded input,
 * and `narrowRecorded` carries that guarantee into the type.
 */
type RecordedOnly = Omit<LiveResultReportInput, 'expectedRevision' | 'idempotencyKey'>;
export type ResultReportInput = Omit<RecordedOnly, 'source' | 'sourcePayloadSha256' | 'retrievedAt' | 'asOfBasis'> & {
  source: NonNullable<RecordedOnly['source']>;
  sourcePayloadSha256: string;
  retrievedAt: string;
  asOfBasis: AsOfBasis;
};
export function narrowRecorded<T extends RecordedOnly>(r: T): Omit<T, 'source' | 'sourcePayloadSha256' | 'retrievedAt' | 'asOfBasis'> & ResultReportInput {
  if (r.source === null || r.sourcePayloadSha256 === null || r.retrievedAt === null || r.asOfBasis === null) {
    throw new ResultReportError(422, 'invalid_report', 'a recorded result requires source provenance', [{ path: 'source', message: 'An observed result requires source provenance' }]);
  }
  return r as Omit<T, 'source' | 'sourcePayloadSha256' | 'retrievedAt' | 'asOfBasis'> & ResultReportInput;
}
/** Validator for adapter / event output: the same DTO minus the admin-only fields. */
export const resultReportInputSchema = z.preprocess(
  (v) => (v && typeof v === 'object' ? { expectedRevision: null, idempotencyKey: 'adapter', ...(v as object) } : v),
  liveResultReportInputSchema,
).transform((r) => narrowRecorded(stripAdminFields(r)));
export function stripAdminFields<T extends { expectedRevision?: unknown; idempotencyKey?: unknown }>(r: T): Omit<T, 'expectedRevision' | 'idempotencyKey'> {
  const { expectedRevision: _e, idempotencyKey: _k, ...rest } = r;
  return rest;
}

/** Stored row shapes (snake_case as the tables are read back). */
export interface ResultReportRow {
  id: number; election_id: number; revision: string; status: ResultStatus;
  source_id: string; source_kind: ResultSourceKind; source_name: string; source_url: string; source_contest_id: string;
  source_payload_sha256: string; as_of: Date | string | null; as_of_basis: AsOfBasis; retrieved_at: Date | string;
  reporting_percent: string | number | null; reporting_basis: ReportingBasis | null;
  precincts_reporting: number | null; precincts_total: number | null; total_votes: number | string | null;
  winner_called_source: string | null; winner_called_url: string | null; winner_called_at: Date | string | null;
  certification_url: string | null; certified_at: Date | string | null;
  context_state: string; context_election_date: Date | string; context_type: string; context_level: string; context_office: string;
  posted_by: string; idempotency_key: string | null; note: string | null; supersedes_report_id: number | null; created_at: Date | string;
}
export interface ResultLineRow {
  id: number; report_id: number; candidate_id: number | null; source_candidate_id: string; name: string; party: string | null;
  votes: number | string; percent: string | number | null; is_winner_declared: boolean;
}

/** The race context a snapshot is bound to (copied from the election row when recorded). */
export interface ElectionContext {
  state: string;
  /** YYYY-MM-DD */
  electionDate: string;
  type: string;
  level: string;
  office: string;
}
export function electionContextOf(e: { state: string; date: Date | string; type: string; level: string; title: string }): ElectionContext {
  return { state: e.state, electionDate: new Date(e.date).toISOString().slice(0, 10), type: e.type, level: e.level, office: e.title };
}
export function reportContextOf(r: ResultReportRow): ElectionContext {
  return { state: r.context_state, electionDate: new Date(r.context_election_date).toISOString().slice(0, 10), type: r.context_type, level: r.context_level, office: r.context_office };
}
export function contextMatches(a: ElectionContext, b: ElectionContext): boolean {
  return a.state === b.state && a.electionDate === b.electionDate && a.type === b.type && a.level === b.level && a.office === b.office;
}

/**
 * Public payload = lane C's response DTO + the two context-binding fields (asked of C as an additive
 * schema change: `electionContext` and `history[].contextMatch`).
 */
export type ResultsPayload = Omit<LiveElectionResultsResponse, 'history'> & {
  electionContext: ElectionContext | null;
  history: Array<LiveElectionResultsResponse['history'][number] & { contextMatch: boolean }>;
};

const iso = (v: Date | string | null | undefined): string | null => (v == null ? null : new Date(v).toISOString());
const num = (v: string | number | null | undefined): number | null => (v == null ? null : Number(v));

export function emptyResultsPayload(electionId: number): ResultsPayload {
  return {
    schemaVersion: RESULTS_SCHEMA_VERSION, electionId, reportId: null, revision: null, status: 'none', reporting: null, source: null,
    sourcePayloadSha256: null, asOf: null, asOfBasis: null, retrievedAt: null, totalVotes: null, candidates: [], winnerCalledBy: null,
    certification: null, supersedesReportId: null, stale: false, staleSince: null, electionContext: null, history: [],
  };
}

/**
 * `latest` must already be the newest report whose context equals `current` (the caller selects it);
 * `history` = EARLIER reports for the id (every report except the current one), newest first, each
 * annotated against `current`. The current report is never repeated in its own history (B found the
 * off-by-one in "Earlier reports (N)"); when status is none, history holds the mismatched-context
 * reports that are not current. `electionContext.office` is the election title (races have no
 * separate office column; the title names the race).
 */
export function buildResultsPayload(electionId: number, latest: ResultReportRow | null, lines: ResultLineRow[], history: ResultReportRow[], current: ElectionContext): ResultsPayload {
  const annotated = history.filter((h) => latest === null || h.id !== latest.id).map((h) => ({
    reportId: h.id, revision: h.revision, asOf: iso(h.as_of), status: h.status, percent: num(h.reporting_percent), sourceId: h.source_id, sourceUrl: h.source_url,
    contextMatch: contextMatches(reportContextOf(h), current),
  }));
  if (!latest) return { ...emptyResultsPayload(electionId), history: annotated };
  return {
    schemaVersion: RESULTS_SCHEMA_VERSION,
    electionId,
    reportId: latest.id,
    revision: latest.revision,
    status: latest.status,
    reporting: latest.reporting_basis === null && latest.reporting_percent === null && latest.precincts_reporting === null && latest.precincts_total === null
      ? null
      : { percent: num(latest.reporting_percent), basis: latest.reporting_basis ?? 'source_unspecified', precinctsReporting: latest.precincts_reporting, precinctsTotal: latest.precincts_total },
    source: { id: latest.source_id, kind: latest.source_kind, name: latest.source_name, url: latest.source_url, sourceContestId: latest.source_contest_id },
    sourcePayloadSha256: latest.source_payload_sha256,
    asOf: iso(latest.as_of),
    asOfBasis: latest.as_of_basis,
    retrievedAt: iso(latest.retrieved_at)!,
    totalVotes: num(latest.total_votes),
    candidates: lines.map((l) => ({
      candidateId: l.candidate_id, sourceCandidateId: l.source_candidate_id, name: l.name, party: l.party,
      votes: Number(l.votes), percent: num(l.percent), isWinner: l.is_winner_declared === true,
    })),
    winnerCalledBy: latest.winner_called_source && latest.winner_called_url && latest.winner_called_at
      ? { source: latest.winner_called_source, url: latest.winner_called_url, at: iso(latest.winner_called_at)! } : null,
    certification: latest.certification_url ? { url: latest.certification_url, certifiedAt: iso(latest.certified_at) } : null,
    supersedesReportId: latest.supersedes_report_id,
    stale: false,
    staleSince: null,
    electionContext: reportContextOf(latest),
    history: annotated,
  };
}


/** Revision = report id + first 8 hex of the hash of the normalised input (stable across replays). */
export function revisionFor(reportId: number, input: ResultReportInput): string {
  return `r${reportId}-${canonicalInputHash(input).slice(0, 8)}`;
}
/**
 * Stable serialisation: object keys sorted at EVERY level, array order preserved, no key dropped.
 * (The earlier `JSON.stringify(value, sortedTopLevelKeys)` was wrong: a replacer ARRAY filters keys
 * at every nesting level, so nested candidate/source/reporting fields vanished and two different
 * snapshots could hash the same — found by lane C on PR #50.)
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}
export function canonicalInputHash(input: ResultReportInput): string {
  const { note: _n, supersedesReportId: _s, ...rest } = input;
  return createHash('sha256').update(stableStringify(rest)).digest('hex');
}
/** Same published facts across fresh captures and database timestamp spellings. */
export function publishedContentHash(input:ResultReportInput|ResultsPayload):string{
 const time=(value:string|null)=>value===null?null:new Date(value).toISOString();
 const normalized={schemaVersion:input.schemaVersion,electionId:input.electionId,status:input.status,source:input.source,sourcePayloadSha256:input.sourcePayloadSha256,asOf:time(input.asOf),asOfBasis:input.asOfBasis,reporting:input.reporting,totalVotes:input.totalVotes,
 candidates:[...input.candidates].sort((a,b)=>a.sourceCandidateId<b.sourceCandidateId?-1:a.sourceCandidateId>b.sourceCandidateId?1:0),
 winnerCalledBy:input.winnerCalledBy?{...input.winnerCalledBy,at:time(input.winnerCalledBy.at)}:null,certification:input.certification?{...input.certification,certifiedAt:time(input.certification.certifiedAt)}:null};
 return createHash('sha256').update(stableStringify(normalized)).digest('hex');
}
export function etagFor(payload: ResultsPayload): string {
  const state=createHash('sha256').update(stableStringify([payload,sourceHealthCacheKey(payload)])).digest('hex').slice(0,24);
  return `W/"${payload.electionId}-${payload.revision ?? 'none'}-${state}"`;
}

/** Errors the writer raises; routes map `status`/`publicCode` straight to HTTP. */
export class ResultReportError extends Error {
  constructor(public readonly status: number, public readonly publicCode: string, message: string, public readonly details?: unknown) {
    super(message);
  }
}

/** Server-only sanity the DTO leaves to the writer: nothing is retrieved from the future. */
export function assertNotFuture(input: ResultReportInput, now = Date.now()): void {
  if (new Date(input.retrievedAt).getTime() > now + 5 * 60 * 1000) {
    throw new ResultReportError(422, 'invalid_report', 'retrievedAt is in the future', [{ path: 'retrievedAt', message: 'retrievedAt is in the future' }]);
  }
}
