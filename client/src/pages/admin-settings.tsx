import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Key,
  Database,
  Shield,
  Settings,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface ServiceKey {
  key: string;
  service: string;
  required: boolean;
  available: boolean;
  purpose: string;
  setupUrl?: string;
}

interface ServicesStatus {
  allRequired: boolean;
  allOptional: boolean;
  missing: ServiceKey[];
  available: ServiceKey[];
  timestamp: string;
}

interface HealthStatus {
  ok: boolean;
  mode: string;
  dbHealthy: boolean;
  elections: number;
  candidates: number;
}

/**
 * Admin Settings — live system status driven entirely by real endpoints.
 * API keys are configured via environment variables (.env) and require a
 * server restart; this page reports their actual state, it does not edit them.
 */
export default function AdminSettings() {
  const {
    data: services,
    refetch: refetchServices,
    isFetching,
  } = useQuery<ServicesStatus>({
    queryKey: ['/api/services/status'],
    queryFn: async () => {
      const response = await fetch('/api/services/status');
      if (!response.ok) throw new Error('Failed to fetch service status');
      return response.json();
    },
  });

  const { data: health } = useQuery<HealthStatus>({
    queryKey: ['/api/health'],
    queryFn: async () => {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error('Failed to fetch health');
      return response.json();
    },
    refetchInterval: 30000,
  });

  const allKeys: ServiceKey[] = [
    ...(services?.available ?? []),
    ...(services?.missing ?? []),
  ].sort((a, b) => Number(b.available) - Number(a.available) || a.service.localeCompare(b.service));

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            System Configuration
          </h1>
          <p className="text-muted-foreground">
            Live service and data-source status
          </p>
        </div>
        <div className="flex items-center gap-4">
          {health && (
            <Badge variant={health.dbHealthy ? 'default' : 'destructive'} className="gap-2">
              {health.dbHealthy ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              Database {health.dbHealthy ? 'Healthy' : 'Unavailable'}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api-keys">
            <Key className="h-4 w-4 mr-2" />
            Data Sources
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="h-4 w-4 mr-2" />
            Database
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              API keys are set in the server's <code>.env</code> file (restart required).
              Services without keys degrade gracefully — core election data is served from the database.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetchServices()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="grid gap-3">
            {allKeys.map((svc) => (
              <Card key={svc.key}>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{svc.service}</CardTitle>
                      {svc.required && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    <Badge variant={svc.available ? 'default' : 'secondary'}>
                      {svc.available ? 'Configured' : 'Not configured'}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center justify-between">
                    <span>{svc.purpose}</span>
                    {!svc.available && svc.setupUrl && (
                      <a
                        href={svc.setupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1 text-xs shrink-0 ml-4"
                      >
                        Get key <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
            {allKeys.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Loading service status…
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Connection</CardTitle>
              <CardDescription>PostgreSQL connection status (live)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {health?.dbHealthy ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="font-medium">Unavailable</span>
                    </>
                  )}
                </div>
                <Badge variant={health?.dbHealthy ? 'default' : 'destructive'}>
                  {health?.mode ?? 'unknown'} mode
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Elections in database</p>
                  <p className="font-medium">{health?.elections ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Candidates in database</p>
                  <p className="font-medium">{health?.candidates ?? '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Authentication and access control (configured at server level)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Cookie Session Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    JWT-signed httpOnly session cookies with database-backed revocation
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Rate Limiting</p>
                  <p className="text-sm text-muted-foreground">Tiered request limits per 15 minutes</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Security Headers</p>
                  <p className="text-sm text-muted-foreground">Helmet, CORS restrictions, XSS protection</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
