/**
 * Bounded, cancellable, de-duplicated upstream access for enrichment providers.
 *
 * ET-5 concurrency findings (Astra 2026-10-12, Sol retake of 83138cc):
 *  1. A request path must never wait on an unreachable provider -> deadline + body cap.
 *  2. When the caller's budget expires, the provider request must actually stop: the
 *     caller's AbortSignal is LINKED to the transport signal (previously overwritten).
 *  3. 120 concurrent HTTP requests for the same races fanned out into 450 identical
 *     provider requests -> identical in-flight GETs are shared (single-flight) and only
 *     cancelled when every subscriber has gone away.
 *  4. upstreamInFlight() exposes the number of provider requests still open so a
 *     receiving test can assert they settle to zero after the HTTP response.
 */

export type FetchLike = (url: string, init?: any) => Promise<any>;

const envInt = (name: string, fallback: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

export const UPSTREAM_DEFAULTS = Object.freeze({
  /** Per-call ceiling for a single provider request (headers + body). */
  timeoutMs: envInt('UPSTREAM_FETCH_TIMEOUT_MS', 4_000),
  /** Largest body any provider may hand us on a request path. */
  maxBodyBytes: envInt('UPSTREAM_FETCH_MAX_BYTES', 5_000_000),
  /** Whole-enrichment ceiling per candidate (all providers together). */
  enrichmentBudgetMs: envInt('ENRICHMENT_BUDGET_MS', 3_500),
});

let fetchImpl: FetchLike = (globalThis as any).fetch;

/** Test hook: swap the transport (hanging, slow, oversized) without touching the network. */
export function setUpstreamFetch(fn: FetchLike | null): void {
  fetchImpl = fn ?? (globalThis as any).fetch;
}

export class UpstreamTimeoutError extends Error {
  constructor(public readonly label: string, public readonly ms: number) {
    super(`${label}: no response within ${ms} ms`);
    this.name = 'UpstreamTimeoutError';
  }
}

export class UpstreamAbortedError extends Error {
  constructor(public readonly label: string) {
    super(`${label}: cancelled by caller`);
    this.name = 'UpstreamAbortedError';
  }
}

export interface BoundedResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<any>;
}

interface InFlight {
  key: string;
  label: string;
  controller: AbortController;
  timer: NodeJS.Timeout;
  timedOut: boolean;
  headers: Promise<any>;
  body: Promise<string> | null;
  subscribers: number;
  settled: boolean;
}

const inflight = new Map<string, InFlight>();
const active = new Set<InFlight>();

/** Number of provider requests whose transport has not yet settled (headers+body or error). */
export function upstreamInFlight(): number {
  return active.size;
}

function settle(entry: InFlight): void {
  if (entry.settled) return;
  entry.settled = true;
  clearTimeout(entry.timer);
  active.delete(entry);
  if (inflight.get(entry.key) === entry) inflight.delete(entry.key);
}

function stableKey(method: string, url: string, init: Record<string, any>): string {
  const headers = init.headers ? JSON.stringify(Object.entries(init.headers).sort()) : '';
  return `${method} ${url} ${headers}`;
}

/**
 * fetch with: an AbortController deadline, a body-size cap, linkage to the caller's
 * signal (init.signal / opts.signal), and single-flight sharing of identical GET/HEAD
 * requests. Rejects with UpstreamTimeoutError on deadline, UpstreamAbortedError when the
 * caller cancelled.
 */
export async function boundedUpstreamFetch(
  url: string,
  init: Record<string, any> = {},
  opts: { timeoutMs?: number; maxBodyBytes?: number; label?: string; signal?: AbortSignal } = {},
): Promise<BoundedResponse> {
  const timeoutMs = opts.timeoutMs ?? UPSTREAM_DEFAULTS.timeoutMs;
  const maxBodyBytes = opts.maxBodyBytes ?? UPSTREAM_DEFAULTS.maxBodyBytes;
  const label = opts.label ?? new URL(url).host;
  const callerSignal: AbortSignal | undefined = opts.signal ?? init.signal;
  if (callerSignal?.aborted) throw new UpstreamAbortedError(label);

  const method = String(init.method ?? 'GET').toUpperCase();
  const shareable = method === 'GET' || method === 'HEAD';
  const key = stableKey(method, url, init);

  let entry = shareable ? inflight.get(key) : undefined;
  if (!entry) {
    const controller = new AbortController();
    const created: InFlight = {
      key, label, controller, timedOut: false, body: null, subscribers: 0, settled: false,
      // The deadline also settles the entry: a body nobody ever reads cannot stay "active".
      timer: setTimeout(() => { created.timedOut = true; controller.abort(); settle(created); }, timeoutMs),
      headers: Promise.resolve().then(() => fetchImpl(url, { ...init, signal: controller.signal })),
    };
    created.headers.catch(() => settle(created));
    entry = created;
    active.add(entry);
    if (shareable) inflight.set(key, entry);
  }
  const shared = entry;
  shared.subscribers++;

  // One subscriber leaving does not cancel a shared request; the last one does.
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    callerSignal?.removeEventListener('abort', onCallerAbort);
    shared.subscribers--;
    if (shared.subscribers <= 0 && !shared.settled) { shared.controller.abort(); settle(shared); }
  };
  const callerAbort = new Promise<never>((_, reject) => {
    (callerSignal ?? new AbortController().signal).addEventListener('abort', () => reject(new UpstreamAbortedError(label)), { once: true });
  });
  callerAbort.catch(() => {});
  function onCallerAbort() { release(); }
  callerSignal?.addEventListener('abort', onCallerAbort, { once: true });

  const deadline = new Promise<never>((_, reject) => {
    shared.controller.signal.addEventListener('abort', () => reject(shared.timedOut ? new UpstreamTimeoutError(label, timeoutMs) : new UpstreamAbortedError(label)), { once: true });
  });
  deadline.catch(() => {});

  const readBody = async (response: any): Promise<string> => {
    const declared = Number(response.headers?.get?.('content-length') ?? 0);
    if (declared > maxBodyBytes) throw new Error(`${label}: body ${declared} bytes exceeds ${maxBodyBytes}`);
    const body = response.body;
    if (body && typeof body[Symbol.asyncIterator] === 'function') {
      const chunks: Buffer[] = []; let received = 0;
      for await (const chunk of body as AsyncIterable<Uint8Array>) {
        received += chunk.byteLength;
        if (received > maxBodyBytes) throw new Error(`${label}: body exceeds ${maxBodyBytes} bytes`);
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks).toString('utf8');
    }
    const text = await response.text();
    if (Buffer.byteLength(text) > maxBodyBytes) throw new Error(`${label}: body exceeds ${maxBodyBytes} bytes`);
    return text;
  };

  try {
    const response: any = await Promise.race([shared.headers, deadline, callerAbort]);
    const text = () => {
      shared.body ??= readBody(response).then((t) => { settle(shared); return t; }, (e) => { settle(shared); throw e; });
      return Promise.race([shared.body, deadline, callerAbort]).finally(release);
    };
    return {
      ok: !!response.ok,
      status: Number(response.status ?? 0),
      text,
      json: async () => JSON.parse(await text()),
    };
  } catch (error) {
    // A caller leaving only releases its subscription; release() settles the shared
    // request when the last subscriber is gone. Transport/deadline failures have
    // already settled it via the headers catch above.
    release();
    if (shared.controller.signal.aborted) settle(shared);
    throw error;
  }
}

/**
 * Run best-effort work under a ceiling. On deadline or error the fallback is returned
 * and the work is told to stop via the signal (which boundedUpstreamFetch now honours);
 * it never throws.
 */
export async function withBudget<T>(label: string, ms: number, work: (signal: AbortSignal) => Promise<T>, fallback: T): Promise<T> {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<T>((resolve) => {
    timer = setTimeout(() => { controller.abort(); resolve(fallback); }, ms);
  });
  try {
    return await Promise.race([
      work(controller.signal).catch((error) => {
        if (!(error instanceof UpstreamTimeoutError) && !(error instanceof UpstreamAbortedError)) {
          console.warn(`${label}: enrichment failed, serving local data:`, error instanceof Error ? error.message : String(error));
        }
        return fallback;
      }),
      deadline,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Small in-process memo with TTL and a shorter negative TTL, for shared upstream files. */
export function memoize<T>(ttlMs: number, negativeTtlMs: number, loader: () => Promise<T | null>) {
  let value: Promise<T | null> | null = null;
  let expires = 0;
  let pending = false;
  return {
    get(): Promise<T | null> {
      const now = Date.now();
      if (value && (pending || now < expires)) return value;
      pending = true;
      const attempt = loader().then(
        (v) => { pending = false; expires = Date.now() + (v == null ? negativeTtlMs : ttlMs); return v; },
        (e) => { pending = false; expires = Date.now() + negativeTtlMs; console.warn('upstream memo load failed:', e instanceof Error ? e.message : String(e)); return null; },
      );
      value = attempt;
      return attempt;
    },
    reset() { value = null; expires = 0; pending = false; },
  };
}
