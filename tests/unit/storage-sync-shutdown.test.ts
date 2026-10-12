import { afterEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ sync: vi.fn(), destroy: vi.fn() }));
vi.mock('../../server/db', () => ({ db: {}, pool: {} })); // storage.ts now also builds the results store on the shared pool
vi.mock('../../server/google-civic-service', () => ({ getGoogleCivicService: vi.fn() }));
vi.mock('../../server/congress-bill-service', () => ({ getCongressBillService: vi.fn() }));
vi.mock('../../server/perplexity-service', () => ({ getPerplexityService: vi.fn() }));
vi.mock('../../server/census-service', () => ({ censusService: {} }));
vi.mock('../../server/storage-factory', () => ({ storageFactory: {
  syncElectionsFromGoogleCivic: state.sync,
  destroy: state.destroy,
  getHealthStatus: () => ({ isDatabaseHealthy: true }),
} }));

function deferred() {
  let resolve!: () => void;
  return { promise: new Promise<void>(r => { resolve = r; }), resolve: () => resolve() };
}
afterEach(() => { vi.useRealTimers(); vi.resetModules(); });
describe('periodic storage sync shutdown', () => {
  it('drains both admitted periodic sync and factory cleanup before resolving', async () => {
    vi.useFakeTimers();
    const sync = deferred(); const factory = deferred();
    state.sync.mockReturnValue(sync.promise);
    state.destroy.mockReturnValue(factory.promise);
    const { stopStorageBackground } = await import('../../server/storage');
    await vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1000);
    expect(state.sync).toHaveBeenCalledTimes(1);
    let stopped = false;
    const stop = stopStorageBackground().then(() => { stopped = true; });
    await Promise.resolve();
    expect(stopped).toBe(false);
    factory.resolve();
    await Promise.resolve();
    expect(stopped).toBe(false);
    sync.resolve();
    await stop;
    await vi.advanceTimersByTimeAsync(12 * 60 * 60 * 1000);
    expect(state.sync).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
