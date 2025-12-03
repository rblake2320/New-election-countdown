import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Crown, Zap, Info } from 'lucide-react';

interface CandidateSettingsProps {
  auth: any;
}

export default function CandidateSettings({ auth }: CandidateSettingsProps) {
  const { candidate } = auth;

  const subscriptionFeatures = {
    basic: [
      'Basic profile management',
      'Standard policy positions',
      'Data attribution tracking',
      'Public profile view',
      'Email support'
    ],
    premium: [
      'All Basic features',
      'Advanced analytics dashboard',
      'Priority data verification',
      'Campaign performance metrics',
      'Social media integration',
      'Priority support'
    ],
    enterprise: [
      'All Premium features',
      'White-label portal access',
      'API access for integrations',
      'Custom branding options',
      'Dedicated account manager',
      'Phone support'
    ]
  };

  return (
    <div className="space-y-6">
      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>
            Your campaign portal account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Email Address</Label>
              <Input value={candidate.email} disabled />
            </div>
            <div>
              <Label className="text-sm font-medium">Role</Label>
              <Input value={candidate.role} disabled />
            </div>
            <div>
              <Label className="text-sm font-medium">Campaign Name</Label>
              <Input value={candidate.campaignName} disabled />
            </div>
            <div>
              <Label className="text-sm font-medium">Subscription Tier</Label>
              <div className="flex items-center gap-2">
                <Badge variant={candidate.subscriptionTier === 'premium' ? 'default' : candidate.subscriptionTier === 'enterprise' ? 'default' : 'secondary'}>
                  {candidate.subscriptionTier}
                </Badge>
                {candidate.subscriptionTier === 'basic' && (
                  <Button size="sm" variant="outline">
                    Upgrade
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {candidate.subscriptionTier === 'enterprise' ? (
              <Crown className="h-5 w-5 text-yellow-500" />
            ) : candidate.subscriptionTier === 'premium' ? (
              <Zap className="h-5 w-5 text-blue-500" />
            ) : (
              <Shield className="h-5 w-5 text-gray-500" />
            )}
            Subscription Features
          </CardTitle>
          <CardDescription>
            Features included with your {candidate.subscriptionTier} plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Basic Plan */}
            <div className={`p-4 border rounded-lg ${candidate.subscriptionTier === 'basic' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-gray-500" />
                <h3 className="font-semibold">Basic</h3>
                {candidate.subscriptionTier === 'basic' && (
                  <Badge variant="default">Current</Badge>
                )}
              </div>
              <ul className="space-y-1 text-sm">
                {subscriptionFeatures.basic.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    {feature}
                  </li>
                ))}
              </ul>
              {candidate.subscriptionTier !== 'basic' && (
                <Button variant="outline" size="sm" className="w-full mt-3" disabled>
                  Downgrade
                </Button>
              )}
            </div>

            {/* Premium Plan */}
            <div className={`p-4 border rounded-lg ${candidate.subscriptionTier === 'premium' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">Premium</h3>
                {candidate.subscriptionTier === 'premium' && (
                  <Badge variant="default">Current</Badge>
                )}
              </div>
              <ul className="space-y-1 text-sm">
                {subscriptionFeatures.premium.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    {feature}
                  </li>
                ))}
              </ul>
              {candidate.subscriptionTier === 'basic' && (
                <Button variant="default" size="sm" className="w-full mt-3">
                  Upgrade to Premium
                </Button>
              )}
              {candidate.subscriptionTier === 'enterprise' && (
                <Button variant="outline" size="sm" className="w-full mt-3">
                  Downgrade to Premium
                </Button>
              )}
            </div>

            {/* Enterprise Plan */}
            <div className={`p-4 border rounded-lg ${candidate.subscriptionTier === 'enterprise' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold">Enterprise</h3>
                {candidate.subscriptionTier === 'enterprise' && (
                  <Badge variant="default">Current</Badge>
                )}
              </div>
              <ul className="space-y-1 text-sm">
                {subscriptionFeatures.enterprise.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    {feature}
                  </li>
                ))}
              </ul>
              {candidate.subscriptionTier !== 'enterprise' && (
                <Button variant="default" size="sm" className="w-full mt-3">
                  Contact Sales
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>
            Manage your account security and access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Password</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Change your account password
              </p>
            </div>
            <Button variant="outline">
              Change Password
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Two-Factor Authentication</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add an extra layer of security
              </p>
            </div>
            <Button variant="outline">
              Enable 2FA
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">API Access</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate API keys for integrations
              </p>
            </div>
            <Button variant="outline" disabled={candidate.subscriptionTier === 'basic'}>
              {candidate.subscriptionTier === 'basic' ? 'Premium Required' : 'Manage API Keys'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Data & Privacy</CardTitle>
          <CardDescription>
            Control your data and privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your candidate data is used to improve voter information accuracy. You control what information is public through your profile settings.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Data Export</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Download a copy of your data
              </p>
            </div>
            <Button variant="outline">
              Export Data
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Public Profile</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Control what information is visible to voters
              </p>
            </div>
            <Button variant="outline">
              Privacy Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle>Support & Contact</CardTitle>
          <CardDescription>
            Get help with your campaign portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="flex items-center gap-2">
              📧 Email Support
            </Button>
            <Button variant="outline" className="flex items-center gap-2" disabled={candidate.subscriptionTier === 'basic'}>
              📞 {candidate.subscriptionTier === 'basic' ? 'Premium Required' : 'Phone Support'}
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              📚 Documentation
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              💬 Live Chat
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}