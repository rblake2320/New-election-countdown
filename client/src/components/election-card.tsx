import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Heart, Share2, Star, Users, Calendar, MapPin, Info, FileText, Trophy, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { CountdownTimer } from "@/components/countdown-timer";
import { CandidateComparisonWizard } from "@/components/candidate-comparison-wizard";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Election, Candidate } from "@shared/schema";
import { useCandidates, useElectionResults } from "@/hooks/use-elections";
import { Link, useLocation } from "wouter";
import { rememberPendingWatch, signInUrl, takePendingWatch } from "@/lib/auth-return";
import { isUpcomingElection } from "@/lib/election-timing";
import { safeSourceUrl } from "@/lib/general-roster";
import { PoliticalLeaningBorder } from "@/components/ui/political-leaning-border";

interface ElectionDetailsResponse {
  election: Election;
  aiAnalysis: string;
  sources: string[];
  relatedQuestions: string[];
}

interface ElectionCardProps {
  election: Election;
  viewMode?: "grid" | "list";
}

const electionTypeColors = {
  primary: "bg-blue-500/20 text-blue-800 dark:text-blue-300",
  general: "bg-green-500/20 text-green-800 dark:text-green-300",
  special: "bg-orange-500/20 text-orange-800 dark:text-orange-300",
  runoff: "bg-purple-500/20 text-purple-800 dark:text-purple-300"
};

const electionLevelColors = {
  federal: "bg-red-500/20 text-red-800 dark:text-red-300",
  state: "bg-blue-500/20 text-blue-800 dark:text-blue-300",
  local: "bg-green-500/20 text-green-800 dark:text-green-300",
  municipal: "bg-yellow-500/20 text-yellow-800 dark:text-yellow-300"
};

function formatElectionDate(date: string): string {
  // Election dates are calendar dates stored at midnight UTC — render in UTC
  // so they don't shift back a day in western timezones.
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

export function ElectionCard({ election, viewMode = "grid" }: ElectionCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Mobile responsiveness hooks
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get watchlist status
  const { data: watchlist } = useQuery({
    queryKey: ["/api/watchlist"],
    enabled: isAuthenticated,
  });

  const isInWatchlist = Array.isArray(watchlist) && 
    watchlist.some((item: any) => item.electionId === election.id);

  // Always fetch candidates for display on card
  const { data: candidates = [], isLoading: candidatesLoading } = useCandidates(election.id);
  const { data: electionResults } = useElectionResults(isDetailsOpen ? election.id : 0);

  // Election details query with aggressive caching
  const { data: electionDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["/api/election-details", election.id],
    queryFn: async () => {
      const response = await fetch(`/api/election-details/${election.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch election details');
      }
      return response.json() as Promise<ElectionDetailsResponse>;
    },
    enabled: isDetailsOpen,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - AI analysis doesn't change frequently
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // Watchlist mutations
  const addToWatchlistMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/watchlist`, { electionId: election.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Added to Watchlist",
        description: "You'll receive updates about this election.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add election to watchlist.",
        variant: "destructive",
      });
    },
  });

  const removeFromWatchlistMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/watchlist/${election.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Removed from Watchlist",
        description: "You'll no longer receive updates about this election.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove election from watchlist.",
        variant: "destructive",
      });
    },
  });

  // Finish a Watch that was started before sign-in, once the watchlist has loaded.
  useEffect(() => {
    if (!isAuthenticated || !Array.isArray(watchlist)) return;
    if (!takePendingWatch(election.id)) return;
    if (!isInWatchlist) addToWatchlistMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, watchlist, election.id]);

  const toggleWatchlist = () => {
    if (!isAuthenticated) {
      // Keep the intent: sign in, come back here, and the watch completes.
      rememberPendingWatch(election.id);
      setLocation(signInUrl(window.location.pathname + window.location.search));
      return;
    }

    if (isInWatchlist) {
      removeFromWatchlistMutation.mutate();
    } else {
      addToWatchlistMutation.mutate();
    }
  };

  const toggleFavorite = () => {
    setIsFavorited(!isFavorited);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: election.title,
          text: `Check out this upcoming election: ${election.title}`,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Election link copied to clipboard.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy link.",
          variant: "destructive",
        });
      }
    }
  };

  // Calculate urgency color
  // Urgency stripe from the shared timing rules; a race that has been held is
  // neutral (the old midnight-UTC day count left past races red forever).
  const daysUntil = isUpcomingElection(election)
    ? Math.max(0, Math.ceil((new Date(election.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : Infinity;
  const urgencyColor = !isUpcomingElection(election) ? "bg-muted" : daysUntil <= 7 ? "bg-brand-error" : 
                      daysUntil <= 30 ? "bg-brand-accent" : 
                      "bg-brand-primary";

  // Neutral frame for every race. The partisan colouring came from simulated
  // "momentum" and simulated voter intentions keyed off the election id
  // (lib/political-analysis), i.e. invented data presented on real races.
  const politicalAnalysis = { leaning: 'neutral' as const, intensity: 'low' as const };

  return (
    <PoliticalLeaningBorder leaning={politicalAnalysis.leaning} intensity={politicalAnalysis.intensity}>
      <div className={cn(
        "unified-card relative border border-border/50 bg-card shadow-xs",
        viewMode === "grid" ? "p-5 gap-4" : "p-4 gap-3 flex-row lg:flex-col"
      )} data-testid="election-card" role="article">
      {/* Tag Row - Absolute positioned for grid, inline for list */}
      <div className={cn(
        "flex gap-2",
        viewMode === "grid" ? "absolute top-3 left-3" : "shrink-0"
      )}>
        <Badge 
          className={cn(
            "px-2 py-0.5 text-xs font-medium rounded-full border-0",
            electionTypeColors[election.type as keyof typeof electionTypeColors]
          )}
        >
          {election.type}
        </Badge>
        <Badge 
          className={cn(
            "px-2 py-0.5 text-xs font-medium rounded-full border-0",
            electionLevelColors[election.level as keyof typeof electionLevelColors]
          )}
        >
          {election.level}
        </Badge>
      </div>

      {/* Urgency indicator */}
      <div className={cn("absolute top-0 left-0 w-1 h-full rounded-l-2xl", urgencyColor)} />

      {/* Title & Meta - Responsive spacing */}
      <header className={cn(
        "space-y-2 flex-1",
        viewMode === "grid" ? "mt-8" : ""
      )}>
        {/* block: Tailwind 4's space-y puts the gap as margin-bottom on this child, which an inline <a> ignores */}
        <Link href={`/elections/${election.id}`} data-testid={`link-election-${election.id}`} className="block">
          <h2 className={cn(
            "font-semibold leading-tight text-foreground hover:text-primary transition-colors cursor-pointer",
            viewMode === "grid" ? "text-lg truncate-2" : "text-base truncate-1"
          )}>
            {election.title}
          </h2>
        </Link>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {election.subtitle || "General Election"}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3 shrink-0" />
            <span className="truncate">{formatElectionDate(election.date.toString())}</span>
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{election.state}</span>
          </p>
        </div>
      </header>

      {/* Countdown - Properly centered and aligned */}
      <div className="flex justify-center items-center py-3">
        <div className="text-center bg-linear-to-br from-background/80 to-muted/50 rounded-lg p-3 border border-border/50">
          <CountdownTimer 
            election={election} 
            size={viewMode === "grid" ? "md" : "sm"} 
            className="text-foreground"
          />
        </div>
      </div>

      {/* Candidate Pills - Grid layout with loading state */}
      {candidatesLoading ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-white">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Loading Candidates...
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="w-full p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-xs border border-gray-200 dark:border-gray-700 animate-pulse">
                <div className="space-y-1">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : candidates.length > 0 ? (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-white">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Candidates ({candidates.length})
            </h3>
            {candidates.length > 4 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Showing top 4
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {candidates.slice(0, 4).map((candidate: any) => (
              <div key={candidate.id} className={cn(
                "w-full p-2.5 rounded-lg bg-linear-to-br from-background/90 to-muted/30 border transition-all hover:shadow-xs hover:border-border/80",
                candidate.isWinner 
                  ? "border-green-500/50 bg-green-500/10" 
                  : "border-border/50"
              )}>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-medium text-foreground truncate-1 flex-1" title={candidate.name}>
                      {candidate.name}
                    </p>
                    {candidate.isWinner && (
                      <Trophy className="w-3 h-3 text-green-600 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate flex-1">
                      {candidate.party}
                    </p>
                    <div className="flex items-center space-x-2">
                      {/* Only show percentages if they're from authentic sources */}
                      {candidate.pollingSupport && candidate.dataAuthenticity?.hasAuthenticPolling && (
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            {candidate.pollingSupport}%
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={`w-2 h-2 rounded-full ${
                                candidate.lastPollingUpdate 
                                  ? 'bg-green-500' 
                                  : 'bg-red-500'
                              }`} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {candidate.lastPollingUpdate 
                                  ? `Authentic polling data from ${candidate.pollingSource}` 
                                  : 'No authentic polling data available'
                                }
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                      {candidate.votePercentage && candidate.dataAuthenticity?.hasAuthenticVotes && (
                        <span className="text-xs font-medium text-green-600">
                          {candidate.votePercentage}%
                        </span>
                      )}
                      {/* Show data quality indicator */}
                      {candidate.dataAuthenticity && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              candidate.dataAuthenticity.dataQuality === 'excellent' ? 'bg-green-500' :
                              candidate.dataAuthenticity.dataQuality === 'good' ? 'bg-blue-500' :
                              candidate.dataAuthenticity.dataQuality === 'fair' ? 'bg-yellow-500' :
                              'bg-gray-500'
                            }`} />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              Data Quality: {candidate.dataAuthenticity.dataQuality}
                              {candidate.dataAuthenticity.pollingConfidence > 0 && 
                                ` (${Math.round(candidate.dataAuthenticity.pollingConfidence * 100)}% confidence)`
                              }
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  {candidate.votesReceived && (
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {candidate.votesReceived.toLocaleString()} votes
                    </p>
                  )}
                  {candidate.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1" title={candidate.description}>
                      {candidate.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {candidates.length > 4 && (
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDetailsOpen(true)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                View all {candidates.length} candidates
              </Button>
            </div>
          )}
        </section>
      ) : null}

      {/* Election Details */}
      {election.offices && election.offices.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-text-muted" />
            <h4 className="text-sm font-medium text-app-fg">Offices on Ballot</h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {election.offices.map((office, index) => (
              <Badge key={index} variant="outline" className="text-xs px-2 py-1 rounded-full border-border-subtle">
                {office}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Action Row - Footer */}
      <footer className="mt-auto flex flex-wrap justify-between items-center gap-2 pt-4 border-t border-border/20">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleWatchlist}
            disabled={addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending}
            className={cn(
              "h-8 px-3 text-xs transition-all flex items-center gap-1.5",
              "hover:bg-primary/10",
              isInWatchlist 
                ? "text-red-600 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800" 
                : "text-muted-foreground hover:text-foreground"
            )}
            title={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
          >
            {isInWatchlist ? (
              <Heart className="h-3 w-3 fill-current" />
            ) : (
              <Heart className="h-3 w-3" />
            )}
            <span className="text-xs">{isInWatchlist ? "Watching" : "Watch"}</span>
          </Button>
        </div>
        
        <div className="flex flex-wrap items-center gap-1.5">
          {/* View Trends Button */}
          <Link href={`/elections/${election.id}?tab=polling`}>
            <Button 
              size="sm" 
              variant="outline"
              className="h-8 px-2.5 text-xs font-medium rounded-full shrink-0"
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              View Trends
            </Button>
          </Link>

          {/* Candidate Comparison Wizard */}
          {candidates && Array.isArray(candidates) && candidates.length >= 2 && (
            <CandidateComparisonWizard 
              election={election} 
              candidates={candidates as Candidate[]} 
            />
          )}
          
          {/* Details Dialog */}
          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="h-8 px-2.5 text-xs font-medium rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
              >
                <Info className="h-3 w-3 mr-1" />
                Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {election.title} - Detailed Analysis
              </DialogTitle>
              <DialogDescription>
                Comprehensive election information and AI-powered analysis
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Election Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Date:</span>
                  <span className="ml-2">{formatElectionDate(election.date.toString())}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Type:</span>
                  <span className="ml-2">{election.type}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Level:</span>
                  <span className="ml-2">{election.level}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">State:</span>
                  <span className="ml-2">{election.state}</span>
                </div>
              </div>

              {/* AI Analysis Section */}
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground">Generating AI analysis...</p>
                  </div>
                </div>
              ) : electionDetails ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-white">AI Analysis</h3>
                    {/* External AI output is untrusted: rendered as text, never as HTML. */}
                    <p className="whitespace-pre-line text-white" data-testid="ai-analysis">
                      {String((electionDetails as any).aiAnalysis || "Analysis not available")}
                    </p>
                  </div>
                  
                  {(electionDetails as any).sources?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Sources</h4>
                      <div className="space-y-1">
                        {(electionDetails as any).sources.map((source: string, index: number) => {
                          // Only http(s) sources become links; anything else (javascript:, data:) is shown as text.
                          const href = safeSourceUrl(String(source));
                          return href ? (
                            <a 
                              key={index}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline block"
                            >
                              {String(source)}
                            </a>
                          ) : (
                            <span key={index} className="text-xs block">{String(source)}</span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </footer>
      </div>
    </PoliticalLeaningBorder>
  );
}