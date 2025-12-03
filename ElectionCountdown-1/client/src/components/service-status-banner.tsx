import { AlertTriangle, Info, X, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useServiceStatus, type ServiceHealthStatus } from "@/hooks/use-service-status";
import { useState } from "react";

interface ServiceStatusBannerProps {
  className?: string;
}

/**
 * Get status icon and color for a service
 */
function getServiceStatusDisplay(status: ServiceHealthStatus['status'], required: boolean) {
  switch (status) {
    case 'available':
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Available'
      };
    case 'degraded':
      return {
        icon: AlertCircle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        label: 'Degraded'
      };
    case 'unavailable':
      return {
        icon: XCircle,
        color: required ? 'text-red-600' : 'text-gray-500',
        bgColor: required ? 'bg-red-50' : 'bg-gray-50',
        borderColor: required ? 'border-red-200' : 'border-gray-200',
        label: 'Unavailable'
      };
    default:
      return {
        icon: Clock,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        label: 'Unknown'
      };
  }
}

/**
 * Enhanced banner component that displays detailed API service status
 * Shows per-service status with clear distinction between critical and optional services
 */
export function ServiceStatusBanner({ className }: ServiceStatusBannerProps) {
  const { 
    summary, 
    isLoadingSummary, 
    shouldShowNotification, 
    hasCriticalIssues,
    comprehensiveHealth,
    isLoadingHealth,
    hasHealthCriticalFailures,
    hasHealthDegradation
  } = useServiceStatus();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Don't show banner if loading, no issues, or manually dismissed
  const shouldShow = shouldShowNotification || hasHealthCriticalFailures || hasHealthDegradation;
  if (isLoadingSummary || isLoadingHealth || !shouldShow || isDismissed) {
    return null;
  }

  // Use comprehensive health status if available, otherwise fall back to summary
  const useCriticalVariant = hasHealthCriticalFailures || hasCriticalIssues;
  const variant = useCriticalVariant ? "destructive" : "default";
  const icon = useCriticalVariant ? AlertTriangle : Info;
  const IconComponent = icon;

  return (
    <Alert 
      variant={variant} 
      className={`border-l-4 ${hasCriticalIssues ? 'border-l-red-500' : 'border-l-yellow-500'} ${className}`}
      data-testid="service-status-banner"
    >
      <IconComponent className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <div className="font-medium text-sm mb-1 flex items-center gap-2">
            {useCriticalVariant ? 'Critical Service Issues Detected' : 'Service Availability Notice'}
            {comprehensiveHealth && (
              <Badge 
                variant={comprehensiveHealth.overall === 'healthy' ? 'default' : 
                        comprehensiveHealth.overall === 'degraded' ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {comprehensiveHealth.overall.toUpperCase()}
              </Badge>
            )}
          </div>
          
          {/* Show comprehensive health summary if available */}
          {comprehensiveHealth ? (
            <div className="text-sm space-y-2">
              <div>
                {comprehensiveHealth.summary.critical_failures > 0 ? (
                  <span className="text-red-600 font-medium">
                    {comprehensiveHealth.summary.critical_failures} critical service{comprehensiveHealth.summary.critical_failures > 1 ? 's' : ''} unavailable
                  </span>
                ) : (
                  <span className="text-yellow-600">
                    {comprehensiveHealth.summary.unavailable + comprehensiveHealth.summary.degraded} service{(comprehensiveHealth.summary.unavailable + comprehensiveHealth.summary.degraded) > 1 ? 's' : ''} need attention
                  </span>
                )}
                {comprehensiveHealth.summary.available > 0 && (
                  <span className="text-green-600 ml-2">
                    • {comprehensiveHealth.summary.available} working normally
                  </span>
                )}
              </div>
              
              {/* Service details toggle */}
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs underline hover:no-underline transition-all duration-200"
                data-testid="button-toggle-service-details"
              >
                {showDetails ? 'Hide details' : 'Show service details'}
              </button>
              
              {/* Detailed service status */}
              {showDetails && (
                <div className="mt-3 space-y-2 border-t border-gray-200 pt-2">
                  {comprehensiveHealth.services
                    .filter(service => service.status !== 'available') // Only show problematic services
                    .map((service) => {
                      const statusDisplay = getServiceStatusDisplay(service.status, service.required);
                      const StatusIcon = statusDisplay.icon;
                      
                      return (
                        <div key={service.key} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`h-3 w-3 ${statusDisplay.color}`} />
                            <span className={service.required ? 'font-medium' : 'opacity-75'}>
                              {service.service}
                              {service.required && <span className="text-red-500 ml-1">*</span>}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${statusDisplay.color} ${statusDisplay.borderColor}`}
                            >
                              {statusDisplay.label}
                            </Badge>
                            {service.responseTime && (
                              <span className="text-gray-500">{service.responseTime}ms</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {comprehensiveHealth.services.filter(s => s.status !== 'available').length === 0 && (
                    <div className="text-xs text-gray-500 italic">All services are operating normally</div>
                  )}
                  <div className="text-xs text-gray-500 mt-2 pt-1 border-t border-gray-100">
                    <span className="text-red-500">*</span> Critical services required for core functionality
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm">
              {summary?.message || 'Checking service availability...'}
            </div>
          )}
          
          {useCriticalVariant && (
            <div className="text-xs mt-2 opacity-80">
              Critical services are required for full platform functionality.
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {/* Link to API configuration guide */}
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => window.open('/api-key-config.md', '_blank')}
            data-testid="button-api-config-guide"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Setup Guide
          </Button>
          
          {/* Dismiss button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsDismissed(true)}
            data-testid="button-dismiss-banner"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Enhanced compact version showing detailed service status
 */
export function CompactServiceStatus() {
  const { 
    summary, 
    shouldShowNotification, 
    hasCriticalIssues,
    comprehensiveHealth,
    hasHealthCriticalFailures,
    hasHealthDegradation
  } = useServiceStatus();

  const shouldShow = shouldShowNotification || hasHealthCriticalFailures || hasHealthDegradation;
  if (!shouldShow) return null;

  // Use comprehensive health data if available
  if (comprehensiveHealth) {
    const { summary: healthSummary } = comprehensiveHealth;
    const hasCritical = healthSummary.critical_failures > 0;
    
    return (
      <div 
        className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs ${
          hasCritical 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
        }`}
        data-testid="compact-service-status"
      >
        {hasCritical ? (
          <XCircle className="h-3 w-3" />
        ) : (
          <AlertCircle className="h-3 w-3" />
        )}
        <span>
          {healthSummary.available} available, 
          {healthSummary.degraded} degraded, 
          {healthSummary.unavailable} unavailable
          {healthSummary.critical_failures > 0 && (
            <span className="font-medium"> ({healthSummary.critical_failures} critical)</span>
          )}
        </span>
      </div>
    );
  }

  // Fallback to original summary-based display
  return (
    <div 
      className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs ${
        hasCriticalIssues 
          ? 'bg-red-50 text-red-700 border border-red-200' 
          : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
      }`}
      data-testid="compact-service-status"
    >
      {hasCriticalIssues ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Info className="h-3 w-3" />
      )}
      <span>
        {summary?.critical || 0} critical, {summary?.optional || 0} optional services unavailable
      </span>
    </div>
  );
}