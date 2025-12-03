import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { formatCountdown } from "@/utils/date";

export default function Countdown({ when }: { when?: string }) {
  const [now, setNow] = useState(DateTime.now());
  const { label, urgent, live } = useMemo(
    () => formatCountdown(when),
    [when, now.toMillis()]
  );

  useEffect(() => {
    const id = setInterval(() => setNow(DateTime.now()), live ? 1000 : 60_000);
    return () => clearInterval(id);
  }, [live]);

  return (
    <span
      className={`font-mono tabular-nums text-[13px] px-1.5 py-0.5 rounded
        ${urgent ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                 : "bg-muted text-foreground/80"}`}
      aria-label={`Time remaining ${label}`}
    >
      {label}
    </span>
  );
}