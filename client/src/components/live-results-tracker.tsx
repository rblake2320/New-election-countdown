import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Clock, 
  TrendingUp, 
  Users, 
  RefreshCw,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Election, Candidate } from "@shared/schema";

interface LiveResultsTrackerProps {
  election: Election;
  isLive?: boolean;
}

interface LiveResults {
  electionId: number;
  candidates: Candidate[];
  hasResults: boolean;
  winner: Candidate | null;
  totalVotes: number;
  isLive: boolean;
  lastUpdated: string;
  refreshInterval: number;
  reportingPercent?: number;
}

export function LiveResultsTracker({ election, isLive = false }: LiveResultsTrackerProps) {
  const [autoRefresh, setAutoRefresh] = useState(isLive);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: liveResults, isLoading, refetch } = useQuery({
    queryKey: ['/api/elections', election.id, 'live-results'],
    refetchInterval: autoRefresh ? 30000 : false, // 30 seconds for live elections
    refetchIntervalInBackground: autoRefresh,
    staleTime: 0, // Always fetch fresh data for live results
  }) as { data: LiveResults | undefined; isLoading: boolean; refetch: () => void };

  useEffect(() => {
    if (autoRefresh) {
      setLastRefresh(new Date());
    }
  }, [liveResults, autoRefresh]);

  const handleManualRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-brand-primary" />
            <span className="text-sm text-text-muted">Loading live results...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!liveResults) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-brand-error mx-auto" />
            <p className="text-sm text-text-muted">Unable to load election results</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { candidates, hasResults, winner, totalVotes, reportingPercent } = liveResults;
  const sortedCandidates = [...candidates].sort((a, b) => (b.votesReceived || 0) - (a.votesReceived || 0));

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">Live Election Results</CardTitle>
            <p className="text-sm text-text-muted">{election.title}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            {isLive && (
              <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse" />
                LIVE
              </Badge>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAutoRefresh}
              className={cn(
                "h-8 px-3",
                autoRefresh && "bg-brand-primary/10 border-brand-primary/30"
              )}
            >
              <RefreshCw className={cn("w-3 h-3 mr-1", autoRefresh && "animate-spin")} />
              Auto
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              className="h-8 px-3"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Results Summary */}
        <div className="flex items-center space-x-4 text-sm text-text-muted">
          {reportingPercent !== undefined && (
            <div className="flex items-center space-x-1">
              <TrendingUp className="w-4 h-4" />
              <span>{reportingPercent}% reporting</span>
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>{totalVotes.toLocaleString()} votes</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>Updated {lastRefresh.toLocaleTimeString()}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasResults ? (
          <div className="text-center py-8 space-y-2">
            <Clock className="w-8 h-8 text-text-muted mx-auto" />
            <p className="text-sm text-text-muted">Results will appear when polls close</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCandidates.map((candidate, index) => {
              const votePercent = totalVotes > 0 ? ((candidate.votesReceived || 0) / totalVotes) * 100 : 0;
              const isWinning = index === 0 && hasResults;
              
              return (
                <div
                  key={candidate.id}
                  className={cn(
                    "p-4 rounded-lg border transition-all",
                    candidate.isWinner
                      ? "border-green-500/50 bg-green-500/5"
                      : isWinning
                      ? "border-blue-500/50 bg-blue-500/5"
                      : "border-border-subtle bg-surface-1/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{candidate.name}</h4>
                        {candidate.isWinner && (
                          <Trophy className="w-4 h-4 text-green-600" />
                        )}
                        {isWinning && !candidate.isWinner && (
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      
                      <Badge variant="outline" className="text-xs">
                        {candidate.party}
                      </Badge>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        {votePercent.toFixed(1)}%
                      </div>
                      <div className="text-xs text-text-muted">
                        {(candidate.votesReceived || 0).toLocaleString()} votes
                      </div>
                    </div>
                  </div>
                  
                  <Progress 
                    value={votePercent} 
                    className={cn(
                      "h-2",
                      candidate.isWinner && "bg-green-500/20",
                      isWinning && !candidate.isWinner && "bg-blue-500/20"
                    )}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Winner Declaration */}
        {winner && (
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">Winner Declared</p>
                <p className="text-sm">
                  {winner.name} ({winner.party}) wins with {winner.votePercentage}% of the vote
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Reporting Progress */}
        {reportingPercent !== undefined && reportingPercent < 100 && (
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">
                Precincts Reporting
              </span>
              <span className="text-sm text-blue-600">
                {reportingPercent}% complete
              </span>
            </div>
            <Progress value={reportingPercent} className="h-2 bg-blue-500/20" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}