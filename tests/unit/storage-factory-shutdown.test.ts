import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../server/mem-storage', () => ({ MemStorage: class {} }));
vi.mock('../../server/db', () => ({ testDatabaseConnection: async () => ({ success: false, error: 'synthetic unavailable' }), connectWithRetry: vi.fn() }));
import { StorageFactory, storageFactory } from '../../server/storage-factory';

function deferred() {
  let resolve!: () => void;
  return { promise: new Promise<void>(r => { resolve = r; }), resolve: () => resolve() };
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe('storage factory background shutdown', () => {
  it('waits for async health startup and prevents its timer from appearing after shutdown', async () => {
    await storageFactory.destroy();
    vi.useFakeTimers();
    const work = deferred();
    const health = vi.spyOn(StorageFactory.prototype as any, 'checkDatabaseHealth').mockReturnValue(work.promise);
    vi.spyOn(StorageFactory.prototype as any, 'checkReplicaHealth').mockResolvedValue(undefined);
    const factory = new StorageFactory();
    await Promise.resolve();
    let stopped = false;
    const stop = factory.destroy().then(() => { stopped = true; });
    await Promise.resolve();
    expect(stopped).toBe(false);
    work.resolve();
    await stop;
    await vi.advanceTimersByTimeAsync(100000);
    expect(health).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears health/queue timers and awaits an admitted queue operation', async () => {
    vi.useFakeTimers();
    const work = deferred();
    const health = vi.spyOn(StorageFactory.prototype as any, 'checkDatabaseHealth').mockResolvedValue(undefined);
    vi.spyOn(StorageFactory.prototype as any, 'checkReplicaHealth').mockResolvedValue(undefined);
    const queue = vi.spyOn(StorageFactory.prototype as any, 'processWriteQueue').mockReturnValue(work.promise);
    const factory = new StorageFactory();
    (factory as any).isDatabaseHealthy = true;
    (factory as any).writeQueue = [{}];
    await vi.advanceTimersByTimeAsync(5000);
    expect(queue).toHaveBeenCalledTimes(1);
    let stopped = false;
    const stop = factory.destroy().then(() => { stopped = true; });
    await Promise.resolve();
    expect(stopped).toBe(false);
    work.resolve();
    await stop;
    await vi.advanceTimersByTimeAsync(100000);
    expect(queue).toHaveBeenCalledTimes(1);
    expect(health).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
