import { useQuery } from "@tanstack/react-query";
import type { GeneralRosterResponse } from "@/lib/general-roster";

/** null = this server has no roster endpoint yet (404 route); otherwise the API's answer. */
export function useGeneralRoster(electionId: number) {
  return useQuery<GeneralRosterResponse | null>({
    queryKey: [`/api/elections/${electionId}/general-candidates`],
    enabled: electionId > 0,
    queryFn: async () => {
      const res = await fetch(`/api/elections/${electionId}/general-candidates`, { credentials: "include" });
      if (res.status === 404) {
        const body = await res.json().catch(() => null);
        return body && body.status === "election_not_found" ? body : null;
      }
      if (!res.ok) throw new Error(`General candidate list unavailable (${res.status})`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

