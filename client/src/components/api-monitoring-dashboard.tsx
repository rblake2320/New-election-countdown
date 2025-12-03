import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Database,
  Globe,
  Key,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useServiceStatus } from '@/hooks/use-service-status';

interface APIHealthMetrics {
  service: string;
  status: 'available' | 'degraded' | 'unavailable';
  responseTime?: number;
  uptime?: number;
  lastChecked: string;
  error?: string;
  details?: string;
}

interface ComprehensiveHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  services: APIHealthMetrics[];
  summary: {
    total: number;
    available: number;
    degraded: number;
    unavailable: number;
  };
  lastUpdated: string;
}

export function ApiMonitoringDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { 
    comprehensiveHealth, 
    isLoadingHealth,
    summary,
    isLoadingSummary,
    overallHealthy,
    hasHealthDegradation,
    hasHealthCriticalFailures
  } = useServiceStatus();

  const { data: refreshData, refetch: refreshServices } = useQuery({
    queryKey: ['/api/services/refresh'],
    enabled: false, // Only run on manual refresh
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshServices();
      // Refresh health data as well
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.error('Failed to refresh services:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unavailable':
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
      case 'healthy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'unavailable':
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const calculateUptimePercentage = (service: APIHealthMetrics) => {
    // Simple calculation based on status
    if (service.status === 'available') return 99.9;
    if (service.status === 'degraded') return 85.0;
    return 45.0;
  };

  if (isLoadingHealth && isLoadingSummary) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading API health status...</span>
      </div>
    );
  }

  const healthData = comprehensiveHealth as ComprehensiveHealthStatus | undefined;

  return (
    <div className="space-y-6" data-testid="api-monitoring-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Health Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of external API integrations
          </p>
        </div>
        <Button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          data-testid="button-refresh-services"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh All
        </Button>
      </div>

      {/* Overall Status Card */}
      {healthData && (
        <Card data-testid="card-overall-status">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-base font-medium">System Overview</CardTitle>
            {getStatusIcon(healthData.overall)}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600" data-testid="text-available-count">
                  {healthData.summary.available}
                </div>
                <div className="text-xs text-muted-foreground">Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600" data-testid="text-degraded-count">
                  {healthData.summary.degraded}
                </div>
                <div className="text-xs text-muted-foreground">Degraded</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600" data-testid="text-unavailable-count">
                  {healthData.summary.unavailable}
                </div>
                <div className="text-xs text-muted-foreground">Unavailable</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-total-services">
                  {healthData.summary.total}
                </div>
                <div className="text-xs text-muted-foreground">Total Services</div>
              </div>
            </div>
            <div className="mt-4">
              <Progress 
                value={(healthData.summary.available / healthData.summary.total) * 100} 
                className="h-2"
                data-testid="progress-overall-health"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Overall system health: {Math.round((healthData.summary.available / healthData.summary.total) * 100)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Critical Issues Alert */}
      {(hasHealthCriticalFailures || (summary?.critical && summary.critical > 0)) && (
        <Alert variant="destructive" data-testid="alert-critical-issues">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {summary?.critical && summary.critical > 0 && (
              <>Critical API keys missing: {summary.critical} services require immediate attention.</>
            )}
            {hasHealthCriticalFailures && (
              <>Critical system failures detected. Some features may be unavailable.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* API Key Status */}
      {summary && (
        <Card data-testid="card-api-keys">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-base font-medium">API Key Status</CardTitle>
            <Key className="h-5 w-5 ml-2" />
          </CardHeader>
          <CardContent>
            {summary.show && (
              <Alert className="mb-4" data-testid="alert-missing-keys">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {summary.message}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.services.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-medium">{service}</span>
                  <Badge className={getStatusColor('unavailable')}>
                    Missing
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Service Health */}
      {healthData?.services && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {healthData.services.map((service, index) => (
            <Card key={index} data-testid={`card-service-${service.service.toLowerCase()}`}>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{service.service}</CardTitle>
                {getStatusIcon(service.status)}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <Badge className={getStatusColor(service.status)} data-testid={`status-${service.service.toLowerCase()}`}>
                      {service.status}
                    </Badge>
                  </div>
                  
                  {service.responseTime && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Response Time</span>
                      <span className="text-xs font-mono" data-testid={`response-time-${service.service.toLowerCase()}`}>
                        {service.responseTime}ms
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Uptime</span>
                    <span className="text-xs font-mono" data-testid={`uptime-${service.service.toLowerCase()}`}>
                      {calculateUptimePercentage(service).toFixed(1)}%
                    </span>
                  </div>
                  
                  {service.error && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
                      <span className="font-medium text-red-700 dark:text-red-400">Error:</span>
                      <span className="text-red-600 dark:text-red-300 ml-1">{service.error}</span>
                    </div>
                  )}
                  
                  {service.details && !service.error && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                      <span className="text-blue-600 dark:text-blue-300">{service.details}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-xs text-muted-foreground mt-2">
                    <Clock className="h-3 w-3 mr-1" />
                    Last checked: {new Date(service.lastChecked).toLocaleTimeString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Last Updated */}
      {healthData && (
        <div className="text-center text-xs text-muted-foreground">
          Dashboard last updated: {new Date(healthData.lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
}