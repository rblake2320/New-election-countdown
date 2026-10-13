import { describe, it, expect, vi } from 'vitest';

const published = {
  id: 7, title: 'U.S. Senate Election - Alaska', state: 'AK', date: new Date('2026-11-03T06:00:00Z'), type: 'general', level: 'federal',
  officialResultsUrl: 'https://www.elections.alaska.gov/results/26GENR/',
  officialResultsSource: { publisher: 'ak-doe', routeType: 'election_specific_results', governmentUrl: 'https://www.elections.alaska.gov/results/26GENR/', routeVerification: 'worked', status: 'published' },
};
const draft = { ...published, id: 8, title: 'Draft race', officialResultsSource: { ...published.officialResultsSource, status: 'draft' } };

vi.mock('../../server/storage', () => ({ storage: { getElections: vi.fn(async () => [published, draft]) } }));

import { ResultsIngestionService, type AdapterElection } from '../../server/results-ingestion-service';

describe('ET-6 ingestion hands adapters the authoritative race context (C ask 2026-10-13)', () => {
  it('passes id/state/date AND type/level/title from the election row; worked-route manifests are offered before publication', async () => {
    const svc = new ResultsIngestionService();
    const seen: AdapterElection[] = [];
    svc.registerAdapter('ak-doe', async (e) => { seen.push(e); return null; });
    const outcomes = await svc.ingestResults();
    // v1.3: a worked route is admitted BEFORE publication, so the draft race is offered too and reports not_published
    expect(seen.map((e) => e.id)).toEqual([7, 8]);
    expect(seen[0]).toMatchObject({ id: 7, state: 'AK', type: 'general', level: 'federal', title: 'U.S. Senate Election - Alaska' });
    expect(seen[0].date).toEqual(published.date);
    expect(outcomes).toEqual([
      { electionId: 7, outcome: 'not_published', sourceId: 'ak-doe', publication: 'published' },
      { electionId: 8, outcome: 'not_published', sourceId: 'ak-doe', publication: 'draft' },
    ]);
  });
});
