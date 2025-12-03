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
import { CandidateComparisonWizard } from "@/components/candidate-comparison-wizard";
import { PollingTrendChart } from "@/components/polling-trend-chart";
import CandidatePublicView from "@/components/candidate-public-view";
import { CandidateCard } from "@/components/candidate-card";
import { usePollingTrends } from "@/hooks/use-polling-trends";
import { useCandidates, useElection } from "@/hooks/use-elections";
import type { Election, Candidate } from "@shared/schema";

// Hook to fetch individual candidate details
function useCandidateDetails(candidateId: number | null) {
  return useQuery({
    queryKey: [`/api/candidates/${candidateId}`],
    enabled: !!candidateId,
  });
}

export default function ElectionDetails() {
  const params = useParams();
  const electionId = parseInt(params.id || "0");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);

  const { data: election, isLoading: electionLoading } = useElection(electionId);

  const { data: candidates = [], isLoading: candidatesLoading } = useCandidates(electionId);

  const { data: pollingData, isLoading: pollingLoading } = usePollingTrends(electionId, "90");

  const { data: selectedCandidateDetails, isLoading: candidateDetailsLoading } = useCandidateDetails(selectedCandidateId);

  const handleCandidateClick = (candidateId: number) => {
    setSelectedCandidateId(candidateId);
    setCandidateModalOpen(true);
  };

  const handleCloseModal = () => {
    setCandidateModalOpen(false);
    setSelectedCandidateId(null);
  };

  if (electionLoading || candidatesLoading) {
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

  const electionDate = election ? new Date(election.date) : new Date();
  const isUpcoming = electionDate > new Date();
  const hasResults = candidates.some(c => c.votePercentage !== null);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {election?.title}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
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
              {candidates.length} candidates
            </div>
          </div>
        </div>
      </div>

      {/* Election Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant={isUpcoming ? "secondary" : hasResults ? "default" : "outline"}>
                {isUpcoming ? "Upcoming" : hasResults ? "Results Available" : "Past Election"}
              </Badge>
              {election?.type && (
                <Badge variant="outline">{election.type}</Badge>
              )}
            </div>
            {isUpcoming && election && (
              <CountdownTimer 
                targetDate={election.date}
                className="text-sm font-medium"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="polling">Polling Trends</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => handleCandidateClick(candidate.id)}
                    data-testid={`candidate-card-${candidate.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
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
                    <div className="flex items-center gap-4">
                      <div className="text-right">
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

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Election Analysis
              </CardTitle>
              <CardDescription>
                AI-powered insights and trend analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Advanced election analysis coming soon</p>
                <p className="text-sm mt-2">
                  This will include AI-powered insights, voting patterns, and predictive analytics
                </p>
              </div>
            </CardContent>
          </Card>
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