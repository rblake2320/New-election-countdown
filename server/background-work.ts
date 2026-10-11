// Own scheduled work and its lifetime, including asynchronous startup.
export class BackgroundWork {
  private stopped = false;
  private active = new Set<Promise<void>>();
  private timers = new Set<ReturnType<typeof setInterval>>();

  get isStopped(): boolean { return this.stopped; }
  get hasTimers(): boolean { return this.timers.size > 0; }

  run(work: () => void | Promise<void>): Promise<void> {
    if (this.stopped) return Promise.resolve();
    const task = Promise.resolve().then(work);
    this.active.add(task);
    // Observe settlement without creating an unhandled rejected finally promise.
    void task.then(() => this.active.delete(task), () => this.active.delete(task));
    return task;
  }

  every(intervalMs: number, work: () => void | Promise<void>, onError: () => void): () => void {
    if (this.stopped) return () => {};
    const timer = setInterval(() => { void this.run(work).catch(onError); }, intervalMs);
    this.timers.add(timer);
    return () => { clearInterval(timer); this.timers.delete(timer); };
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.timers.forEach(timer => clearInterval(timer));
    this.timers.clear();
    // allSettled drains every admitted task, even if one fails early.
    const results = await Promise.allSettled(Array.from(this.active));
    if (results.some(result => result.status === 'rejected')) {
      throw new Error('Background work failed during shutdown');
    }
  }
}
