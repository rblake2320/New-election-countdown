import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { z } from 'zod';
import { OfficialResultsError } from './official-results-error';
import { httpsResultsUrl, officialResultsSourceSchema, publishedResultsReceiptSchema,
  resultsPublicationEvidenceSchema, type OfficialResultsSource } from '../shared/official-results';

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
export interface ReviewedBytes { file: string; bytes: Buffer; publicationReceipts?: Map<string, Buffer> }

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
      const publicationStatus = record.publicationStatus ?? record.generalPublicationStatus;
      if (record.publicationStatus && record.generalPublicationStatus && record.publicationStatus !== record.generalPublicationStatus) {
        throw new OfficialResultsError('Conflicting publication classifications');
      }
      const published = publicationStatus === 'published_for_target_election';
      const publicationEvidence = published ? resultsPublicationEvidenceSchema.parse(record.publicationEvidence) : undefined;
      const destination = verified ? (published ? httpsResultsUrl.parse(record.recommendedUrl) : governmentUrl(record.recommendedUrl)) : null;
      if (published) {
        if (!verified || record.routeType !== 'election_specific_results' || publicationEvidence!.destinationUrl !== destination) {
          throw new OfficialResultsError('Positive publication requires the exact verified receiving destination');
        }
        const files = record.publicationReceipts;
        const contextBytes = review.publicationReceipts?.get(files?.officialContext);
        const receivingBytes = review.publicationReceipts?.get(files?.receiving);
        if (!contextBytes || !receivingBytes || sha256(contextBytes) !== publicationEvidence!.officialContextReceiptSha256 ||
            sha256(receivingBytes) !== publicationEvidence!.receivingReceiptSha256) {
          throw new OfficialResultsError('Missing or changed retained positive publication receipts');
        }
        const context = publishedResultsReceiptSchema.parse(JSON.parse(contextBytes.toString('utf8')));
        const receiving = publishedResultsReceiptSchema.parse(JSON.parse(receivingBytes.toString('utf8')));
        if (publicationEvidence!.state !== record.state || [context, receiving].some(receipt => receipt.state !== record.state || receipt.electionDate !== RESULTS_DATE ||
            receipt.electionPhase !== publicationEvidence!.electionPhase || receipt.destinationUrl !== destination) ||
            context.sourceUrl !== record.officialGovernmentPage || context.observedElectionLabel !== publicationEvidence!.officialElectionLabel ||
            receiving.sourceUrl !== destination || receiving.checkedAt !== publicationEvidence!.receivingCheckedAt) {
          throw new OfficialResultsError('Publication receipt date, phase, official context or destination mismatch');
        }
        // Off-government providers require the exact observed government link;
        // neither an advertised selector nor an invented corrected href suffices.
        try { governmentUrl(destination); }
        catch {
          if (record.governmentDelegation?.kind !== 'observed_government_link' ||
              record.governmentDelegation.sourceUrl !== record.officialGovernmentPage ||
              record.governmentDelegation.observedHref !== destination) {
            throw new OfficialResultsError('Specific provider lacks exact government delegation');
          }
        }
      }
      const source: OfficialResultsSource = officialResultsSourceSchema.parse({
        targetElectionDate: RESULTS_DATE, electionPhase: publicationEvidence?.electionPhase ?? 'general',
        routeType: record.routeType, publisher: record.publisher,
        checkedAt: publicationEvidence?.receivingCheckedAt ?? record.verification.checkedAt,
        routeVerification: verified ? 'worked' : 'blocked',
        status: published ? 'published' : verified && publicationStatus === 'not_linked_in_checked_official_sources' ? 'not_linked' : 'unknown',
        availabilityReason: publicationStatus,
        governmentUrl: governmentUrl(record.officialGovernmentPage),
        fallbackUrl: record.fallbackGovernmentUrl === null ? null : governmentUrl(record.fallbackGovernmentUrl),
        advertisedGeneralUrl: record.nov3GeneralSpecificUrl === null ? null :
          published && record.nov3GeneralSpecificUrl === destination ? destination : governmentUrl(record.nov3GeneralSpecificUrl),
        documentSha256: record.verification.originalResponseSha256,
        sourceReviewSha256: sha256(review.bytes),
        ...(publicationEvidence ? { publicationEvidence } : {}),
      });
      states.push(entrySchema.parse({ state: record.state,
        officialResultsUrl: destination, source }));
    }
  }
  states.sort((a, b) => a.state.localeCompare(b.state));
  return resultsManifestSchema.parse({ version: 1, targetElectionDate: RESULTS_DATE,
    reviews: reviews.map(r => ({ file: r.file, sha256: sha256(r.bytes) })), states });
}
async function guardedRead(directory: string, file: string): Promise<Buffer> {
  if (isAbsolute(file) || file.includes('\\')) throw new OfficialResultsError('Review paths must be relative');
  const actual = await realpath(resolve(directory, file));
  const rel = relative(directory, actual);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new OfficialResultsError('Review path escapes manifest directory');
  return readFile(actual);
}
export async function readResultsReview(directory: string, file: string): Promise<ReviewedBytes> {
  directory = await realpath(directory);
  const bytes = await guardedRead(directory, file);
  const publicationReceipts = new Map<string, Buffer>();
  for (const record of JSON.parse(bytes.toString('utf8')).records ?? []) {
    if ((record.publicationStatus ?? record.generalPublicationStatus) !== 'published_for_target_election') continue;
    for (const receipt of [record.publicationReceipts?.officialContext, record.publicationReceipts?.receiving]) {
      if (typeof receipt !== 'string') throw new OfficialResultsError('Retained positive publication receipt path required');
      publicationReceipts.set(receipt, await guardedRead(directory, receipt));
    }
  }
  return { file, bytes, publicationReceipts };
}
export async function loadResultsManifest(path: string): Promise<{ manifest: ResultsManifest; manifestSha256: string }> {
  const bytes = await readFile(path);
  const manifest = resultsManifestSchema.parse(JSON.parse(bytes.toString('utf8')));
  const directory = await realpath(dirname(resolve(path)));
  const reviews: ReviewedBytes[] = [];
  for (const review of manifest.reviews) {
    const proof = await readResultsReview(directory, review.file);
    if (sha256(proof.bytes) !== review.sha256) throw new OfficialResultsError('Source review bytes changed');
    reviews.push(proof);
  }
  if (canonical(manifestFromReviews(reviews)) !== canonical(manifest)) throw new OfficialResultsError('Manifest differs from reviewed source facts');
  return { manifest, manifestSha256: sha256(bytes) };
}
export function sourceForElection(entry: ResultsManifestEntry, electionType: string): OfficialResultsSource {
  const type = electionType.trim().toLowerCase();
  const electionPhase = type === 'general' ? 'general' : type.includes('primary') ? 'primary' : type.includes('runoff') ? 'runoff' : 'other';
  if (entry.source.status === 'published') {
    if (entry.source.electionPhase !== electionPhase) throw new OfficialResultsError('Specific results source cannot serve a different election phase');
    return officialResultsSourceSchema.parse(entry.source);
  }
  return officialResultsSourceSchema.parse({ ...entry.source, electionPhase,
    ...(electionPhase === 'general' ? {} : { status: 'unknown', availabilityReason: 'unknown_election_phase' }) });
}
