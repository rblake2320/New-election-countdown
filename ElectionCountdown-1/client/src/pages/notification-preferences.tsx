import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Bell, Mail, Phone, MapPin, Clock, Shield, CheckCircle, AlertCircle } from 'lucide-react';

interface NotificationPreferences {
  id: number;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  phoneNumber?: string;
  electionResultsEnabled: boolean;
  candidateUpdatesEnabled: boolean;
  breakingNewsEnabled: boolean;
  weeklyDigestEnabled: boolean;
  deadlineRemindersEnabled: boolean;
  stateFilter: string[];
  localElectionsEnabled: boolean;
  federalElectionsEnabled: boolean;
  immediateNotifications: boolean;
  dailyDigest: boolean;
  weeklyDigest: boolean;
  preferredDeliveryTime: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

interface Subscription {
  id: number;
  subscriptionType: string;
  channel: string;
  targetValue: string;
  isVerified: boolean;
  isActive: boolean;
  electionTypes?: string[];
  electionLevels?: string[];
  states?: string[];
  parties?: string[];
  createdAt: string;
}

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' }
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu'
];

export default function NotificationPreferences() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<NotificationPreferences>>({});
  const [pendingVerifications, setPendingVerifications] = useState<string[]>([]);

  // Fetch user preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['/api/notifications/preferences'],
    enabled: true
  });

  // Fetch user subscriptions
  const { data: subscriptions } = useQuery<Subscription[]>({
    queryKey: ['/api/notifications/subscriptions'],
    enabled: true
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (updates: Partial<NotificationPreferences>) =>
      apiRequest('/api/notifications/preferences', 'PUT', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences'] });
      toast({
        title: 'Preferences Updated',
        description: 'Your notification preferences have been saved.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update preferences',
        variant: 'destructive',
      });
    }
  });

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: (subscriptionData: any) =>
      apiRequest('/api/notifications/subscribe', 'POST', subscriptionData),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/subscriptions'] });
      if (data.verificationRequired) {
        setPendingVerifications(prev => [...prev, data.subscription.channel]);
        toast({
          title: 'Verification Required',
          description: `Please check your ${data.subscription.channel} for verification instructions.`,
        });
      } else {
        toast({
          title: 'Subscribed Successfully',
          description: 'You are now subscribed to notifications.',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Subscription Failed',
        description: error.message || 'Failed to create subscription',
        variant: 'destructive',
      });
    }
  });

  // Verify subscription mutation
  const verifyMutation = useMutation({
    mutationFn: (token: string) =>
      apiRequest('/api/notifications/verify', 'POST', { token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/subscriptions'] });
      toast({
        title: 'Verification Successful',
        description: 'Your subscription has been verified.',
      });
    }
  });

  useEffect(() => {
    if (preferences) {
      setFormData(preferences);
    }
  }, [preferences]);

  const handlePreferenceChange = (field: keyof NotificationPreferences, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePreferences = () => {
    updatePreferencesMutation.mutate(formData);
  };

  const handleSubscribe = (subscriptionType: string, channel: 'email' | 'sms') => {
    const targetValue = channel === 'email' 
      ? 'user@example.com' // In real app, get from user profile
      : formData.phoneNumber;

    if (channel === 'sms' && !targetValue) {
      toast({
        title: 'Phone Number Required',
        description: 'Please enter your phone number first.',
        variant: 'destructive',
      });
      return;
    }

    subscribeMutation.mutate({
      subscriptionType,
      channel,
      targetValue,
      preferences: {
        electionTypes: ['general', 'primary'],
        electionLevels: ['federal', 'state'],
        states: formData.stateFilter || [],
        parties: []
      }
    });
  };

  const handleTestNotification = async (type: 'email' | 'sms') => {
    try {
      await apiRequest('/api/notifications/test', 'POST', { type });
      toast({
        title: 'Test Notification Sent',
        description: `Check your ${type} for the test notification.`,
      });
    } catch (error: any) {
      toast({
        title: 'Test Failed',
        description: error.message || 'Failed to send test notification',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="notification-preferences-page">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Notification Preferences</h1>
        <p className="text-muted-foreground">
          Manage how and when you receive election updates and alerts.
        </p>
      </div>

      <Tabs defaultValue="channels" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="channels" data-testid="tab-channels">Channels</TabsTrigger>
          <TabsTrigger value="content" data-testid="tab-content">Content</TabsTrigger>
          <TabsTrigger value="timing" data-testid="tab-timing">Timing</TabsTrigger>
          <TabsTrigger value="geography" data-testid="tab-geography">Geography</TabsTrigger>
          <TabsTrigger value="privacy" data-testid="tab-privacy">Privacy</TabsTrigger>
        </TabsList>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Receive election alerts and updates via email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get comprehensive election updates with rich formatting
                  </p>
                </div>
                <Switch
                  checked={formData.emailEnabled || false}
                  onCheckedChange={(checked) => handlePreferenceChange('emailEnabled', checked)}
                  data-testid="switch-email-enabled"
                />
              </div>

              {formData.emailEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSubscribe('election_alerts', 'email')}
                      data-testid="button-subscribe-email-alerts"
                    >
                      Subscribe to Election Alerts
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestNotification('email')}
                      data-testid="button-test-email"
                    >
                      Send Test Email
                    </Button>
                  </div>

                  {pendingVerifications.includes('email') && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Please check your email for verification instructions.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                SMS Notifications
              </CardTitle>
              <CardDescription>
                Receive urgent alerts via text message
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get immediate alerts for urgent election news
                  </p>
                </div>
                <Switch
                  checked={formData.smsEnabled || false}
                  onCheckedChange={(checked) => handlePreferenceChange('smsEnabled', checked)}
                  data-testid="switch-sms-enabled"
                />
              </div>

              {formData.smsEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-green-200">
                  <div className="space-y-2">
                    <Label htmlFor="phone-number">Phone Number</Label>
                    <Input
                      id="phone-number"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phoneNumber || ''}
                      onChange={(e) => handlePreferenceChange('phoneNumber', e.target.value)}
                      data-testid="input-phone-number"
                    />
                    <p className="text-xs text-muted-foreground">
                      Include country code for international numbers
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSubscribe('breaking_news', 'sms')}
                      disabled={!formData.phoneNumber}
                      data-testid="button-subscribe-sms-alerts"
                    >
                      Subscribe to SMS Alerts
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestNotification('sms')}
                      disabled={!formData.phoneNumber}
                      data-testid="button-test-sms"
                    >
                      Send Test SMS
                    </Button>
                  </div>

                  {pendingVerifications.includes('sms') && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Please check your phone for verification code.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Types
              </CardTitle>
              <CardDescription>
                Choose what types of election updates you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Election Results</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when election results are available
                    </p>
                  </div>
                  <Switch
                    checked={formData.electionResultsEnabled || false}
                    onCheckedChange={(checked) => handlePreferenceChange('electionResultsEnabled', checked)}
                    data-testid="switch-election-results"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Candidate Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      News and updates about candidates
                    </p>
                  </div>
                  <Switch
                    checked={formData.candidateUpdatesEnabled || false}
                    onCheckedChange={(checked) => handlePreferenceChange('candidateUpdatesEnabled', checked)}
                    data-testid="switch-candidate-updates"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Breaking News</Label>
                    <p className="text-sm text-muted-foreground">
                      Urgent election-related news
                    </p>
                  </div>
                  <Switch
                    checked={formData.breakingNewsEnabled || false}
                    onCheckedChange={(checked) => handlePreferenceChange('breakingNewsEnabled', checked)}
                    data-testid="switch-breaking-news"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Weekly Digest</Label>
                    <p className="text-sm text-muted-foreground">
                      Summary of the week's election news
                    </p>
                  </div>
                  <Switch
                    checked={formData.weeklyDigestEnabled || false}
                    onCheckedChange={(checked) => handlePreferenceChange('weeklyDigestEnabled', checked)}
                    data-testid="switch-weekly-digest"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Deadline Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Registration and voting deadlines
                    </p>
                  </div>
                  <Switch
                    checked={formData.deadlineRemindersEnabled || false}
                    onCheckedChange={(checked) => handlePreferenceChange('deadlineRemindersEnabled', checked)}
                    data-testid="switch-deadline-reminders"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timing Tab */}
        <TabsContent value="timing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Delivery Schedule
              </CardTitle>
              <CardDescription>
                Control when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Immediate</Label>
                    <p className="text-sm text-muted-foreground">
                      As events happen
                    </p>
                  </div>
                  <Switch
                    checked={formData.immediateNotifications || false}
                    onCheckedChange={(checked) => handlePreferenceChange('immediateNotifications', checked)}
                    data-testid="switch-immediate"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Daily Digest</Label>
                    <p className="text-sm text-muted-foreground">
                      Once per day
                    </p>
                  </div>
                  <Switch
                    checked={formData.dailyDigest || false}
                    onCheckedChange={(checked) => handlePreferenceChange('dailyDigest', checked)}
                    data-testid="switch-daily"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Weekly Digest</Label>
                    <p className="text-sm text-muted-foreground">
                      Once per week
                    </p>
                  </div>
                  <Switch
                    checked={formData.weeklyDigest || false}
                    onCheckedChange={(checked) => handlePreferenceChange('weeklyDigest', checked)}
                    data-testid="switch-weekly"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="delivery-time">Preferred Delivery Time</Label>
                  <Input
                    id="delivery-time"
                    type="time"
                    value={formData.preferredDeliveryTime || '09:00'}
                    onChange={(e) => handlePreferenceChange('preferredDeliveryTime', e.target.value)}
                    data-testid="input-delivery-time"
                  />
                  <p className="text-sm text-muted-foreground">
                    For scheduled notifications like daily/weekly digests
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={formData.timezone || 'America/New_York'}
                    onValueChange={(value) => handlePreferenceChange('timezone', value)}
                  >
                    <SelectTrigger data-testid="select-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz} value={tz}>
                          {tz.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Geography Tab */}
        <TabsContent value="geography" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Geographic Preferences
              </CardTitle>
              <CardDescription>
                Choose which regions and election levels to follow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Federal Elections</Label>
                    <p className="text-sm text-muted-foreground">
                      Presidential, Congressional
                    </p>
                  </div>
                  <Switch
                    checked={formData.federalElectionsEnabled || false}
                    onCheckedChange={(checked) => handlePreferenceChange('federalElectionsEnabled', checked)}
                    data-testid="switch-federal-elections"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <Label>State Elections</Label>
                    <p className="text-sm text-muted-foreground">
                      Governor, state legislature
                    </p>
                  </div>
                  <Switch
                    checked={true} // Always enabled for state elections
                    onCheckedChange={() => {}} // No-op, always enabled
                    disabled
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Local Elections</Label>
                    <p className="text-sm text-muted-foreground">
                      Mayor, city council, ballot measures
                    </p>
                  </div>
                  <Switch
                    checked={formData.localElectionsEnabled || false}
                    onCheckedChange={(checked) => handlePreferenceChange('localElectionsEnabled', checked)}
                    data-testid="switch-local-elections"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>States to Follow</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {US_STATES.map(state => (
                    <div key={state.code} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`state-${state.code}`}
                        checked={formData.stateFilter?.includes(state.code) || false}
                        onChange={(e) => {
                          const currentStates = formData.stateFilter || [];
                          const newStates = e.target.checked
                            ? [...currentStates, state.code]
                            : currentStates.filter(s => s !== state.code);
                          handlePreferenceChange('stateFilter', newStates);
                        }}
                        data-testid={`checkbox-state-${state.code}`}
                        className="rounded border-gray-300"
                      />
                      <Label
                        htmlFor={`state-${state.code}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {state.code}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Select the states you want to follow. Leave empty to follow all states.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy & Consent
              </CardTitle>
              <CardDescription>
                Manage your data privacy and consent preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your data is protected according to GDPR and CCPA privacy regulations.
                  You can withdraw consent or delete your data at any time.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h4 className="font-medium">Current Subscriptions</h4>
                {subscriptions && subscriptions.length > 0 ? (
                  <div className="space-y-2">
                    {subscriptions.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{sub.subscriptionType.replace('_', ' ')}</span>
                            <Badge variant={sub.isVerified ? 'default' : 'secondary'}>
                              {sub.isVerified ? 'Verified' : 'Pending'}
                            </Badge>
                            <Badge variant={sub.isActive ? 'default' : 'destructive'}>
                              {sub.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {sub.channel}: {sub.targetValue}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" data-testid={`button-unsubscribe-${sub.id}`}>
                          Unsubscribe
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No active subscriptions</p>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Data Management</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="justify-start" data-testid="button-export-data">
                    Export My Data
                  </Button>
                  <Button variant="outline" className="justify-start" data-testid="button-delete-data">
                    Delete My Data
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Export your data to see what information we have, or request deletion of your account and all associated data.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline" data-testid="button-reset-preferences">
          Reset to Defaults
        </Button>
        <Button
          onClick={handleSavePreferences}
          disabled={updatePreferencesMutation.isPending}
          data-testid="button-save-preferences"
        >
          {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}