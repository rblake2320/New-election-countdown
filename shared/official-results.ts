import { z } from 'zod';

// Navigation verification is not publication or certification of returns.
export const officialResultsRouteTypes = [
  'generic_results_portal', 'government_elections_fallback',
  'government_results_archive', 'government_results_gateway',
  'government_results_history_information', 'government_results_landing',
  'year_results_landing',
  'election_specific_results',
] as const;
export const httpsResultsUrl = z.string().url().max(2048).refine(value => {
  // Zod also runs refinements after a nonfatal url() validation issue. Invalid
  // strings must become a field error rather than escape safeParse as TypeError.
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port;
  } catch {
    return false;
  }
}, 'An HTTPS URL without credentials or a custom port is required');
const resultPhase = z.enum(['general', 'primary', 'runoff', 'other']);
const resultDigest = z.string().regex(/^[a-f0-9]{64}$/);
export const publishedResultsReceiptSchema = z.object({
  state: z.string().regex(/^[A-Z]{2}$/),
  outcome: z.literal('worked'), electionDate: z.literal('2026-11-03'),
  electionPhase: resultPhase, destinationUrl: httpsResultsUrl,
  sourceUrl: httpsResultsUrl, contextVerified: z.literal(true),
  resultsObserved: z.literal(true), observedElectionLabel: z.string().trim().min(5).max(1024),
  checkedAt: z.string().datetime({ offset: true }),
}).strict();
export const resultsPublicationEvidenceSchema = z.object({
  state: z.string().regex(/^[A-Z]{2}$/),
  electionDate: z.literal('2026-11-03'), electionPhase: resultPhase,
  destinationUrl: httpsResultsUrl,
  officialElectionLabel: z.string().trim().min(5).max(1024),
  officialContextVerified: z.literal(true), officialContextReceiptSha256: resultDigest,
  receivingOutcome: z.literal('worked'), receivingResultsObserved: z.literal(true),
  receivingReceiptSha256: resultDigest, receivingCheckedAt: z.string().datetime({ offset: true }),
}).strict();
export const officialResultsSourceSchema = z.object({
  targetElectionDate: z.literal('2026-11-03'),
  electionPhase: resultPhase,
  routeType: z.enum(officialResultsRouteTypes),
  publisher: z.string().min(1).max(512),
  checkedAt: z.string().datetime({ offset: true }),
  routeVerification: z.enum(['worked', 'blocked']),
  status: z.enum(['not_linked', 'unknown', 'published']),
  availabilityReason: z.enum([
    'not_linked_in_checked_official_sources',
    'advertised_route_election_not_in_selector',
    'unknown_portal_data_load_failed', 'unknown_portal_election_context',
    'unknown_results_portal_tls_blocked', 'unknown_transport_blocked',
    'unknown_election_phase',
    'published_for_target_election',
  ]),
  governmentUrl: httpsResultsUrl,
  fallbackUrl: httpsResultsUrl.nullable(),
  advertisedGeneralUrl: httpsResultsUrl.nullable(),
  documentSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  sourceReviewSha256: z.string().regex(/^[a-f0-9]{64}$/),
  publicationEvidence: resultsPublicationEvidenceSchema.optional(),
}).strict().superRefine((source, ctx) => {
  if (source.status === 'not_linked' && (source.electionPhase !== 'general' ||
      source.availabilityReason !== 'not_linked_in_checked_official_sources' ||
      source.routeVerification !== 'worked')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'not_linked requires a checked general-election context' });
  }
  if (source.status === 'published') {
    const proof = source.publicationEvidence;
    if (source.routeType !== 'election_specific_results' || source.routeVerification !== 'worked' ||
        source.availabilityReason !== 'published_for_target_election' || !proof ||
        proof.electionDate !== source.targetElectionDate || proof.electionPhase !== source.electionPhase ||
        proof.receivingCheckedAt !== source.checkedAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Published requires a verified exact-date/phase specific results receipt' });
    }
  } else if (source.routeType === 'election_specific_results' || source.publicationEvidence || source.availabilityReason === 'published_for_target_election') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Specific publication evidence cannot be asserted on pending or unknown routes' });
  }
});
export type OfficialResultsSource = z.infer<typeof officialResultsSourceSchema>;
export const officialResultsFieldsSchema = z.object({
  officialResultsUrl: httpsResultsUrl.nullable().default(null),
  officialResultsSource: officialResultsSourceSchema.nullable().default(null),
}).superRefine((fields, ctx) => {
  if (fields.officialResultsUrl !== null && fields.officialResultsSource?.routeVerification !== 'worked') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A destination requires verified source metadata' });
  }
  if (fields.officialResultsSource?.status === 'published' &&
      fields.officialResultsUrl !== fields.officialResultsSource.publicationEvidence?.destinationUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Published destination must match the observed receiving receipt' });
  }
});

export interface OfficialResultsFields {
  officialResultsUrl: string | null;
  officialResultsSource: OfficialResultsSource | null;
}
export interface OfficialResultsElectionContext {
  date?: unknown; type?: unknown; state?: unknown;
  officialResultsUrl?: unknown; officialResultsSource?: unknown;
}
export function officialResultsElectionPhase(type: unknown): OfficialResultsSource['electionPhase'] | null {
  if (typeof type !== 'string') return null;
  switch (type.trim().toLowerCase()) {
    case 'general': return 'general';
    case 'primary': return 'primary';
    case 'runoff': return 'runoff';
    case 'special': case 'other': return 'other';
    default: return null;
  }
}
function calendarDate(value: unknown): string | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : null;
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-]\d{2}:\d{2})?)?$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, offset] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() + 1 !== Number(month) || date.getUTCDate() !== Number(day)) return null;
  if (hour !== undefined && (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59)) return null;
  if (offset && offset !== 'Z') {
    const [offsetHour, offsetMinute] = offset.slice(1).split(':').map(Number);
    if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) return null;
  }
  return value.slice(0, 10);
}
// Receiving boundary: the stored source is useful only for this outer record.
// SQL-backed callers first normalize from the canonical timestamp text;
// they must not infer a stored calendar day from a native PG Date in local TZ.
export function projectOfficialResultsForElection(context: OfficialResultsElectionContext): OfficialResultsFields {
  const empty: OfficialResultsFields = { officialResultsUrl: null, officialResultsSource: null };
  try {
    const parsed = officialResultsFieldsSchema.safeParse(context);
    if (!parsed.success) return empty;
    const source = parsed.data.officialResultsSource;
    if (!source) return empty;
    if (calendarDate(context.date) !== source.targetElectionDate || officialResultsElectionPhase(context.type) !== source.electionPhase) return empty;
    if (source.status === 'published' &&
        (typeof context.state !== 'string' || context.state.trim().toUpperCase() !== source.publicationEvidence?.state)) return empty;
    return { officialResultsUrl: parsed.data.officialResultsUrl ?? null, officialResultsSource: source };
  } catch { return empty; }
}
