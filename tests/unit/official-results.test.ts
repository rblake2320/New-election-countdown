import { readFile } from 'node:fs/promises';
import { describe, it, expect } from 'vitest';
import { loadResultsManifest, manifestFromReviews, RESULTS_STATES, sha256, sourceForElection } from '../../server/official-results-manifest';
import { officialResultsFieldsSchema } from '../../shared/official-results';
import { insertElectionSchema } from '../../shared/schema';

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
