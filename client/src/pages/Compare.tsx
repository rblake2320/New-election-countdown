import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

function useIdsFromQuery() {
  const [loc] = useLocation();
  const params = new URLSearchParams(loc.split("?")[1] ?? "");
  return (params.get("c") ?? "")
    .split(",").map(s => Number(s)).filter(n => Number.isFinite(n));
}

function titleCase(str?: string) {
  if (!str) return "";
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export default function ComparePage() {
  const ids = useIdsFromQuery();
  
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["candidates", ids],
    queryFn: async () => {
      if (!ids.length) return [];
      const r = await fetch(`/api/elections/candidates-by-ids?ids=${ids.join(",")}`);
      if (!r.ok) throw new Error("fetch candidates failed");
      return await r.json();
    }
  });

  if (!ids.length) return <div className="p-6 text-sm">Select two or more candidates to compare.</div>;

  if (isLoading) return <div className="p-6 text-sm">Loading candidate data...</div>;
  
  if (error) return <div className="p-6 text-sm text-red-600">Error loading candidates: {String(error)}</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Candidate Comparison</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((c: any) => (
          <div key={c.id} className="rounded-xl border p-4 space-y-2" data-testid="candidate-tile">
            <div className="flex items-center gap-3">
              {c.profile_image_url && <img src={c.profile_image_url} className="w-10 h-10 rounded-full object-cover" alt="" />}
              <div>
                <div className="font-semibold" data-testid="candidate-name">{c.name}</div>
                <div className="text-xs text-muted-foreground">{titleCase(c.party)}</div>
              </div>
            </div>
            <div className="text-xs">
              <div>Incumbent: {c.incumbent ? "Yes" : "No"}</div>
              {c.is_verified && <div className="text-green-600">✓ Verified</div>}
              {c.website && <a href={c.website} target="_blank" rel="noopener" className="text-blue-600 hover:underline">Campaign Website</a>}
            </div>
            
            <div className="mt-3 pt-3 border-t">
              <h4 className="text-xs font-semibold mb-2">Fundraising (OpenFEC ✓)</h4>
              <div className="text-xs text-muted-foreground">
                Loading finance data from FEC...
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t">
              <h4 className="text-xs font-semibold mb-2">Policy Positions</h4>
              <div className="text-xs text-muted-foreground">
                VoteSmart API needed for positions
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {data.length > 0 && (
        <div className="mt-6 p-4 rounded-xl border bg-muted/50">
          <h3 className="text-sm font-semibold mb-2">Side-by-Side Comparison</h3>
          <div className="text-xs text-muted-foreground">
            This feature provides detailed side-by-side policy comparison when API keys are configured.
          </div>
        </div>
      )}
    </div>
  );
}