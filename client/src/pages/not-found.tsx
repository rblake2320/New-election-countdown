import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft, Search, HelpCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-lg mx-4" data-testid="not-found-page">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Page Not Found</CardTitle>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or may have been moved.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">What you can do:</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Search className="h-4 w-4 mt-0.5 text-blue-500" />
                <span>Check the URL for typos or try searching for what you need</span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowLeft className="h-4 w-4 mt-0.5 text-green-500" />
                <span>Go back to the previous page using your browser's back button</span>
              </div>
              <div className="flex items-start gap-2">
                <Home className="h-4 w-4 mt-0.5 text-purple-500" />
                <span>Return to the elections dashboard to explore available content</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/" className="flex-1">
              <Button className="w-full" data-testid="not-found-home-button">
                <Home className="mr-2 h-4 w-4" />
                Go to Elections
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={() => window.history.back()} 
              className="flex-1"
              data-testid="not-found-back-button"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground mb-1">Need Help?</h4>
                <p className="text-sm text-muted-foreground">
                  If you believe this is an error, try refreshing the page or navigating through the main menu in the sidebar.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
