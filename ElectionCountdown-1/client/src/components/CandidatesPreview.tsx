import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompare } from "@/compare/CompareContext";
import { analytics } from "@/analytics";

async function fetchCandidates(electionId: number) {
  const r = await fetch(`/api/elections/${electionId}/candidates`);
  if (!r.ok) throw new Error("fetch candidates failed");
  return r.json() as Promise<{id:number;name:string;party?:string;incumbent?:boolean;profile_image_url?:string}[]>;
}

function titleCase(str?: string) {
  if (!str) return "";
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export default function CandidatesPreview({ electionId, count }: { electionId: number; count?: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { selected, toggle } = useCompare();
  
  const handleToggleCandidate = (candidateId: string) => {
    toggle(candidateId);
    const isSelected = selected.includes(candidateId);
    analytics.track(isSelected ? "candidate_unchecked_for_compare" : "candidate_checked_for_compare", {
      candidate_id: Number(candidateId),
      election_id: electionId
    });
  };

  const q = useQuery({
    queryKey: ["election", electionId, "candidates"],
    queryFn: () => fetchCandidates(electionId),
    enabled: open
  });

  // Prefetch on hover/focus
  const prefetch = () => qc.prefetchQuery({ 
    queryKey: ["election", electionId, "candidates"], 
    queryFn: () => fetchCandidates(electionId) 
  });

  return (
    <div className="mt-2">
      <button
        onClick={() => {
          setOpen(v => !v);
          if (!open) {
            analytics.track("candidates_preview_opened", { election_id: electionId });
          }
        }}
        onMouseEnter={prefetch}
        className="text-xs px-2 py-1 rounded-lg border hover:bg-muted"
        aria-expanded={open}
        data-testid="candidates-toggle"
      >
        {open ? "Hide" : "Candidates"}{typeof count === "number" ? ` (${count})` : ""}
      </button>

      {open && (
        <div className="mt-2 border rounded-xl p-2 space-y-1">
          {q.isLoading && <div className="h-2 rounded bg-muted animate-pulse" aria-live="polite" />}
          {q.error && (
            <div className="text-amber-600 text-sm">
              Couldn't load candidates. <button className="underline" onClick={() => q.refetch()}>Retry</button>
            </div>
          )}
          {!q.isLoading && !q.error && q.data?.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No verified candidates recorded yet.
              <button className="ml-2 underline" onClick={() => q.refetch()}>Check again</button>
            </div>
          )}
          {q.data?.map(c => {
            const checked = selected.includes(String(c.id));
            return (
              <label key={c.id} className="flex items-center justify-between text-sm gap-3" data-testid="candidate-row">
                <div className="truncate">
                  <span className="font-medium">{c.name}</span>
                  {c.party && <span className="ml-2 text-xs text-muted-foreground">{titleCase(c.party)}</span>}
                  {c.incumbent && <span className="ml-2 text-[11px] px-1 rounded bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">Incumbent</span>}
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggleCandidate(String(c.id))}
                  aria-label={`Add ${c.name} to compare`}
                />
              </label>
            );
          })}
          {!!selected.length && (
            <a
              href={`/compare?c=${selected.join(",")}`}
              className="mt-2 inline-flex text-xs px-3 py-1.5 rounded-lg border bg-background hover:bg-muted"
              onClick={() => analytics.track("compare_launched", { 
                election_id: electionId,
                value_num: selected.length 
              })}
            >
              Compare ({selected.length})
            </a>
          )}
        </div>
      )}
    </div>
  );
}