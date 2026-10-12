import { useState } from 'react';
import { getJson } from "@/lib/queryClient";
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Calendar, 
  MapPin, 
  Users, 
  CheckCircle, 
  Clock,
  AlertCircle,
  RefreshCw,
  Zap
} from 'lucide-react';
import { Link } from 'wouter';

interface Election {
  id: number;
  title: string;
  location: string;
  state: string;
  date: string;
  type: string;
  level: string;
  isActive?: boolean;
}

interface Candidate {
  id: number;
  name: string;
  party: string;
  votesReceived?: number;
  votePercentage?: number;
  isWinner?: boolean;
}

interface ElectionResults {
  electionId: number;
  candidates: Candidate[];
  hasResults: boolean;
  winner: Candidate | null;
  totalVotes: number;
  reportingPrecincts?: number | null;
  totalPrecincts?: number | null;
  percentReporting?: number | string | null;
  isComplete?: boolean;
  lastUpdated?: string;
}

export default function HappeningNow() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch elections happening today/recently (past 30 days for live results)
  const { data: elections = [], isLoading, error, refetch, dataUpdatedAt } = useQuery<Election[]>({
    queryKey: ['/api/elections'],
    select: (data) => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Show results from past 30 days
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      return data
        .filter(e => {
          const electionDate = new Date(e.date);
          return electionDate >= thirtyDaysAgo && electionDate <= tomorrow && e.isActive;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds
  });

  const handleManualRefresh = () => {
    refetch();
  };

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getPartyColor = (party: string) => {
    const partyUpper = party.toUpperCase();
    if (partyUpper === 'D' || partyUpper === 'DEM' || partyUpper === 'DEMOCRATIC') {
      return 'bg-blue-600 dark:bg-blue-500';
    }
    if (partyUpper === 'R' || partyUpper === 'REP' || partyUpper === 'REPUBLICAN') {
      return 'bg-red-600 dark:bg-red-500';
    }
    if (partyUpper === 'I' || partyUpper === 'IND' || partyUpper === 'INDEPENDENT') {
      return 'bg-purple-600 dark:bg-purple-500';
    }
    return 'bg-gray-600 dark:bg-gray-500';
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Zap className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
                Happening Now
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Results as official sources report them
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* When this page last fetched, not when a source reported. */}
            {dataUpdatedAt > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Checked at {new Date(dataUpdatedAt).toLocaleTimeString()}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              data-testid="button-manual-refresh"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              data-testid="button-toggle-auto-refresh"
            >
              <Clock className="w-4 h-4 mr-2" />
              {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
            </Button>
          </div>
        </div>

        {autoRefresh && (
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Auto-refresh is on: this page checks for new results every 30 seconds
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">Loading elections...</p>
        </div>
      )}

      {!isLoading && error && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center gap-3">
            Elections could not be loaded ({error.message.split(':')[0]}).
            <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* No Elections */}
      {!isLoading && !error && elections.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No elections from the past 30 days through tomorrow. Results appear here on election day.
          </AlertDescription>
        </Alert>
      )}

      {/* Election Results */}
      <div className="space-y-6">
        {elections.map(election => (
          <ElectionResultCard key={election.id} election={election} />
        ))}
      </div>
    </div>
  );
}

function ElectionResultCard({ election }: { election: Election }) {
  const { data: results, isLoading, error, refetch } = useQuery<ElectionResults>({
    queryKey: ['/api/elections', election.id, 'results'],
    queryFn: ({ signal }) => getJson<ElectionResults>(`/api/elections/${election.id}/results`, signal),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getPartyColor = (party: string) => {
    const partyUpper = party.toUpperCase();
    if (partyUpper === 'D' || partyUpper === 'DEM' || partyUpper === 'DEMOCRATIC') {
      return 'bg-blue-600 dark:bg-blue-500';
    }
    if (partyUpper === 'R' || partyUpper === 'REP' || partyUpper === 'REPUBLICAN') {
      return 'bg-red-600 dark:bg-red-500';
    }
    if (partyUpper === 'I' || partyUpper === 'IND' || partyUpper === 'INDEPENDENT') {
      return 'bg-purple-600 dark:bg-purple-500';
    }
    return 'bg-gray-600 dark:bg-gray-500';
  };

  // Unknown reporting stays unknown: never shown as 0%.
  const reportedPct = results?.percentReporting != null && results.percentReporting !== ''
    ? Number(results.percentReporting)
    : NaN;
  const percentReporting = Number.isFinite(reportedPct) ? reportedPct : null;
  const hasPrecincts = results?.reportingPrecincts != null && results?.totalPrecincts != null;

  const sortedCandidates = results?.candidates?.length 
    ? [...results.candidates].sort((a, b) => (b.votesReceived || 0) - (a.votesReceived || 0))
    : [];

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-700" data-testid={`card-election-${election.id}`}>
      <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1">
            <Link href={`/elections/${election.id}`}>
              <CardTitle className="text-xl sm:text-2xl hover:text-primary cursor-pointer transition-colors break-words">
                {election.title}
              </CardTitle>
            </Link>
            <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {election.location}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(election.date).toLocaleDateString(undefined, { timeZone: 'UTC' })}
              </span>
              <Badge variant="outline">{election.type}</Badge>
              <Badge variant="outline">{election.level}</Badge>
            </CardDescription>
          </div>
          {results?.winner && (
            <div className="text-right">
              <Badge className="bg-green-600 text-white text-lg px-4 py-2">
                <Trophy className="w-5 h-5 mr-2" />
                Winner declared
              </Badge>
            </div>
          )}
        </div>

        {/* Reporting Progress */}
        {results?.hasResults && (
          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {percentReporting != null
                  ? `Reporting: ${percentReporting.toFixed(1)}%`
                  : 'Reporting: not yet stated by the source'}
              </span>
              {hasPrecincts && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {results.reportingPrecincts!.toLocaleString()} / {results.totalPrecincts!.toLocaleString()} precincts
                </span>
              )}
            </div>
            {percentReporting != null && (
              <Progress value={percentReporting} className="h-2" aria-label="Percent reporting" />
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-6">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
            Loading results...
          </div>
        ) : error ? (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-wrap items-center gap-3">
              Results could not be loaded ({error.message.split(':')[0]}). This does not mean no results were reported.
              <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
            </AlertDescription>
          </Alert>
        ) : !results || !results.hasResults ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No results reported yet. They appear here as official sources publish them.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {sortedCandidates.map((candidate, index) => {
              const isLeading = index === 0 && !results.winner;
              const votePercentage = parseFloat(candidate.votePercentage?.toString() || '0');

              return (
                <div 
                  key={candidate.id} 
                  className={`p-4 rounded-lg border-2 ${
                    candidate.isWinner 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                      : isLeading 
                      ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  data-testid={`candidate-${candidate.id}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                      <div className={`w-3 h-3 rounded-full ${getPartyColor(candidate.party)}`} />
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {candidate.name}
                      </h3>
                      <Badge variant="outline">{candidate.party}</Badge>
                      {candidate.isWinner && (
                        <Badge className="bg-green-600 text-white">
                          <Trophy className="w-3 h-3 mr-1" />
                          Winner
                        </Badge>
                      )}
                      {/* No projections (ET-6): only a source-declared winner is shown as one. */}
                      {isLeading && !candidate.isWinner && (
                        <Badge className="bg-blue-600 text-white">Leading in reported votes</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {votePercentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {(candidate.votesReceived || 0).toLocaleString()} votes
                      </div>
                    </div>
                  </div>
                  <Progress 
                    value={votePercentage} 
                    className={`h-2 ${candidate.isWinner ? '[&>div]:bg-green-600' : ''}`}
                  />
                </div>
              );
            })}

            {/* Total Votes */}
            {results.totalVotes > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Total Votes Cast
                  </span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {results.totalVotes.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
