import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { UserIcon, CheckCircle2, AlertCircle, TrendingUp, Shield, Globe, Users, FileText, Settings, LogOut } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import CandidateLogin from '@/components/candidate-login';

interface CandidateAuth {
  token: string;
  candidate: {
    id: number;
    email: string;
    role: string;
    subscriptionTier: string;
    campaignName: string;
    campaignTitle?: string;
  };
}

interface CandidateProfile {
  fullName?: string;
  preferredName?: string;
  age?: number;
  birthPlace?: string;
  currentResidence?: string;
  familyStatus?: string;
  currentOccupation?: string;
  employmentHistory?: Array<{
    company: string;
    position: string;
    years: string;
    description?: string;
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    year: string;
    field: string;
  }>;
  militaryService?: string;
  previousOffices?: Array<{
    office: string;
    years: string;
    achievements?: string;
  }>;
  politicalExperience?: string;
  endorsements?: Array<{
    organization: string;
    description: string;
    date: string;
  }>;
  economyPosition?: string;
  healthcarePosition?: string;
  educationPosition?: string;
  environmentPosition?: string;
  immigrationPosition?: string;
  criminalJusticePosition?: string;
  infrastructurePosition?: string;
  taxesPosition?: string;
  foreignPolicyPosition?: string;
  socialIssuesPosition?: string;
  campaignWebsite?: string;
  campaignSlogan?: string;
  topPriorities?: Array<{
    priority: string;
    description: string;
  }>;
  keyAccomplishments?: Array<string>;
}

interface AnalyticsData {
  profileCompletion: number;
  viewsThisWeek: number;
  searchImpressions: number;
}

interface PolicyTemplate {
  categories: Array<{
    name: string;
    description: string;
    positions: Array<{
      title: string;
      description: string;
    }>;
  }>;
}

export default function CandidatePortal() {
  const [location, setLocation] = useLocation();
  const [auth, setAuth] = useState<CandidateAuth | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check for authentication token on load
  useEffect(() => {
    const token = localStorage.getItem('candidate_token');
    const candidateData = localStorage.getItem('candidate_data');
    
    if (token && candidateData) {
      try {
        setAuth({
          token,
          candidate: JSON.parse(candidateData)
        });
      } catch (error) {
        localStorage.removeItem('candidate_token');
        localStorage.removeItem('candidate_data');
      }
    }
  }, []);

  // Authenticated fetch helper
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${auth?.token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }
    
    return response;
  };

  // Get candidate profile
  const { data: candidateProfile, isLoading } = useQuery<CandidateProfile>({
    queryKey: ['/api/candidate/profile'],
    enabled: !!auth?.token,
    queryFn: async () => {
      const response = await authenticatedFetch('/api/candidate/profile');
      return await response.json();
    }
  });

  // Get analytics data
  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ['/api/candidate/analytics'],
    enabled: !!auth?.token,
    queryFn: async () => {
      try {
        const response = await authenticatedFetch('/api/candidate/analytics');
        return await response.json();
      } catch (error) {
        return { profileCompletion: 0, viewsThisWeek: 0, searchImpressions: 0 };
      }
    }
  });

  // Get policy template
  const { data: policyTemplate } = useQuery<PolicyTemplate>({
    queryKey: ['/api/candidate/policy-template'],
    enabled: !!auth?.token,
    queryFn: async () => {
      try {
        const response = await authenticatedFetch('/api/candidate/policy-template');
        return await response.json();
      } catch (error) {
        return { categories: [] };
      }
    }
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<CandidateProfile>) => {
      const response = await authenticatedFetch('/api/candidate/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/analytics'] });
      toast({
        title: "Profile Updated",
        description: data.message || "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem('candidate_token');
    localStorage.removeItem('candidate_data');
    setAuth(null);
    setLocation('/candidate-portal');
  };

  // Show login form if not authenticated
  if (!auth) {
    return <CandidateLogin onLogin={setAuth} />;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading your campaign portal...</p>
          </div>
        </div>
      </div>
    );
  }

  const profileCompletionPercentage = analytics?.profileCompletion || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {auth.candidate.campaignName}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {auth.candidate.campaignTitle} • {auth.candidate.subscriptionTier} Plan
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="capitalize">
                {auth.candidate.role}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <UserIcon className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="positions" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Positions</span>
            </TabsTrigger>
            <TabsTrigger value="public" className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>Public View</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Profile Completion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{profileCompletionPercentage}%</span>
                      <CheckCircle2 className={`h-5 w-5 ${profileCompletionPercentage === 100 ? 'text-green-500' : 'text-gray-400'}`} />
                    </div>
                    <Progress value={profileCompletionPercentage} className="h-2" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Complete your profile to improve visibility
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Views This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.viewsThisWeek || 0}</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Profile views from voters and media
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Search Impressions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.searchImpressions || 0}</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Times you appeared in search results
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Complete these steps to optimize your campaign presence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profileCompletionPercentage < 100 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your profile is {profileCompletionPercentage}% complete. 
                      <Button 
                        variant="link" 
                        className="p-0 ml-1"
                        onClick={() => setActiveTab('profile')}
                      >
                        Complete your profile
                      </Button>
                      to improve your visibility.
                    </AlertDescription>
                  </Alert>
                )}

                {(!candidateProfile?.economyPosition) && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Add your policy positions to help voters understand your platform.
                      <Button 
                        variant="link" 
                        className="p-0 ml-1"
                        onClick={() => setActiveTab('positions')}
                      >
                        Add positions
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Profile</CardTitle>
                <CardDescription>
                  Update your candidate information and campaign details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      defaultValue={candidateProfile?.fullName || ''}
                      placeholder="Enter your full legal name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferredName">Preferred Name</Label>
                    <Input
                      id="preferredName"
                      defaultValue={candidateProfile?.preferredName || ''}
                      placeholder="Name you prefer on ballots"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentOccupation">Current Occupation</Label>
                  <Input
                    id="currentOccupation"
                    defaultValue={candidateProfile?.currentOccupation || ''}
                    placeholder="Your current job or profession"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="politicalExperience">Political Experience</Label>
                  <Textarea
                    id="politicalExperience"
                    defaultValue={candidateProfile?.politicalExperience || ''}
                    placeholder="Describe your political background and experience"
                    rows={4}
                  />
                </div>

                <Button
                  onClick={() => updateProfileMutation.mutate({
                    fullName: (document.getElementById('fullName') as HTMLInputElement)?.value,
                    preferredName: (document.getElementById('preferredName') as HTMLInputElement)?.value,
                    currentOccupation: (document.getElementById('currentOccupation') as HTMLInputElement)?.value,
                    politicalExperience: (document.getElementById('politicalExperience') as HTMLTextAreaElement)?.value,
                  })}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? 'Updating...' : 'Update Profile'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs would be implemented similarly */}
          <TabsContent value="positions">
            <Card>
              <CardHeader>
                <CardTitle>Policy Positions</CardTitle>
                <CardDescription>
                  Define your stance on key issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Policy position management coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="public">
            <Card>
              <CardHeader>
                <CardTitle>Public Profile Preview</CardTitle>
                <CardDescription>
                  How voters see your profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Public profile preview coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Settings</CardTitle>
                <CardDescription>
                  Manage your account and campaign preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Campaign settings coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}