import { useState, useEffect } from "react";
import { calculateTimeRemaining } from "@/lib/election-data";

export function useCountdown(targetDate: Date | string, precision: 'full' | 'seconds' | 'minutes' = 'full') {
  const [timeRemaining, setTimeRemaining] = useState(() => calculateTimeRemaining(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate));
    }, precision === 'full' ? 50 : 1000); // Update every 50ms for full precision, 1s otherwise

    return () => clearInterval(interval);
  }, [targetDate, precision]);

  return timeRemaining;
}
