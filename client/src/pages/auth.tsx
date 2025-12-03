import { useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/auth/login-form";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { useAuth } from "@/hooks/use-auth";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  
  // Redirect if already authenticated
  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }
  
  const handleSuccess = () => {
    setLocation("/dashboard");
  };
  
  // For registration flow, use the complete onboarding experience
  if (activeTab === "register") {
    return <OnboardingFlow onComplete={handleSuccess} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <LoginForm onSuccess={handleSuccess} />
              </TabsContent>
            </Tabs>
          </div>
          
          {activeTab === "login" && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                New to Election Tracker?
              </p>
              <Button 
                variant="link" 
                onClick={() => setActiveTab("register")}
                data-testid="switch-to-register"
              >
                Create an account with guided setup
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}