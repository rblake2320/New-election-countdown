// HTTP failures that keep their status, so pages can tell "does not exist"
// (404) from "busy" (429) and "broken" (5xx, network) instead of collapsing all
// of them into "Not Found".

export class HttpError extends Error {
  constructor(public status: number, public retryAfterSec: number | null, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.name = "HttpError";
  }
}

export async function httpErrorFrom(res: Response): Promise<HttpError> {
  const ra = res.headers.get("retry-after");
  const sec = ra && /^\d+$/.test(ra.trim()) ? Number(ra) : null;
  return new HttpError(res.status, sec);
}

/** 429, 5xx and network failures (status 0) are worth retrying; 4xx are not. */
export function isRetryable(err: unknown): boolean {
  if (!(err instanceof HttpError)) return true; // fetch threw: network failure
  return err.status === 429 || err.status >= 500 || err.status === 0;
}

/** Retry-After when the server sends it (capped), else 1 s, 2 s, 4 s. */
export function retryDelayMs(attempt: number, err: unknown): number {
  if (err instanceof HttpError && err.retryAfterSec != null) return Math.min(err.retryAfterSec, 30) * 1000;
  return Math.min(1000 * 2 ** attempt, 8000);
}

export const MAX_RETRIES = 3;
