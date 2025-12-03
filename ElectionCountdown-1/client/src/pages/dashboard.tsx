import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Heart, 
  Calendar, 
  Users, 
  TrendingUp, 
  MapPin, 
  Clock,
  Star,
  ArrowRight,
  Activity,
  BookOpen,
  Vote,
  Sparkles,
  Target,
  Settings,
  Eye
} from "lucide-react";
import { CountdownTimer } from "@/components/countdown-timer";
import { formatElectionDate } from "@/lib/election-data";
import { QuickRecommendations } from "@/components/quick-recommendations";
import { RecommendationWidget } from "@/components/recommendation-widget";
import { type DashboardResponse } from "@shared/schema";

const iconMap = {
  calendar: Calendar,
  users: Users,
  heart: Heart,
  activity: Activity,
  book: BookOpen,
  vote: Vote
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: dashboardData, isLoading, error } = useQuery<DashboardResponse>({
    queryKey: ['/api/auth/dashboard'],
    enabled: isAuthenticated && !!user,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Redirect to auth if not authenticated
  if (!authLoading && !isAuthenticated) {
    setLocation('/auth');
    return null;
  }

  if (authLoading || isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="dashboard-error">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load dashboard data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="dashboard-no-data">
        <Alert>
          <AlertDescription>
            Dashboard data is temporarily unavailable.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { user: userData, watchlist, recommendations, stats, quickActions } = dashboardData;
  const displayName = userData.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : userData.email.split('@')[0];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8" data-testid="dashboard-main">
      {/* Recommendation Banner */}
      <RecommendationWidget 
        variant="banner" 
        limit={1}
        data-testid="recommendation-banner"
      />
      
      {/* Welcome Section */}
      <div className="space-y-4" data-testid="welcome-section">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="welcome-title">
              Welcome back, {displayName}! 👋
            </h1>
            <p className="text-muted-foreground mt-1" data-testid="welcome-subtitle">
              You've been tracking elections for {userData.daysSinceJoining} days
            </p>
          </div>
          {!userData.emailVerified && (
            <Alert className="max-w-md">
              <AlertDescription>
                Please verify your email to enable all features.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="stats-section">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Elections</CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-saved-elections">
              {stats.savedElections}
            </div>
            <p className="text-xs text-muted-foreground">
              Elections in your watchlist
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Elections</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-upcoming-elections">
              {stats.totalUpcomingElections}
            </div>
            <p className="text-xs text-muted-foreground">
              Total elections to track
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-activity">
              {stats.watchlistActivity}
            </div>
            <p className="text-xs text-muted-foreground">
              Recent watchlist items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Quick Actions */}
      <Card data-testid="quick-actions-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Jump to the most important features and discover new content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Enhanced Watchlist Action */}
            <Link href="/watchlist">
              <Button 
                variant="outline" 
                className="w-full h-auto p-4 justify-start gap-3 border-blue-200 hover:bg-blue-50"
                data-testid="quick-action-enhanced-watchlist"
              >
                <Sparkles className="h-5 w-5 text-blue-500" />
                <div className="text-left">
                  <div className="font-medium">Enhanced Watchlist</div>
                  <div className="text-xs text-muted-foreground">Organize & get recommendations</div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </Link>
            
            {/* Personalized Recommendations Action */}
            <Button 
              variant="outline" 
              className="w-full h-auto p-4 justify-start gap-3 border-green-200 hover:bg-green-50"
              onClick={() => document.getElementById('recommendations-section')?.scrollIntoView({ behavior: 'smooth' })}
              data-testid="quick-action-recommendations"
            >
              <Target className="h-5 w-5 text-green-500" />
              <div className="text-left">
                <div className="font-medium">Recommendations</div>
                <div className="text-xs text-muted-foreground">Discover relevant elections</div>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            
            {/* Original Quick Actions */}
            {quickActions.slice(0, 2).map((action) => {
              const IconComponent = iconMap[action.icon as keyof typeof iconMap] || Calendar;
              
              if (action.path) {
                return (
                  <Link key={action.id} href={action.path}>
                    <Button 
                      variant="outline" 
                      className="w-full h-auto p-4 justify-start gap-3"
                      data-testid={`quick-action-${action.id}`}
                    >
                      <IconComponent className="h-5 w-5" />
                      <span>{action.label}</span>
                      <ArrowRight className="h-4 w-4 ml-auto" />
                    </Button>
                  </Link>
                );
              }
              
              return (
                <Button 
                  key={action.id}
                  variant="outline" 
                  className="w-full h-auto p-4 justify-start gap-3"
                  onClick={() => {
                    if (action.action === 'scroll-to-watchlist') {
                      document.getElementById('watchlist-section')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  data-testid={`quick-action-${action.id}`}
                >
                  <IconComponent className="h-5 w-5" />
                  <span>{action.label}</span>
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* My Watchlist */}
        <Card id="watchlist-section" data-testid="watchlist-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              My Watchlist
            </CardTitle>
            <CardDescription>
              Elections you're tracking ({watchlist.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {watchlist.length === 0 ? (
              <div className="text-center py-8" data-testid="watchlist-empty">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">No elections saved yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start building your watchlist by saving elections you want to track
                </p>
                <Link href="/">
                  <Button data-testid="browse-elections-button">
                    <Calendar className="h-4 w-4 mr-2" />
                    Browse Elections
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4" data-testid="watchlist-items">
                {watchlist.slice(0, 5).map((item) => (
                  <div 
                    key={item.id} 
                    className="border rounded-lg p-4 space-y-2"
                    data-testid={`watchlist-item-${item.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <h4 className="font-medium text-sm">{item.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {item.location}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {item.level}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2">
                      <CountdownTimer 
                        targetDate={item.date} 
                        size="sm"
                        className="text-xs"
                      />
                    </div>
                  </div>
                ))}
                {watchlist.length > 5 && (
                  <div className="text-center pt-4">
                    <p className="text-sm text-muted-foreground">
                      And {watchlist.length - 5} more elections in your watchlist
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Personalized Recommendations */}
        <QuickRecommendations 
          limit={5}
          onViewAll={() => setLocation('/watchlist')}
          data-testid="recommendations-section"
        />
      </div>

      {/* First-time user tips */}
      {userData.daysSinceJoining <= 7 && (
        <Card data-testid="onboarding-tips">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              Getting Started Tips
            </CardTitle>
            <CardDescription>
              Make the most of your Election Tracker experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-sm">Explore Elections</h4>
                  <p className="text-xs text-muted-foreground">
                    Browse federal, state, and local elections with countdown timers
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-sm">Save to Watchlist</h4>
                  <p className="text-xs text-muted-foreground">
                    Click the heart icon on any election to add it to your watchlist
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-sm">Track Congress</h4>
                  <p className="text-xs text-muted-foreground">
                    Stay informed about your representatives and their voting records
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8" data-testid="dashboard-loading">
      {/* Welcome Section Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content Sections Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="border rounded-lg p-4">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}