import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Users, 
  Bell, 
  Briefcase, 
  Building, 
  Flag, 
  Mail, 
  Clock,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  SkipForward
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// US States list
const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" }
];

// Validation schema for onboarding preferences
const onboardingPreferencesSchema = z.object({
  // Location preferences
  state: z.string().optional(),
  city: z.string().optional(),
  congressionalDistrict: z.string().optional(),
  
  // Political interests
  federalElectionsInterest: z.boolean().default(true),
  stateElectionsInterest: z.boolean().default(true),
  localElectionsInterest: z.boolean().default(false),
  candidateProfilesInterest: z.boolean().default(true),
  votingRecordsInterest: z.boolean().default(false),
  
  // Election types
  primaryElectionsEnabled: z.boolean().default(true),
  generalElectionsEnabled: z.boolean().default(true),
  specialElectionsEnabled: z.boolean().default(false),
  runoffElectionsEnabled: z.boolean().default(false),
  
  // Notification preferences
  digestFrequency: z.enum(['daily', 'weekly', 'monthly', 'never']).default('weekly'),
  breakingNewsAlerts: z.boolean().default(false),
  electionReminderAlerts: z.boolean().default(true),
  candidateUpdateAlerts: z.boolean().default(false),
  
  // Content preferences
  candidateInformationDepth: z.enum(['minimal', 'standard', 'detailed']).default('standard'),
  pollingDataInterest: z.boolean().default(true),
  endorsementDataInterest: z.boolean().default(false),
  
  // Privacy preferences
  dataUsageConsent: z.boolean().default(true),
  personalizationEnabled: z.boolean().default(true),
  analyticsOptOut: z.boolean().default(false),
});

type OnboardingPreferencesFormData = z.infer<typeof onboardingPreferencesSchema>;

interface OnboardingPreferencesProps {
  onComplete: (preferences: OnboardingPreferencesFormData) => void;
  onSkip: () => void;
}

export function OnboardingPreferences({ onComplete, onSkip }: OnboardingPreferencesProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedState, setSelectedState] = useState<string>("");
  const { toast } = useToast();
  
  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const form = useForm<OnboardingPreferencesFormData>({
    resolver: zodResolver(onboardingPreferencesSchema),
    defaultValues: {
      federalElectionsInterest: true,
      stateElectionsInterest: true,
      localElectionsInterest: false,
      candidateProfilesInterest: true,
      votingRecordsInterest: false,
      primaryElectionsEnabled: true,
      generalElectionsEnabled: true,
      specialElectionsEnabled: false,
      runoffElectionsEnabled: false,
      digestFrequency: 'weekly',
      breakingNewsAlerts: false,
      electionReminderAlerts: true,
      candidateUpdateAlerts: false,
      candidateInformationDepth: 'standard',
      pollingDataInterest: true,
      endorsementDataInterest: false,
      dataUsageConsent: true,
      personalizationEnabled: true,
      analyticsOptOut: false,
    },
  });

  // Get congressional districts for selected state
  const { data: districts, isLoading: districtsLoading } = useQuery({
    queryKey: ['/api/user/preferences/congressional-districts', selectedState],
    enabled: !!selectedState,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/user/preferences/congressional-districts?state=${selectedState}`);
      return response.json();
    },
  });

  // Watch state changes to reset district
  useEffect(() => {
    const stateValue = form.watch('state');
    if (stateValue !== selectedState) {
      setSelectedState(stateValue || '');
      form.setValue('congressionalDistrict', '');
    }
  }, [form.watch('state')]);

  // Submit preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: (data: OnboardingPreferencesFormData) => 
      apiRequest('POST', '/api/user/preferences/onboarding', data),
    onSuccess: () => {
      toast({
        title: "Preferences saved!",
        description: "Your preferences have been saved successfully.",
      });
      onComplete(form.getValues());
    },
    onError: (error: any) => {
      toast({
        title: "Error saving preferences",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (data: OnboardingPreferencesFormData) => {
    savePreferencesMutation.mutate(data);
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <div className="max-w-2xl mx-auto p-6" data-testid="onboarding-preferences">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-center mb-2" data-testid="onboarding-title">
          Customize Your Experience
        </h2>
        <p className="text-muted-foreground text-center mb-6">
          Help us personalize your election tracking experience by sharing your preferences.
        </p>
        
        <div className="space-y-2" data-testid="progress-section">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="w-full" data-testid="progress-bar" />
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Step 1: Location Preferences */}
          {currentStep === 1 && (
            <Card data-testid="location-step">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-500" />
                  Location Preferences
                </CardTitle>
                <CardDescription>
                  Tell us where you're located to get relevant local elections and representatives.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="state-select">
                            <SelectValue placeholder="Select your state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state.code} value={state.code}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your city" 
                          {...field} 
                          data-testid="city-input"
                        />
                      </FormControl>
                      <FormDescription>
                        Helps us find your congressional district and local elections.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedState && (
                  <FormField
                    control={form.control}
                    name="congressionalDistrict"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Congressional District (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={districtsLoading}>
                          <FormControl>
                            <SelectTrigger data-testid="district-select">
                              <SelectValue placeholder={districtsLoading ? "Loading districts..." : "Select your district"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {districts?.districts?.map((district: any) => (
                              <SelectItem key={district.districtCode} value={district.districtCode}>
                                {district.districtCode} - {district.representativeName ? `Rep. ${district.representativeName}` : 'District'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Your representative and federal election information.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Political Interests */}
          {currentStep === 2 && (
            <Card data-testid="interests-step">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-red-500" />
                  Political Interests
                </CardTitle>
                <CardDescription>
                  Choose which types of elections and political information interest you most.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Election Levels</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="federalElectionsInterest"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Federal Elections</FormLabel>
                            <FormDescription>
                              President, Senate, House of Representatives
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="federal-elections-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="stateElectionsInterest"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">State Elections</FormLabel>
                            <FormDescription>
                              Governor, state legislature, state-wide ballot measures
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="state-elections-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="localElectionsInterest"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Local Elections</FormLabel>
                            <FormDescription>
                              Mayor, city council, school board, local measures
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="local-elections-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Additional Interests</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <FormField
                      control={form.control}
                      name="candidateProfilesInterest"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="candidate-profiles-checkbox"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Candidate Profiles & Backgrounds</FormLabel>
                            <FormDescription>
                              Detailed information about candidates running for office
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="votingRecordsInterest"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="voting-records-checkbox"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Voting Records & Legislative History</FormLabel>
                            <FormDescription>
                              How candidates and elected officials have voted on issues
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pollingDataInterest"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="polling-data-checkbox"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Polling Data & Election Forecasts</FormLabel>
                            <FormDescription>
                              Current polling numbers and election predictions
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Election Types */}
          {currentStep === 3 && (
            <Card data-testid="election-types-step">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-green-500" />
                  Election Types
                </CardTitle>
                <CardDescription>
                  Choose which types of elections you want to track and receive updates about.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="generalElectionsEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-medium">General Elections</FormLabel>
                          <FormDescription>
                            Final elections that determine who takes office
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="general-elections-switch"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primaryElectionsEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-medium">Primary Elections</FormLabel>
                          <FormDescription>
                            Elections to choose party nominees for general elections
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="primary-elections-switch"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specialElectionsEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-medium">Special Elections</FormLabel>
                          <FormDescription>
                            Elections held outside the regular schedule to fill vacant seats
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="special-elections-switch"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="runoffElectionsEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-medium">Runoff Elections</FormLabel>
                          <FormDescription>
                            Secondary elections when no candidate wins a majority
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="runoff-elections-switch"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="candidateInformationDepth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Candidate Information Detail Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="candidate-depth-select">
                              <SelectValue placeholder="Select information depth" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="minimal">Minimal - Just names and parties</SelectItem>
                            <SelectItem value="standard">Standard - Basic background and positions</SelectItem>
                            <SelectItem value="detailed">Detailed - Comprehensive profiles and voting records</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How much detail you want to see about candidates.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Notifications & Privacy */}
          {currentStep === 4 && (
            <Card data-testid="notifications-step">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-purple-500" />
                  Notifications & Privacy
                </CardTitle>
                <CardDescription>
                  Configure how and when you want to receive election updates and manage your privacy settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Notification Preferences</h4>
                  
                  <FormField
                    control={form.control}
                    name="digestFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Digest Frequency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="digest-frequency-select">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Daily - Every day</SelectItem>
                            <SelectItem value="weekly">Weekly - Once per week</SelectItem>
                            <SelectItem value="monthly">Monthly - Once per month</SelectItem>
                            <SelectItem value="never">Never - No email digests</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How often you want to receive summary emails about elections you're following.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="electionReminderAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Election Reminder Alerts</FormLabel>
                            <FormDescription>
                              Get notified before important election dates
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="election-reminders-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="breakingNewsAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Breaking News Alerts</FormLabel>
                            <FormDescription>
                              Immediate notifications for major election developments
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="breaking-news-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="candidateUpdateAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Candidate Update Alerts</FormLabel>
                            <FormDescription>
                              Updates when candidates you follow make announcements
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="candidate-updates-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Privacy & Data Settings</h4>
                  
                  <FormField
                    control={form.control}
                    name="personalizationEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Personalized Recommendations</FormLabel>
                          <FormDescription>
                            Use your preferences to suggest relevant elections and content
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="personalization-switch"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dataUsageConsent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Data Usage Consent</FormLabel>
                          <FormDescription>
                            Allow us to use your data to improve the platform experience
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="data-consent-switch"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="analyticsOptOut"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Opt Out of Analytics</FormLabel>
                          <FormDescription>
                            Disable anonymous usage analytics and tracking
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="analytics-opt-out-switch"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between items-center pt-6" data-testid="navigation-buttons">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  data-testid="previous-button"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
              
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
                data-testid="skip-button"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip for now
              </Button>
            </div>

            <div className="flex gap-2">
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  data-testid="next-button"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={savePreferencesMutation.isPending}
                  data-testid="complete-button"
                >
                  {savePreferencesMutation.isPending ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Complete Setup
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}