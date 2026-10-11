import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FirecrawlService } from '../server/firecrawl-service';
import { isFulfilledPollingScrape, PollingDataService } from '../server/polling-data-service';

type Scrape = NonNullable<Awaited<ReturnType<FirecrawlService['scrapeUrl']>>>;
const fixture = (scrapedAt: Date, pollDate: string): Scrape => ({
  source: 'OFFLINE_UNIT_FIXTURE', title: 'Offline polling contract fixture',
  description: 'Synthetic test content, never a real polling source',
  content: `Fixture Candidate 42% ${pollDate} sample 1000 margin of error 3`,
  scrapedAt, metadata: {},
});
const mock = vi.hoisted(() => ({
  scrapeUrl: vi.fn<(url: string) => Promise<Scrape | null>>(),
  enabled: true,
}));
vi.mock('../server/firecrawl-service', () => ({
  getFirecrawlService: () => mock.enabled ? { scrapeUrl: mock.scrapeUrl } : null,
}));

describe('polling scrape availability is a boolean, not an invented age policy', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-11T12:00:00Z'));
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Live provider access blocked in offline acceptance'); }));
    mock.enabled = true; mock.scrapeUrl.mockReset();
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('null and rejected provider results are false', () => {
    expect(isFulfilledPollingScrape({ status: 'fulfilled', value: null })).toBe(false);
    expect(isFulfilledPollingScrape({ status: 'rejected', reason: new Error('offline refusal') })).toBe(false);
  });
  it('fresh fulfilled content is exactly true', () => {
    const result = isFulfilledPollingScrape({ status: 'fulfilled', value: fixture(new Date(), '2026-10-10') });
    expect(result).toBe(true); expect(typeof result).toBe('boolean');
  });
  it('older fulfilled content is exactly true and retains its original dates', () => {
    const source = fixture(new Date('2026-09-01T12:00:00Z'), '2026-09-01');
    expect(isFulfilledPollingScrape({ status: 'fulfilled', value: source })).toBe(true);
    expect(source.scrapedAt.toISOString()).toBe('2026-09-01T12:00:00.000Z');
  });
  it('an unavailable scraper preserves the public null polling result', async () => {
    mock.enabled = false;
    expect(await new PollingDataService().getElectionPolling(101, ['Fixture Candidate'])).toBeNull();
    expect(mock.scrapeUrl).not.toHaveBeenCalled();
  });
  it('null/rejected generic sources produce null, not an empty successful polling object', async () => {
    mock.scrapeUrl.mockImplementation(async url => {
      if (url.startsWith('https://www.politico.com')) throw new Error('offline source refusal');
      return null;
    });
    expect(await new PollingDataService().getElectionPolling(101, ['Fixture Candidate'])).toBeNull();
  });
  it('a dated provider fixture survives unavailable sources without rewriting the poll date', async () => {
    mock.scrapeUrl.mockImplementation(async url => {
      if (url.startsWith('https://ballotpedia.org')) return fixture(new Date(), '2026-09-01');
      if (url.startsWith('https://www.politico.com')) throw new Error('offline source refusal');
      return null;
    });
    const result = await new PollingDataService().getElectionPolling(101, ['Fixture Candidate']);
    expect(mock.scrapeUrl).toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result?.polls.length).toBeGreaterThan(0);
    expect(result?.polls.every(poll => poll.date === '2026-09-01')).toBe(true);
    expect(result?.averages[0]?.averagePercentage).toBe(42);
  });
});
