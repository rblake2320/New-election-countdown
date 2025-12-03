import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { PageHead, pageMetadata } from "@/components/page-head";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { UserIcon, CheckCircle2, AlertCircle, TrendingUp, Shield, Globe, Users, FileText, Settings } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import CandidateLogin from '@/components/candidate-login';
import CandidateProfileForm from '@/components/candidate-profile-form';
import CandidatePolicyForm from '@/components/candidate-policy-form';
import CandidatePublicView from '@/components/candidate-public-view';
import CandidateSettings from '@/components/candidate-settings';

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
  // Policy positions
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
  // Campaign information
  campaignWebsite?: string;
  campaignSlogan?: string;
  topPriorities?: Array<{
    priority: string;
    description: string;
  }>;
  keyAccomplishments?: string[];
  verificationStatus?: string;
}

// API Response interfaces
interface CandidateAnalyticsResponse {
  analytics: {
    profileStats: {
      dataCompleteness: number;
      completedFields: number;
      totalFields: number;
    };
    sourceBreakdown: {
      candidate_supplied: number;
      ai_research: number;
      verified_external: number;
    };
    recommendations: string[];
  };
}

interface CandidateProfileResponse {
  candidate: CandidateProfile;
}

interface PolicyCategory {
  id: string;
  name: string;
  description: string;
  questions: string[];
}

interface PolicyTemplateResponse {
  categories: PolicyCategory[];
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

  // Get candidate profile with RAG data
  const { data: candidateProfile, isLoading } = useQuery<CandidateProfileResponse>({
    queryKey: ['/api/candidate/profile'],
    enabled: !!auth?.token,
    meta: {
      headers: {
        'Authorization': `Bearer ${auth?.token}`
      }
    }
  });

  // Get analytics data
  const { data: analytics } = useQuery<CandidateAnalyticsResponse>({
    queryKey: ['/api/candidate/analytics'],
    enabled: !!auth?.token,
    meta: {
      headers: {
        'Authorization': `Bearer ${auth?.token}`
      }
    }
  });

  // Get policy template
  const { data: policyTemplate } = useQuery<PolicyTemplateResponse>({
    queryKey: ['/api/candidate/policy-template'],
    enabled: !!auth?.token,
    meta: {
      headers: {
        'Authorization': `Bearer ${auth?.token}`
      }
    }
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<CandidateProfile>) => {
      const response = await fetch('/api/candidate/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
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
    setLocation('/candidate-portal/login');
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHead {...pageMetadata.candidatePortal} />
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Campaign Portal
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {auth.candidate.campaignName}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={auth.candidate.subscriptionTier === 'premium' ? 'default' : 'secondary'}>
                {auth.candidate.subscriptionTier}
              </Badge>
              <Button variant="outline" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="policies" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Policies
            </TabsTrigger>
            <TabsTrigger value="public-view" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Public View
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Profile Completion */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Profile Completion
                  </CardTitle>
                  <CardDescription>
                    Complete your profile to improve voter visibility
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{analytics?.analytics?.profileStats?.dataCompleteness || 0}%</span>
                    </div>
                    <Progress value={analytics?.analytics?.profileStats?.dataCompleteness || 0} />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {analytics?.analytics?.profileStats?.completedFields || 0} of {analytics?.analytics?.profileStats?.totalFields || 25} fields completed
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Data Sources */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    Data Attribution
                  </CardTitle>
                  <CardDescription>
                    Source tracking for transparency
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Candidate Supplied</span>
                      <span className="font-medium text-green-600">
                        {analytics?.analytics?.sourceBreakdown?.candidate_supplied || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>AI Researched</span>
                      <span className="font-medium text-blue-600">
                        {analytics?.analytics?.sourceBreakdown?.ai_research || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Verified External</span>
                      <span className="font-medium text-purple-600">
                        {analytics?.analytics?.sourceBreakdown?.verified_external || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Verification Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Verification Status
                  </CardTitle>
                  <CardDescription>
                    Account verification and trust score
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge 
                      variant={candidateProfile?.candidate?.verificationStatus === 'verified' ? 'default' : 'secondary'}
                      className="w-full justify-center"
                    >
                      {candidateProfile?.candidate?.verificationStatus || 'Pending'}
                    </Badge>
                    <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                      Complete your profile to improve verification status
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            {analytics?.analytics?.recommendations?.length && analytics.analytics.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                  <CardDescription>
                    Actions to improve your campaign presence
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.analytics?.recommendations?.map((rec: string, index: number) => (
                      <Alert key={index}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{rec}</AlertDescription>
                      </Alert>
                    )) || []}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <CandidateProfileForm 
              profile={candidateProfile?.candidate} 
              onUpdate={updateProfileMutation.mutate}
              isLoading={updateProfileMutation.isPending}
            />
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="space-y-6">
            <CandidatePolicyForm 
              profile={candidateProfile?.candidate}
              policyTemplate={policyTemplate?.categories || []}
              onUpdate={updateProfileMutation.mutate}
              isLoading={updateProfileMutation.isPending}
            />
          </TabsContent>

          {/* Public View Tab */}
          <TabsContent value="public-view" className="space-y-6">
            <CandidatePublicView candidate={candidateProfile?.candidate} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <CandidateSettings auth={auth} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

