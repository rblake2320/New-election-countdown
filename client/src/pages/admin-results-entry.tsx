import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useIsAdmin } from '@/lib/useIsAdmin';
import { ChevronLeft, Save, Trophy, AlertTriangle, CheckCircle, RefreshCw, Shield } from 'lucide-react';
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
  isProjectedWinner?: boolean;
}

interface CandidateInput {
  candidateId: number;
  votesReceived: number;
  votePercentage: number;
  isWinner: boolean;
  isProjectedWinner: boolean;
}

export default function AdminResultsEntry() {
  const { toast } = useToast();
  const isAdmin = useIsAdmin();
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);
  const [totalVotes, setTotalVotes] = useState<number>(0);
  const [reportingPrecincts, setReportingPrecincts] = useState<number>(0);
  const [totalPrecincts, setTotalPrecincts] = useState<number>(0);
  const [candidateInputs, setCandidateInputs] = useState<Record<number, CandidateInput>>({});
  const [resultsSource, setResultsSource] = useState<string>('Manual Entry');

  // Admin access control
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-600" />
              <div>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>Administrative privileges required</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You do not have permission to access the election results entry system. 
                This area is restricted to authorized administrators only.
              </AlertDescription>
            </Alert>
            <div className="mt-6">
              <Link href="/">
                <Button variant="outline">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Return to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch elections happening today/soon
  const { data: elections = [], isLoading: electionsLoading } = useQuery<Election[]>({
    queryKey: ['/api/elections'],
    select: (data) => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      return data
        .filter(e => {
          const electionDate = new Date(e.date);
          return electionDate >= sevenDaysAgo && electionDate <= sevenDaysFromNow;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  });

  // Fetch candidates for selected election
  const { data: candidates = [], isLoading: candidatesLoading } = useQuery<Candidate[]>({
    queryKey: ['/api/elections', selectedElectionId, 'candidates'],
    enabled: !!selectedElectionId
  });

  // Fetch current results
  const { data: currentResults, refetch: refetchResults } = useQuery({
    queryKey: ['/api/elections', selectedElectionId, 'results'],
    enabled: !!selectedElectionId
  });

  // Update results mutation
  const updateResultsMutation = useMutation({
    mutationFn: async (resultsData: any) => {
      return apiRequest(`/api/elections/${selectedElectionId}/results`, {
        method: 'POST',
        body: JSON.stringify(resultsData),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Results Updated',
        description: 'Election results have been saved successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/elections', selectedElectionId, 'results'] });
      queryClient.invalidateQueries({ queryKey: ['/api/elections', selectedElectionId, 'candidates'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update election results.',
        variant: 'destructive',
      });
    }
  });

  // Initialize candidate inputs when candidates are loaded
  useState(() => {
    if (candidates.length > 0 && Object.keys(candidateInputs).length === 0) {
      const initialInputs: Record<number, CandidateInput> = {};
      candidates.forEach(candidate => {
        initialInputs[candidate.id] = {
          candidateId: candidate.id,
          votesReceived: candidate.votesReceived || 0,
          votePercentage: parseFloat(candidate.votePercentage?.toString() || '0'),
          isWinner: candidate.isWinner || false,
          isProjectedWinner: candidate.isProjectedWinner || false,
        };
      });
      setCandidateInputs(initialInputs);
    }
  });

  // Handle election selection
  const handleElectionSelect = (electionId: string) => {
    const id = parseInt(electionId);
    setSelectedElectionId(id);
    setCandidateInputs({});
    setTotalVotes(0);
    setReportingPrecincts(0);
    setTotalPrecincts(0);
  };

  // Update candidate input
  const updateCandidateInput = (candidateId: number, field: keyof CandidateInput, value: any) => {
    setCandidateInputs(prev => ({
      ...prev,
      [candidateId]: {
        ...prev[candidateId],
        [field]: value
      }
    }));
  };

  // Auto-calculate percentages
  const calculatePercentages = () => {
    if (totalVotes === 0) return;

    const updated = { ...candidateInputs };
    Object.keys(updated).forEach(id => {
      const candidateId = parseInt(id);
      const votes = updated[candidateId].votesReceived;
      updated[candidateId].votePercentage = parseFloat(((votes / totalVotes) * 100).toFixed(2));
    });
    setCandidateInputs(updated);

    toast({
      title: 'Percentages Calculated',
      description: 'Vote percentages have been automatically calculated.',
    });
  };

  // Auto-calculate total votes
  const calculateTotalVotes = () => {
    const total = Object.values(candidateInputs).reduce((sum, input) => sum + input.votesReceived, 0);
    setTotalVotes(total);

    toast({
      title: 'Total Votes Calculated',
      description: `Total votes: ${total.toLocaleString()}`,
    });
  };

  // Mark winner
  const markWinner = (candidateId: number) => {
    const updated = { ...candidateInputs };
    
    // Clear all winners first
    Object.keys(updated).forEach(id => {
      const cId = parseInt(id);
      updated[cId].isWinner = false;
      updated[cId].isProjectedWinner = false;
    });
    
    // Set the selected candidate as winner
    updated[candidateId].isWinner = true;
    setCandidateInputs(updated);

    toast({
      title: 'Winner Marked',
      description: 'Candidate has been marked as the winner.',
    });
  };

  // Submit results
  const handleSubmit = () => {
    if (!selectedElectionId) {
      toast({
        title: 'No Election Selected',
        description: 'Please select an election first.',
        variant: 'destructive',
      });
      return;
    }

    const percentReporting = totalPrecincts > 0 
      ? parseFloat(((reportingPrecincts / totalPrecincts) * 100).toFixed(2))
      : 0;

    const resultsData = {
      totalVotes,
      reportingPrecincts,
      totalPrecincts,
      percentReporting,
      isComplete: reportingPrecincts === totalPrecincts && totalPrecincts > 0,
      resultsSource,
      candidateResults: Object.values(candidateInputs)
    };

    updateResultsMutation.mutate(resultsData);
  };

  const selectedElection = elections.find(e => e.id === selectedElectionId);
  const percentReporting = totalPrecincts > 0 
    ? ((reportingPrecincts / totalPrecincts) * 100).toFixed(1)
    : '0';

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Live Results Entry
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manual entry system for election results
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" data-testid="button-back-home">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Election Selector */}
      <Card className="mb-6" data-testid="card-election-selector">
        <CardHeader>
          <CardTitle>Select Election</CardTitle>
          <CardDescription>
            Showing elections from 7 days ago to 7 days from now
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleElectionSelect} value={selectedElectionId?.toString()}>
            <SelectTrigger data-testid="select-election">
              <SelectValue placeholder="Choose an election..." />
            </SelectTrigger>
            <SelectContent>
              {elections.map(election => (
                <SelectItem key={election.id} value={election.id.toString()}>
                  {election.title} - {election.location} - {new Date(election.date).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Results Entry Form */}
      {selectedElection && (
        <>
          <Alert className="mb-6" data-testid="alert-election-info">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{selectedElection.title}</strong> - {selectedElection.location}
              <br />
              Date: {new Date(selectedElection.date).toLocaleDateString()} | 
              Type: {selectedElection.type} | 
              Level: {selectedElection.level}
            </AlertDescription>
          </Alert>

          {/* Overall Results */}
          <Card className="mb-6" data-testid="card-overall-results">
            <CardHeader>
              <CardTitle>Overall Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="totalVotes">Total Votes Cast</Label>
                  <Input
                    id="totalVotes"
                    type="number"
                    value={totalVotes}
                    onChange={(e) => setTotalVotes(parseInt(e.target.value) || 0)}
                    data-testid="input-total-votes"
                  />
                </div>
                <div>
                  <Label htmlFor="reportingPrecincts">Reporting Precincts</Label>
                  <Input
                    id="reportingPrecincts"
                    type="number"
                    value={reportingPrecincts}
                    onChange={(e) => setReportingPrecincts(parseInt(e.target.value) || 0)}
                    data-testid="input-reporting-precincts"
                  />
                </div>
                <div>
                  <Label htmlFor="totalPrecincts">Total Precincts</Label>
                  <Input
                    id="totalPrecincts"
                    type="number"
                    value={totalPrecincts}
                    onChange={(e) => setTotalPrecincts(parseInt(e.target.value) || 0)}
                    data-testid="input-total-precincts"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="resultsSource">Results Source</Label>
                <Input
                  id="resultsSource"
                  value={resultsSource}
                  onChange={(e) => setResultsSource(e.target.value)}
                  placeholder="e.g., Secretary of State, Associated Press"
                  data-testid="input-results-source"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Reporting</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {percentReporting}%
                  </div>
                </div>
                <div className="space-x-2">
                  <Button 
                    onClick={calculateTotalVotes}
                    variant="outline"
                    size="sm"
                    data-testid="button-calc-total-votes"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Calc Total Votes
                  </Button>
                  <Button 
                    onClick={calculatePercentages}
                    variant="outline"
                    size="sm"
                    data-testid="button-calc-percentages"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Calc Percentages
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Candidate Results */}
          <Card data-testid="card-candidate-results">
            <CardHeader>
              <CardTitle>Candidate Results</CardTitle>
              <CardDescription>
                Enter vote counts for each candidate
              </CardDescription>
            </CardHeader>
            <CardContent>
              {candidatesLoading ? (
                <div className="text-center py-8">Loading candidates...</div>
              ) : candidates.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No candidates found for this election. Please add candidates first.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Votes Received</TableHead>
                      <TableHead>Vote %</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map(candidate => {
                      const input = candidateInputs[candidate.id] || {
                        candidateId: candidate.id,
                        votesReceived: 0,
                        votePercentage: 0,
                        isWinner: false,
                        isProjectedWinner: false
                      };

                      return (
                        <TableRow key={candidate.id}>
                          <TableCell className="font-medium">
                            {candidate.name}
                            {input.isWinner && (
                              <Badge className="ml-2 bg-green-600">
                                <Trophy className="w-3 h-3 mr-1" />
                                Winner
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{candidate.party}</Badge>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={input.votesReceived}
                              onChange={(e) => 
                                updateCandidateInput(
                                  candidate.id, 
                                  'votesReceived', 
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-32"
                              data-testid={`input-votes-${candidate.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={input.votePercentage}
                              onChange={(e) => 
                                updateCandidateInput(
                                  candidate.id, 
                                  'votePercentage', 
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-24"
                              data-testid={`input-percentage-${candidate.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={input.isWinner ? 'default' : 'outline'}
                              onClick={() => markWinner(candidate.id)}
                              data-testid={`button-mark-winner-${candidate.id}`}
                            >
                              <Trophy className="w-4 h-4 mr-2" />
                              {input.isWinner ? 'Winner' : 'Mark Winner'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={updateResultsMutation.isPending || candidates.length === 0}
                  size="lg"
                  data-testid="button-submit-results"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateResultsMutation.isPending ? 'Saving...' : 'Save Results'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedElection && !electionsLoading && elections.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No elections found within the next 7 days. Please check back later or adjust the date range.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
