import { createServer, get } from 'node:http';
import { once } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { createGracefulShutdown } from '../../server/graceful-shutdown';

describe('graceful shutdown', () => {
  it('waits for accepted background work before retiring the database', async () => {
    const server = createServer().listen(0, '127.0.0.1');
    await once(server, 'listening');
    let finishBackground!: () => void;
    const background = new Promise<void>(resolve => { finishBackground = resolve; });
    const closeDatabase = vi.fn(async () => {}); const exit = vi.fn();
    const pending = createGracefulShutdown({ server, stopBackground: () => background, closeDatabase, exit, log: vi.fn() }).shutdown();
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(closeDatabase).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
    finishBackground(); await pending;
    expect(closeDatabase).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
  });
  it('finishes an admitted HTTP response before closing the database, once', async () => {
    let release!: () => void;
    let admitted!: () => void;
    const started = new Promise<void>(resolve => { admitted = resolve; });
    const order: string[] = [];
    const server = createServer((_req, res) => {
      release = () => { order.push('response'); res.end('completed'); };
      admitted();
    }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const port = (server.address() as { port: number }).port;
    const response = new Promise<string>((resolve, reject) => {
      get(`http://127.0.0.1:${port}/`, res => {
        let text = ''; res.on('data', c => { text += c; });
        res.on('end', () => resolve(text));
      }).on('error', reject);
    });
    await started;
    const stop = vi.fn(() => { order.push('stop'); });
    const closeDatabase = vi.fn(async () => { order.push('database'); });
    const exit = vi.fn();
    const lifecycle = createGracefulShutdown({ server, stopBackground: stop, closeDatabase, exit, log: vi.fn() });
    const first = lifecycle.shutdown();
    expect(lifecycle.shutdown()).toBe(first);
    expect(server.listening).toBe(false);
    expect(closeDatabase).not.toHaveBeenCalled();
    release();
    expect(await response).toBe('completed');
    await first;
    expect(order.indexOf('database')).toBeGreaterThan(order.indexOf('response'));
    expect(stop).toHaveBeenCalledTimes(1);
    expect(closeDatabase).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('reports cleanup failure without forwarding internal error text', async () => {
    const server = createServer().listen(0, '127.0.0.1');
    await once(server, 'listening');
    const exit = vi.fn(); const log = vi.fn();
    await createGracefulShutdown({ server, stopBackground: () => {}, closeDatabase: async () => { throw Error('internal detail'); }, exit, log }).shutdown();
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(log).toHaveBeenCalledExactlyOnceWith('Shutdown incomplete');
  });

  it('bounds an unfinished cleanup and never reports success', async () => {
    const server = createServer().listen(0, '127.0.0.1');
    await once(server, 'listening');
    const exit = vi.fn(); const log = vi.fn();
    const exited = new Promise<void>(resolve => {
      createGracefulShutdown({ server, stopBackground: () => {}, closeDatabase: () => new Promise(() => {}), exit: code => { exit(code); resolve(); }, log, timeoutMs: 30 }).shutdown();
    });
    await exited;
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(log).toHaveBeenCalledExactlyOnceWith('Shutdown incomplete');
  });
});
