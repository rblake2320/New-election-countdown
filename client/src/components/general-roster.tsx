import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";
import { isWriteIn, rosterCoverage, rosterParty, rosterSources, safeSourceUrl, scopeLabels, snapshotLines, type SourceLine } from "@/lib/general-roster";
import { useGeneralRoster } from "@/hooks/use-general-roster";

const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  // A bare calendar date ("2026-08-21") is the publisher's date, not an instant:
  // format it as-is so a viewer west of UTC does not see the day before.
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = ymd ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])) : new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

function SourceLines({ lines }: { lines: SourceLine[] }) {
  return (
    <div className="mt-3 space-y-1 text-xs text-muted-foreground" data-testid="general-roster-sources">
      {lines.map(s => {
        const href = safeSourceUrl(s.url);
        const checked = fmtDate(s.checkedAt);
        const published = fmtDate(s.publishedAt);
        return (
          <p key={`${s.name}|${s.url}`}>
            Source: {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="underline">{s.name}</a> : s.name}
            {published && <> (published {published})</>}
            {checked && <> · checked {checked}</>}
          </p>
        );
      })}
    </div>
  );
}

export function GeneralRoster({ electionId }: { electionId: number }) {
  const { data, isLoading, error } = useGeneralRoster(electionId);
  // Hide only when there is nothing to say: still loading, no endpoint on this
  // server (null), or unknown election. A failed request (503 etc.) leaves data
  // undefined and must still show the error state (lane C review of a90ae7e).
  if (isLoading || (!error && (data === null || data === undefined)) || data?.status === "election_not_found") return null;

  return (
    <Card data-testid="general-roster">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5" />
          Official general-election candidate list
        </CardTitle>
        <CardDescription>
          As published by the state election office. Being listed is not the same as certification of results.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-muted-foreground">The official list could not be loaded right now.</p>
        ) : data && data.status === "sourced" && data.candidates.length === 0 && rosterCoverage(data) === "complete" ? (
          <>
            <p className="text-sm" data-testid="general-roster-known-empty">
              The official general-election list records no candidates for this race.
            </p>
            <SourceLines lines={snapshotLines(data.sources ?? [])} />
          </>
        ) : data && data.status === "sourced" && data.candidates.length === 0 && rosterCoverage(data) === "scoped" ? (
          <>
            <p className="text-sm" data-testid="general-roster-scoped-empty">
              The recorded official lists contain no candidates in the scopes they cover
              {scopeLabels(data).length > 0 && <>: {scopeLabels(data).join("; ")}</>}.
              They do not establish that the race has no candidates.
            </p>
            <SourceLines lines={snapshotLines(data.sources ?? [])} />
          </>
        ) : !data || data.status !== "sourced" || data.candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="general-roster-empty">
            The official general-election list for this race has not been recorded yet.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border" aria-label="Candidates on the official general-election list">
              {data.candidates.map(c => {
                const party = rosterParty(c);
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="font-medium">{c.name}</span>
                    <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                      {party && <span>{party}</span>}
                      {c.isIncumbent === true && <Badge variant="outline" className="text-xs">Incumbent</Badge>}
                      {isWriteIn(c) && <Badge variant="outline" className="text-xs">Write-in</Badge>}
                    </span>
                  </li>
                );
              })}
            </ul>
            {rosterCoverage(data) === "scoped" && scopeLabels(data).length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground" data-testid="general-roster-scope-note">
                Covers only: {scopeLabels(data).join("; ")}. Other candidates may appear on the ballot.
              </p>
            )}
            <SourceLines lines={rosterSources(data.candidates)} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
