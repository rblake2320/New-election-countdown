import { useQuery } from "@tanstack/react-query";
import { type Election, type Candidate, type ElectionFilters } from "@shared/schema";

export function useElections(filters?: ElectionFilters) {
  // Normalize filters to ensure consistent cache keys
  const normalizedFilters = filters ? Object.fromEntries(
    Object.entries(filters).filter(([_, value]) => 
      value !== undefined && value !== null && value !== '' && 
      (!Array.isArray(value) || value.length > 0)
    )
  ) : {};

  return useQuery({
    queryKey: ['/api/elections', normalizedFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              value.forEach(v => params.append(key, v));
            } else {
              params.append(key, value.toString());
            }
          }
        });
      }
      
      const response = await fetch(`/api/elections?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch elections');
      }
      return response.json() as Promise<Election[]>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - reasonable caching
    refetchOnWindowFocus: true,
    refetchInterval: false,
    refetchOnMount: true,
  });
}

export function useElection(id: number) {
  return useQuery({
    queryKey: ['/api/elections', id],
    queryFn: async () => {
      const response = await fetch(`/api/elections/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch election');
      }
      return response.json() as Promise<Election>;
    },
    enabled: !!id,
  });
}

export function useCandidates(electionId: number) {
  return useQuery({
    queryKey: ['/api/elections', electionId, 'candidates'],
    queryFn: async () => {
      const response = await fetch(`/api/elections/${electionId}/candidates`);
      if (!response.ok) {
        throw new Error('Failed to fetch candidates');
      }
      return response.json() as Promise<Candidate[]>;
    },
    enabled: !!electionId,
    staleTime: 60 * 60 * 1000, // 1 hour cache - candidates don't change frequently
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });
}

export function useElectionResults(electionId: number) {
  return useQuery({
    queryKey: ['/api/elections', electionId, 'results'],
    queryFn: async () => {
      const response = await fetch(`/api/elections/${electionId}/results`);
      if (!response.ok) {
        throw new Error('Failed to fetch election results');
      }
      return response.json();
    },
    enabled: !!electionId,
    staleTime: 10 * 60 * 1000, // 10 minutes cache for results
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false, // Disable automatic polling to prevent excessive requests
  });
}

export function useElectionStats() {
  return useQuery({
    queryKey: ['/api/stats'],
    queryFn: async () => {
      const response = await fetch('/api/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch election stats');
      }
      return response.json() as Promise<{
        total: number;
        byType: Record<string, number>;
        byLevel: Record<string, number>;
        nextElection: Election | null;
      }>;
    },
  });
}
