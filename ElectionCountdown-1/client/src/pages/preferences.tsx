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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  MapPin, 
  Users, 
  Bell, 
  Briefcase, 
  Building, 
  Flag, 
  Mail, 
  Clock,
  Settings,
  Shield,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Info
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { updateUserPreferencesSchema } from "@shared/schema";

// US States list (abbreviated for code readability)
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

// Validation schema for preferences
const preferencesFormSchema = updateUserPreferencesSchema.extend({
  // Additional validation for the form
  state: z.string().optional(),
  city: z.string().optional(),
});

type PreferencesFormData = z.infer<typeof preferencesFormSchema>;

export default function PreferencesPage() {
  const [selectedState, setSelectedState] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user preferences
  const { data: userPreferences, isLoading, error } = useQuery({
    queryKey: ['/api/user/preferences'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/user/preferences');
      return await response.json();
    },
  });

  // Get congressional districts for selected state
  const { data: districts, isLoading: districtsLoading } = useQuery({
    queryKey: ['/api/user/preferences/congressional-districts', selectedState],
    enabled: !!selectedState,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/user/preferences/congressional-districts?state=${selectedState}`);
      return await response.json();
    },
  });

  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesFormSchema),
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

  // Update form when user preferences are loaded
  useEffect(() => {
    if (userPreferences?.preferences) {
      const prefs = userPreferences.preferences;
      form.reset(prefs);
      setSelectedState(prefs.state || '');
    }
  }, [userPreferences, form]);

  // Track form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Watch state changes to reset district
  useEffect(() => {
    const stateValue = form.watch('state');
    if (stateValue !== selectedState) {
      setSelectedState(stateValue || '');
      form.setValue('congressionalDistrict', '');
    }
  }, [form.watch('state')]);

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: PreferencesFormData) => {
      const response = await apiRequest('PUT', '/api/user/preferences', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Preferences updated!",
        description: "Your preferences have been saved successfully.",
      });
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating preferences",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: PreferencesFormData) => {
    updatePreferencesMutation.mutate(data);
  };

  const handleReset = () => {
    if (userPreferences?.preferences) {
      form.reset(userPreferences.preferences);
      setSelectedState(userPreferences.preferences.state || '');
      setHasUnsavedChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6" data-testid="preferences-loading">
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6" data-testid="preferences-error">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Preferences</AlertTitle>
          <AlertDescription>
            Unable to load your preferences. Please refresh the page and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6" data-testid="preferences-page">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold" data-testid="preferences-title">User Preferences</h1>
        <p className="text-muted-foreground">
          Manage your election tracking preferences, notification settings, and privacy options.
        </p>
      </div>

      {hasUnsavedChanges && (
        <Alert data-testid="unsaved-changes-alert">
          <Info className="h-4 w-4" />
          <AlertTitle>Unsaved Changes</AlertTitle>
          <AlertDescription>
            You have unsaved changes. Don't forget to save your preferences.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Tabs defaultValue="location" className="w-full" data-testid="preferences-tabs">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="location" data-testid="location-tab">
                <MapPin className="h-4 w-4 mr-2" />
                Location
              </TabsTrigger>
              <TabsTrigger value="interests" data-testid="interests-tab">
                <Flag className="h-4 w-4 mr-2" />
                Interests
              </TabsTrigger>
              <TabsTrigger value="notifications" data-testid="notifications-tab">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="privacy" data-testid="privacy-tab">
                <Shield className="h-4 w-4 mr-2" />
                Privacy
              </TabsTrigger>
            </TabsList>

            {/* Location Tab */}
            <TabsContent value="location" className="space-y-6">
              <Card data-testid="location-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    Location Preferences
                  </CardTitle>
                  <CardDescription>
                    Set your location to receive relevant local elections and representative information.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
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
                            value={field.value || ''}
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
                          <FormLabel>Congressional District</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''} disabled={districtsLoading}>
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
            </TabsContent>

            {/* Interests Tab */}
            <TabsContent value="interests" className="space-y-6">
              <Card data-testid="interests-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="h-5 w-5 text-red-500" />
                    Political Interests
                  </CardTitle>
                  <CardDescription>
                    Choose which elections and political information you want to follow.
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
                                checked={field.value ?? false}
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
                                checked={field.value ?? false}
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
                                checked={field.value ?? false}
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
                    <h4 className="font-medium">Election Types</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <FormField
                        control={form.control}
                        name="primaryElectionsEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value ?? false}
                                onCheckedChange={field.onChange}
                                data-testid="primary-elections-checkbox"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Primary Elections</FormLabel>
                              <FormDescription>
                                Elections to choose party nominees
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="generalElectionsEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value ?? false}
                                onCheckedChange={field.onChange}
                                data-testid="general-elections-checkbox"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>General Elections</FormLabel>
                              <FormDescription>
                                Final elections that determine who takes office
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="specialElectionsEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value ?? false}
                                onCheckedChange={field.onChange}
                                data-testid="special-elections-checkbox"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Special Elections</FormLabel>
                              <FormDescription>
                                Elections to fill vacant seats
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="candidateInformationDepth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Candidate Information Detail Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'standard'}>
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
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card data-testid="notifications-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-purple-500" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Configure how and when you want to receive election updates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="digestFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Digest Frequency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'weekly'}>
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
                          How often you want to receive summary emails.
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
                              checked={field.value ?? false}
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
                              Immediate notifications for major developments
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value ?? false}
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
                              Updates when followed candidates make announcements
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value ?? false}
                              onCheckedChange={field.onChange}
                              data-testid="candidate-updates-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card data-testid="privacy-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-500" />
                    Privacy & Data Settings
                  </CardTitle>
                  <CardDescription>
                    Control how your data is used and your privacy preferences.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="personalizationEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Personalized Recommendations</FormLabel>
                          <FormDescription>
                            Use your preferences to suggest relevant content
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
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
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Data Usage Consent</FormLabel>
                          <FormDescription>
                            Allow us to use your data to improve the platform
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
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
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Opt Out of Analytics</FormLabel>
                          <FormDescription>
                            Disable anonymous usage analytics and tracking
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                            data-testid="analytics-opt-out-switch"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action buttons */}
          <div className="flex justify-between items-center pt-6 border-t" data-testid="action-buttons">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={!hasUnsavedChanges}
              data-testid="reset-button"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Changes
            </Button>

            <Button
              type="submit"
              disabled={updatePreferencesMutation.isPending || !hasUnsavedChanges}
              data-testid="save-button"
            >
              {updatePreferencesMutation.isPending ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}