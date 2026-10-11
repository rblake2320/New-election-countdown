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
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password && !url.port;
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
