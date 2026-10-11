import { useCountdown } from "@/hooks/use-countdown";
import { cn } from "@/lib/utils";
import type { ElectionTimingInput } from "@/lib/election-timing";

interface CountdownTimerProps {
  /** The election, or at least its date plus any poll hours / IANA time zone. */
  election: ElectionTimingInput;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const PRECISION_NOTE: Record<string, string> = {
  exact: "",
  unverified: " · poll hours not yet verified",
  local_variable: " · closing times vary locally",
  unpublished: " · poll hours not yet published",
};

const PHASE_STYLES: Record<string, string> = {
  "polls-open": "text-green-700 dark:text-green-400",
  "election-day": "text-green-700 dark:text-green-400",
  "polls-closed": "text-amber-700 dark:text-amber-400",
  completed: "text-muted-foreground",
};

export function CountdownTimer({ election, size = "md", className }: CountdownTimerProps) {
  const t = useCountdown(election);

  if (!t.target) {
    return (
      <div className={cn("text-center", className)} role="status">
        <div className={cn("font-semibold", PHASE_STYLES[t.phase])}>{t.statusLabel}</div>
      </div>
    );
  }

  const sizeClasses = { sm: "text-sm", md: "text-lg", lg: "text-2xl" };
  const units: [number, string][] = [[t.days, "DAYS"], [t.hours, "HRS"], [t.minutes, "MIN"], [t.seconds, "SEC"]];
  const spoken = `${t.days} days, ${t.hours} hours, ${t.minutes} minutes ${t.targetLabel}`;

  return (
    <div className={cn("text-center font-mono", className)}>
      {t.phase !== "upcoming" && (
        <div className={cn("mb-1 text-xs font-semibold font-sans", PHASE_STYLES[t.phase])}>{t.statusLabel}</div>
      )}
      <div className="grid grid-cols-4 gap-2" role="timer" aria-label={spoken}>
        {units.map(([value, unit]) => (
          <div key={unit} className="text-center" aria-hidden="true">
            <div className={cn("font-bold tabular-nums text-foreground", sizeClasses[size])}>
              {value.toString().padStart(2, "0")}
            </div>
            <div className="text-xs text-muted-foreground">{unit}</div>
          </div>
        ))}
      </div>
      <div className="mt-1 text-xs font-sans text-muted-foreground">
        {t.targetLabel}{PRECISION_NOTE[t.precision]}
        {election.pollHoursSource && (
          <> · <a href={election.pollHoursSource} target="_blank" rel="noopener noreferrer" className="underline">source</a></>
        )}
      </div>
    </div>
  );
}
