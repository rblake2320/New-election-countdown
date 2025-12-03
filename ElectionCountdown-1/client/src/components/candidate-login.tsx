import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Shield, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  candidateId: z.number().min(1, 'Please select a valid candidate'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  campaignName: z.string().min(1, 'Campaign name is required'),
  campaignTitle: z.string().optional(),
  role: z.enum(['candidate', 'campaign_manager', 'staff']).default('campaign_manager'),
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

interface CandidateLoginProps {
  onLogin: (auth: any) => void;
}

export default function CandidateLogin({ onLogin }: CandidateLoginProps) {
  const [activeTab, setActiveTab] = useState('login');
  const { toast } = useToast();

  // Login form
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Signup form
  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      candidateId: 0,
      email: '',
      password: '',
      campaignName: '',
      campaignTitle: '',
      role: 'campaign_manager',
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest('POST', '/api/candidate/login', data);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        localStorage.setItem('candidate_token', data.token);
        localStorage.setItem('candidate_data', JSON.stringify(data.candidate));
        onLogin({ token: data.token, candidate: data.candidate });
        toast({
          title: "Login Successful",
          description: `Welcome back to ${data.candidate.campaignName}!`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async (data: SignupForm) => {
      const response = await apiRequest('POST', '/api/candidate/signup', data);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        localStorage.setItem('candidate_token', data.token);
        localStorage.setItem('candidate_data', JSON.stringify(data.candidate));
        onLogin({ token: data.token, candidate: data.candidate });
        toast({
          title: "Account Created",
          description: `Welcome to the campaign portal!`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Signup Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const handleSignup = (data: SignupForm) => {
    signupMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Campaign Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Secure access for campaign teams
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Create Account
            </TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Sign In to Your Campaign</CardTitle>
                <CardDescription>
                  Access your candidate portal dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="campaign@example.com"
                      {...loginForm.register('email')}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-red-600">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      {...loginForm.register('password')}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-600">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Signup Tab */}
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create Campaign Account</CardTitle>
                <CardDescription>
                  Set up your campaign portal access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You must be listed as a candidate in our election database to create an account.
                    Contact support if you're not finding your candidate ID.
                  </AlertDescription>
                </Alert>

                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="candidate-id">Candidate ID</Label>
                    <Input
                      id="candidate-id"
                      type="number"
                      placeholder="Find your ID in our candidate database"
                      {...signupForm.register('candidateId', { valueAsNumber: true })}
                    />
                    {signupForm.formState.errors.candidateId && (
                      <p className="text-sm text-red-600">
                        {signupForm.formState.errors.candidateId.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email Address</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="campaign@example.com"
                      {...signupForm.register('email')}
                    />
                    {signupForm.formState.errors.email && (
                      <p className="text-sm text-red-600">
                        {signupForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Minimum 8 characters"
                      {...signupForm.register('password')}
                    />
                    {signupForm.formState.errors.password && (
                      <p className="text-sm text-red-600">
                        {signupForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Campaign Name</Label>
                    <Input
                      id="campaign-name"
                      placeholder="e.g., Smith for Senate 2026"
                      {...signupForm.register('campaignName')}
                    />
                    {signupForm.formState.errors.campaignName && (
                      <p className="text-sm text-red-600">
                        {signupForm.formState.errors.campaignName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="campaign-title">Your Title (Optional)</Label>
                    <Input
                      id="campaign-title"
                      placeholder="e.g., Campaign Manager, Communications Director"
                      {...signupForm.register('campaignTitle')}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={signupMutation.isPending}
                  >
                    {signupMutation.isPending ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
          <p>
            Need help? Contact support for assistance with account setup.
          </p>
        </div>
      </div>
    </div>
  );
}