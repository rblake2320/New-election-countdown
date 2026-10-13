import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, MapPin, Users, Trophy, TrendingUp, BarChart3, Eye } from "lucide-react";
import { format } from "date-fns";
import { CountdownTimer } from "@/components/countdown-timer";
import { GeneralRoster } from "@/components/general-roster";
import { OfficialResultsLink } from "@/components/official-results-link";
import { officialResultsLink, type OfficialResultsFields } from "@/lib/official-results";
import { getElectionTiming, type ElectionTimingInput } from "@/lib/election-timing";
import { HttpError } from "@/lib/http-error";
import { useNow } from "@/hooks/use-now";
import { CandidateComparisonWizard } from "@/components/candidate-comparison-wizard";
import { PollingTrendChart } from "@/components/polling-trend-chart";
import CandidatePublicView from "@/components/candidate-public-view";
import { CandidateCard } from "@/components/candidate-card";
import { usePollingTrends } from "@/hooks/use-polling-trends";
import { useCandidates, useElection } from "@/hooks/use-elections";
import { useLiveElectionResults } from "@/lib/live-results";
import { LiveResultView } from "@/components/live-result-view";
import type { Election, Candidate } from "@shared/schema";

// Hook to fetch individual candidate details
function useCandidateDetails(candidateId: number | null) {
  return useQuery({
    queryKey: [`/api/candidates/${candidateId}`],
    enabled: !!candidateId,
  });
}

export default function ElectionDetails() {
  const params = useParams<{ id: string }>();
  const electionId = parseInt(params.id || "0");
  // Tab lives in the URL (?tab=polling) so links like "View Trends" open the
  // right tab and Back/refresh keep it (owner UX review: Trends opened Overview).
  const TABS = ["overview", "polling", "candidates"] as const;
  const [activeTab, setActiveTabState] = useState<string>(() => {
    const t = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("tab");
    return t && (TABS as readonly string[]).includes(t) ? t : "overview";
  });
  const setActiveTab = (t: string) => {
    setActiveTabState(t);
    const url = new URL(window.location.href);
    if (t === "overview") url.searchParams.delete("tab"); else url.searchParams.set("tab", t);
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  };
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  // Shared minute clock: the page's phase badge follows the same timing rules as
  // the countdown instead of comparing the midnight-UTC date with "now".
  const minuteNow = useNow(60_000);
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);

  const { data: election, isLoading: electionLoading, error: electionError, failureReason, refetch: refetchElection, isFetching: electionFetching } = useElection(electionId);

  const { data: candidates = [], isLoading: candidatesLoading } = useCandidates(electionId);

  const { data: pollingData, isLoading: pollingLoading } = usePollingTrends(electionId, "90");

  // ET-6 v1.2 results (detail read with history). Polled from election day on.
  const resultsPhase = election ? getElectionTiming(election, new Date(minuteNow)).phase : "upcoming";
  const liveResults = useLiveElectionResults(election ? electionId : 0, resultsPhase !== "upcoming" && resultsPhase !== "completed");

  const { data: selectedCandidateDetails, isLoading: candidateDetailsLoading } = useCandidateDetails(selectedCandidateId);

  const handleCandidateClick = (candidateId: number) => {
    setSelectedCandidateId(candidateId);
    setCandidateModalOpen(true);
  };

  const handleCloseModal = () => {
    setCandidateModalOpen(false);
    setSelectedCandidateId(null);
  };

  // What went wrong, if anything: the final error, or the latest failure while
  // retries are still running. Only a real 404 means "not found".
  const problem = (electionError ?? failureReason) as (HttpError | Error | null);
  const problemStatus = problem instanceof HttpError ? problem.status : problem ? 0 : null;

  if (!election && problem && problemStatus !== 404) {
    const busy = problemStatus === 429;
    const retrying = !electionError; // still inside automatic retries
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center" role="status" data-testid="election-load-problem">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {busy ? "Election Tracker is busy right now" : "We couldn't load this election"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {retrying
              ? "Trying again automatically…"
              : busy
                ? "Too many requests at the moment. Please try again in a few seconds."
                : "Something went wrong on our side or with your connection."}
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={() => refetchElection()} disabled={electionFetching}>
              {electionFetching ? "Retrying…" : "Try again"}
            </Button>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Elections
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if ((electionLoading && !problem) || (election && candidatesLoading)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Election Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            The election you're looking for could not be found.
          </p>
          <Link href="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Elections
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Election dates are calendar dates at midnight UTC — re-anchor to local
  // midnight so date-fns format() doesn't render the previous day.
  const rawDate = election ? new Date(election.date) : new Date();
  const electionDate = election
    ? new Date(rawDate.getUTCFullYear(), rawDate.getUTCMonth(), rawDate.getUTCDate())
    : rawDate;
  const resultStatus = liveResults.data?.data.status ?? "none";
  const hasResults = resultStatus !== "none";
  // `date > now` called a race past from midnight UTC on election day, before
  // polls even opened in Texas (lane C review of 63da481).
  const phase = election ? getElectionTiming(election, new Date(minuteNow)).phase : "upcoming";
  const isUpcoming = phase === "upcoming";
  const isLive = phase === "election-day" || phase === "polls-open";
  const badgeText = isUpcoming ? "Upcoming" : isLive ? "Election Day"
    : resultStatus === "certified" ? "Certified results"
    : resultStatus === "unofficial" ? "Unofficial results"
    : phase === "polls-closed" ? ((election as ElectionTimingInput | undefined)?.pollCloseKind === "ballot_return" ? "Drop-off closed" : "Polls closed")
    : "Past Election";

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      {/* Phones: Back sits above the title and the stats wrap (ET-36). */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4 mb-6">
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">
            {election?.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(electionDate, "EEEE, MMMM d, yyyy")}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {election?.state}, {election?.level}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {candidates.length === 0 ? "Candidates not yet recorded" : `${candidates.length} ${candidates.length === 1 ? "candidate" : "candidates"}`}
            </div>
          </div>
        </div>
      </div>

      {/* Election Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant={isUpcoming || isLive ? "secondary" : hasResults ? "default" : "outline"}>
                {badgeText}
              </Badge>
              {election?.type && (
                <Badge variant="outline">{election.type}</Badge>
              )}
            </div>
            {phase !== "completed" && election && (
              <CountdownTimer 
                election={election}
                className="text-sm font-medium"
              />
            )}
          </div>
                  {election && officialResultsLink(election as OfficialResultsFields) && (
            <div className="mt-4 border-t border-border pt-3">
              <OfficialResultsLink election={election as OfficialResultsFields} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="polling">Polling Trends</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {!isUpcoming && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Results
                </CardTitle>
                <CardDescription>As recorded from official sources. No projections.</CardDescription>
              </CardHeader>
              <CardContent>
                {liveResults.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading results...</p>
                ) : liveResults.error ? (
                  <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
                    {liveResults.error.message} This does not mean no results were reported.
                    <Button variant="outline" size="sm" onClick={() => liveResults.refetch()}>Try again</Button>
                  </div>
                ) : liveResults.data ? (
                  <LiveResultView result={liveResults.data.data} showHistory />
                ) : null}
              </CardContent>
            </Card>
          )}
          <GeneralRoster electionId={electionId} />
          {/* Candidates Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Candidates
              </CardTitle>
              <CardDescription>
                Current candidate standings and information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {candidates.map((candidate) => (
                  <div 
                    key={candidate.id} 
                    className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer sm:flex-row sm:items-center sm:justify-between"
                    onClick={() => handleCandidateClick(candidate.id)}
                    data-testid={`candidate-card-${candidate.id}`}
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white break-words">
                          {candidate.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {candidate.party}
                        </p>
                      </div>
                      {candidate.isIncumbent && (
                        <Badge variant="secondary">Incumbent</Badge>
                      )}
                      {candidate.isWinner && (
                        <Trophy className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end">
                      <div className="sm:text-right">
                        {candidate.votePercentage && (
                          <div className="text-lg font-bold text-green-600">
                            {candidate.votePercentage}%
                          </div>
                        )}
                        {candidate.pollingSupport && (
                          <div className="text-sm text-blue-600 dark:text-blue-400">
                            {candidate.pollingSupport}% polling
                          </div>
                        )}
                        {candidate.votesReceived && (
                          <div className="text-xs text-gray-500">
                            {candidate.votesReceived.toLocaleString()} votes
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCandidateClick(candidate.id);
                        }}
                        data-testid={`button-view-details-${candidate.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="polling" className="space-y-6">
          {pollingLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="animate-pulse h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
          ) : (
            <PollingTrendChart
              electionId={electionId}
              candidates={candidates}
              pollingData={(pollingData as any)?.pollingData || []}
              className="w-full"
            />
          )}
        </TabsContent>

        <TabsContent value="candidates" className="space-y-6">
          <div className="candidate-grid">
            {candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onClick={handleCandidateClick}
              />
            ))}
          </div>

          {candidates.length >= 2 && election && (
            <CandidateComparisonWizard
              election={election}
              candidates={candidates}
            />
          )}
        </TabsContent>

      </Tabs>

      {/* Candidate Details Modal */}
      <Dialog open={candidateModalOpen} onOpenChange={setCandidateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="candidate-details-modal">
          <DialogHeader>
            <DialogTitle>
              {(selectedCandidateDetails as any)?.name || 'Candidate Details'}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {candidateDetailsLoading ? (
              <div className="animate-pulse space-y-6">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : selectedCandidateDetails ? (
              <CandidatePublicView candidate={selectedCandidateDetails} />
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>Failed to load candidate details. Please try again.</p>
                <Button 
                  variant="outline" 
                  onClick={handleCloseModal} 
                  className="mt-4"
                  data-testid="button-close-modal"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}