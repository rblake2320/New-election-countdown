import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  CheckCircle, 
  Clock,
  AlertCircle,
  RefreshCw,
  Zap
} from 'lucide-react';
import { Link } from 'wouter';
import { LiveResultView } from '@/components/live-result-view';
import { batchOutcomeFor, electionDates, formatTime, useLiveResultsBatch } from '@/lib/live-results';

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

  const qc = useQueryClient();
  const handleManualRefresh = () => {
    qc.invalidateQueries({ queryKey: ["/api/results"] });
    refetch();
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
          <Alert role="status" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
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
        <Alert role="status">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No elections from the past 30 days through tomorrow. Results appear here on election day.
          </AlertDescription>
        </Alert>
      )}

      {/* One batch poll per election date (ET-6 v1.2), never one poll per race. */}
      <div className="space-y-10">
        {electionDates(elections).map(date => (
          <DateResults key={date} date={date} elections={elections.filter(e => e.date.slice(0, 10) === date)} poll={autoRefresh} />
        ))}
      </div>
    </div>
  );
}

function DateResults({ date, elections, poll }: { date: string; elections: Election[]; poll: boolean }) {
  const { data, isLoading, error, refetch } = useLiveResultsBatch(date, poll);
  const heading = new Date(date + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

  return (
    <section aria-labelledby={`results-${date}`} className="space-y-4">
      <h2 id={`results-${date}`} className="text-xl font-semibold">{heading}</h2>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {error.message} This does not mean no results were reported.
            <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-6">
        {elections.map(election => (
          <Card key={election.id} className="border-2 border-gray-200 dark:border-gray-700" data-testid={`card-election-${election.id}`}>
            <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
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
                <Badge variant="outline">{election.type}</Badge>
                <Badge variant="outline">{election.level}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="text-center py-6 text-gray-500">
                  <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                  Loading results...
                </div>
              ) : error ? (
                <p className="text-sm text-muted-foreground">Results for this race are not available right now (see above).</p>
              ) : (() => {
                const outcome = batchOutcomeFor(data?.data, election.id);
                if (outcome.kind === 'result') return <LiveResultView result={outcome.result} />;
                if (outcome.kind === 'error') {
                  return (
                    <div role="alert" data-testid={`result-error-${election.id}`} className="text-sm space-y-1">
                      <p className="text-destructive">The official source for this race could not be read{outcome.error.failedSince ? ` since ${formatTime(outcome.error.failedSince)}` : ''}. {outcome.error.message}</p>
                      <p className="text-muted-foreground">This does not mean no results were reported. Other races on this date are unaffected.</p>
                    </div>
                  );
                }
                return <p className="text-sm text-muted-foreground">This race is not in the results feed for {heading}.</p>;
              })()}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
