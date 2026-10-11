import { useNow } from "@/hooks/use-now";
import { getElectionTiming, splitDuration, type ElectionTimingInput } from "@/lib/election-timing";

export function useCountdown(election: ElectionTimingInput) {
  const now = useNow();
  const timing = getElectionTiming(election, new Date(now));
  const remaining = splitDuration(timing.target ? timing.target.getTime() - now : 0);
  return { ...timing, ...remaining };
}
