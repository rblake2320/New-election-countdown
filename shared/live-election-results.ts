import { z } from 'zod';
import { httpsResultsUrl, resultsTimestamp } from './official-results';

// ET-6 A/C contract v1.2: these are observed returns, never projections.
export const liveResultSourceKinds = ['official_state_enr', 'official_state_page', 'official_county', 'ap', 'admin_manual'] as const;
export const liveResultReportingBases = ['precincts', 'ballots', 'votes', 'source_unspecified'] as const;
export const liveResultAsOfBases = ['source_timestamp', 'source_publication_time', 'not_provided'] as const;
const count = z.number().int().nonnegative().safe();
const id = count.refine(value => value > 0, 'A positive identifier is required');
const percent = z.number().finite().min(0).max(100);
const timestamp = resultsTimestamp;
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const token = z.string().trim().min(1).max(256);
const shortText = z.string().trim().min(1).max(512);
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'An actual calendar date is required');

// Read-only context copied by the server when recording a snapshot. Posting
// callers cannot choose it or move existing votes to an edited election date.
export const liveResultElectionContextSchema = z.object({
  state: z.string().regex(/^[A-Z]{2}$/), electionDate: calendarDate,
  type: token, level: token, office: shortText,
}).strict();

export const liveResultSourceSchema = z.object({
  id: token,
  kind: z.enum(liveResultSourceKinds),
  name: shortText,
  url: httpsResultsUrl,
  sourceContestId: token,
}).strict();

export const liveResultReportingSchema = z.object({
  percent: percent.nullable(),
  basis: z.enum(liveResultReportingBases),
  precinctsReporting: count.nullable(),
  precinctsTotal: count.nullable(),
}).strict().superRefine((value, ctx) => {
  if (value.precinctsReporting !== null && value.precinctsTotal !== null && value.precinctsReporting > value.precinctsTotal) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['precinctsReporting'], message: 'Reported precincts exceed the source total' });
  }
});

export const liveResultCandidateSchema = z.object({
  candidateId: id.nullable(),
  sourceCandidateId: token,
  name: shortText,
  party: shortText.nullable(),
  votes: count,
  percent: percent.nullable(),
  isWinner: z.boolean(),
}).strict();

const winnerSchema = z.object({ source: shortText, url: httpsResultsUrl, at: timestamp }).strict();
const certificationSchema = z.object({ url: httpsResultsUrl, certifiedAt: timestamp.nullable() }).strict();
export const liveResultHistorySchema = z.object({
  reportId: id, revision: token, asOf: timestamp.nullable(),
  status: z.enum(['unofficial', 'certified']), percent: percent.nullable(),
  sourceId: token, sourceUrl: httpsResultsUrl,
  contextMatch: z.boolean(),
}).strict();

const resultFields = {
  schemaVersion: z.literal(1), electionId: id,
  status: z.enum(['none', 'unofficial', 'certified']),
  reporting: liveResultReportingSchema.nullable(),
  source: liveResultSourceSchema.nullable(), sourcePayloadSha256: digest.nullable(),
  asOf: timestamp.nullable(), asOfBasis: z.enum(liveResultAsOfBases).nullable(),
  retrievedAt: timestamp.nullable(), totalVotes: count.nullable(),
  candidates: z.array(liveResultCandidateSchema).max(5000),
  winnerCalledBy: winnerSchema.nullable(), certification: certificationSchema.nullable(),
  supersedesReportId: id.nullable(),
};
const resultObject = z.object(resultFields).strict();
type ResultFields = z.infer<typeof resultObject>;

function validateRecorded(value: ResultFields, ctx: z.RefinementCtx): void {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
  if (value.status === 'none') return;
  for (const field of ['source', 'sourcePayloadSha256', 'retrievedAt', 'asOfBasis'] as const) {
    if (value[field] === null) issue([field], 'An observed result requires source provenance');
  }
  if (value.asOf === null && value.asOfBasis !== 'not_provided') issue(['asOfBasis'], 'An absent source timestamp must be not_provided');
  if (value.asOf !== null && (value.asOfBasis === null || value.asOfBasis === 'not_provided')) issue(['asOfBasis'], 'A source timestamp requires its actual basis');
  if (value.asOf !== null && value.retrievedAt !== null && Date.parse(value.asOf) > Date.parse(value.retrievedAt)) issue(['asOf'], 'Source as-of time is after retrieval');
  if (value.status === 'certified' && value.certification === null) issue(['certification'], 'Certification requires exact-race official evidence');
  if (value.status !== 'certified' && value.certification !== null) issue(['certification'], 'Certification evidence requires certified status');
  if (value.source?.kind === 'ap' && value.status === 'certified') issue(['status'], 'AP cannot establish official certification');
  if (value.certification?.certifiedAt && value.retrievedAt && Date.parse(value.certification.certifiedAt) > Date.parse(value.retrievedAt)) issue(['certification', 'certifiedAt'], 'Certification time is after retrieval');
  if (value.winnerCalledBy && value.retrievedAt && Date.parse(value.winnerCalledBy.at) > Date.parse(value.retrievedAt)) issue(['winnerCalledBy', 'at'], 'Official decision time is after retrieval');
  const winners = value.candidates.filter(candidate => candidate.isWinner);
  if (winners.length && value.winnerCalledBy === null) issue(['winnerCalledBy'], 'Only an explicit official declaration may mark a winner');
  if (!winners.length && value.winnerCalledBy !== null) issue(['winnerCalledBy'], 'An official winner declaration must name a recorded option');
  const options = new Set<string>();
  const boundCandidates = new Set<number>();
  value.candidates.forEach((candidate, index) => {
    if (options.has(candidate.sourceCandidateId)) issue(['candidates', index, 'sourceCandidateId'], 'Duplicate source ballot option');
    options.add(candidate.sourceCandidateId);
    if (candidate.candidateId !== null) {
      if (boundCandidates.has(candidate.candidateId)) issue(['candidates', index, 'candidateId'], 'Duplicate candidate binding');
      boundCandidates.add(candidate.candidateId);
    }
  });
  // No sum-versus-total or percentage-derived outcome: multi-seat ballots and
  // publisher-specific denominators require context, not a guessed invariant.
}

export const liveElectionResultsSchema = resultObject.extend({
  reportId: id.nullable(), revision: token.nullable(),
  electionContext: liveResultElectionContextSchema.nullable(),
  history: z.array(liveResultHistorySchema).max(10000),
  stale: z.boolean().default(false), staleSince: timestamp.nullable().default(null),
}).strict().superRefine((value, ctx) => {
  validateRecorded(value, ctx);
  if (value.status === 'none') {
    for (const field of ['reportId', 'revision', 'reporting', 'source', 'sourcePayloadSha256', 'asOf', 'asOfBasis', 'retrievedAt', 'totalVotes', 'winnerCalledBy', 'certification', 'supersedesReportId', 'staleSince', 'electionContext'] as const) {
      if (value[field] !== null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'No ingested result requires null metadata' });
    }
    if (value.candidates.length || value.stale) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'No ingested result cannot contain counts or a stale snapshot' });
    value.history.forEach((entry, index) => {
      if (entry.contextMatch) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['history', index, 'contextMatch'], message: 'A matching recorded snapshot cannot be represented as none' });
    });
  } else {
    if (value.reportId === null || value.revision === null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Recorded results require a persisted report and revision' });
    if (value.electionContext === null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['electionContext'], message: 'Recorded results require their immutable race context' });
    if (value.stale !== (value.staleSince !== null)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['staleSince'], message: 'Stale snapshots require the actual failure time' });
  }
});

// Server-generated reportId/revision/history/stale fields are not posting inputs.
export const liveResultReportInputSchema = resultObject.extend({
  status: z.enum(['unofficial', 'certified']),
  expectedRevision: token.nullable(),
  idempotencyKey: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9:_-]+$/),
  note: z.string().trim().max(4000).nullable(),
}).strict().superRefine(validateRecorded);

/** A failed source read is an outcome for a race, never a healthy zero/none
 * result and never a reason to discard other races' recorded snapshots. */
export const liveResultReadErrorSchema = z.object({
  electionId: id,
  code: z.literal('source_unavailable'),
  message: z.string().trim().min(1).max(300),
  sourceId: token.nullable(),
  failedSince: timestamp,
  electionContext: liveResultElectionContextSchema,
}).strict();
export type LiveResultReadError = z.infer<typeof liveResultReadErrorSchema>;

export const liveResultsBatchSchema = z.object({
  schemaVersion: z.literal(1),
  date: calendarDate.nullable(),
  results: z.array(liveElectionResultsSchema).max(2000),
  errors: z.array(liveResultReadErrorSchema).max(2000).optional(),
  cursor: token,
  reset: z.literal(true),
}).strict().superRefine((value, ctx) => {
  const ids = new Set<number>();
  value.results.forEach((row, index) => {
    if (ids.has(row.electionId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['results', index, 'electionId'], message: 'Duplicate contest in batch' });
    ids.add(row.electionId);
    if (row.history.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['results', index, 'history'], message: 'Batch contains current snapshots only; history belongs to the detail read' });
    if (value.date !== null && row.electionContext !== null && row.electionContext.electionDate !== value.date) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['results', index, 'electionContext', 'electionDate'], message: 'Recorded contest does not belong to the requested date' });
  });
  if (value.results.length + (value.errors?.length ?? 0) > 2000) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Batch outcomes exceed the scope bound' });
  (value.errors ?? []).forEach((row, index) => {
    if (ids.has(row.electionId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['errors', index, 'electionId'], message: 'One batch outcome per election is required' });
    ids.add(row.electionId);
    if (value.date !== null && row.electionContext.electionDate !== value.date) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['errors', index, 'electionContext', 'electionDate'], message: 'A source failure must match the requested election date' });
  });
});

export type LiveResultSource = z.infer<typeof liveResultSourceSchema>;
export type LiveResultElectionContext = z.infer<typeof liveResultElectionContextSchema>;
export type LiveResultCandidateLine = z.infer<typeof liveResultCandidateSchema>;
export type LiveElectionResultsResponse = z.infer<typeof liveElectionResultsSchema>;
export type LiveResultReportInput = z.infer<typeof liveResultReportInputSchema>;
export type LiveResultsBatchResponse = z.infer<typeof liveResultsBatchSchema>;

export function noLiveElectionResults(electionId: number): LiveElectionResultsResponse {
  return liveElectionResultsSchema.parse({
    schemaVersion: 1, electionId, reportId: null, revision: null, status: 'none',
    reporting: null, source: null, sourcePayloadSha256: null, asOf: null,
    asOfBasis: null, retrievedAt: null, totalVotes: null, candidates: [],
    winnerCalledBy: null, certification: null, supersedesReportId: null,
    history: [], stale: false, staleSince: null,
    electionContext: null,
  });
}
