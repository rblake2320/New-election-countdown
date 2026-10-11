// Typed loader for endpoints that return a JSON array. A non-2xx status, a body
// that is not JSON, or a body that is not an array is an error, never a list, so
// pages cannot render an error object as data (B35: /api/bills/119 answers 503
// {reason:"missing_api_key"} when no congressional data key is configured).

export class ListLoadError extends Error {
  constructor(message: string, readonly status: number | null, readonly reason: string | null) {
    super(message);
    this.name = "ListLoadError";
  }
}

export async function fetchList<T = unknown>(url: string, signal?: AbortSignal, label = "Data"): Promise<T[]> {
  const res = await fetch(url, { credentials: "include", signal });
  const body: unknown = await res.json().catch(() => undefined);
  if (!res.ok) {
    const reason = body && typeof body === "object" && typeof (body as { reason?: unknown }).reason === "string"
      ? (body as { reason: string }).reason : null;
    throw new ListLoadError(`${label} request failed (${res.status})`, res.status, reason);
  }
  if (body === undefined) throw new ListLoadError(`${label} response was not valid JSON`, res.status, null);
  if (!Array.isArray(body)) throw new ListLoadError(`${label} response was not a list`, res.status, null);
  return body as T[];
}

/** One sentence for the UI: names the missing data source when the server says so. */
export function describeListError(error: unknown, what: string): string {
  if (error instanceof ListLoadError) {
    if (error.reason === "missing_api_key") return `${what} are unavailable: no congressional data source is configured.`;
    if (error.status) return `${what} could not be loaded (${error.status}).`;
  }
  return `${what} could not be loaded.`;
}
