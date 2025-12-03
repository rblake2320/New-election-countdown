import { useCountdown } from "@/hooks/use-countdown";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  targetDate: Date | string;
  size?: "sm" | "md" | "lg";
  showMilliseconds?: boolean;
  className?: string;
}

export function CountdownTimer({ 
  targetDate, 
  size = "md", 
  showMilliseconds = true,
  className 
}: CountdownTimerProps) {
  const timeRemaining = useCountdown(targetDate, showMilliseconds ? 'full' : 'seconds');

  if (timeRemaining.expired) {
    return (
      <div className={cn("text-center", className)}>
        <div className="text-red-600 font-bold">Election Day!</div>
      </div>
    );
  }

  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl"
  };

  const gridCols = showMilliseconds ? "grid-cols-5" : "grid-cols-4";

  return (
    <div className={cn("text-center font-mono", className)}>
      <div className={cn("grid gap-2", gridCols)}>
        <div className="text-center">
          <div className={cn("font-bold text-gray-900 dark:text-white", sizeClasses[size])}>
            {timeRemaining.days.toString().padStart(2, '0')}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">DAYS</div>
        </div>
        <div className="text-center">
          <div className={cn("font-bold text-gray-900 dark:text-white", sizeClasses[size])}>
            {timeRemaining.hours.toString().padStart(2, '0')}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">HOURS</div>
        </div>
        <div className="text-center">
          <div className={cn("font-bold text-gray-900 dark:text-white", sizeClasses[size])}>
            {timeRemaining.minutes.toString().padStart(2, '0')}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">MINUTES</div>
        </div>
        <div className="text-center">
          <div className={cn("font-bold text-gray-900 dark:text-white", sizeClasses[size])}>
            {timeRemaining.seconds.toString().padStart(2, '0')}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">SECONDS</div>
        </div>
        {showMilliseconds && (
          <div className="text-center">
            <div className={cn("font-bold text-gray-700 dark:text-gray-200", size === "lg" ? "text-lg" : "text-sm")}>
              {timeRemaining.milliseconds.toString().padStart(3, '0')}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300">MS</div>
          </div>
        )}
      </div>
    </div>
  );
}
