/**
 * Bounded upstream access for enrichment providers (ET-5 concurrency finding, 2026-10-12).
 *
 * Every provider call made on a request path must be cancellable and must have a
 * deadline, otherwise one unreachable host (no egress, DNS black-hole, slow CDN)
 * pins the whole response: Astra's 120-concurrent run saw all 30 ordinary
 * /api/elections/37/candidates requests abort at 15 s because one enrichment fetch
 * never returned. Local data (exact ids, profiles, provenance) is always served;
 * enrichment is best-effort within a budget.
 */

export type FetchLike = (url: string, init?: any) => Promise<any>;

const envInt = (name: string, fallback: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

export const UPSTREAM_DEFAULTS = Object.freeze({
  /** Per-call ceiling for a single provider request. */
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

export interface BoundedResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<any>;
}

/**
 * fetch with an AbortController deadline and a body-size cap. Resolves to a small
 * response wrapper whose body readers enforce the cap; rejects with
 * UpstreamTimeoutError on deadline.
 */
export async function boundedUpstreamFetch(
  url: string,
  init: Record<string, any> = {},
  opts: { timeoutMs?: number; maxBodyBytes?: number; label?: string } = {},
): Promise<BoundedResponse> {
  const timeoutMs = opts.timeoutMs ?? UPSTREAM_DEFAULTS.timeoutMs;
  const maxBodyBytes = opts.maxBodyBytes ?? UPSTREAM_DEFAULTS.maxBodyBytes;
  const label = opts.label ?? new URL(url).host;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const deadline = new Promise<never>((_, reject) => {
    controller.signal.addEventListener('abort', () => reject(new UpstreamTimeoutError(label, timeoutMs)), { once: true });
  });

  const readBody = async (response: any): Promise<string> => {
    const declared = Number(response.headers?.get?.('content-length') ?? 0);
    if (declared > maxBodyBytes) throw new Error(`${label}: body ${declared} bytes exceeds ${maxBodyBytes}`);
    const body = response.body;
    if (body && typeof body[Symbol.asyncIterator] === 'function') {
      const chunks: Buffer[] = []; let received = 0;
      for await (const chunk of body as AsyncIterable<Uint8Array>) {
        received += chunk.byteLength;
        // Throw without aborting the controller: the abort listener would turn this
        // into a timeout error and win the race below. Leaving the loop drops the stream.
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
    const response: any = await Promise.race([fetchImpl(url, { ...init, signal: controller.signal }), deadline]);
    let cached: Promise<string> | null = null;
    const text = () => (cached ??= Promise.race([readBody(response), deadline]));
    return {
      ok: !!response.ok,
      status: Number(response.status ?? 0),
      text,
      json: async () => JSON.parse(await text()),
    };
  } finally {
    // The timer must outlive the headers: body reads race the same deadline above.
    // Clear it once the deadline can no longer matter (after a tick, when callers
    // have either consumed the body or dropped the response).
    setTimeout(() => clearTimeout(timer), timeoutMs).unref?.();
  }
}

/**
 * Run best-effort work under a ceiling. On deadline or error the fallback is returned
 * and the work is told to stop via the signal; it never throws.
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
        if (!(error instanceof UpstreamTimeoutError)) console.warn(`${label}: enrichment failed, serving local data:`, error instanceof Error ? error.message : String(error));
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
      // One load at a time: concurrent callers share the in-flight promise.
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
