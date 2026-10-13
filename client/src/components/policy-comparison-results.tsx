import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ConfidenceMeter from "@/components/ConfidenceMeter";

/**
 * One candidate's stated position. The server returns only stored, verified sources and
 * sets `confidence` to null when none is recorded (lane C, 2026-10-13), so both can be null.
 */
export interface PolicyPosition {
  candidateId: string;
  candidateName: string;
  position: string;
  details: string;
  source: string | null;
  confidence: number | null;
  /** Lane C's verified-comparison DTO (2d437f0): id of the stored verified statement, null when not recorded. */
  sourcePositionId?: number | null;
  /** Link to the source of the statement; null when not recorded. Only http(s) is ever linked. */
  sourceUrl?: string | null;
  /** The actual recorded ISO instant, or null: never the time of the request. */
  recordedDate?: string | null;
}

export interface PolicyComparison {
  category: string;
  positions: PolicyPosition[];
}

/** Only http(s) is linked; anything else (javascript:, data:, garbage) is shown as plain text, never as a link. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const u = new URL(value.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch { return null; }
}

/** "Recorded Oct 1, 2026" from the recorded instant (read in UTC so a date-only value never shifts a day); null date = stated as such. */
export function recordedDateLabel(recordedDate: string | null | undefined): string {
  if (!recordedDate) return "Recorded date not stated";
  const d = new Date(recordedDate);
  if (Number.isNaN(d.getTime())) return "Recorded date not stated";
  return `Recorded ${d.toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" })}`;
}

/** Status-aware wording for the typed service errors (400 malformed scope, 404 missing candidate, 422 invalid source, 503 unavailable). */
function describeCompareError(error: unknown): { text: string; maybeRecorded: boolean } {
  const message = error instanceof Error ? error.message : "request failed";
  const status = /\b(\d{3})\b/.exec(message)?.[1];
  switch (status) {
    case "400": return { text: "The candidates or categories could not be read. Check them and try again.", maybeRecorded: false };
    case "404": return { text: "One of the selected candidates was not found.", maybeRecorded: false };
    case "422": return { text: "A recorded source did not pass validation, so positions are not shown.", maybeRecorded: false };
    case "503": return { text: "The positions service is temporarily unavailable.", maybeRecorded: true };
    default: return { text: `Policy positions could not be loaded (${message}).`, maybeRecorded: true };
  }
}

/** Fraction (0..1) from the API to the percent the meter shows; unknown stays unknown, never 0. */
export function confidencePercent(confidence: number | null | undefined): number | null {
  return typeof confidence === "number" && Number.isFinite(confidence) ? confidence * 100 : null;
}

export function PolicyComparisonResults({ data, isLoading, error, onRetry }: {
  data: PolicyComparison[] | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
        <p className="mt-2 text-sm text-text-muted">Gathering multi-source policy data...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="text-center py-8 space-y-3">
        <p className="text-sm text-destructive">
          {describeCompareError(error).text}{describeCompareError(error).maybeRecorded ? " This does not mean none are recorded." : ""}
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>
      </div>
    );
  }
  if (!data) return null;
  if (data.length === 0) {
    return <p className="text-sm text-text-muted py-4">No positions are recorded for these candidates and categories.</p>;
  }
  return (
    <div className="space-y-4">
      {data.map(category => (
        <Card key={category.category}>
          <CardHeader>
            <CardTitle className="text-lg">{category.category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {category.positions.length === 0 && (
                <p className="text-sm text-text-muted">No verified statements are recorded for this category.</p>
              )}
              {category.positions.map(position => (
                <div key={position.candidateId} className="border-l-4 border-brand-primary pl-4">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium">{position.candidateName}</h4>
                    <ConfidenceMeter value={confidencePercent(position.confidence)} />
                  </div>
                  <p className="text-sm text-text-muted mb-1">{position.position}</p>
                  <p className="text-xs text-text-muted">
                    {(() => {
                      const href = safeHttpUrl(position.sourceUrl);
                      const label = position.source ? `Source: ${position.source}` : href ? "Source" : "Source not recorded";
                      return href
                        ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">{label}</a>
                        : label;
                    })()}
                    {" · "}{recordedDateLabel(position.recordedDate)}
                    {position.sourcePositionId != null ? ` · Record #${position.sourcePositionId}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
