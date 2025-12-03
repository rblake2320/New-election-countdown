import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  GitCompare, 
  CheckCircle, 
  XCircle, 
  Info,
  Plus,
  UserPlus,
  Trophy, 
  ExternalLink,
  Star,
  Award,
  Briefcase,
  GraduationCap,
  MapPin,
  Calendar,
  DollarSign,
  Vote,
  Database,
  AlertCircle,
  RefreshCw,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Candidate, Election } from "@shared/schema";
import { EnhancedPolicyComparison } from "./enhanced-policy-comparison";
import { useToast } from "@/hooks/use-toast";

interface CandidateComparisonWizardProps {
  election: Election;
  candidates: Candidate[];
}

interface PolicyPosition {
  category: string;
  position: string;
  details?: string;
  source?: string;
}

interface CandidateDetails {
  id: number;
  name: string;
  party: string;
  description?: string;
  background?: string;
  experience?: string[];
  education?: string;
  endorsements?: string[];
  detailedAnalysis?: string;
  policySources?: string[];
  comparisonMetrics?: {
    experience: string;
    visibility: string;
    competitiveness: number;
  };
  pollingSupport?: number;
  votesReceived?: number;
  votePercentage?: string;
  isWinner?: boolean;
  isIncumbent?: boolean;
  website?: string;
  funding?: {
    totalRaised: number;
    individualDonations: number;
    pacContributions: number;
  };
  policies: PolicyPosition[];
  dataAuthenticity?: {
    hasAuthenticPolling: boolean;
    hasAuthenticVotes: boolean;
    lastDataVerification: string;
    pollingConfidence: number;
    dataQuality: "excellent" | "good" | "fair" | "poor";
  };
  dataSourceAvailability?: {
    propublica: boolean;
    fec: boolean;
    voteSmart: boolean;
    openStates: boolean;
    polling: boolean;
  };
  officialData?: {
    propublica: any;
    fec: any;
    voteSmart: any;
    openStates: any;
    polling: any;
  };
}

const policyCategories = [
  "Economy & Jobs",
  "Healthcare",
  "Education", 
  "Environment",
  "Immigration",
  "Criminal Justice",
  "Infrastructure",
  "Taxes",
  "Social Issues",
  "Foreign Policy"
];

export function CandidateComparisonWizard({ election, candidates }: CandidateComparisonWizardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(policyCategories);
  const [step, setStep] = useState<'select' | 'compare'>('select');
  const [enrichedData, setEnrichedData] = useState<Record<number, any>>({});
  const [isFetchingEnriched, setIsFetchingEnriched] = useState(false);
  const { toast } = useToast();

  // Early return if election is not available
  if (!election) {
    return null;
  }

  // Get detailed candidate information using Perplexity AI
  const { data: candidateDetails, isLoading, error, refetch, isError, failureCount } = useQuery({
    queryKey: ["/api/candidates/detailed", selectedCandidates.join(','), election.id],
    queryFn: async () => {
      if (selectedCandidates.length === 0 || !election?.id) return null;
      
      const params = new URLSearchParams({
        candidateIds: selectedCandidates.join(','),
        electionId: election.id.toString()
      });

      // Get custom candidates from sessionStorage
      const customCandidates = JSON.parse(sessionStorage.getItem('customCandidates') || '[]');
      const customInSelection = customCandidates.filter((c: any) => selectedCandidates.includes(c.id));
      
      // Filter regular candidates (those with IDs < 999000)
      const regularCandidateIds = selectedCandidates.filter(id => id < 999000);
      
      if (regularCandidateIds.length > 0) {
        // Replace the existing candidateIds parameter instead of appending
        params.set('candidateIds', regularCandidateIds.join(','));
      }
      
      if (customInSelection.length > 0) {
        params.append('customCandidates', encodeURIComponent(JSON.stringify(customInSelection)));
      }

      const response = await fetch(`/api/candidates/detailed?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to load candidate details: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    enabled: selectedCandidates.length > 0 && step === 'compare',
    retry: (failureCount, error) => {
      // Implement exponential backoff - retry up to 3 times
      if (failureCount < 3) {
        const delay = Math.pow(2, failureCount) * 1000; // 1s, 2s, 4s delays
        toast({
          title: "Retrying...",
          description: `Attempting to load candidate details (${failureCount + 1}/3)`,
          duration: 2000,
        });
        return true;
      }
      toast({
        title: "Failed to Load",
        description: "Unable to retrieve candidate details after multiple attempts.",
        variant: "destructive",
      });
      return false;
    },
    retryDelay: (attemptIndex) => Math.pow(2, attemptIndex) * 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const handleCandidateToggle = (candidateId: number) => {
    setSelectedCandidates(prev => {
      if (prev.includes(candidateId)) {
        return prev.filter(id => id !== candidateId);
      } else if (prev.length < 4) { // Limit to 4 candidates for comparison
        return [...prev, candidateId];
      }
      return prev;
    });
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(cat => cat !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const startComparison = () => {
    if (selectedCandidates.length >= 2) {
      toast({
        title: "Starting Comparison",
        description: `Comparing ${selectedCandidates.length} candidates across ${selectedCategories.length} policy areas.`,
      });
      setStep('compare');
    } else {
      toast({
        title: "Selection Required",
        description: "Please select at least 2 candidates to compare.",
        variant: "destructive",
      });
    }
  };

  const handleRetryComparison = () => {
    toast({
      title: "Retrying",
      description: "Attempting to load candidate details again...",
    });
    refetch();
  };

  const resetWizard = () => {
    setStep('select');
    setSelectedCandidates([]);
    setSelectedCategories(policyCategories);
    setEnrichedData({});
  };

  const fetchEnrichedData = async () => {
    setIsFetchingEnriched(true);
    
    try {
      // Filter out custom candidates (ID >= 999000)
      const regularCandidates = selectedCandidates.filter(id => id < 999000);
      
      if (regularCandidates.length === 0) {
        toast({
          title: "No candidates to enrich",
          description: "Enriched data is only available for real candidates, not custom entries.",
          variant: "destructive",
        });
        setIsFetchingEnriched(false);
        return;
      }

      toast({
        title: "Fetching Real-Time Data",
        description: `Using Perplexity AI to get latest information for ${regularCandidates.length} candidate(s)...`,
      });

      // Fetch enriched data for each candidate in parallel
      const enrichedPromises = regularCandidates.map(async (candidateId) => {
        try {
          const response = await fetch(`/api/candidates/${candidateId}/enriched`);
          if (!response.ok) {
            throw new Error(`Failed to fetch enriched data for candidate ${candidateId}`);
          }
          const data = await response.json();
          return { candidateId, data };
        } catch (error) {
          console.error(`Error fetching enriched data for ${candidateId}:`, error);
          return { candidateId, data: null };
        }
      });

      const results = await Promise.all(enrichedPromises);
      
      // Update enriched data state
      const newEnrichedData: Record<number, any> = {};
      results.forEach(({ candidateId, data }) => {
        if (data) {
          newEnrichedData[candidateId] = data;
        }
      });
      
      setEnrichedData(newEnrichedData);
      
      const successCount = Object.keys(newEnrichedData).length;
      toast({
        title: "Real-Time Data Retrieved",
        description: `Successfully retrieved latest information for ${successCount} of ${regularCandidates.length} candidate(s).`,
      });
    } catch (error) {
      console.error('Error fetching enriched data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch real-time candidate data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingEnriched(false);
    }
  };

  if (candidates.length < 2) {
    return null; // Don't show if there aren't enough candidates to compare
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="h-8 px-2.5 text-xs font-medium rounded-full border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10 flex-shrink-0"
        >
          <GitCompare className="w-3 h-3 mr-1" />
          Compare
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Candidate Comparison Wizard
          </DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <CandidateSelectionStep
            candidates={candidates}
            selectedCandidates={selectedCandidates}
            selectedCategories={selectedCategories}
            onCandidateToggle={handleCandidateToggle}
            onCategoryToggle={handleCategoryToggle}
            onStartComparison={startComparison}
          />
        )}

        {step === 'compare' && (
          <ComparisonView
            election={election}
            candidates={candidates}
            selectedCandidates={selectedCandidates}
            selectedCategories={selectedCategories}
            candidateDetails={candidateDetails}
            enrichedData={enrichedData}
            isFetchingEnriched={isFetchingEnriched}
            onFetchEnriched={fetchEnrichedData}
            isLoading={isLoading}
            isError={isError}
            error={error}
            failureCount={failureCount}
            onRetry={handleRetryComparison}
            onReset={resetWizard}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface CandidateSelectionStepProps {
  candidates: Candidate[];
  selectedCandidates: number[];
  selectedCategories: string[];
  onCandidateToggle: (id: number) => void;
  onCategoryToggle: (category: string) => void;
  onStartComparison: () => void;
}

function CandidateSelectionStep({
  candidates,
  selectedCandidates,
  selectedCategories,
  onCandidateToggle,
  onCategoryToggle,
  onStartComparison
}: CandidateSelectionStepProps) {
  const [customCandidateName, setCustomCandidateName] = useState("");
  const [customCandidateTitle, setCustomCandidateTitle] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [isAddingCustomCandidate, setIsAddingCustomCandidate] = useState(false);
  const [isStartingComparison, setIsStartingComparison] = useState(false);
  const { toast } = useToast();

  const handleAddCustomCandidate = async () => {
    if (customCandidateName.trim() && selectedCandidates.length < 4) {
      setIsAddingCustomCandidate(true);
      
      try {
        // Add small delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Create a temporary ID for custom candidate
        const customId = 999000 + Math.floor(Math.random() * 1000);
        
        // Add to selected candidates list
        onCandidateToggle(customId);
        
        // Store custom candidate info for later use
        const customCandidate = {
          id: customId,
          name: customCandidateName.trim(),
          party: "Independent/Custom",
          title: customCandidateTitle.trim() || "Custom Candidate",
          isCustom: true
        };
        
        // Store in sessionStorage for retrieval during comparison
        const existingCustom = JSON.parse(sessionStorage.getItem('customCandidates') || '[]');
        existingCustom.push(customCandidate);
        sessionStorage.setItem('customCandidates', JSON.stringify(existingCustom));
        
        // Show success feedback
        toast({
          title: "Candidate Added",
          description: `${customCandidateName.trim()} has been added for comparison.`,
        });
        
        setCustomCandidateName("");
        setCustomCandidateTitle("");
        setShowCustomForm(false);
      } catch (error) {
        console.error('Error adding custom candidate:', error);
        toast({
          title: "Error",
          description: "Failed to add custom candidate. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsAddingCustomCandidate(false);
      }
    }
  };

  const handleStartComparison = async () => {
    if (selectedCandidates.length >= 2) {
      setIsStartingComparison(true);
      // Add small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 200));
      onStartComparison();
      setIsStartingComparison(false);
    }
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[70vh]">
      {/* Step 1: Select Candidates */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Step 1: Select Candidates to Compare</h3>
        <p className="text-sm text-text-muted mb-4">
          Choose 2-4 candidates for detailed comparison. Selected: {selectedCandidates.length}/4
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map((candidate) => (
            <Card 
              key={candidate.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md",
                selectedCandidates.includes(candidate.id) 
                  ? "ring-2 ring-brand-primary bg-brand-primary/5" 
                  : "hover:bg-surface-1/50"
              )}
              onClick={() => onCandidateToggle(candidate.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={selectedCandidates.includes(candidate.id)}
                        onChange={() => {}}
                      />
                      <h4 className="font-medium text-app-fg">{candidate.name}</h4>
                      {candidate.isIncumbent && (
                        <Badge variant="outline" className="text-xs">
                          Incumbent
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-text-muted">{candidate.party}</p>
                    {candidate.pollingSupport && (
                      <div className="flex items-center gap-1 text-xs text-brand-primary">
                        <Vote className="w-3 h-3" />
                        {candidate.pollingSupport}% polling support
                      </div>
                    )}
                  </div>
                  {selectedCandidates.includes(candidate.id) && (
                    <CheckCircle className="w-5 h-5 text-brand-primary" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Custom Candidate Option */}
          {selectedCandidates.length < 4 && (
            <Card 
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md border-dashed border-2",
                showCustomForm ? "ring-2 ring-green-500 bg-green-50" : "hover:bg-surface-1/50"
              )}
              onClick={() => setShowCustomForm(!showCustomForm)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-center space-y-2 flex-col">
                  <Plus className="w-6 h-6 text-green-600" />
                  <div className="text-center">
                    <h4 className="font-medium text-sm text-green-700">Add Custom Candidate</h4>
                    <p className="text-xs text-green-600">Compare against anyone</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Custom Candidate Form */}
        {showCustomForm && (
          <Card className="mt-4 border-green-500/20 bg-green-50/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Add Custom Candidate
              </CardTitle>
              <CardDescription>
                Enter any person's name to compare their potential against current candidates. 
                This could be yourself, a hypothetical candidate, or anyone not currently running.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., John Smith, Michelle Obama, yourself"
                    value={customCandidateName}
                    onChange={(e) => setCustomCandidateName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title/Position (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Former Governor, Business Owner, Citizen"
                    value={customCandidateTitle}
                    onChange={(e) => setCustomCandidateTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddCustomCandidate}
                  disabled={!customCandidateName.trim() || isAddingCustomCandidate}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                  data-testid="button-add-custom-candidate"
                >
                  {isAddingCustomCandidate ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" />
                      Add for Comparison
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => setShowCustomForm(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Step 2: Select Policy Categories */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Step 2: Choose Policy Areas to Compare</h3>
        <p className="text-sm text-text-muted mb-4">
          Select the policy categories you want to compare. Selected: {selectedCategories.length}/{policyCategories.length}
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {policyCategories.map((category) => (
            <div
              key={category}
              className={cn(
                "flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all",
                selectedCategories.includes(category)
                  ? "border-brand-primary bg-brand-primary/5"
                  : "border-border-subtle hover:bg-surface-1/50"
              )}
              onClick={() => onCategoryToggle(category)}
            >
              <Checkbox 
                checked={selectedCategories.includes(category)}
                onChange={() => {}}
              />
              <span className="text-sm font-medium">{category}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={handleStartComparison}
          disabled={selectedCandidates.length < 2 || isStartingComparison}
          className="px-6"
          data-testid="button-start-comparison"
        >
          {isStartingComparison ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <GitCompare className="w-4 h-4 mr-2" />
              Start Comparison
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface ComparisonViewProps {
  election: Election;
  candidates: Candidate[];
  selectedCandidates: number[];
  selectedCategories: string[];
  candidateDetails?: CandidateDetails[];
  enrichedData: Record<number, any>;
  isFetchingEnriched: boolean;
  onFetchEnriched: () => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  failureCount: number;
  onRetry: () => void;
  onReset: () => void;
}

function ComparisonView({
  election,
  candidates,
  selectedCandidates,
  selectedCategories,
  candidateDetails,
  enrichedData,
  isFetchingEnriched,
  onFetchEnriched,
  isLoading,
  isError,
  error,
  failureCount,
  onRetry,
  onReset
}: ComparisonViewProps) {
  // Show error state with retry option
  if (isError && !isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-6 max-w-md">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">
              Failed to Load Candidate Details
            </h3>
            <p className="text-sm text-red-700 dark:text-red-400">
              {error?.message || "Unable to retrieve detailed candidate information. This might be due to network issues or server overload."}
            </p>
            {failureCount > 0 && (
              <p className="text-xs text-red-600 dark:text-red-500">
                Attempted {failureCount + 1} time{failureCount > 0 ? 's' : ''}
              </p>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={onRetry} 
              className="flex items-center gap-2"
              data-testid="button-retry-comparison"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button 
              onClick={onReset} 
              variant="outline"
              data-testid="button-reset-comparison"
            >
              Back to Selection
            </Button>
          </div>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-left">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">What you can try:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Check your internet connection</li>
                  <li>Try again in a few moments</li>
                  <li>Select different candidates if the issue persists</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mr-3" />
            <div className="text-left">
              <p className="text-sm font-medium text-brand-primary">
                Loading candidate details...
              </p>
              <p className="text-xs text-text-muted">
                Gathering comprehensive information and policy positions
              </p>
            </div>
          </div>
          
          {failureCount > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                Retrying... (Attempt {failureCount + 1}/3)
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!candidateDetails || candidateDetails.length === 0) {
    // Show basic candidate information even if detailed AI analysis fails
    const basicCandidates = selectedCandidates.map(id => {
      const candidate = candidates.find((c: Candidate) => c.id === id);
      return candidate || { id, name: `Candidate ${id}`, party: 'Unknown' };
    }).filter(Boolean);

    if (basicCandidates.length > 0) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Candidate Comparison</h3>
              <p className="text-sm text-text-muted">
                Comprehensive candidate data with verified polling information
              </p>
            </div>
            <Button onClick={onReset} variant="outline" size="sm">
              New Comparison
            </Button>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            {basicCandidates.map((candidate) => (
              <Card key={candidate.id} className="border-l-4 border-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{candidate.name}</span>
                    <Badge variant="outline">{candidate.party}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><strong>Party:</strong> {candidate.party}</div>
                    {(candidate as any).description && (
                      <div><strong>Description:</strong> {(candidate as any).description}</div>
                    )}
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <Info className="w-4 h-4 inline mr-2" />
                      <span className="text-xs">
                        Enhanced with AI-powered analysis from real-time search and verified sources.
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center pt-4">
            <Button onClick={onReset} variant="outline">
              Try New Comparison
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-12">
        <Info className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Candidate Data Available</h3>
        <p className="text-text-muted mb-4">
          Displaying authentic candidate information and polling data from verified sources.
        </p>
        <Button onClick={onReset} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-y-auto max-h-[80vh]">
      {/* Header with Election Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Candidate Comparison</h3>
          <p className="text-sm text-text-muted">{election.title}</p>
          {Object.keys(enrichedData).length > 0 && (
            <Badge variant="secondary" className="mt-1">
              <RefreshCw className="h-3 w-3 mr-1" />
              Real-time data loaded
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={onFetchEnriched} 
            variant="default"
            size="sm"
            disabled={isFetchingEnriched}
            data-testid="button-fetch-realtime-data"
          >
            {isFetchingEnriched ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Fetch Real-Time Data
              </>
            )}
          </Button>
          <Button onClick={onReset} variant="outline" size="sm">
            New Comparison
          </Button>
        </div>
      </div>

      {/* Candidate Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {candidateDetails.map((candidate) => (
          <Card key={candidate.id} className="bg-surface-1/50">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{candidate.name}</CardTitle>
                  <CardDescription>{candidate.party}</CardDescription>
                </div>
                {candidate.isIncumbent && (
                  <Badge variant="outline" className="text-xs">
                    <Award className="w-3 h-3 mr-1" />
                    Incumbent
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {candidate.pollingSupport && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Polling Support:</span>
                  <span className="font-medium text-brand-primary">{candidate.pollingSupport}%</span>
                </div>
              )}

              <div className="text-xs text-text-muted">
                <p className="line-clamp-2">{candidate.description || 'No description available'}</p>
              </div>

              {candidate.comparisonMetrics && (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Experience:</span>
                    <Badge variant="outline" className="text-xs h-5">
                      {candidate.comparisonMetrics.experience}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Visibility:</span>
                    <Badge variant="outline" className="text-xs h-5">
                      {candidate.comparisonMetrics.visibility}
                    </Badge>
                  </div>
                </div>
              )}

              {candidate.website && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full h-8 text-xs"
                  onClick={() => window.open(candidate.website, '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Campaign Website
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enhanced AI-Powered Analysis with Individual Candidate Styling */}
      {candidateDetails[0]?.detailedAnalysis && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-green-600" />
              AI-Powered Candidate Analysis
            </CardTitle>
            <CardDescription>
              Comprehensive comparison powered by real-time data analysis from {candidateDetails.length} official sources
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Individual Candidate Analysis Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {candidateDetails.map((candidate, index) => {
                const candidateColors = [
                  { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'text-blue-700', name: 'bg-blue-100' },
                  { bg: 'bg-orange-50', border: 'border-orange-200', accent: 'text-orange-700', name: 'bg-orange-100' },
                  { bg: 'bg-green-50', border: 'border-green-200', accent: 'text-green-700', name: 'bg-green-100' },
                  { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'text-purple-700', name: 'bg-purple-100' }
                ];
                const colors = candidateColors[index % candidateColors.length];
                
                return (
                  <Card key={candidate.id} className={`${colors.bg} ${colors.border} border-2`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className={`text-lg ${colors.accent} flex items-center gap-2`}>
                          <div className={`w-3 h-3 rounded-full ${colors.name}`}></div>
                          {candidate.name}
                        </CardTitle>
                        <Badge variant="outline" className={colors.accent}>
                          {candidate.party}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Data Source Indicators */}
                      <div className="flex flex-wrap gap-2">
                        {candidate.dataSourceAvailability?.propublica && (
                          <Badge variant="secondary" className="text-xs">ProPublica</Badge>
                        )}
                        {candidate.dataSourceAvailability?.fec && (
                          <Badge variant="secondary" className="text-xs">FEC Data</Badge>
                        )}
                        {candidate.dataSourceAvailability?.voteSmart && (
                          <Badge variant="secondary" className="text-xs">VoteSmart</Badge>
                        )}
                        {candidate.dataSourceAvailability?.openStates && (
                          <Badge variant="secondary" className="text-xs">Open States</Badge>
                        )}
                      </div>

                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className={`p-2 rounded ${colors.name}`}>
                          <div className="font-medium">Experience</div>
                          <div className={colors.accent}>{candidate.comparisonMetrics?.experience || 'N/A'}</div>
                        </div>
                        <div className={`p-2 rounded ${colors.name}`}>
                          <div className="font-medium">Polling</div>
                          <div className={colors.accent}>
                            {candidate.pollingSupport && candidate.dataAuthenticity?.hasAuthenticPolling 
                              ? `${candidate.pollingSupport}%` 
                              : 'No verified data'
                            }
                          </div>
                        </div>
                      </div>

                      {/* Background Summary */}
                      {candidate.background && (
                        <div>
                          <h5 className={`font-medium ${colors.accent} mb-2`}>Background</h5>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {candidate.background}
                          </p>
                        </div>
                      )}

                      {/* Campaign Website */}
                      {candidate.website && (
                        <a
                          href={candidate.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 text-sm ${colors.accent} hover:underline`}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Campaign Website
                        </a>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Enhanced Policy Comparison Interface */}
            <EnhancedPolicyComparison 
              candidateDetails={candidateDetails}
              selectedCategories={selectedCategories}
            />

            {/* Comparative Analysis */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">AI Analysis Summary</h4>
              <div className="bg-white p-4 rounded-lg border">
                <div className="prose prose-sm max-w-none text-gray-800">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {candidateDetails[0].detailedAnalysis}
                  </div>
                </div>
              </div>
            </div>
            
            {candidateDetails[0]?.policySources && candidateDetails[0].policySources.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Verified Sources
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {candidateDetails[0].policySources.slice(0, 6).map((source, index) => (
                    <a
                      key={index}
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 underline block truncate p-2 bg-gray-50 rounded border"
                    >
                      {source}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Candidate Metrics Comparison */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold">Candidate Metrics</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidateDetails.map((candidate) => (
            <Card key={candidate.id} className="bg-surface-1/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{candidate.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Polling Support:</span>
                    <span className="font-medium">
                      {candidate.pollingSupport && candidate.dataAuthenticity?.hasAuthenticPolling 
                        ? `${candidate.pollingSupport}%` 
                        : 'No verified polling'
                      }
                    </span>
                  </div>
                  
                  {candidate.votesReceived && (
                    <div className="flex justify-between text-sm">
                      <span>Votes Received:</span>
                      <span className="font-medium">{candidate.votesReceived.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {candidate.votePercentage && (
                    <div className="flex justify-between text-sm">
                      <span>Vote Share:</span>
                      <span className="font-medium">{candidate.votePercentage}%</span>
                    </div>
                  )}
                  
                  {candidate.isWinner && (
                    <Badge className="w-full justify-center bg-green-500/10 text-green-700 border-green-500/20">
                      <Trophy className="w-3 h-3 mr-1" />
                      Winner
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Experience & Background Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Experience & Background</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {candidateDetails.map((candidate) => (
              <div key={candidate.id} className="space-y-3">
                <h5 className="font-medium text-app-fg">{candidate.name}</h5>
                
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <GraduationCap className="w-4 h-4 text-text-muted mt-0.5" />
                    <div>
                      <p className="text-xs font-medium">Education</p>
                      <p className="text-xs text-text-muted">{candidate.education}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Briefcase className="w-4 h-4 text-text-muted mt-0.5" />
                    <div>
                      <p className="text-xs font-medium">Experience</p>
                      <ul className="text-xs text-text-muted space-y-1">
                        {(candidate.experience?.slice(0, 3) ?? []).map((exp, index) => (
                          <li key={index} className="line-clamp-1">• {exp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {(candidate.endorsements?.length ?? 0) > 0 && (
                    <div className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-text-muted mt-0.5" />
                      <div>
                        <p className="text-xs font-medium">Key Endorsements</p>
                        <p className="text-xs text-text-muted line-clamp-2">
                          {(candidate.endorsements?.slice(0, 2) ?? []).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}