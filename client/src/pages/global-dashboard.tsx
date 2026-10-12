import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { describeListError, fetchList } from "@/lib/fetch-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHead, pageMetadata } from "@/components/page-head";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Shield, Activity, AlertTriangle, CheckCircle, Clock, Users, BarChart3 } from "lucide-react";

interface GlobalStatus {
  ideaConnected: boolean;
  openStatesConnected: boolean;
  aceNetworkConnected: boolean;
  ballotpediaConnected: boolean;
  lastMonitoringRun: string;
  monitoring: {
    isRunning: boolean;
    targetCount: number;
    activeTargets: number;
    lastChecked?: string;
  };
  eventProcessing: {
    queueLength: number;
    isProcessing: boolean;
    eventsProcessedToday: number;
    precinctCount: number;
    districtCallCount: number;
  };
  compliance: {
    regulations: string[];
    auditLogCount: number;
    lastRetentionCleanup: string;
    dataTypes: string[];
  };
}

interface GlobalElection {
  country: string;
  countryCode: string;
  electionType: string;
  date: string;
  title: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  participatingParties: string[];
  voterTurnout?: number;
  source: string;
}

interface LegislativeEvent {
  id: string;
  type: string;
  state: string;
  date: string;
  data: {
    name: string;
    description: string;
    location: string;
  };
}

export default function GlobalDashboard() {
  const [selectedCountry, setSelectedCountry] = useState<string>("all");

  // Global system status
  const { data: globalStatus, error: statusError, refetch: refetchStatus } = useQuery<GlobalStatus>({
    queryKey: ["/api/global/status"],
    refetchInterval: 30000,
  });

  // The whole list is fetched once and filtered here, so the country choices stay
  // available after one is picked. A provider failure is an error (503 with a code
  // since ET-41), never "no elections".
  const electionsQuery = useQuery<GlobalElection[]>({
    queryKey: ["/api/global/elections"],
    queryFn: ({ signal }) => fetchList<GlobalElection>("/api/global/elections", signal, "Global elections"),
  });
  const { data: allGlobalElections, isLoading: electionsLoading } = electionsQuery;

  const legislativeQuery = useQuery<LegislativeEvent[]>({
    queryKey: ["/api/global/legislative/all"],
    queryFn: ({ signal }) => fetchList<LegislativeEvent>("/api/global/legislative/all", signal, "Legislative activity"),
  });
  const legislativeEvents = legislativeQuery.data;

  const getStatusColor = (connected: boolean) => 
    connected ? "text-green-600" : "text-red-600";

  const getStatusIcon = (connected: boolean) => 
    connected ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />;

  const getElectionStatusBadge = (status: string) => {
    const variants = {
      upcoming: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      ongoing: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      completed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    };
    return variants[status as keyof typeof variants] || variants.upcoming;
  };

  const countries = Array.from(new Set(allGlobalElections?.map(e => e.country) || [])).sort();
  const globalElections = selectedCountry === "all" ? allGlobalElections : allGlobalElections?.filter(e => e.country === selectedCountry);

  return (
    <div className="p-6 space-y-6">
      <PageHead {...pageMetadata.global} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Global Election Observatory</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of elections and democratic processes worldwide
          </p>
        </div>
        {allGlobalElections && (
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center space-x-1">
              <Globe className="h-3 w-3" />
              <span>{countries.length} {countries.length === 1 ? "Country" : "Countries"}</span>
            </Badge>
          </div>
        )}
      </div>

      {/* System Status Overview */}
      {statusError && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center gap-3">
            System status could not be loaded ({statusError.message.split(":")[0]}). The figures below are hidden rather than shown as zero.
            <Button variant="outline" size="sm" onClick={() => refetchStatus()}>Try again</Button>
          </AlertDescription>
        </Alert>
      )}
      {globalStatus && <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Real-Time Monitor</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {getStatusIcon(globalStatus?.monitoring.isRunning || false)}
              <span className={`font-medium ${getStatusColor(globalStatus?.monitoring.isRunning || false)}`}>
                {globalStatus?.monitoring.isRunning ? 'Active' : 'Stopped'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {globalStatus?.monitoring.activeTargets || 0}/{globalStatus?.monitoring.targetCount || 0} targets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Event Processing</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {globalStatus?.eventProcessing.eventsProcessedToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {globalStatus?.eventProcessing.queueLength || 0} in queue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Compliance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {globalStatus?.compliance.regulations.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active regulations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>District Calls</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {globalStatus?.eventProcessing.districtCallCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {globalStatus?.eventProcessing.precinctCount || 0} precincts
            </p>
          </CardContent>
        </Card>
      </div>}

      <Tabs defaultValue="global-elections" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="global-elections">Global Elections</TabsTrigger>
          <TabsTrigger value="services">Data Sources</TabsTrigger>
          <TabsTrigger value="legislative">Legislative Activity</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="global-elections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>International Elections</CardTitle>
              <CardDescription>
                Elections monitored through International IDEA and partner organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium">Filter by Country</label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {countries.map(country => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {electionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading global elections...</span>
                </div>
              ) : electionsQuery.error ? (
                <div role="alert" className="text-center py-8 space-y-3">
                  <Globe className="h-12 w-12 mx-auto opacity-50" aria-hidden="true" />
                  <p className="text-sm text-destructive">{describeListError(electionsQuery.error, "Global elections")}</p>
                  <p className="text-sm text-muted-foreground">This does not mean there are no elections.</p>
                  <Button variant="outline" size="sm" onClick={() => electionsQuery.refetch()}>Try again</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {globalElections && globalElections.length > 0 ? (
                    globalElections.map((election, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-medium">{election.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {election.country} • {new Date(election.date).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                            </p>
                          </div>
                          <Badge className={getElectionStatusBadge(election.status)}>
                            {election.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <span>Type: {election.electionType}</span>
                          {election.voterTurnout && (
                            <span>Turnout: {election.voterTurnout}%</span>
                          )}
                          <span>Parties: {election.participatingParties.length}</span>
                        </div>
                        
                        <div className="mt-2 text-xs text-muted-foreground">
                          Source: {election.source}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{selectedCountry === "all" ? "The data provider reports no elections." : `No elections are listed for ${selectedCountry}.`}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          {!globalStatus ? (
            <p className="text-sm text-muted-foreground">{statusError ? "Data source status could not be loaded (see above)." : "Loading data source status..."}</p>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>International Data Sources</CardTitle>
                <CardDescription>
                  Global election monitoring services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>International IDEA</span>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(globalStatus?.ideaConnected || false)}
                    <span className={getStatusColor(globalStatus?.ideaConnected || false)}>
                      {globalStatus?.ideaConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>ACE Electoral Network</span>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(globalStatus?.aceNetworkConnected || false)}
                    <span className={getStatusColor(globalStatus?.aceNetworkConnected || false)}>
                      {globalStatus?.aceNetworkConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Ballotpedia</span>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(globalStatus?.ballotpediaConnected || false)}
                    <span className={getStatusColor(globalStatus?.ballotpediaConnected || false)}>
                      {globalStatus?.ballotpediaConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Legislative Data Sources</CardTitle>
                <CardDescription>
                  State and federal legislative monitoring
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Open States API</span>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(globalStatus?.openStatesConnected || false)}
                    <span className={getStatusColor(globalStatus?.openStatesConnected || false)}>
                      {globalStatus?.openStatesConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          )}
        </TabsContent>

        <TabsContent value="legislative" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Legislative Activity</CardTitle>
              <CardDescription>
                State legislative events that may impact elections
              </CardDescription>
            </CardHeader>
            <CardContent>
              {legislativeQuery.error ? (
                <div role="alert" className="text-center py-8 space-y-3">
                  <Activity className="h-12 w-12 mx-auto opacity-50" aria-hidden="true" />
                  <p className="text-sm text-destructive">{describeListError(legislativeQuery.error, "Legislative activity")}</p>
                  <Button variant="outline" size="sm" onClick={() => legislativeQuery.refetch()}>Try again</Button>
                </div>
              ) : legislativeEvents && legislativeEvents.length > 0 ? (
                <div className="space-y-3">
                  {legislativeEvents.slice(0, 10).map((event) => (
                    <div key={event.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-medium text-sm">{event.data.name}</h4>
                        <Badge variant="outline">{event.state}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {event.data.description}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Type: {event.type}</span>
                        <span>Date: {new Date(event.date).toLocaleDateString(undefined, { timeZone: 'UTC' })}</span>
                        {event.data.location && <span>Location: {event.data.location}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent legislative activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          {!globalStatus ? (
            <p className="text-sm text-muted-foreground">{statusError ? "Compliance figures could not be loaded (see above)." : "Loading compliance figures..."}</p>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Regulatory Compliance</CardTitle>
                <CardDescription>
                  Active compliance frameworks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {globalStatus?.compliance.regulations.map((regulation, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{regulation}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Protection</CardTitle>
                <CardDescription>
                  Privacy and audit information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm font-medium">Audit Log Entries</div>
                  <div className="text-2xl font-bold">
                    {globalStatus?.compliance.auditLogCount || 0}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium">Data Types Monitored</div>
                  <div className="text-2xl font-bold">
                    {globalStatus?.compliance.dataTypes.length || 0}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium">Last Retention Cleanup</div>
                  <div className="text-sm text-muted-foreground">
                    {globalStatus?.compliance.lastRetentionCleanup 
                      ? new Date(globalStatus.compliance.lastRetentionCleanup).toLocaleDateString()
                      : 'Not available'
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}