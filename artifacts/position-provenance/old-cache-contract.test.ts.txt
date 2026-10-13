import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { CacheService, cacheService } from '../server/cache-service';
import { PositionAggregatorService } from '../server/position-aggregator-service';

interface PortalFixtureRow {
  position: string; detailedStatement: string | null; lastUpdated: Date;
  createdAt: Date; sourceUrl: string | null;
}
const fixture = vi.hoisted(() => {
  const portalRows: PortalFixtureRow[] = [];
  return {
  select: vi.fn(), candidateRows: [{ id: 101, name: 'OFFLINE Fixture Candidate', state: 'ZZ' }],
  portalRows,
  from: vi.fn(),
  };
});
vi.mock('../server/db', () => ({ db: { select: fixture.select } }));
vi.mock('node-fetch', () => ({ default: vi.fn(async () => { throw new Error('Live providers are forbidden in offline acceptance'); }) }));

describe('position aggregation uses the real seconds-based cache contract', () => {
  let cache: CacheService;
  beforeAll(() => cacheService.destroy());
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-11T12:00:00Z'));
    cache = cacheService; cache.destroy(); fixture.select.mockReset(); fixture.from.mockReset();
    fixture.candidateRows = [{ id: 101, name: 'OFFLINE Fixture Candidate', state: 'ZZ' }];
    fixture.portalRows = [{ position: 'Offline unit position fixture', detailedStatement: null, lastUpdated: new Date(), createdAt: new Date(), sourceUrl: null }];
    fixture.select.mockImplementation(() => ({ from: fixture.from }));
    fixture.from.mockImplementation(table => {
      const query = { where: () => query, orderBy: () => query, limit: async () => {
        const { getTableName } = await import('drizzle-orm');
        return getTableName(table) === 'candidates' ? fixture.candidateRows : fixture.portalRows;
      } };
      return query;
    });
  });
  afterEach(() => { cache.destroy(); vi.useRealTimers(); });

  it('miss loads fixture rows; hit avoids all database/provider work', async () => {
    const service = new PositionAggregatorService();
    const first = await service.aggregatePositionsForCandidate(101);
    expect(first).toHaveLength(12);
    expect(await cache.get('positions-101')).toEqual(first);
    fixture.select.mockClear();
    expect(await service.aggregatePositionsForCandidate(101)).toEqual(first);
    expect(fixture.select).not.toHaveBeenCalled();
  });
  it('the one-hour TTL is seconds; 59 minutes hits and more than one hour reloads', async () => {
    const service = new PositionAggregatorService();
    const first = await service.aggregatePositionsForCandidate(101);
    fixture.select.mockClear();
    vi.setSystemTime(new Date('2026-10-11T12:59:00Z'));
    expect(await service.aggregatePositionsForCandidate(101)).toEqual(first);
    expect(fixture.select).not.toHaveBeenCalled();
    vi.setSystemTime(new Date('2026-10-11T13:00:00.001Z'));
    await service.aggregatePositionsForCandidate(101);
    expect(fixture.select).toHaveBeenCalled();
  });
  it('an honest empty result is cached and remains empty without re-querying', async () => {
    fixture.portalRows = [];
    const service = new PositionAggregatorService();
    expect(await service.aggregatePositionsForCandidate(101)).toEqual([]);
    fixture.select.mockClear();
    expect(await service.aggregatePositionsForCandidate(101)).toEqual([]);
    expect(fixture.select).not.toHaveBeenCalled();
  });
  it('an unknown candidate fails rather than caching empty success', async () => {
    fixture.candidateRows = [];
    const service = new PositionAggregatorService();
    await expect(service.aggregatePositionsForCandidate(101)).rejects.toThrow('Candidate not found');
    expect(await cache.get('positions-101')).toBeNull();
  });
  it('malformed cached payload fails explicitly without empty fallback or database access', async () => {
    await cache.set('positions-101', { incorrect: 'cached shape' }, 3600);
    await expect(new PositionAggregatorService().aggregatePositionsForCandidate(101)).rejects.toThrow('Invalid cached candidate positions');
    expect(fixture.select).not.toHaveBeenCalled();
  });
  it('cached records for a different candidate are refused', async () => {
    const positions = await new PositionAggregatorService().aggregatePositionsForCandidate(101);
    await cache.set('positions-202', positions, 3600); fixture.select.mockClear();
    await expect(new PositionAggregatorService().aggregatePositionsForCandidate(202)).rejects.toThrow('Invalid cached candidate positions');
    expect(fixture.select).not.toHaveBeenCalled();
  });
});
