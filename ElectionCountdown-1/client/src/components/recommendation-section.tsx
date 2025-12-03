import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  RefreshCw, 
  Settings, 
  TrendingUp,
  MapPin,
  Star,
  Users,
  ArrowRight,
  Target
} from "lucide-react";
import { RecommendationCard } from "./recommendation-card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface RecommendationSectionProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'compact' | 'detailed';
  limit?: number;
  types?: string[];
  showHeader?: boolean;
  showRefresh?: boolean;
  className?: string;
  onViewAll?: () => void;
  onRecommendationAction?: (action: string, recommendation: any) => void;
}

export function RecommendationSection({
  title = "Recommended for You",
  description = "Personalized election suggestions based on your interests and location",
  variant = 'default',
  limit = 6,
  types,
  showHeader = true,
  showRefresh = true,
  className = "",
  onViewAll,
  onRecommendationAction
}: RecommendationSectionProps) {
  const { user, token } = useAuth();
  const { toast } = useToast();

  // Fetch recommendations
  const { data: recommendationsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['/api/recommendations', { limit, types }],
    enabled: !!user && !!token,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (types?.length) {
        params.append('types', types.join(','));
      }

      const response = await fetch(`/api/recommendations?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        return response.json();
      }
      return { recommendations: [], totalCount: 0 };
    },
  });

  // Refresh recommendations
  const handleRefresh = async () => {
    try {
      await apiRequest('/api/recommendations/refresh', {
        method: 'POST',
      });
      await refetch();
      toast({
        title: "Recommendations updated",
        description: "We've refreshed your personalized recommendations",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh recommendations",
        variant: "destructive",
      });
    }
  };

  // Handle recommendation actions
  const handleRecommendationAction = (action: string, recommendation: any) => {
    onRecommendationAction?.(action, recommendation);
    
    if (action === 'add_to_watchlist' || action === 'dismiss') {
      // Refresh recommendations after user action
      refetch();
    }
  };

  // Get recommendation type stats
  const getTypeStats = (recommendations: any[]) => {
    const stats = recommendations.reduce((acc, rec) => {
      acc[rec.type] = (acc[rec.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(stats).map(([type, count]) => ({
      type,
      count,
      label: type.replace('_', ' '),
      icon: getTypeIcon(type)
    }));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'location_based':
        return <MapPin className="h-3 w-3" />;
      case 'interest_based':
        return <Star className="h-3 w-3" />;
      case 'trending':
        return <TrendingUp className="h-3 w-3" />;
      case 'similar_users':
        return <Users className="h-3 w-3" />;
      default:
        return <Target className="h-3 w-3" />;
    }
  };

  if (!user) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Personalized Recommendations
          </CardTitle>
          <CardDescription>
            Sign in to get election recommendations tailored to your interests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Unlock intelligent election tracking with personalized recommendations
            </p>
            <Button data-testid="sign-in-for-recommendations">
              Sign In to Get Started
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const recommendations = recommendationsData?.recommendations || [];
  const totalCount = recommendationsData?.totalCount || 0;
  const typeStats = getTypeStats(recommendations);

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {showRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isFetching}
                  data-testid="refresh-recommendations"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
              <Button variant="outline" size="sm" data-testid="recommendation-settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          {/* Type Statistics */}
          {typeStats.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {typeStats.map(({ type, count, label, icon }) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {icon}
                  <span className="ml-1">{count} {label}</span>
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
      )}

      <CardContent className={showHeader ? "pt-0" : "pt-6"}>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No recommendations available</h3>
            <p className="text-muted-foreground mb-4">
              Complete your profile preferences to get personalized election recommendations
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" data-testid="setup-preferences">
                <Settings className="h-4 w-4 mr-2" />
                Setup Preferences
              </Button>
              <Button onClick={handleRefresh} data-testid="generate-recommendations">
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Recommendations
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Recommendations Grid */}
            <div className={`grid gap-4 ${
              variant === 'compact' 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                : variant === 'detailed'
                ? 'grid-cols-1'
                : 'grid-cols-1 sm:grid-cols-2'
            }`}>
              {recommendations.map((recommendation: any) => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  variant={variant}
                  onAddToWatchlist={(rec) => handleRecommendationAction('add_to_watchlist', rec)}
                  onDismiss={(rec) => handleRecommendationAction('dismiss', rec)}
                  onView={(rec) => handleRecommendationAction('view', rec)}
                  data-testid={`recommendation-card-${recommendation.id}`}
                />
              ))}
            </div>

            {/* View All Button */}
            {totalCount > recommendations.length && onViewAll && (
              <div className="text-center pt-4 border-t">
                <Button variant="outline" onClick={onViewAll} data-testid="view-all-recommendations">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  View All {totalCount} Recommendations
                </Button>
              </div>
            )}

            {/* Quick Stats */}
            {recommendations.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
                <span>Showing {recommendations.length} of {totalCount} recommendations</span>
                <span>Updated {new Date().toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}