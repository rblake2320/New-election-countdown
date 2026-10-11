import type { Server } from 'node:http';

// Stop accepting requests before retiring resources used by admitted requests.
export function createGracefulShutdown(options: {
  server: Server;
  stopBackground: () => void | Promise<void>;
  closeDatabase: () => Promise<void>;
  exit: (code: number) => void;
  log: (message: string) => void;
  timeoutMs?: number;
}) {
  let pending: Promise<void> | undefined;
  let stopping = false;
  const shutdown = () => {
    if (pending) return pending;
    stopping = true;
    pending = (async () => {
      let finished = false;
      const finish = (code: number) => {
        if (finished) return;
        finished = true;
        clearTimeout(deadline);
        options.log(code === 0 ? 'Shutdown complete' : 'Shutdown incomplete');
        options.exit(code);
      };
      const deadline = setTimeout(() => {
        options.server.closeAllConnections();
        finish(1);
      }, options.timeoutMs ?? 8000);
      try {
        const drained = new Promise<void>((resolve, reject) => {
          options.server.close(error => error ? reject(error) : resolve());
        });
        // Always observe both operations, even if one rejects first.
        await Promise.all([drained, Promise.resolve().then(options.stopBackground)]);
        await options.closeDatabase();
        finish(0);
      } catch {
        options.server.closeAllConnections();
        finish(1);
      }
    })();
    return pending;
  };
  return { shutdown, isStopping: () => stopping };
}
