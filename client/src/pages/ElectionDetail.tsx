import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Countdown from "@/components/Countdown";
import { formatDateLocal } from "@/utils/date";
import CandidatesPreview from "@/components/CandidatesPreview";

async function fetchElection(id: string) {
  const r = await fetch(`/api/elections/${id}`);
  if (!r.ok) throw new Error("not found");
  return r.json();
}

export default function ElectionDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: e, isLoading } = useQuery({ 
    queryKey: ["election", id], 
    queryFn: () => fetchElection(id) 
  });

  if (isLoading) return <div className="p-6 text-sm">Loading…</div>;
  if (!e) return <div className="p-6 text-sm">Election not found.</div>;

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{e.title}</h1>
          <div className="text-sm text-muted-foreground">
            {formatDateLocal(e.date)} · {e.state ?? "US"} · {e.level} · {e.type}
          </div>
        </div>
        <Countdown when={e.date} />
      </header>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Candidates</h2>
        <CandidatesPreview electionId={e.id} count={e.candidateCount} />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-2">Polling Trends</h3>
          <div className="text-xs text-muted-foreground">
            Connect OpenFEC/OpenStates/VoteSmart to enable real-time polling charts.
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-2">Finance Summary</h3>
          <div className="text-xs text-muted-foreground">
            FEC data appears here when API key is present.
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h3 className="text-sm font-semibold mb-2">Election Information</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Registration Deadline</span>
            <span>Check state website</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Early Voting</span>
            <span>Varies by state</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Polling Hours</span>
            <span>{e.pollsOpen && e.pollsClose ? `${e.pollsOpen} - ${e.pollsClose}` : "Check local jurisdiction"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Voter ID Required</span>
            <span>Check state requirements</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h3 className="text-sm font-semibold mb-2">Key Issues</h3>
        <div className="text-xs text-muted-foreground">
          Connect Perplexity API to display AI-analyzed key election issues and voter concerns.
        </div>
      </section>
    </div>
  );
}