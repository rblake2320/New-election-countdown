import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  ChevronRight, 
  MapPin,
  TrendingUp,
  Star,
  Plus,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { formatElectionDate } from "@/lib/election-data";
import { apiRequest } from "@/lib/queryClient";

interface RecommendationWidgetProps {
  variant?: 'sidebar' | 'popup' | 'banner';
  limit?: number;
  collapsible?: boolean;
  showActions?: boolean;
  className?: string;
  onExpand?: () => void;
}

export function RecommendationWidget({
  variant = 'sidebar',
  limit = 2,
  collapsible = true,
  showActions = true,
  className = "",
  onExpand
}: RecommendationWidgetProps) {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch widget recommendations
  const { data: recommendationsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/recommendations', { limit, widget: true }],
    enabled: !!user && !!token,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    queryFn: async () => {
      const response = await fetch(`/api/recommendations?limit=${limit}&types=location_based,trending`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        return response.json();
      }
      return { recommendations: [], totalCount: 0 };
    },
  });

  // Track interaction
  const trackInteraction = async (action: string, recommendationId: number, electionId?: number) => {
    try {
      await apiRequest('/api/recommendations/track', {
        method: 'POST',
        body: JSON.stringify({ action, recommendationId, electionId }),
      });
    } catch (error) {
      console.error('Failed to track recommendation:', error);
    }
  };

  // Handle add to watchlist
  const handleAddToWatchlist = async (recommendation: any) => {
    try {
      await trackInteraction('click', recommendation.id);
      
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ electionId: recommendation.election.id }),
      });

      if (response.ok) {
        await trackInteraction('add_to_watchlist', recommendation.id, recommendation.election.id);
        toast({
          title: "Added to watchlist",
          description: recommendation.election.title,
        });
        refetch();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to watchlist",
        variant: "destructive",
      });
    }
  };

  // Handle dismiss
  const handleDismiss = async (recommendation: any) => {
    await trackInteraction('dismiss', recommendation.id);
    refetch();
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await apiRequest('/api/recommendations/refresh', { method: 'POST' });
      await refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh recommendations",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'location_based':
        return <MapPin className="h-3 w-3 text-blue-500" />;
      case 'trending':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'interest_based':
        return <Star className="h-3 w-3 text-purple-500" />;
      default:
        return <Sparkles className="h-3 w-3 text-gray-500" />;
    }
  };

  if (!user) {
    return null; // Don't show widget for unauthenticated users
  }

  const recommendations = recommendationsData?.recommendations || [];
  const totalCount = recommendationsData?.totalCount || 0;

  // Banner variant for top of page notifications
  if (variant === 'banner') {
    if (recommendations.length === 0) return null;
    
    const topRecommendation = recommendations[0];
    
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-blue-900 truncate">
                New recommendation: {topRecommendation.election.title}
              </p>
              <p className="text-xs text-blue-700">
                {topRecommendation.reason}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button 
              size="sm" 
              variant="outline" 
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
              onClick={() => handleAddToWatchlist(topRecommendation)}
              data-testid={`add-banner-${topRecommendation.id}`}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-blue-500 hover:bg-blue-100"
              onClick={() => handleDismiss(topRecommendation)}
              data-testid={`dismiss-banner-${topRecommendation.id}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Popup variant for modal or overlay display
  if (variant === 'popup') {
    if (recommendations.length === 0) return null;
    
    return (
      <Card className={`w-80 shadow-lg ${className}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              New Recommendations
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.map((rec: any) => (
            <div key={rec.id} className="border rounded p-2 space-y-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium line-clamp-1">{rec.election.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">{rec.election.location}</p>
                </div>
                <Badge variant="secondary" className="text-xs ml-2">
                  {Math.round(rec.score)}%
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {getTypeIcon(rec.type)}
                  <span className="text-xs text-muted-foreground capitalize">
                    {rec.type.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 px-2 text-xs"
                    onClick={() => handleAddToWatchlist(rec)}
                    data-testid={`add-popup-${rec.id}`}
                  >
                    Add
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 px-1"
                    onClick={() => handleDismiss(rec)}
                    data-testid={`dismiss-popup-${rec.id}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {totalCount > recommendations.length && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={onExpand}
              data-testid="view-all-popup"
            >
              View {totalCount - recommendations.length} more
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default sidebar variant
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            Recommendations
            {totalCount > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">
                {totalCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              data-testid="refresh-widget"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            {collapsible && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsCollapsed(!isCollapsed)}
                data-testid="toggle-widget"
              >
                {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-4">
              <Sparkles className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                No new recommendations
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec: any) => (
                <div key={rec.id} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium line-clamp-2 leading-tight">
                        {rec.election.title}
                      </h4>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">
                          {rec.election.location}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                      {Math.round(rec.score)}%
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {getTypeIcon(rec.type)}
                      <span className="text-xs text-muted-foreground">
                        {formatElectionDate(rec.election.date)}
                      </span>
                    </div>
                    
                    {showActions && (
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-6 px-2 text-xs"
                          onClick={() => handleAddToWatchlist(rec)}
                          data-testid={`add-widget-${rec.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 px-1"
                          onClick={() => handleDismiss(rec)}
                          data-testid={`dismiss-widget-${rec.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {totalCount > recommendations.length && onExpand && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs mt-2"
                  onClick={onExpand}
                  data-testid="view-all-widget"
                >
                  View {totalCount - recommendations.length} more
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}