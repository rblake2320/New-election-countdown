import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { z } from 'zod';
import { OfficialResultsError } from './official-results-error';
import { httpsResultsUrl, officialResultsSourceSchema, type OfficialResultsSource } from '../shared/official-results';

export const RESULTS_DATE = '2026-11-03' as const;
export const RESULTS_STATES = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ').sort();
export function sha256(bytes: string | Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    return '{' + Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, item]) => JSON.stringify(key) + ':' + canonical(item)).join(',') + '}';
  }
  return JSON.stringify(value);
}
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const entrySchema = z.object({
  state: z.enum(RESULTS_STATES as [string, ...string[]]),
  officialResultsUrl: httpsResultsUrl.nullable(),
  source: officialResultsSourceSchema,
}).strict().superRefine((entry, ctx) => {
  if ((entry.officialResultsUrl !== null) !== (entry.source.routeVerification === 'worked')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Blocked routes must have a null destination' });
  }
});
export const resultsManifestSchema = z.object({
  version: z.literal(1), targetElectionDate: z.literal(RESULTS_DATE),
  reviews: z.array(z.object({ file: z.string(), sha256: hashSchema }).strict()).min(1),
  states: z.array(entrySchema).length(50),
}).strict().superRefine((manifest, ctx) => {
  if (manifest.states.map(s => s.state).sort().join(' ') !== RESULTS_STATES.join(' ')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Exactly the 50 unique reviewed states are required' });
  }
});
export type ResultsManifest = z.infer<typeof resultsManifestSchema>;
export type ResultsManifestEntry = z.infer<typeof entrySchema>;
export interface ReviewedBytes { file: string; bytes: Buffer }

function governmentUrl(value: unknown): string {
  const url = httpsResultsUrl.parse(value);
  const host = new URL(url).hostname.toLowerCase();
  if (!(host.endsWith('.gov') || ['electionstats.state.ma.us', 'mvic.sos.state.mi.us'].includes(host))) {
    throw new OfficialResultsError('This source snapshot admits only reviewed government routes');
  }
  return url;
}
export function manifestFromReviews(reviews: ReviewedBytes[]): ResultsManifest {
  const states: ResultsManifestEntry[] = [];
  for (const review of reviews) {
    const document = JSON.parse(review.bytes.toString('utf8'));
    if (document.kind !== 'official_results_route_review' || document.targetElectionDate !== RESULTS_DATE || !Array.isArray(document.records)) {
      throw new OfficialResultsError('Not a reviewed November 3 official-results inventory');
    }
    for (const record of document.records) {
      const verified = ['worked', 'worked_primary_source_web_fetch'].includes(record.verification?.outcome);
      if (!verified && record.verification?.outcome !== 'blocked') throw new OfficialResultsError('Missing source verification');
      const source: OfficialResultsSource = officialResultsSourceSchema.parse({
        targetElectionDate: RESULTS_DATE, electionPhase: 'general',
        routeType: record.routeType, publisher: record.publisher,
        checkedAt: record.verification.checkedAt,
        routeVerification: verified ? 'worked' : 'blocked',
        status: verified && record.generalPublicationStatus === 'not_linked_in_checked_official_sources' ? 'not_linked' : 'unknown',
        availabilityReason: record.generalPublicationStatus,
        governmentUrl: governmentUrl(record.officialGovernmentPage),
        fallbackUrl: record.fallbackGovernmentUrl === null ? null : governmentUrl(record.fallbackGovernmentUrl),
        advertisedGeneralUrl: record.nov3GeneralSpecificUrl === null ? null : governmentUrl(record.nov3GeneralSpecificUrl),
        documentSha256: record.verification.originalResponseSha256,
        sourceReviewSha256: sha256(review.bytes),
      });
      states.push(entrySchema.parse({ state: record.state,
        officialResultsUrl: verified ? governmentUrl(record.recommendedUrl) : null, source }));
    }
  }
  states.sort((a, b) => a.state.localeCompare(b.state));
  return resultsManifestSchema.parse({ version: 1, targetElectionDate: RESULTS_DATE,
    reviews: reviews.map(r => ({ file: r.file, sha256: sha256(r.bytes) })), states });
}
export async function loadResultsManifest(path: string): Promise<{ manifest: ResultsManifest; manifestSha256: string }> {
  const bytes = await readFile(path);
  const manifest = resultsManifestSchema.parse(JSON.parse(bytes.toString('utf8')));
  const directory = await realpath(dirname(resolve(path)));
  const reviews: ReviewedBytes[] = [];
  for (const review of manifest.reviews) {
    if (isAbsolute(review.file) || review.file.includes('\\')) throw new OfficialResultsError('Review paths must be relative');
    const actual = await realpath(resolve(directory, review.file));
    const rel = relative(directory, actual);
    if (rel.startsWith('..') || isAbsolute(rel)) throw new OfficialResultsError('Review path escapes manifest directory');
    const proof = await readFile(actual);
    if (sha256(proof) !== review.sha256) throw new OfficialResultsError('Source review bytes changed');
    reviews.push({ file: review.file, bytes: proof });
  }
  if (canonical(manifestFromReviews(reviews)) !== canonical(manifest)) throw new OfficialResultsError('Manifest differs from reviewed source facts');
  return { manifest, manifestSha256: sha256(bytes) };
}
export function sourceForElection(entry: ResultsManifestEntry, electionType: string): OfficialResultsSource {
  const type = electionType.trim().toLowerCase();
  const electionPhase = type === 'general' ? 'general' : type.includes('primary') ? 'primary' : type.includes('runoff') ? 'runoff' : 'other';
  return officialResultsSourceSchema.parse({ ...entry.source, electionPhase,
    ...(electionPhase === 'general' ? {} : { status: 'unknown', availabilityReason: 'unknown_election_phase' }) });
}
