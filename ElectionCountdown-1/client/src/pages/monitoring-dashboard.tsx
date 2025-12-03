import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHead, pageMetadata } from "@/components/page-head";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Square, Plus, Globe, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MonitoringTarget {
  url: string;
  type: 'results' | 'feed' | 'api';
  priority: 'high' | 'medium' | 'low';
  state?: string;
  lastChecked?: string;
  status: 'active' | 'inactive' | 'error';
}

interface MonitoringStatus {
  isRunning: boolean;
  targetCount: number;
  activeTargets: number;
  lastChecked?: string;
  targets: MonitoringTarget[];
}

export default function MonitoringDashboard() {
  const [newTargetUrl, setNewTargetUrl] = useState("");
  const [newTargetType, setNewTargetType] = useState<'results' | 'feed' | 'api'>('results');
  const [newTargetPriority, setNewTargetPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newTargetState, setNewTargetState] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get monitoring status
  const { data: monitoringStatus, isLoading, error } = useQuery<MonitoringStatus>({
    queryKey: ["/api/monitoring/status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Start monitoring mutation
  const startMonitoringMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/monitoring/start", { intervalMinutes }),
    onSuccess: () => {
      toast({
        title: "Monitoring Started",
        description: "Real-time election monitoring is now active",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/monitoring/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Start Monitoring",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Stop monitoring mutation
  const stopMonitoringMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/monitoring/stop"),
    onSuccess: () => {
      toast({
        title: "Monitoring Stopped",
        description: "Real-time election monitoring has been stopped",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/monitoring/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Stop Monitoring",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add monitoring target mutation
  const addTargetMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/monitoring/targets", {
      url: newTargetUrl,
      type: newTargetType,
      priority: newTargetPriority,
      state: newTargetState || undefined,
    }),
    onSuccess: () => {
      toast({
        title: "Target Added",
        description: "New monitoring target has been added successfully",
      });
      setNewTargetUrl("");
      setNewTargetState("");
      queryClient.invalidateQueries({ queryKey: ["/api/monitoring/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Target",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartMonitoring = () => {
    startMonitoringMutation.mutate();
  };

  const handleStopMonitoring = () => {
    stopMonitoringMutation.mutate();
  };

  const handleAddTarget = () => {
    if (!newTargetUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a valid URL for the monitoring target",
        variant: "destructive",
      });
      return;
    }
    addTargetMutation.mutate();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Globe className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading monitoring dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load monitoring status. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHead {...pageMetadata.monitoring} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real-Time Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor election results and data feeds across multiple sources
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {monitoringStatus?.isRunning ? (
            <Button 
              onClick={handleStopMonitoring} 
              variant="destructive"
              disabled={stopMonitoringMutation.isPending}
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Monitoring
            </Button>
          ) : (
            <Button 
              onClick={handleStartMonitoring}
              disabled={startMonitoringMutation.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              Start Monitoring
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {monitoringStatus?.isRunning ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold text-green-600">Active</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold text-red-600">Stopped</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Targets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitoringStatus?.targetCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {monitoringStatus?.activeTargets || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Check</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {monitoringStatus?.lastChecked ? 
                new Date(monitoringStatus.lastChecked).toLocaleString() : 
                'Never'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="targets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="targets">Monitoring Targets</TabsTrigger>
          <TabsTrigger value="add">Add Target</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="targets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Monitoring Targets</CardTitle>
              <CardDescription>
                Election result sites and data feeds being monitored
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monitoringStatus?.targets && monitoringStatus.targets.length > 0 ? (
                <div className="space-y-3">
                  {monitoringStatus.targets.map((target, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {getStatusIcon(target.status)}
                          <span className="font-medium truncate">{target.url}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className={getPriorityColor(target.priority)}>
                            {target.priority}
                          </Badge>
                          <Badge variant="outline">
                            {target.type}
                          </Badge>
                          {target.state && (
                            <Badge variant="outline">
                              {target.state}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {target.lastChecked ? 
                          new Date(target.lastChecked).toLocaleTimeString() : 
                          'Not checked'
                        }
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No monitoring targets configured</p>
                  <p className="text-sm">Add targets to start monitoring election data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Monitoring Target</CardTitle>
              <CardDescription>
                Add a new election site or data feed to monitor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">URL</label>
                <Input
                  placeholder="https://example.com/election-results"
                  value={newTargetUrl}
                  onChange={(e) => setNewTargetUrl(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={newTargetType} onValueChange={(value: 'results' | 'feed' | 'api') => setNewTargetType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="results">Results Page</SelectItem>
                      <SelectItem value="feed">Data Feed</SelectItem>
                      <SelectItem value="api">API Endpoint</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={newTargetPriority} onValueChange={(value: 'high' | 'medium' | 'low') => setNewTargetPriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">State (Optional)</label>
                <Input
                  placeholder="e.g., CA, TX, NY"
                  value={newTargetState}
                  onChange={(e) => setNewTargetState(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleAddTarget} 
                className="w-full"
                disabled={addTargetMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Monitoring Target
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring Settings</CardTitle>
              <CardDescription>
                Configure monitoring intervals and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Check Interval (minutes)</label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 5)}
                />
                <p className="text-xs text-muted-foreground">
                  How often to check monitoring targets for updates
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Lower intervals provide more real-time updates but use more resources. 
                  Recommended: 5-15 minutes for most use cases.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}