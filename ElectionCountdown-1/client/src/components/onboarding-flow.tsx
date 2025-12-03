import { useState } from "react";
import { useLocation } from "wouter";
import { RegisterForm } from "@/components/auth/register-form";
import { OnboardingPreferences } from "@/components/onboarding-preferences";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, UserPlus, Settings, Sparkles } from "lucide-react";

type OnboardingStep = 'registration' | 'preferences' | 'complete';

interface OnboardingFlowProps {
  onComplete?: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('registration');
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  // If user is already authenticated, redirect to dashboard
  if (isAuthenticated && user) {
    setLocation('/dashboard');
    return null;
  }

  const handleRegistrationSuccess = () => {
    setCurrentStep('preferences');
  };

  const handlePreferencesComplete = () => {
    setCurrentStep('complete');
    setTimeout(() => {
      onComplete?.();
      setLocation('/dashboard');
    }, 2000);
  };

  const handlePreferencesSkip = () => {
    setCurrentStep('complete');
    setTimeout(() => {
      onComplete?.();
      setLocation('/dashboard');
    }, 1500);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8" data-testid="onboarding-steps">
      <div className="flex items-center space-x-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          currentStep === 'registration' ? 'bg-blue-500 text-white' :
          currentStep === 'preferences' || currentStep === 'complete' ? 'bg-green-500 text-white' :
          'bg-gray-200 text-gray-600'
        }`}>
          {currentStep === 'registration' ? '1' : <CheckCircle2 className="h-4 w-4" />}
        </div>
        <span className="text-sm font-medium">Create Account</span>
      </div>
      
      <div className={`w-8 h-1 ${
        currentStep === 'preferences' || currentStep === 'complete' ? 'bg-blue-500' : 'bg-gray-200'
      }`} />
      
      <div className="flex items-center space-x-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          currentStep === 'preferences' ? 'bg-blue-500 text-white' :
          currentStep === 'complete' ? 'bg-green-500 text-white' :
          'bg-gray-200 text-gray-600'
        }`}>
          {currentStep === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : '2'}
        </div>
        <span className="text-sm font-medium">Set Preferences</span>
      </div>
      
      <div className={`w-8 h-1 ${
        currentStep === 'complete' ? 'bg-blue-500' : 'bg-gray-200'
      }`} />
      
      <div className="flex items-center space-x-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          currentStep === 'complete' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {currentStep === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : '3'}
        </div>
        <span className="text-sm font-medium">Complete</span>
      </div>
    </div>
  );

  if (currentStep === 'registration') {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="onboarding-registration">
        <div className="max-w-lg mx-auto">
          {renderStepIndicator()}
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Welcome to Election Tracker</h1>
            <p className="text-muted-foreground">
              Create your account to get started with personalized election tracking
            </p>
          </div>
          
          <RegisterForm onSuccess={handleRegistrationSuccess} />
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              After creating your account, we'll help you customize your experience
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'preferences') {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="onboarding-preferences-step">
        {renderStepIndicator()}
        
        <OnboardingPreferences 
          onComplete={handlePreferencesComplete}
          onSkip={handlePreferencesSkip}
        />
      </div>
    );
  }

  if (currentStep === 'complete') {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="onboarding-complete">
        <div className="max-w-lg mx-auto">
          {renderStepIndicator()}
          
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">All Set!</CardTitle>
              <CardDescription>
                Your account has been created and your preferences have been saved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Account created successfully</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Preferences configured</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Ready to explore elections</span>
                </div>
              </div>
              
              <p className="mt-6 text-sm text-muted-foreground">
                Redirecting you to your personalized dashboard...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}

// Standalone onboarding page component
export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  
  const handleComplete = () => {
    setLocation('/dashboard');
  };
  
  return <OnboardingFlow onComplete={handleComplete} />;
}