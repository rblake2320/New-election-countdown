import type { LiveElectionResultsResponse } from "@shared/live-election-results";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, ExternalLink, Trophy } from "lucide-react";
import { asOfLabel, formatTime, reportingLabel, statusLabel } from "@/lib/live-results";

const PARTY_DOT: Record<string, string> = { D: "bg-blue-600", R: "bg-red-600", I: "bg-purple-600" };

/**
 * One race's results exactly as recorded (ET-6 v1.2): counts, source, the
 * source's own time, percent reporting and status. No projection is computed
 * here; "Winner" appears only when the source declared that exact option.
 */
export function LiveResultView({ result, showHistory = false }: { result: LiveElectionResultsResponse; showHistory?: boolean }) {
  if (result.status === "none") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          No results reported yet. They appear here once an official source publishes them and they are recorded.
        </p>
        {result.history.length > 0 && (
          <p className="text-sm text-muted-foreground" data-testid="mismatched-history-note">
            {result.history.length === 1 ? "An earlier report was" : `${result.history.length} earlier reports were`} recorded
            for this race under a different setup (state, date or office), so {result.history.length === 1 ? "it is" : "they are"} not shown as results.
          </p>
        )}
      </div>
    );
  }
  const candidates = [...result.candidates].sort((a, b) => b.votes - a.votes);
  // The server's history may include the report being shown; "earlier" never does.
  const earlier = result.history.filter(h => h.reportId !== result.reportId);
  const reportedPct = result.reporting?.percent ?? null;
  const asOf = asOfLabel(result);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={result.status === "certified" ? "default" : "secondary"}>{statusLabel(result.status)}</Badge>
        {result.source && (
          <a href={result.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline">
            {result.source.name}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">(opens the official source in a new tab)</span>
          </a>
        )}
      </div>

      {result.stale && result.staleSince && (
        <div role="status" className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          The source has not answered since {formatTime(result.staleSince)}. These are the last counts we received.
        </div>
      )}

      {result.electionContext && (
        <p className="text-xs text-muted-foreground">
          Recorded for {result.electionContext.office}, {result.electionContext.state}, election of {result.electionContext.electionDate}
        </p>
      )}

      <div className="space-y-1">
        <p className="text-sm font-medium">{reportingLabel(result)}</p>
        {reportedPct !== null && <Progress value={reportedPct} className="h-2" aria-label="Percent reporting" />}
        {asOf && <p className="text-xs text-muted-foreground">{asOf}</p>}
      </div>

      <ul className="space-y-3" aria-label="Candidate results">
        {candidates.map(c => (
          <li key={c.sourceCandidateId} className={`rounded-lg border p-3 ${c.isWinner ? "border-green-600 bg-green-50 dark:bg-green-950" : "border-border"}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${PARTY_DOT[c.party ?? ""] ?? "bg-gray-500"}`} aria-hidden="true" />
                <span className="font-semibold break-words">{c.name}</span>
                {c.party && <Badge variant="outline">{c.party}</Badge>}
                {c.isWinner && (
                  <Badge className="bg-green-700 text-white"><Trophy className="mr-1 h-3 w-3" aria-hidden="true" />Winner</Badge>
                )}
              </div>
              <div className="text-right">
                <span className="text-lg font-bold">{c.percent !== null ? `${c.percent.toFixed(1)}%` : "—"}</span>
                <span className="ml-2 text-sm text-muted-foreground">{c.votes.toLocaleString()} votes</span>
              </div>
            </div>
            {c.percent !== null && <Progress value={c.percent} className="mt-2 h-1.5" aria-hidden="true" />}
          </li>
        ))}
      </ul>

      {result.totalVotes !== null && (
        <p className="text-sm text-muted-foreground">Total votes counted: <span className="font-semibold text-foreground">{result.totalVotes.toLocaleString()}</span></p>
      )}

      {result.winnerCalledBy && (
        <p className="text-sm">
          Winner declared by{" "}
          <a href={result.winnerCalledBy.url} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">{result.winnerCalledBy.source}</a>
          {" "}on {formatTime(result.winnerCalledBy.at)}.
        </p>
      )}
      {result.certification && (
        <p className="text-sm">
          <a href={result.certification.url} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">Official certification</a>
          {result.certification.certifiedAt ? ` (${formatTime(result.certification.certifiedAt)})` : ""}.
        </p>
      )}
      {result.status === "unofficial" && !result.winnerCalledBy && (
        <p className="text-xs text-muted-foreground">Unofficial counts can change as more ballots are counted. No winner has been declared by an official source.</p>
      )}

      {showHistory && earlier.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Earlier reports ({earlier.length})</summary>
          <ul className="mt-2 space-y-1">
            {earlier.map(h => (
              <li key={h.reportId} className="text-muted-foreground">
                {h.asOf ? formatTime(h.asOf) : "Time not stated"} · {h.status === "certified" ? "Certified" : "Unofficial"}
                {h.percent !== null ? ` · ${h.percent.toFixed(1)}% reporting` : ""}
                {!h.contextMatch ? " · recorded under a different race setup, not counted" : ""} ·{" "}
                <a href={h.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">source</a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
