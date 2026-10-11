// Keep a signed-out visitor's intent across sign-in: where to come back to,
// and which election they were trying to watch.

const PENDING_WATCH_KEY = "pending-watch-election";

/** Only same-origin app paths; anything else (//evil.com, https://...) falls back. */
export function safeReturnTo(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}

export function signInUrl(returnTo: string): string {
  return `/auth?returnTo=${encodeURIComponent(safeReturnTo(returnTo, "/"))}`;
}

export function rememberPendingWatch(electionId: number) {
  try { sessionStorage.setItem(PENDING_WATCH_KEY, String(electionId)); } catch { /* storage blocked */ }
}

/** Returns and clears the pending election id if it matches. */
export function takePendingWatch(electionId: number): boolean {
  try {
    if (sessionStorage.getItem(PENDING_WATCH_KEY) !== String(electionId)) return false;
    sessionStorage.removeItem(PENDING_WATCH_KEY);
    return true;
  } catch {
    return false;
  }
}
