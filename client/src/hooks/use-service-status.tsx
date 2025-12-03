import { useQuery } from "@tanstack/react-query";

export interface ServiceNotificationSummary {
  show: boolean;
  critical: number;
  optional: number;
  services: string[];
  message: string;
}

export interface ServiceHealthStatus {
  key: string;
  service: string;
  status: 'available' | 'unavailable' | 'degraded';
  required: boolean;
  responseTime?: number;
  error?: string;
  lastChecked: string;
  details?: string;
}

export interface ComprehensiveHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  services: ServiceHealthStatus[];
  summary: {
    available: number;
    degraded: number;
    unavailable: number;
    critical_failures: number;
  };
  timestamp: string;
}

export interface ServiceStatus {
  allRequired: boolean;
  allOptional: boolean;
  missing: Array<{
    key: string;
    service: string;
    required: boolean;
    available: boolean;
    purpose: string;
    setupUrl?: string;
  }>;
  available: Array<{
    key: string;
    service: string;
    required: boolean;
    available: boolean;
    purpose: string;
    setupUrl?: string;
  }>;
  critical: Array<{
    key: string;
    service: string;
    required: boolean;
    available: boolean;
    purpose: string;
    setupUrl?: string;
  }>;
}

/**
 * Hook to fetch service status and notification summary for missing API keys
 */
export function useServiceStatus() {
  const {
    data: notificationSummary,
    isLoading: isLoadingSummary,
    error: summaryError,
  } = useQuery<ServiceNotificationSummary>({
    queryKey: ["/api/services/notification-summary"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const {
    data: fullStatus,
    isLoading: isLoadingStatus,
    error: statusError,
  } = useQuery<ServiceStatus>({
    queryKey: ["/api/services/status"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: false, // Only fetch when specifically needed
  });

  const {
    data: comprehensiveHealth,
    isLoading: isLoadingHealth,
    error: healthError,
  } = useQuery<ComprehensiveHealthStatus>({
    queryKey: ["/api/health/services"],
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent for health checks)
    retry: 2,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  return {
    // Notification summary for banner display
    summary: notificationSummary,
    isLoadingSummary,
    summaryError,
    
    // Full status for detailed views
    fullStatus,
    isLoadingStatus,
    statusError,
    
    // Comprehensive health status (new detailed health check)
    comprehensiveHealth,
    isLoadingHealth,
    healthError,
    
    // Convenience flags
    hasCriticalIssues: (notificationSummary?.critical ?? 0) > 0,
    hasOptionalIssues: (notificationSummary?.optional ?? 0) > 0,
    shouldShowNotification: notificationSummary?.show === true,
    
    // Health-based convenience flags
    overallHealthy: comprehensiveHealth?.overall === 'healthy',
    hasHealthDegradation: comprehensiveHealth?.overall === 'degraded',
    hasHealthCriticalFailures: comprehensiveHealth?.overall === 'critical',
  };
}