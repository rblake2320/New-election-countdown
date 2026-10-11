import { useMemo } from "react";
import { useNow } from "@/hooks/use-now";
import { getElectionSchedule, phaseAt, splitDuration, type ElectionTimingInput } from "@/lib/election-timing";

export function useCountdown(election: ElectionTimingInput) {
  const now = useNow();
  // Time-zone math runs once per election record, not on every tick.
  const schedule = useMemo(
    () => getElectionSchedule(election),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [String(election.date), election.pollsOpen, election.pollsClose, election.timezone],
  );
  const timing = phaseAt(schedule, new Date(now));
  const remaining = splitDuration(timing.target ? timing.target.getTime() - now : 0);
  return { ...timing, ...remaining };
}
