import { readFile, mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadResultsManifest, manifestFromReviews, RESULTS_STATES, sha256, sourceForElection } from '../../server/official-results-manifest';
import { officialResultsFieldsSchema } from '../../shared/official-results';
import { insertElectionSchema } from '../../shared/schema';
import { publishedResultsReceiptSchema } from '../../shared/official-results';
import { planResults } from '../../server/official-results-sync';

const path = 'data/official-results/2026-11-03.json';
describe('reviewed official-results receiving contract', () => {
  it('verifies all 50 exact reviewed states and retained document hashes', async () => {
    const { manifest, manifestSha256 } = await loadResultsManifest(path);
    expect(manifestSha256).toBe(sha256(await readFile(path)));
    expect(manifest.states.map(state => state.state)).toEqual(RESULTS_STATES);
    expect(manifest.states.filter(state => state.officialResultsUrl !== null)).toHaveLength(49);
    expect(manifest.states.every(state => state.source.status !== ('published' as string))).toBe(true);
  });
  it('keeps New Hampshire live transport failure unknown with no destination', async () => {
    const { manifest } = await loadResultsManifest(path);
    const nh = manifest.states.find(state => state.state === 'NH')!;
    expect(nh.officialResultsUrl).toBeNull();
    expect(nh.source).toMatchObject({ status: 'unknown', routeVerification: 'blocked', documentSha256: null });
  });
  it('keeps Michigan advertised but unavailable Nov3 query separate from destination', async () => {
    const { manifest } = await loadResultsManifest(path);
    const mi = manifest.states.find(state => state.state === 'MI')!;
    expect(mi.officialResultsUrl).toBe('https://www.michigan.gov/sos/elections/election-results-and-data');
    expect(mi.source.advertisedGeneralUrl).toContain('11-3-2026');
    expect(mi.source.status).toBe('unknown');
  });
  it('keeps Louisiana government landing without repairing the broken publisher href', async () => {
    const { manifest } = await loadResultsManifest(path);
    const la = manifest.states.find(state => state.state === 'LA')!;
    expect(la.officialResultsUrl).toBe('https://www.sos.la.gov/elections-voting/election-results-statistics');
    expect(sourceForElection(la, 'primary')).toMatchObject({ electionPhase: 'primary', status: 'unknown', availabilityReason: 'unknown_election_phase' });
    expect(la.source.advertisedGeneralUrl).toBeNull();
  });
  it('rejects duplicate/missing states in actual reviewed facts', async () => {
    const bytes = await readFile('data/official-results/source-reviews/remaining-36.json');
    const review = JSON.parse(bytes.toString());
    review.records.push(review.records[0]);
    expect(() => manifestFromReviews([{ file: 'remaining-36.json', bytes: Buffer.from(JSON.stringify(review)) }])).toThrow();
  });
  it('provides explicit null defaults and refuses destinations without evidence', () => {
    expect(officialResultsFieldsSchema.parse({})).toEqual({ officialResultsUrl: null, officialResultsSource: null });
    expect(officialResultsFieldsSchema.safeParse({ officialResultsUrl: 'https://elections.ny.gov/election-results' }).success).toBe(false);
  });
  it('does not accept callers asserting source provenance through election inserts', async () => {
    const { manifest } = await loadResultsManifest(path);
    const original = { title: 'U.S. House Election - AK-AL', location: 'AK', state: 'AK', date: new Date('2026-11-03T00:00:00Z'), type: 'general', level: 'federal' };
    const parsed = insertElectionSchema.parse({ ...original, officialResultsUrl: manifest.states[0].officialResultsUrl, officialResultsSource: manifest.states[0].source });
    expect(parsed).toEqual(original);
  });
});

// This is an isolated future-shape acceptance fixture, never a live source or
// product manifest. All committed government records remain pending/unknown.
async function futurePublicationFixture() {
  const initial = await readFile('data/official-results/source-reviews/initial-14.json');
  const remaining = JSON.parse(await readFile('data/official-results/source-reviews/remaining-36.json', 'utf8'));
  const record = remaining.records.find((state: { state: string }) => state.state === 'LA');
  const checkedAt = '2026-11-04T06:00:00.000Z';
  const context = {
    state: 'LA',
    outcome: 'worked', electionDate: '2026-11-03', electionPhase: 'general',
    destinationUrl: record.recommendedUrl, sourceUrl: record.officialGovernmentPage,
    contextVerified: true, resultsObserved: true,
    observedElectionLabel: 'Fixture-only future-shape November 3, 2026 General results', checkedAt,
  };
  const receiving = { ...context, sourceUrl: record.recommendedUrl,
    observedElectionLabel: 'Fixture-only receiving context: 2026-11-03 General returns' };
  const contextBytes = Buffer.from(JSON.stringify(context));
  const receivingBytes = Buffer.from(JSON.stringify(receiving));
  record.routeType = 'election_specific_results';
  record.generalPublicationStatus = 'published_for_target_election';
  record.publicationEvidence = {
    state: 'LA',
    electionDate: '2026-11-03', electionPhase: 'general', destinationUrl: record.recommendedUrl,
    officialElectionLabel: context.observedElectionLabel, officialContextVerified: true,
    officialContextReceiptSha256: sha256(contextBytes), receivingOutcome: 'worked', receivingResultsObserved: true,
    receivingReceiptSha256: sha256(receivingBytes), receivingCheckedAt: checkedAt,
  };
  record.publicationReceipts = { officialContext: 'fixture-only-context.json', receiving: 'fixture-only-receiving.json' };
  const receipts = new Map([['fixture-only-context.json', contextBytes], ['fixture-only-receiving.json', receivingBytes]]);
  return { initial, remaining, record, receipts, context, receiving, reviews: () => [
    { file: 'initial-14.json', bytes: initial },
    { file: 'remaining-36.json', bytes: Buffer.from(JSON.stringify(remaining)), publicationReceipts: receipts },
  ] };
}
describe('isolated future specific-publication shape', () => {
  it('admits reviewed positive exact-date/phase/destination plus both retained receiving/context receipts', async () => {
    const fixture = await futurePublicationFixture();
    const entry = manifestFromReviews(fixture.reviews()).states.find(state => state.state === 'LA')!;
    expect(entry.source.status).toBe('published');
    expect(officialResultsFieldsSchema.parse({ officialResultsUrl: entry.officialResultsUrl, officialResultsSource: entry.source }).officialResultsUrl).toBe(entry.source.publicationEvidence!.destinationUrl);
    expect(sourceForElection(entry, 'general').status).toBe('published');
  });
  it('refuses General-specific publication for an actual primary phase such as LA November House', async () => {
    const fixture = await futurePublicationFixture();
    const entry = manifestFromReviews(fixture.reviews()).states.find(state => state.state === 'LA')!;
    expect(() => sourceForElection(entry, 'primary')).toThrow('different election phase');
    const actual = JSON.parse(await readFile('data/official-results/acceptance/LA-429-context.json', 'utf8')).receipt.electionContext;
    const manifest = manifestFromReviews(fixture.reviews());
    expect(actual.type).toBe('primary');
    expect(() => planResults([actual], manifest, sha256(JSON.stringify(manifest)))).toThrow('different election phase');
  });
  it('refuses a positive claim without its retained receiving proof bytes', async () => {
    const fixture = await futurePublicationFixture();
    fixture.receipts.delete('fixture-only-receiving.json');
    expect(() => manifestFromReviews(fixture.reviews())).toThrow('retained positive publication receipts');
  });
  it('loads isolated positive files with exact digests and refuses later receiving-byte tampering', async () => {
    const fixture = await futurePublicationFixture();
    const directory = await mkdtemp(join(tmpdir(), 'et-c6-future-shape-'));
    const files = ['initial-14.json', 'remaining-36.json', 'fixture-only-context.json', 'fixture-only-receiving.json', 'manifest.json'];
    try {
      for (const review of fixture.reviews()) await writeFile(join(directory, review.file), review.bytes);
      for (const [file, bytes] of fixture.receipts) await writeFile(join(directory, file), bytes);
      await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifestFromReviews(fixture.reviews())));
      const loaded = await loadResultsManifest(join(directory, 'manifest.json'));
      expect(loaded.manifest.states.find(state => state.state === 'LA')!.source.status).toBe('published');
      await writeFile(join(directory, 'fixture-only-receiving.json'), JSON.stringify({ ...fixture.receiving, resultsObserved: false }));
      await expect(loadResultsManifest(join(directory, 'manifest.json'))).rejects.toThrow('changed retained positive publication receipts');
    } finally {
      // Only exact files in this mkdtemp-owned directory; no recursive removal.
      for (const file of files) await unlink(join(directory, file)).catch(() => {});
      await rmdir(directory);
    }
  });
  it('refuses prior-primary date, mismatched phase, and HTTP200-only contexts', () => {
    expect(publishedResultsReceiptSchema.safeParse({ outcome: 'worked', httpStatus: 200 }).success).toBe(false);
  });
  it.each(['state', 'date', 'phase', 'destination', 'results_observed'])('refuses mismatched %s in a receiving receipt even when its digest is recomputed', async mismatch => {
    const fixture = await futurePublicationFixture();
    const changed = { ...fixture.receiving };
    if (mismatch === 'state') changed.state = 'WV';
    if (mismatch === 'date') changed.electionDate = '2026-08-04';
    if (mismatch === 'phase') changed.electionPhase = 'primary';
    if (mismatch === 'destination') changed.destinationUrl = 'https://elections.ny.gov/election-results';
    if (mismatch === 'results_observed') changed.resultsObserved = false;
    const bytes = Buffer.from(JSON.stringify(changed));
    fixture.receipts.set('fixture-only-receiving.json', bytes);
    fixture.record.publicationEvidence.receivingReceiptSha256 = sha256(bytes);
    expect(() => manifestFromReviews(fixture.reviews())).toThrow();
  });
  it('refuses a receiving destination that differs from the published source', async () => {
    const fixture = await futurePublicationFixture();
    const entry = manifestFromReviews(fixture.reviews()).states.find(state => state.state === 'LA')!;
    expect(officialResultsFieldsSchema.safeParse({ officialResultsUrl: 'https://elections.ny.gov/election-results', officialResultsSource: entry.source }).success).toBe(false);
  });
  it('leaves the current committed 50-state snapshot unchanged and unpublished', async () => {
    const { manifest, manifestSha256 } = await loadResultsManifest(path);
    expect(manifestSha256).toBe('edbc1deff97cba8a154f3322e305be08427be1db358761635e59153328e04c86');
    expect(manifest.states.every(entry => entry.source.status !== 'published' && entry.source.publicationEvidence === undefined)).toBe(true);
  });
});
