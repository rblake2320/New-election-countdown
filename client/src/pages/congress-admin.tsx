import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Users, Search, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SEATS, composition, compositionIssues, fetchMembers, ordinal } from '@/lib/congress-members';

/**
 * POST an admin Congress route and return its JSON only on 2xx. Refusals (422 unverified
 * source, 409 refused import, 401/403) and failures are thrown with the server's own
 * message so the page never reports them as a completed import.
 */
export async function postAdminAction(url: string): Promise<unknown> {
  const res = await fetch(url, { method: 'POST', credentials: 'include' });
  const body: any = await res.json().catch(() => null);
  if (!res.ok) {
    const reason = typeof body?.message === 'string' ? body.message
      : typeof body?.error === 'string' ? body.error
      : res.statusText || 'Request failed';
    const code = typeof body?.code === 'string' ? ` (${body.code})` : '';
    throw new Error(`${res.status}: ${reason}${code}`);
  }
  return body;
}

export default function CongressAdminPage() {
  const [perplexityResult, setPerplexityResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  // Current member rows; a failed load is shown as an error, not as zero members.
  const membersQuery = useQuery({
    queryKey: ['/api/members'],
    queryFn: ({ signal }) => fetchMembers('/api/members', signal),
  });
  const { isLoading } = membersQuery;
  const stats = composition(membersQuery.data ?? []);
  const dataIssues = compositionIssues(stats);

  // Import mutation: only a 2xx result counts as an import; refusals stay visible.
  const importMutation = useMutation({
    mutationFn: () => postAdminAction('/api/congress/import'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
    }
  });

  // Perplexity analysis mutation
  const perplexityMutation = useMutation({
    mutationFn: () => postAdminAction('/api/congress/find-missing'),
    onSuccess: (data) => {
      setPerplexityResult(data);
    },
    onError: (error: Error) => {
      setPerplexityResult({ success: false, error: error.message });
    }
  });

  const handlePerplexityAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await perplexityMutation.mutateAsync();
    } catch {
      // Shown through onError; nothing else to do here.
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Stacks on phones so both actions stay reachable. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Congressional Data Management</h1>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${importMutation.isPending ? 'animate-spin' : ''}`} />
            Re-import Data
          </Button>
          <Button 
            onClick={handlePerplexityAnalysis}
            disabled={isAnalyzing || perplexityMutation.isPending}
          >
            <Search className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Find Missing Members
          </Button>
        </div>
      </div>

      {importMutation.isError && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">Import not performed</div>
            <div className="text-sm">{importMutation.error.message}</div>
          </AlertDescription>
        </Alert>
      )}
      {importMutation.isSuccess && (
        <Alert role="status">
          <AlertDescription>The importer accepted the request. Member counts below are re-read from the database.</AlertDescription>
        </Alert>
      )}

      {membersQuery.isError ? (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">Member data could not be loaded</div>
            <div className="text-sm">{membersQuery.error.message}. Counts are not shown because no rows were received.</div>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => membersQuery.refetch()}>Try again</Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Current Statistics: seats are fixed by law; rows are what the database holds. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{ordinal(stats.congress)} Congress Member Records</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {SEATS.senate + SEATS.houseVoting + SEATS.houseNonVoting} seats in total, including {SEATS.houseNonVoting} nonvoting House seats.
                  {stats.otherCongress > 0 && ` ${stats.otherCongress} record(s) from other Congresses are not counted.`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">House</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.houseVoting} <span className="text-base font-normal text-muted-foreground">of {SEATS.houseVoting} voting seats</span></div>
                <p className="text-xs text-muted-foreground">
                  {stats.houseVoting < SEATS.houseVoting
                    ? `${SEATS.houseVoting - stats.houseVoting} voting seat(s) have no member record (a vacancy or a missing row; the importer receipt lists vacancies). `
                    : ''}
                  Nonvoting delegates and resident commissioner: {stats.houseNonVoting} of {SEATS.houseNonVoting}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Senate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.senate} <span className="text-base font-normal text-muted-foreground">of {SEATS.senate} seats</span></div>
                <p className="text-xs text-muted-foreground">
                  {stats.senate === SEATS.senate ? 'Every seat has a member record'
                    : stats.senate > SEATS.senate ? `${stats.senate - SEATS.senate} more record(s) than seats`
                    : `${SEATS.senate - stats.senate} seat(s) have no member record`}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Issues Alert */}
          {dataIssues.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">Data Issues Detected:</div>
                <ul className="mt-2 space-y-1">
                  {dataIssues.map((issue, index) => (
                    <li key={index} className="text-sm">• {issue}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Party Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Party Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.byParty).map(([party, count]) => (
                  <Badge key={party} variant="outline">
                    {party}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Perplexity Analysis Results */}
      {perplexityResult && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {perplexityResult.success ? (
              <div>
                {/* Display Congress.gov Analysis Results */}
                {perplexityResult.analysis && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
                        <div className="text-sm font-medium">Total Found</div>
                        <div className="text-2xl font-bold text-blue-600">{perplexityResult.analysis.totalMembers}</div>
                        <div className="text-xs text-muted-foreground">Expected: {perplexityResult.analysis.expectedTotal}</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded">
                        <div className="text-sm font-medium">House Members</div>
                        <div className="text-2xl font-bold text-green-600">{perplexityResult.analysis.houseMembers}</div>
                        <div className="text-xs text-muted-foreground">Expected: {perplexityResult.analysis.expectedHouse}</div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded">
                        <div className="text-sm font-medium">Senate Members</div>
                        <div className="text-2xl font-bold text-purple-600">{perplexityResult.analysis.senateMembers}</div>
                        <div className="text-xs text-muted-foreground">Expected: {perplexityResult.analysis.expectedSenate}</div>
                      </div>
                    </div>

                    {/* Issues Summary */}
                    {perplexityResult.analysis.issues && perplexityResult.analysis.issues.length > 0 && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded">
                        <div className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                          Data Issues Found ({perplexityResult.analysis.issues.length})
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {perplexityResult.analysis.issues.slice(0, 10).map((issue: string, index: number) => (
                            <div key={index} className="text-xs text-yellow-700 dark:text-yellow-300">
                              • {issue}
                            </div>
                          ))}
                          {perplexityResult.analysis.issues.length > 10 && (
                            <div className="text-xs text-yellow-600 dark:text-yellow-400">
                              ... and {perplexityResult.analysis.issues.length - 10} more issues
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Party Breakdown */}
                    {perplexityResult.analysis.byParty && (
                      <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded">
                        <div className="font-medium mb-2">Party Distribution</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(perplexityResult.analysis.byParty).map(([party, count]) => (
                            <Badge key={party} variant="outline">
                              {party}: {count as number}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Source Information */}
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      <strong>Data Source:</strong> {perplexityResult.analysis.source} | 
                      <strong> Analysis Time:</strong> {new Date(perplexityResult.timestamp || Date.now()).toLocaleString()}
                    </div>
                  </div>
                )}
                
                {/* Legacy text display for older format */}
                {perplexityResult.data && !perplexityResult.analysis && (
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-sm">
                      {perplexityResult.data}
                    </div>
                  </div>
                )}
                
                {perplexityResult.citations && perplexityResult.citations.length > 0 && (
                  <div className="mt-4">
                    <Separator />
                    <h4 className="font-medium mt-4 mb-2">Sources:</h4>
                    <ul className="space-y-1">
                      {perplexityResult.citations.map((citation: string, index: number) => (
                        <li key={index} className="text-sm">
                          <a 
                            href={citation} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {citation}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Error: {perplexityResult.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}