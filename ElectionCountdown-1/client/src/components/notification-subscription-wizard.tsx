import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Mail, Phone, Bell, MapPin, Users, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

interface SubscriptionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: string;
  initialChannel?: 'email' | 'sms';
}

interface SubscriptionStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

const SUBSCRIPTION_TYPES = [
  {
    id: 'election_alerts',
    name: 'Election Alerts',
    description: 'Results, updates, and breaking news',
    icon: Bell,
    urgency: 'high'
  },
  {
    id: 'candidate_updates',
    name: 'Candidate Updates',
    description: 'News and position changes',
    icon: Users,
    urgency: 'medium'
  },
  {
    id: 'breaking_news',
    name: 'Breaking News',
    description: 'Urgent election developments',
    icon: AlertCircle,
    urgency: 'urgent'
  },
  {
    id: 'weekly_digest',
    name: 'Weekly Digest',
    description: 'Summary of the week\'s events',
    icon: Calendar,
    urgency: 'low'
  },
  {
    id: 'deadline_reminders',
    name: 'Deadline Reminders',
    description: 'Registration and voting deadlines',
    icon: Calendar,
    urgency: 'high'
  }
];

const ELECTION_TYPES = [
  { id: 'primary', name: 'Primary Elections' },
  { id: 'general', name: 'General Elections' },
  { id: 'special', name: 'Special Elections' },
  { id: 'runoff', name: 'Runoff Elections' }
];

const ELECTION_LEVELS = [
  { id: 'federal', name: 'Federal (President, Congress)' },
  { id: 'state', name: 'State (Governor, Legislature)' },
  { id: 'local', name: 'Local (Mayor, City Council)' }
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

export function NotificationSubscriptionWizard({ isOpen, onClose, initialType, initialChannel }: SubscriptionWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    subscriptionType: initialType || '',
    channel: initialChannel || '',
    targetValue: '',
    electionTypes: [] as string[],
    electionLevels: [] as string[],
    states: [] as string[],
    parties: [] as string[],
    consent: false
  });

  const steps: SubscriptionStep[] = [
    {
      id: 'type',
      title: 'Choose Notification Type',
      description: 'Select what you want to be notified about',
      completed: !!formData.subscriptionType
    },
    {
      id: 'channel',
      title: 'Select Delivery Method',
      description: 'Choose how you want to receive notifications',
      completed: !!formData.channel && !!formData.targetValue
    },
    {
      id: 'filters',
      title: 'Set Preferences',
      description: 'Customize what elections to follow',
      completed: formData.electionTypes.length > 0 && formData.electionLevels.length > 0
    },
    {
      id: 'consent',
      title: 'Review & Consent',
      description: 'Review settings and provide consent',
      completed: formData.consent
    }
  ];

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: (subscriptionData: any) =>
      apiRequest('/api/notifications/subscribe', 'POST', subscriptionData),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/subscriptions'] });
      
      if (data.verificationRequired) {
        toast({
          title: 'Verification Required',
          description: `Please check your ${formData.channel} for verification instructions.`,
        });
      } else {
        toast({
          title: 'Subscribed Successfully',
          description: 'You are now subscribed to notifications.',
        });
      }
      
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Subscription Failed',
        description: error.message || 'Failed to create subscription',
        variant: 'destructive',
      });
    }
  });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (!formData.consent) {
      toast({
        title: 'Consent Required',
        description: 'Please provide consent to create the subscription.',
        variant: 'destructive',
      });
      return;
    }

    subscribeMutation.mutate({
      subscriptionType: formData.subscriptionType,
      channel: formData.channel,
      targetValue: formData.targetValue,
      preferences: {
        electionTypes: formData.electionTypes,
        electionLevels: formData.electionLevels,
        states: formData.states,
        parties: formData.parties
      }
    });
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: 'electionTypes' | 'electionLevels' | 'states' | 'parties', item: string) => {
    const currentArray = formData[field];
    const newArray = currentArray.includes(item)
      ? currentArray.filter(i => i !== item)
      : [...currentArray, item];
    updateFormData(field, newArray);
  };

  const canProceed = () => {
    return steps[currentStep].completed || 
           (currentStep === 0 && formData.subscriptionType) ||
           (currentStep === 1 && formData.channel && formData.targetValue) ||
           (currentStep === 2 && formData.electionTypes.length > 0 && formData.electionLevels.length > 0) ||
           (currentStep === 3 && formData.consent);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="subscription-wizard-dialog">
        <DialogHeader>
          <DialogTitle>Subscribe to Notifications</DialogTitle>
          <DialogDescription>
            Set up your notification preferences in a few simple steps
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${index <= currentStep 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
                }
              `}>
                {step.completed ? <CheckCircle className="w-4 h-4" /> : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  w-16 h-0.5 mx-2
                  ${index < currentStep ? 'bg-blue-600' : 'bg-gray-200'}
                `} />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {/* Step 1: Choose Notification Type */}
          {currentStep === 0 && (
            <div className="space-y-4" data-testid="step-notification-type">
              <div>
                <h3 className="text-lg font-medium mb-2">{steps[0].title}</h3>
                <p className="text-muted-foreground mb-4">{steps[0].description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SUBSCRIPTION_TYPES.map(type => (
                  <Card
                    key={type.id}
                    className={`cursor-pointer transition-colors ${
                      formData.subscriptionType === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => updateFormData('subscriptionType', type.id)}
                    data-testid={`card-subscription-type-${type.id}`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <type.icon className="w-5 h-5" />
                        {type.name}
                        <Badge variant={
                          type.urgency === 'urgent' ? 'destructive' :
                          type.urgency === 'high' ? 'default' :
                          type.urgency === 'medium' ? 'secondary' : 'outline'
                        }>
                          {type.urgency}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Delivery Method */}
          {currentStep === 1 && (
            <div className="space-y-4" data-testid="step-delivery-method">
              <div>
                <h3 className="text-lg font-medium mb-2">{steps[1].title}</h3>
                <p className="text-muted-foreground mb-4">{steps[1].description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                  className={`cursor-pointer transition-colors ${
                    formData.channel === 'email'
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => updateFormData('channel', 'email')}
                  data-testid="card-channel-email"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Mail className="w-5 h-5" />
                      Email
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Rich formatting, images, and detailed content
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-colors ${
                    formData.channel === 'sms'
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => updateFormData('channel', 'sms')}
                  data-testid="card-channel-sms"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Phone className="w-5 h-5" />
                      SMS
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Instant delivery for urgent alerts
                    </p>
                  </CardContent>
                </Card>
              </div>

              {formData.channel && (
                <div className="space-y-2">
                  <Label htmlFor="target-value">
                    {formData.channel === 'email' ? 'Email Address' : 'Phone Number'}
                  </Label>
                  <Input
                    id="target-value"
                    placeholder={
                      formData.channel === 'email'
                        ? 'your@email.com'
                        : '+1 (555) 123-4567'
                    }
                    value={formData.targetValue}
                    onChange={(e) => updateFormData('targetValue', e.target.value)}
                    data-testid="input-target-value"
                  />
                  {formData.channel === 'sms' && (
                    <p className="text-xs text-muted-foreground">
                      Include country code for international numbers
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Set Preferences */}
          {currentStep === 2 && (
            <div className="space-y-6" data-testid="step-preferences">
              <div>
                <h3 className="text-lg font-medium mb-2">{steps[2].title}</h3>
                <p className="text-muted-foreground mb-4">{steps[2].description}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Election Types</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select which types of elections to follow
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {ELECTION_TYPES.map(type => (
                      <div key={type.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`election-type-${type.id}`}
                          checked={formData.electionTypes.includes(type.id)}
                          onCheckedChange={() => toggleArrayItem('electionTypes', type.id)}
                          data-testid={`checkbox-election-type-${type.id}`}
                        />
                        <Label htmlFor={`election-type-${type.id}`} className="text-sm">
                          {type.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium">Election Levels</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose which government levels to follow
                  </p>
                  <div className="space-y-2">
                    {ELECTION_LEVELS.map(level => (
                      <div key={level.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`election-level-${level.id}`}
                          checked={formData.electionLevels.includes(level.id)}
                          onCheckedChange={() => toggleArrayItem('electionLevels', level.id)}
                          data-testid={`checkbox-election-level-${level.id}`}
                        />
                        <Label htmlFor={`election-level-${level.id}`} className="text-sm">
                          {level.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium">States (Optional)</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Leave empty to follow all states, or select specific states
                  </p>
                  <div className="grid grid-cols-6 md:grid-cols-8 gap-2 max-h-32 overflow-y-auto p-2 border rounded">
                    {US_STATES.map(state => (
                      <div key={state} className="flex items-center space-x-1">
                        <Checkbox
                          id={`state-${state}`}
                          checked={formData.states.includes(state)}
                          onCheckedChange={() => toggleArrayItem('states', state)}
                          data-testid={`checkbox-state-${state}`}
                        />
                        <Label htmlFor={`state-${state}`} className="text-xs">
                          {state}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Consent */}
          {currentStep === 3 && (
            <div className="space-y-6" data-testid="step-consent">
              <div>
                <h3 className="text-lg font-medium mb-2">{steps[3].title}</h3>
                <p className="text-muted-foreground mb-4">{steps[3].description}</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Subscription Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">
                      {SUBSCRIPTION_TYPES.find(t => t.id === formData.subscriptionType)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery:</span>
                    <span className="font-medium">
                      {formData.channel} ({formData.targetValue})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Election Types:</span>
                    <span className="font-medium">
                      {formData.electionTypes.length} selected
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Levels:</span>
                    <span className="font-medium">
                      {formData.electionLevels.length} selected
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">States:</span>
                    <span className="font-medium">
                      {formData.states.length === 0 ? 'All states' : `${formData.states.length} selected`}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  By subscribing, you consent to receive notifications at the provided contact information. 
                  You can unsubscribe at any time. Your data will be processed according to our privacy policy.
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="consent"
                  checked={formData.consent}
                  onCheckedChange={(checked) => updateFormData('consent', checked)}
                  data-testid="checkbox-consent"
                />
                <Label htmlFor="consent" className="text-sm">
                  I consent to receive notifications and understand that I can unsubscribe at any time
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack} data-testid="button-back">
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                data-testid="button-next"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!formData.consent || subscribeMutation.isPending}
                data-testid="button-subscribe"
              >
                {subscribeMutation.isPending ? 'Subscribing...' : 'Subscribe'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}