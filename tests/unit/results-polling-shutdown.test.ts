import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../server/storage', () => ({ storage: {} }));
import { ResultsIngestionService } from '../../server/results-ingestion-service';

function deferred() {
  let resolve!: () => void;
  return { promise: new Promise<void>(r => { resolve = r; }), resolve: () => resolve() };
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe('results polling shutdown', () => {
  it('drains initial ingestion and does not create a timer after a concurrent stop', async () => {
    vi.useFakeTimers();
    const service = new ResultsIngestionService();
    const work = deferred();
    const ingest = vi.spyOn(service, 'ingestResults').mockReturnValue(work.promise);
    const start = service.startPolling(1);
    await Promise.resolve();
    expect(service.getStatus().pollingActive).toBe(false);
    let stopped = false;
    const stop = service.stopPolling().then(() => { stopped = true; });
    await Promise.resolve();
    expect(stopped).toBe(false);
    work.resolve();
    await Promise.all([start, stop]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(ingest).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('drains an admitted recurring poll and permits an explicit later restart', async () => {
    vi.useFakeTimers();
    const service = new ResultsIngestionService();
    const work = deferred();
    const ingest = vi.spyOn(service, 'ingestResults').mockResolvedValueOnce(undefined).mockReturnValueOnce(work.promise).mockResolvedValue(undefined);
    await service.startPolling(1);
    expect(service.getStatus().pollingActive).toBe(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(ingest).toHaveBeenCalledTimes(2);
    let stopped = false;
    const stop = service.stopPolling().then(() => { stopped = true; });
    await Promise.resolve();
    expect(stopped).toBe(false);
    work.resolve();
    await stop;
    expect(service.getStatus().pollingActive).toBe(false);
    await vi.advanceTimersByTimeAsync(5000);
    expect(ingest).toHaveBeenCalledTimes(2);
    await service.startPolling(1);
    expect(ingest).toHaveBeenCalledTimes(3);
    await service.stopPolling();
    expect(vi.getTimerCount()).toBe(0);
  });
});
