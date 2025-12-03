import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Plus, 
  X, 
  TrendingUp, 
  Calendar,
  Eye,
  Share2,
  Star,
  Sparkles
} from "lucide-react";
import { CountdownTimer } from "./countdown-timer";
import { formatElectionDate } from "@/lib/election-data";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

interface RecommendationCardProps {
  recommendation: {
    id: number;
    election: {
      id: number;
      title: string;
      subtitle?: string;
      location: string;
      state: string;
      date: string;
      type: string;
      level: string;
      offices?: string[];
      description?: string;
    };
    score: number;
    type: string;
    reason: string;
    isPresented: boolean;
    isViewed: boolean;
    isClicked: boolean;
    isAddedToWatchlist: boolean;
    isDismissed: boolean;
  };
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  onAddToWatchlist?: (recommendation: any) => void;
  onDismiss?: (recommendation: any) => void;
  onView?: (recommendation: any) => void;
  className?: string;
}

export function RecommendationCard({ 
  recommendation, 
  variant = 'default',
  showActions = true,
  onAddToWatchlist,
  onDismiss,
  onView,
  className = ""
}: RecommendationCardProps) {
  const { toast } = useToast();
  const { token } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  // Track recommendation interaction
  const trackInteraction = async (action: string, electionId?: number) => {
    try {
      await apiRequest('/api/recommendations/track', {
        method: 'POST',
        body: JSON.stringify({ 
          action, 
          recommendationId: recommendation.id, 
          electionId 
        }),
      });
    } catch (error) {
      console.error('Failed to track recommendation:', error);
    }
  };

  // Handle add to watchlist
  const handleAddToWatchlist = async () => {
    if (isAdding) return;
    
    setIsAdding(true);
    try {
      await trackInteraction('click');
      
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ electionId: recommendation.election.id }),
      });

      if (response.ok) {
        await trackInteraction('add_to_watchlist', recommendation.election.id);
        toast({
          title: "Added to watchlist",
          description: "Election added to your watchlist from recommendations",
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
    } finally {
      setIsAdding(false);
    }
  };

  // Handle dismiss
  const handleDismiss = async () => {
    if (isDismissing) return;
    
    setIsDismissing(true);
    try {
      await trackInteraction('dismiss');
      toast({
        title: "Recommendation dismissed",
        description: "We'll improve our suggestions based on your feedback",
      });
      onDismiss?.(recommendation);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to dismiss recommendation",
        variant: "destructive",
      });
    } finally {
      setIsDismissing(false);
    }
  };

  // Handle view election
  const handleViewElection = async () => {
    await trackInteraction('view');
    onView?.(recommendation);
  };

  // Get match percentage color
  const getMatchColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  // Get recommendation type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'location_based':
        return <MapPin className="h-3 w-3" />;
      case 'interest_based':
        return <Star className="h-3 w-3" />;
      case 'trending':
        return <TrendingUp className="h-3 w-3" />;
      case 'similar_users':
        return <Sparkles className="h-3 w-3" />;
      default:
        return <Calendar className="h-3 w-3" />;
    }
  };

  // Compact variant for dashboard/sidebar
  if (variant === 'compact') {
    return (
      <Card className={`hover:shadow-md transition-shadow cursor-pointer ${className}`} onClick={handleViewElection}>
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <h4 className="font-medium text-sm line-clamp-2">{recommendation.election.title}</h4>
              <Badge className={`${getMatchColor(recommendation.score)} border text-xs ml-2 flex-shrink-0`}>
                {Math.round(recommendation.score)}%
              </Badge>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{recommendation.election.location}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">
                  {getTypeIcon(recommendation.type)}
                  <span className="ml-1">{recommendation.type.replace('_', ' ')}</span>
                </Badge>
              </div>
              
              {showActions && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToWatchlist();
                  }}
                  disabled={isAdding}
                  data-testid={`add-compact-${recommendation.id}`}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Detailed variant for full recommendation displays
  if (variant === 'detailed') {
    return (
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <h3 className="font-semibold text-lg">{recommendation.election.title}</h3>
                {recommendation.election.subtitle && (
                  <p className="text-sm text-muted-foreground">{recommendation.election.subtitle}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {recommendation.election.location}
                </div>
              </div>
              <Badge className={`${getMatchColor(recommendation.score)} border flex items-center gap-1`}>
                <TrendingUp className="h-3 w-3" />
                {Math.round(recommendation.score)}% match
              </Badge>
            </div>

            {/* Election Details */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{recommendation.election.type}</Badge>
              <Badge variant="outline">{recommendation.election.level}</Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                {getTypeIcon(recommendation.type)}
                {recommendation.type.replace('_', ' ')}
              </Badge>
            </div>

            {/* Offices */}
            {recommendation.election.offices && recommendation.election.offices.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Offices:</p>
                <div className="flex flex-wrap gap-1">
                  {recommendation.election.offices.map((office, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {office}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation Reason */}
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm">
                <strong>Why this matches:</strong> {recommendation.reason}
              </p>
            </div>

            {/* Description */}
            {recommendation.election.description && (
              <p className="text-sm text-muted-foreground">
                {recommendation.election.description}
              </p>
            )}

            {/* Countdown */}
            <CountdownTimer 
              targetDate={recommendation.election.date} 
              size="sm"
              className="text-sm"
            />

            {/* Actions */}
            {showActions && (
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  onClick={handleAddToWatchlist}
                  disabled={isAdding}
                  data-testid={`add-detailed-${recommendation.id}`}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isAdding ? 'Adding...' : 'Add to Watchlist'}
                </Button>
                <Button variant="outline" onClick={handleViewElection} data-testid={`view-${recommendation.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button variant="outline" data-testid={`share-${recommendation.id}`}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleDismiss} 
                  disabled={isDismissing}
                  data-testid={`dismiss-${recommendation.id}`}
                >
                  <X className="h-4 w-4 mr-2" />
                  Dismiss
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <h4 className="font-medium">{recommendation.election.title}</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {recommendation.election.location}
              </div>
            </div>
            <Badge className={`${getMatchColor(recommendation.score)} border flex items-center gap-1`}>
              <TrendingUp className="h-3 w-3" />
              {Math.round(recommendation.score)}% match
            </Badge>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{recommendation.election.type}</Badge>
            <Badge variant="outline">{recommendation.election.level}</Badge>
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              {getTypeIcon(recommendation.type)}
              {recommendation.type.replace('_', ' ')}
            </Badge>
          </div>

          {/* Reason */}
          <p className="text-sm text-muted-foreground">
            <strong>Why this matches:</strong> {recommendation.reason}
          </p>

          {/* Countdown */}
          <CountdownTimer 
            targetDate={recommendation.election.date} 
            size="sm"
            className="text-sm"
          />

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleAddToWatchlist}
                disabled={isAdding}
                data-testid={`add-default-${recommendation.id}`}
              >
                <Plus className="h-3 w-3 mr-1" />
                {isAdding ? 'Adding...' : 'Add to Watchlist'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewElection}
                data-testid={`view-default-${recommendation.id}`}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDismiss}
                disabled={isDismissing}
                data-testid={`dismiss-default-${recommendation.id}`}
              >
                <X className="h-3 w-3 mr-1" />
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}