// Client side of the ET-6 v1.2 results contract (C owns the schema in
// shared/live-election-results.ts). Every response is validated before it is
// shown: a body that fails the schema is an error, never rendered as results.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  liveElectionResultsSchema,
  liveResultsBatchSchema,
  type LiveElectionResultsResponse,
  type LiveResultsBatchResponse,
} from "@shared/live-election-results";

export class ResultsLoadError extends Error {
  constructor(message: string, readonly status: number | null, readonly code: string | null) {
    super(message);
    this.name = "ResultsLoadError";
  }
}

async function readError(res: Response, what: string): Promise<ResultsLoadError> {
  const body = await res.json().catch(() => null) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code : null;
  const reason = code === "results_unavailable" ? "results are temporarily unavailable"
    : code === "election_not_found" ? "this election was not found"
    : `the server answered ${res.status}`;
  return new ResultsLoadError(`${what} could not be loaded: ${reason}.`, res.status, code);
}

interface Cached<T> { etag: string | null; data: T }

/** GET with If-None-Match; a 304 keeps the previous validated snapshot. */
async function getValidated<T>(url: string, what: string, validate: (body: unknown) => T, previous: Cached<T> | undefined, signal?: AbortSignal): Promise<Cached<T>> {
  const headers: Record<string, string> = {};
  if (previous?.etag) headers["If-None-Match"] = previous.etag;
  const res = await fetch(url, { credentials: "include", headers, signal });
  if (res.status === 304 && previous) return previous;
  if (!res.ok) throw await readError(res, what);
  const body: unknown = await res.json().catch(() => {
    throw new ResultsLoadError(`${what} could not be loaded: the response was not valid JSON.`, res.status, null);
  });
  return { etag: res.headers.get("ETag"), data: validate(body) };
}

function validator<T>(schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: { issues: { path: (string | number)[]; message: string }[] } } }, what: string) {
  return (body: unknown): T => {
    const parsed = schema.safeParse(body);
    if (parsed.success) return parsed.data;
    const first = parsed.error.issues[0];
    // Shown as an error state; the invalid payload is never rendered.
    throw new ResultsLoadError(`${what} could not be shown: the response failed validation (${first ? `${first.path.join(".") || "body"}: ${first.message}` : "unknown"}).`, 200, "invalid_payload");
  };
}

const validateBatch = validator<LiveResultsBatchResponse>(liveResultsBatchSchema, "Results");
const validateDetail = validator<LiveElectionResultsResponse>(liveElectionResultsSchema, "Results");

export const RESULTS_POLL_MS = 30_000;

/** One poll per election date for every race on that date (agreed batch read). */
export function useLiveResultsBatch(date: string | null, poll: boolean) {
  const qc = useQueryClient();
  const key = ["/api/results", date] as const;
  return useQuery({
    queryKey: key,
    enabled: !!date,
    queryFn: ({ signal }) => getValidated(`/api/results?date=${encodeURIComponent(date!)}`, "Results", validateBatch,
      qc.getQueryData<Cached<LiveResultsBatchResponse>>(key), signal),
    refetchInterval: poll ? RESULTS_POLL_MS : false,
    staleTime: 0,
    retry: false,
  });
}

/** Detail read for one race, including revision history. */
export function useLiveElectionResults(electionId: number, poll: boolean) {
  const qc = useQueryClient();
  // Own key: other screens cache the raw body under ['/api/elections', id, 'results'].
  const key = ["/api/elections", electionId, "results", "v1"] as const;
  return useQuery({
    queryKey: key,
    enabled: electionId > 0,
    queryFn: ({ signal }) => getValidated(`/api/elections/${electionId}/results`, "Results", validateDetail,
      qc.getQueryData<Cached<LiveElectionResultsResponse>>(key), signal),
    refetchInterval: poll ? RESULTS_POLL_MS : false,
    staleTime: 0,
    retry: false,
  });
}

const timeFormat: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" };
export const formatTime = (iso: string) => new Date(iso).toLocaleString(undefined, timeFormat);

/** "As of" in the source's own terms; retrieval time is never passed off as source age. */
export function asOfLabel(r: Pick<LiveElectionResultsResponse, "asOf" | "asOfBasis" | "retrievedAt">): string | null {
  const retrieved = r.retrievedAt ? `retrieved ${formatTime(r.retrievedAt)}` : null;
  if (r.asOf && r.asOfBasis === "source_timestamp") return [`Counts as of ${formatTime(r.asOf)} (source time)`, retrieved].filter(Boolean).join(", ");
  if (r.asOf && r.asOfBasis === "source_publication_time") return [`Published by the source ${formatTime(r.asOf)}`, retrieved].filter(Boolean).join(", ");
  if (retrieved) return `The source gave no time for these counts; ${retrieved}`;
  return null;
}

const BASIS: Record<string, string> = { precincts: "of precincts", ballots: "of expected ballots", votes: "of expected votes", source_unspecified: "(basis not stated by the source)" };

export function reportingLabel(r: Pick<LiveElectionResultsResponse, "reporting">): string {
  const rep = r.reporting;
  if (!rep || rep.percent === null) return "Percent reporting: not stated by the source";
  const precincts = rep.precinctsReporting !== null && rep.precinctsTotal !== null
    ? ` · ${rep.precinctsReporting.toLocaleString()} of ${rep.precinctsTotal.toLocaleString()} precincts` : "";
  return `${rep.percent.toFixed(1)}% reporting ${BASIS[rep.basis] ?? ""}${precincts}`.replace(/\s+/g, " ").trim();
}

export function statusLabel(status: LiveElectionResultsResponse["status"]): string {
  return status === "certified" ? "Certified results" : status === "unofficial" ? "Unofficial results" : "No results reported yet";
}

/** Election dates (YYYY-MM-DD, as stored) for the races on screen. */
export function electionDates(elections: { date: string }[]): string[] {
  return [...new Set(elections.map(e => e.date.slice(0, 10)))].sort();
}
