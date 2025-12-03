import { useQuery } from "@tanstack/react-query";

interface PollingDataPoint {
  date: string;
  candidateId: number;
  candidateName: string;
  party: string;
  support: number;
  source: string;
  sampleSize?: number;
  marginOfError?: number;
}

interface TrendAnalysis {
  candidateId: number;
  candidateName: string;
  party: string;
  currentSupport: number;
  trend: "up" | "down" | "stable";
  change: number;
  momentum: number;
}

export function usePollingTrends(electionId: number, timeRange: string = "30") {
  return useQuery({
    queryKey: ["/api/elections", electionId, "polling-trends", { timeRange }],
    enabled: !!electionId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useTrendAnalysis(electionId: number) {
  return useQuery({
    queryKey: ["/api/elections", electionId, "trend-analysis"],
    enabled: !!electionId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}