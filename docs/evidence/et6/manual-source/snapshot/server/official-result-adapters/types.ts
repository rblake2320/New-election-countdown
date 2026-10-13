import { z } from 'zod';
import { httpsResultsUrl, resultsTimestamp } from '../../shared/official-results';
import { liveResultReportingSchema } from '../../shared/live-election-results';

const count = z.number().int().nonnegative().safe();
const text = z.string().trim().min(1).max(512);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const officialContestContextSchema = z.object({
  state: z.string().regex(/^[A-Z]{2}$/),
  electionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }),
  phase: z.enum(['general', 'primary', 'runoff', 'primary_runoff', 'other']),
  level: text, office: text, district: text.nullable(), party: text.nullable(),
}).strict();
export const officialCertificationEvidenceSchema = z.object({
  url: httpsResultsUrl, sha256: digest, dateRaw: text.nullable(),
  certifiedAt: resultsTimestamp.nullable(), context: officialContestContextSchema,
}).strict();
export const parsedOfficialContestSchema = z.object({
  context: officialContestContextSchema,
  sourceContestId: z.string().trim().min(1).max(256),
  sourcePayloadSha256: digest,
  asOf: resultsTimestamp.nullable(),
  asOfBasis: z.enum(['source_timestamp', 'source_publication_time', 'not_provided']),
  asOfRaw: text.nullable(), reporting: liveResultReportingSchema.nullable(),
  totalVotes: count.nullable(),
  options: z.array(z.object({
    sourceCandidateId: z.string().trim().min(1).max(256).nullable(),
    identifierBasis: z.enum(['publisher_id', 'printed_label']),
    name: text, party: text.nullable(), votes: count,
    percent: z.number().finite().min(0).max(100).nullable(),
    isWinner: z.literal(false), optionKind: z.enum(['named', 'write_in', 'other']),
  }).strict()).min(1).max(5000),
  // The publisher's ballot totals may include over/undervotes. Never replace
  // the option-vote total with another denominator or compute percentages.
  publisherMetrics: z.record(z.string(), count.nullable()).default({}),
  certificationEvidence: z.array(officialCertificationEvidenceSchema).default([]),
}).strict().superRefine((value, ctx) => {
  if ((value.asOf === null) !== (value.asOfBasis === 'not_provided')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['asOfBasis'], message: 'Source timestamp basis does not match the observed timestamp' });
  }
  const keys = new Set<string>();
  value.options.forEach((option, index) => {
    const key = option.sourceCandidateId ?? option.name;
    if (keys.has(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options', index], message: 'Ambiguous duplicate source option requires a publisher identifier' });
    keys.add(key);
    if (option.identifierBasis === 'publisher_id' && option.sourceCandidateId === null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options', index, 'sourceCandidateId'], message: 'Publisher identifier is absent' });
  });
});

export type OfficialContestContext = z.infer<typeof officialContestContextSchema>;
export type OfficialCertificationEvidence = z.infer<typeof officialCertificationEvidenceSchema>;
export type ParsedOfficialContest = z.infer<typeof parsedOfficialContestSchema>;

export class OfficialResultParseError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'OfficialResultParseError';
  }
}

export function requireContext(actual: OfficialContestContext, expected: OfficialContestContext): void {
  for (const key of ['state', 'electionDate', 'phase', 'level', 'office', 'district', 'party'] as const) {
    if (actual[key] !== expected[key]) throw new OfficialResultParseError('CONTEXT_MISMATCH', `Official source ${key} does not match the reviewed contest`);
  }
}
