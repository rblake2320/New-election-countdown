/** Persisted profile-record update time, never request time or publication time. */
export function candidateRecordUpdatedAt(candidate: unknown): string | null {
  if (!candidate || typeof candidate !== 'object') return null;
  const row = candidate as Record<string, unknown>;
  for (const value of [row.updatedAt, row.updated_at]) {
    if (value instanceof Date) {
      if (Number.isFinite(value.getTime())) return value.toISOString();
      continue;
    }
    if (typeof value !== 'string') continue;
    // Require an explicit instant. Date-only/local-time strings and permissive
    // Date.parse inputs such as numeric strings cannot establish this clock.
    const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.\d{1,9})?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
    if (!match) continue;
    const instant = new Date(value);
    if (!Number.isFinite(instant.getTime())) continue;
    const offsetMinutes = match[2] === 'Z' ? 0 :
      (match[3] === '+' ? 1 : -1) * (Number(match[4]) * 60 + Number(match[5]));
    // Reject normalized invalid calendar dates or 24:00 rollovers.
    const local = new Date(instant.getTime() + offsetMinutes * 60_000);
    if (local.toISOString().slice(0, 19) !== match[1]) continue;
    return instant.toISOString();
  }
  return null;
}
