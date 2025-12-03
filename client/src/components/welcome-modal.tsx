import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Home, 
  Users, 
  Building2, 
  Shield, 
  Radio, 
  Database, 
  BarChart3, 
  Globe, 
  Calendar,
  ArrowRight,
  CheckCircle,
  Lightbulb,
  Target,
  TrendingUp
} from "lucide-react";

interface WelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WelcomeModal({ open, onOpenChange }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const steps = [
    {
      title: "Welcome to ElectionTracker",
      subtitle: "Your comprehensive platform for election information and civic engagement",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg text-muted-foreground">
              Track elections, monitor candidates, and stay informed about the democratic process with real-time data and comprehensive analysis.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-blue-700 dark:text-blue-400">Real-Time Data</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Access live election results, polling data, and candidate information from verified sources.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-700 dark:text-green-400">Verified Information</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  All data is validated through our AI-powered verification system for accuracy and authenticity.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      title: "Explore Elections",
      subtitle: "Discover upcoming elections and track the democratic process",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Home className="h-4 w-4" />
                  Elections Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3">
                  Browse federal, state, and local elections with advanced filtering and search.
                </p>
                <Badge variant="secondary" className="text-xs">549+ Elections</Badge>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  Congress Tracker
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3">
                  Monitor congressional members, bills, and voting records.
                </p>
                <Badge variant="secondary" className="text-xs">Live Updates</Badge>
              </CardContent>
            </Card>
          </div>
          
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                    2026 Midterm Elections
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Get ready for the next major election cycle with 545+ offices up for election including Congress, Governors, and major mayoral races.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      title: "Powerful Tools & Portals",
      subtitle: "Access specialized features for candidates, campaigns, and data analysis",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-400">
                  <Building2 className="h-4 w-4" />
                  Campaign Portal
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-2">
                  Professional tools for campaign management and voter outreach.
                </p>
                <Badge variant="outline" className="text-xs">For Campaigns</Badge>
              </CardContent>
            </Card>
            
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400">
                  <Shield className="h-4 w-4" />
                  Candidate Portal
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-2">
                  Direct candidate registration and profile management system.
                </p>
                <Badge variant="outline" className="text-xs">For Candidates</Badge>
              </CardContent>
            </Card>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Radio className="h-3 w-3 text-slate-600" />
                  <span className="text-xs font-medium">Real-Time Monitor</span>
                </div>
                <p className="text-xs text-muted-foreground">Live election updates</p>
              </CardContent>
            </Card>
            
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="h-3 w-3 text-slate-600" />
                  <span className="text-xs font-medium">Data Steward</span>
                </div>
                <p className="text-xs text-muted-foreground">AI data validation</p>
              </CardContent>
            </Card>
            
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-3 w-3 text-slate-600" />
                  <span className="text-xs font-medium">Global Observatory</span>
                </div>
                <p className="text-xs text-muted-foreground">Worldwide elections</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      title: "Ready to Get Started!",
      subtitle: "Choose your path to explore the platform",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-muted-foreground">
              You're all set! Here are some great starting points based on your interests:
            </p>
          </div>
          
          <div className="space-y-3">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer" data-testid="welcome-suggestion-elections">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Home className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium">Browse Elections</h4>
                      <p className="text-sm text-muted-foreground">Start exploring upcoming elections in your area</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer" data-testid="welcome-suggestion-2026">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <div>
                      <h4 className="font-medium">2026 Midterm Preview</h4>
                      <p className="text-sm text-muted-foreground">Get ready for the next major election cycle</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer" data-testid="welcome-suggestion-congress">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-green-600" />
                    <div>
                      <h4 className="font-medium">Congress Tracker</h4>
                      <p className="text-sm text-muted-foreground">Monitor your representatives and congressional activity</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-1">Pro Tip</h4>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Use the sidebar navigation to quickly access any feature. Look for tooltips and help text throughout the platform for additional guidance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleNext = async () => {
    if (isNavigating) return; // Prevent rapid clicking
    setIsNavigating(true);
    
    // Add small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 150));
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onOpenChange(false);
      // Mark welcome as seen when completing the tour
      localStorage.setItem('electiontracker-welcome-seen', 'true');
    }
    setIsNavigating(false);
  };

  const handlePrevious = async () => {
    if (isNavigating || currentStep === 0) return;
    setIsNavigating(true);
    
    await new Promise(resolve => setTimeout(resolve, 150));
    setCurrentStep(currentStep - 1);
    setIsNavigating(false);
  };

  const handleSkip = () => {
    if (isNavigating) return;
    onOpenChange(false);
    localStorage.setItem('electiontracker-welcome-seen', 'true');
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // User clicked X button or clicked outside - save the flag
      localStorage.setItem('electiontracker-welcome-seen', 'true');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="welcome-modal">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            {steps[currentStep].title}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {steps[currentStep].subtitle}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          {steps[currentStep].content}
        </div>
        
        {/* Progress indicator */}
        <div className="flex justify-center space-x-2 mb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep 
                  ? "bg-primary" 
                  : index < currentStep 
                    ? "bg-primary/60" 
                    : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        
        {/* Navigation buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button 
                variant="outline" 
                onClick={handlePrevious}
                disabled={isNavigating}
                data-testid="welcome-previous-button"
              >
                {isNavigating ? "Loading..." : "Previous"}
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              onClick={handleSkip}
              disabled={isNavigating}
              data-testid="welcome-skip-button"
            >
              Skip Tour
            </Button>
            <Button 
              onClick={handleNext}
              disabled={isNavigating}
              data-testid="welcome-next-button"
            >
              {isNavigating ? "Loading..." : (currentStep === steps.length - 1 ? "Get Started" : "Next")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing welcome modal state
export function useWelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCheckedWelcome, setHasCheckedWelcome] = useState(false);

  useEffect(() => {
    // Prevent auto-opening multiple times
    if (hasCheckedWelcome) return;
    
    // Check if user has seen the welcome modal before
    const hasSeenWelcome = localStorage.getItem('electiontracker-welcome-seen');
    if (!hasSeenWelcome) {
      // Small delay to ensure the app has loaded
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasCheckedWelcome(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setHasCheckedWelcome(true);
    }
  }, [hasCheckedWelcome]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('electiontracker-welcome-seen', 'true');
    setHasCheckedWelcome(true);
  };

  return {
    isOpen,
    setIsOpen,
    handleClose
  };
}