import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Bell, 
  Send, 
  Users, 
  BarChart3, 
  Settings, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Mail, 
  Phone,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Eye,
  Download
} from 'lucide-react';

interface NotificationCampaign {
  id: number;
  name: string;
  description?: string;
  templateId?: number;
  campaignType: 'immediate' | 'scheduled' | 'triggered';
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused' | 'cancelled';
  targetAudience: any;
  estimatedRecipients: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  customSubject?: string;
  customContent?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  rateLimit: number;
  retryAttempts: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalBounced: number;
  totalClicked: number;
  totalOpened: number;
  totalUnsubscribed: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface QueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  averageProcessingTime: number;
  successRate: number;
}

interface AlertTrigger {
  id: string;
  name: string;
  description: string;
  eventType: string;
  priority: string;
  isActive: boolean;
  cooldownMinutes: number;
}

export default function AdminNotificationDashboard() {
  const { toast } = useToast();
  const [selectedCampaign, setSelectedCampaign] = useState<NotificationCampaign | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<NotificationCampaign>>({});

  // Fetch campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery<NotificationCampaign[]>({
    queryKey: ['/api/admin/notification-campaigns'],
    enabled: true
  });

  // Fetch queue statistics
  const { data: queueStats } = useQuery<QueueStats>({
    queryKey: ['/api/admin/notification-queue/stats'],
    enabled: true,
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Fetch alert triggers
  const { data: triggers } = useQuery<AlertTrigger[]>({
    queryKey: ['/api/admin/alert-triggers'],
    enabled: true
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: (campaignData: Partial<NotificationCampaign>) =>
      apiRequest('/api/admin/notification-campaigns', 'POST', campaignData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notification-campaigns'] });
      setIsCreateDialogOpen(false);
      setFormData({});
      toast({
        title: 'Campaign Created',
        description: 'The notification campaign has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create campaign',
        variant: 'destructive',
      });
    }
  });

  // Update campaign status mutation
  const updateCampaignStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest(`/api/admin/notification-campaigns/${id}/status`, 'PUT', { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notification-campaigns'] });
      toast({
        title: 'Status Updated',
        description: 'Campaign status has been updated.',
      });
    }
  });

  // Send test notification mutation
  const sendTestMutation = useMutation({
    mutationFn: (testData: any) =>
      apiRequest('/api/admin/notifications/send-test', 'POST', testData),
    onSuccess: () => {
      toast({
        title: 'Test Sent',
        description: 'Test notification has been sent.',
      });
    }
  });

  const handleCreateCampaign = () => {
    if (!formData.name || !formData.campaignType) {
      toast({
        title: 'Missing Information',
        description: 'Please provide campaign name and type.',
        variant: 'destructive',
      });
      return;
    }

    createCampaignMutation.mutate({
      ...formData,
      priority: formData.priority || 'normal',
      rateLimit: formData.rateLimit || 100,
      retryAttempts: formData.retryAttempts || 3,
      estimatedRecipients: 0,
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0
    });
  };

  const handleStatusChange = (campaignId: number, newStatus: string) => {
    updateCampaignStatusMutation.mutate({ id: campaignId, status: newStatus });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'sending': return 'secondary';
      case 'scheduled': return 'outline';
      case 'paused': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const calculateSuccessRate = (campaign: NotificationCampaign) => {
    const total = campaign.totalSent;
    if (total === 0) return 0;
    return Math.round((campaign.totalDelivered / total) * 100);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="admin-notification-dashboard">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notification Management</h1>
          <p className="text-muted-foreground">
            Manage notification campaigns, monitor delivery, and configure alerts
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-campaign">
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" data-testid="dialog-create-campaign">
            <DialogHeader>
              <DialogTitle>Create Notification Campaign</DialogTitle>
              <DialogDescription>
                Set up a new notification campaign for your users
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  placeholder="e.g., Election Day Reminders"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-campaign-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="campaign-description">Description</Label>
                <Textarea
                  id="campaign-description"
                  placeholder="Brief description of the campaign"
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  data-testid="textarea-campaign-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Campaign Type</Label>
                  <Select
                    value={formData.campaignType || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, campaignType: value as any }))}
                  >
                    <SelectTrigger data-testid="select-campaign-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="triggered">Triggered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority || 'normal'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
                  >
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate-limit">Rate Limit (per minute)</Label>
                  <Input
                    id="rate-limit"
                    type="number"
                    placeholder="100"
                    value={formData.rateLimit || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, rateLimit: parseInt(e.target.value) || 100 }))}
                    data-testid="input-rate-limit"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retry-attempts">Retry Attempts</Label>
                  <Input
                    id="retry-attempts"
                    type="number"
                    placeholder="3"
                    value={formData.retryAttempts || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, retryAttempts: parseInt(e.target.value) || 3 }))}
                    data-testid="input-retry-attempts"
                  />
                </div>
              </div>

              {formData.campaignType === 'scheduled' && (
                <div className="space-y-2">
                  <Label htmlFor="scheduled-time">Scheduled Time</Label>
                  <Input
                    id="scheduled-time"
                    type="datetime-local"
                    value={formData.scheduledAt || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                    data-testid="input-scheduled-time"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateCampaign}
                disabled={createCampaignMutation.isPending}
                data-testid="button-save-campaign"
              >
                {createCampaignMutation.isPending ? 'Creating...' : 'Create Campaign'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="queue" data-testid="tab-queue">Queue Status</TabsTrigger>
          <TabsTrigger value="triggers" data-testid="tab-triggers">Alert Triggers</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {campaigns?.filter(c => c.status === 'sending').length || 0} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queueStats?.queued || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {queueStats?.processing || 0} processing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {queueStats?.successRate?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {queueStats?.completed || 0} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Triggers</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {triggers?.filter(t => t.isActive).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {triggers?.length || 0} total
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest notification events and campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {campaigns?.slice(0, 5).map(campaign => (
                    <div key={campaign.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(campaign.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Notification system status and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Queue Processing</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Healthy</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Email Service</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Connected</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SMS Service</span>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">Limited</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Alert Engine</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Active</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Campaigns</CardTitle>
              <CardDescription>
                Manage and monitor your notification campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="text-center py-6">Loading campaigns...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns?.map(campaign => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {campaign.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{campaign.campaignType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(campaign.priority)}>
                            {campaign.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="font-medium">{campaign.totalSent}</div>
                            <div className="text-xs text-muted-foreground">
                              of {campaign.estimatedRecipients}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={calculateSuccessRate(campaign)} 
                              className="w-16" 
                            />
                            <span className="text-sm">
                              {calculateSuccessRate(campaign)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedCampaign(campaign)}
                              data-testid={`button-view-campaign-${campaign.id}`}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            
                            {campaign.status === 'draft' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleStatusChange(campaign.id, 'scheduled')}
                                data-testid={`button-start-campaign-${campaign.id}`}
                              >
                                <Play className="w-3 h-3" />
                              </Button>
                            )}
                            
                            {campaign.status === 'sending' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleStatusChange(campaign.id, 'paused')}
                                data-testid={`button-pause-campaign-${campaign.id}`}
                              >
                                <Pause className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queue Status Tab */}
        <TabsContent value="queue" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Queue Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Queued:</span>
                  <span className="font-medium">{queueStats?.queued || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Processing:</span>
                  <span className="font-medium">{queueStats?.processing || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed:</span>
                  <span className="font-medium text-green-600">{queueStats?.completed || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Failed:</span>
                  <span className="font-medium text-red-600">{queueStats?.failed || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Success Rate:</span>
                  <span className="font-medium">{queueStats?.successRate?.toFixed(1) || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Processing:</span>
                  <span className="font-medium">{queueStats?.averageProcessingTime?.toFixed(0) || 0}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Processed:</span>
                  <span className="font-medium">{queueStats?.totalProcessed || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => sendTestMutation.mutate({ type: 'email', message: 'Test email notification' })}
                  data-testid="button-test-email"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Test Email
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => sendTestMutation.mutate({ type: 'sms', message: 'Test SMS notification' })}
                  data-testid="button-test-sms"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Send Test SMS
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alert Triggers Tab */}
        <TabsContent value="triggers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alert Triggers</CardTitle>
              <CardDescription>
                Configure automatic notification triggers for election events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Cooldown</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {triggers?.map(trigger => (
                    <TableRow key={trigger.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{trigger.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {trigger.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{trigger.eventType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(trigger.priority)}>
                          {trigger.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{trigger.cooldownMinutes}m</TableCell>
                      <TableCell>
                        <Badge variant={trigger.isActive ? 'default' : 'secondary'}>
                          {trigger.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" data-testid={`button-edit-trigger-${trigger.id}`}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm" data-testid={`button-delete-trigger-${trigger.id}`}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Analytics</CardTitle>
                <CardDescription>Overall notification delivery performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <BarChart3 className="h-4 w-4" />
                    <AlertDescription>
                      Detailed analytics dashboard with charts and metrics will be available here.
                      This would include delivery rates, open rates, click rates, and engagement metrics.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
                <CardDescription>Download reports and analytics data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start" data-testid="button-export-campaigns">
                  <Download className="w-4 h-4 mr-2" />
                  Export Campaign Data
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-export-analytics">
                  <Download className="w-4 h-4 mr-2" />
                  Export Analytics Report
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-export-delivery-logs">
                  <Download className="w-4 h-4 mr-2" />
                  Export Delivery Logs
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}