import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  ArrowRight, 
  TrendingUp,
  MapPin,
  Star,
  Eye,
  Plus
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { formatElectionDate } from "@/lib/election-data";
import { apiRequest } from "@/lib/queryClient";

interface QuickRecommendationsProps {
  limit?: number;
  showHeader?: boolean;
  onViewAll?: () => void;
  onAddToWatchlist?: (recommendation: any) => void;
  className?: string;
}

export function QuickRecommendations({
  limit = 3,
  showHeader = true,
  onViewAll,
  onAddToWatchlist,
  className = ""
}: QuickRecommendationsProps) {
  const { user, token } = useAuth();
  const { toast } = useToast();

  // Fetch quick recommendations
  const { data: recommendationsData, isLoading } = useQuery({
    queryKey: ['/api/recommendations', { limit, types: ['location_based', 'trending'] }],
    enabled: !!user && !!token,
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

  // Track recommendation interaction
  const trackInteraction = async (action: string, recommendationId: number, electionId?: number) => {
    try {
      await apiRequest('/api/recommendations/track', {
        method: 'POST',
        body: JSON.stringify({ 
          action, 
          recommendationId, 
          electionId 
        }),
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
          description: "Election added from quick recommendations",
        });
        onAddToWatchlist?.(recommendation);
      } else {
        throw new Error('Failed to add to watchlist');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add election to watchlist",
        variant: "destructive",
      });
    }
  };

  // Handle view election
  const handleViewElection = async (recommendation: any) => {
    await trackInteraction('view', recommendation.id);
  };

  // Get match percentage color
  const getMatchColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-gray-600';
  };

  // Get recommendation type icon and color
  const getTypeDisplay = (type: string) => {
    switch (type) {
      case 'location_based':
        return { icon: <MapPin className="h-3 w-3" />, label: 'Near You', color: 'text-blue-600' };
      case 'trending':
        return { icon: <TrendingUp className="h-3 w-3" />, label: 'Trending', color: 'text-green-600' };
      case 'interest_based':
        return { icon: <Star className="h-3 w-3" />, label: 'Interest Match', color: 'text-purple-600' };
      default:
        return { icon: <Sparkles className="h-3 w-3" />, label: 'Recommended', color: 'text-gray-600' };
    }
  };

  if (!user) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-4 w-4" />
            Quick Recommendations
          </CardTitle>
          <CardDescription className="text-sm">
            Sign in for personalized suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Get election recommendations tailored to you
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const recommendations = recommendationsData?.recommendations || [];
  const totalCount = recommendationsData?.totalCount || 0;

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-4 w-4 text-blue-500" />
                Quick Recommendations
              </CardTitle>
              <CardDescription className="text-sm">
                Elections you might be interested in
              </CardDescription>
            </div>
            {totalCount > limit && onViewAll && (
              <Button variant="ghost" size="sm" onClick={onViewAll} data-testid="view-all-quick">
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent className={showHeader ? "pt-0" : "pt-4"}>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-6">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              No recommendations available
            </p>
            <Button variant="outline" size="sm" data-testid="setup-preferences-quick">
              Setup Preferences
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((recommendation: any) => {
              const typeDisplay = getTypeDisplay(recommendation.type);
              
              return (
                <div 
                  key={recommendation.id} 
                  className="group border rounded-lg p-3 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => handleViewElection(recommendation)}
                  data-testid={`quick-recommendation-${recommendation.id}`}
                >
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                          {recommendation.election.title}
                        </h4>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">
                            {recommendation.election.location}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1 ml-2">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getMatchColor(recommendation.score)}`}
                        >
                          {Math.round(recommendation.score)}%
                        </Badge>
                      </div>
                    </div>

                    {/* Type and Date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${typeDisplay.color}`}>
                          {typeDisplay.icon}
                          <span className="ml-1">{typeDisplay.label}</span>
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {recommendation.election.type}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewElection(recommendation);
                          }}
                          data-testid={`view-quick-${recommendation.id}`}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToWatchlist(recommendation);
                          }}
                          data-testid={`add-quick-${recommendation.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Election Date */}
                    <div className="text-xs text-muted-foreground">
                      {formatElectionDate(recommendation.election.date)}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Footer */}
            {totalCount > recommendations.length && onViewAll && (
              <div className="pt-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs" 
                  onClick={onViewAll}
                  data-testid="view-all-recommendations-footer"
                >
                  View {totalCount - recommendations.length} more recommendations
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}