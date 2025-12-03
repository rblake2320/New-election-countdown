import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Clock, MapPin, Trash2 } from "lucide-react";
import { CountdownTimer } from "./countdown-timer";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { formatElectionDate, getUrgencyLevel, getUrgencyColor } from "@/lib/election-data";

export function UserWatchlist() {
  const { user, token } = useAuth();
  const { toast } = useToast();

  const { data: watchlist = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/watchlist'],
    enabled: !!user && !!token,
    queryFn: async () => {
      const response = await fetch('/api/watchlist', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch watchlist');
      }
      
      return response.json();
    },
  });

  const removeFromWatchlist = async (electionId: number) => {
    try {
      const response = await fetch(`/api/watchlist/${electionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Removed from watchlist",
          description: "Election removed from your watchlist",
        });
        refetch();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove election from watchlist",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            My Watchlist
          </CardTitle>
          <CardDescription>
            Sign in to save elections you want to track
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            My Watchlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading watchlist...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          My Watchlist
        </CardTitle>
        <CardDescription>
          {watchlist.length} saved election{watchlist.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {watchlist.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No elections saved yet. Click the heart icon on any election to add it to your watchlist.
          </div>
        ) : (
          watchlist.map((item: any) => {
            const election = item.election;
            const urgency = getUrgencyLevel(election.date);
            const urgencyColor = getUrgencyColor(urgency);
            
            return (
              <div key={item.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">{election.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {election.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {election.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {election.level}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromWatchlist(election.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="pt-2">
                  <CountdownTimer 
                    targetDate={election.date} 
                    size="sm"
                    className="text-xs"
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}