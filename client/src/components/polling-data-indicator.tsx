import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface PollingDataIndicatorProps {
  candidate: {
    pollingSupport: number | null;
    lastPollingUpdate: string | null;
    pollingSource: string | null;
    pollingTrend: string | null;
  };
}

export function PollingDataIndicator({ candidate }: PollingDataIndicatorProps) {
  const getDataFreshness = () => {
    if (!candidate.lastPollingUpdate) {
      return {
        status: 'static',
        color: 'text-yellow-600 dark:text-yellow-400',
        icon: AlertTriangle,
        message: 'Static database value - not from live polling sources'
      };
    }

    const daysSince = Math.floor(
      (Date.now() - new Date(candidate.lastPollingUpdate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSince <= 7) {
      return {
        status: 'fresh',
        color: 'text-green-600 dark:text-green-400',
        icon: CheckCircle,
        message: `Fresh polling data from ${candidate.pollingSource} (${daysSince} days ago)`
      };
    }

    if (daysSince <= 30) {
      return {
        status: 'recent',
        color: 'text-blue-600 dark:text-blue-400',
        icon: Clock,
        message: `Recent polling data from ${candidate.pollingSource} (${daysSince} days ago)`
      };
    }

    return {
      status: 'outdated',
      color: 'text-orange-600 dark:text-orange-400',
      icon: AlertTriangle,
      message: `Outdated polling data from ${candidate.pollingSource} (${daysSince} days ago)`
    };
  };

  if (!candidate.pollingSupport) {
    return null;
  }

  const freshness = getDataFreshness();
  const Icon = freshness.icon;

  return (
    <div className="flex items-center space-x-2">
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {candidate.pollingSupport}%
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className={`w-3 h-3 ${freshness.color}`} />
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-medium">Polling Data Source</p>
            <p className="text-sm">{freshness.message}</p>
            {candidate.pollingTrend && (
              <p className="text-sm mt-1">
                Trend: {candidate.pollingTrend === 'up' ? '↗️' : candidate.pollingTrend === 'down' ? '↘️' : '➡️'}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}