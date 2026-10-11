import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";
import { isWriteIn, rosterParty, rosterSources, safeSourceUrl } from "@/lib/general-roster";
import { useGeneralRoster } from "@/hooks/use-general-roster";

const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export function GeneralRoster({ electionId }: { electionId: number }) {
  const { data, isLoading, error } = useGeneralRoster(electionId);
  if (isLoading || data === null || data === undefined || data.status === "election_not_found") return null;

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
        ) : data.status !== "sourced" || data.candidates.length === 0 ? (
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
            <div className="mt-3 space-y-1 text-xs text-muted-foreground" data-testid="general-roster-sources">
              {rosterSources(data.candidates).map(s => {
                const href = safeSourceUrl(s.url);
                const checked = fmtDate(s.checkedAt);
                return (
                  <p key={`${s.name}|${s.url}`}>
                    Source: {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="underline">{s.name}</a> : s.name}
                    {checked && <> · checked {checked}</>}
                  </p>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
