import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart3, 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Users,
  Briefcase
} from "lucide-react";

interface CandidateDetails {
  id: number;
  name: string;
  party: string;
  policies?: Array<{
    category: string;
    position: string;
    details?: string;
    source?: string;
  }>;
  dataSourceAvailability?: {
    propublica: boolean;
    fec: boolean;
    voteSmart: boolean;
    openStates: boolean;
    polling: boolean;
  };
  comparisonMetrics?: {
    experience: string;
    visibility: string;
    competitiveness: number;
  };
  pollingSupport?: number;
  dataAuthenticity?: {
    hasAuthenticPolling: boolean;
    hasAuthenticVotes: boolean;
    lastDataVerification: string;
    pollingConfidence: number;
    dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

interface EnhancedPolicyComparisonProps {
  candidateDetails: CandidateDetails[];
  selectedCategories: string[];
}

export function EnhancedPolicyComparison({ candidateDetails, selectedCategories }: EnhancedPolicyComparisonProps) {
  const candidateColorSchemes = [
    { 
      primary: 'bg-blue-500', 
      light: 'bg-blue-50', 
      border: 'border-blue-200', 
      text: 'text-blue-700',
      accent: 'bg-blue-100',
      ring: 'ring-blue-500'
    },
    { 
      primary: 'bg-orange-500', 
      light: 'bg-orange-50', 
      border: 'border-orange-200', 
      text: 'text-orange-700',
      accent: 'bg-orange-100',
      ring: 'ring-orange-500'
    },
    { 
      primary: 'bg-green-500', 
      light: 'bg-green-50', 
      border: 'border-green-200', 
      text: 'text-green-700',
      accent: 'bg-green-100',
      ring: 'ring-green-500'
    },
    { 
      primary: 'bg-purple-500', 
      light: 'bg-purple-50', 
      border: 'border-purple-200', 
      text: 'text-purple-700',
      accent: 'bg-purple-100',
      ring: 'ring-purple-500'
    }
  ];

  const getDataSourceScore = (candidate: CandidateDetails): number => {
    const sources = candidate.dataSourceAvailability;
    if (!sources) return 0;
    
    let score = 0;
    if (sources.propublica) score += 25;
    if (sources.fec) score += 25;
    if (sources.voteSmart) score += 25;
    if (sources.openStates) score += 25;
    return score;
  };

  const getPositionStrength = (position: string): 'strong' | 'moderate' | 'weak' => {
    if (position.toLowerCase().includes('not available') || position.toLowerCase().includes('not specified')) {
      return 'weak';
    }
    if (position.length > 100) return 'strong';
    if (position.length > 50) return 'moderate';
    return 'weak';
  };

  return (
    <div className="space-y-8">
      {/* Candidate Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {candidateDetails.map((candidate, index) => {
          const colors = candidateColorSchemes[index % candidateColorSchemes.length];
          const dataScore = getDataSourceScore(candidate);
          
          return (
            <Card key={candidate.id} className={`${colors.light} ${colors.border} border-2 transition-all hover:shadow-lg`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${colors.primary}`}></div>
                    <CardTitle className={`text-lg ${colors.text}`}>
                      {candidate.name}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className={`${colors.text} border-current`}>
                    {candidate.party}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Data Quality Indicator */}
                <div className={`p-3 rounded-lg ${colors.accent}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Data Coverage</span>
                    <span className={`text-sm font-bold ${colors.text}`}>{dataScore}%</span>
                  </div>
                  <div className="w-full bg-white rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${colors.primary} transition-all duration-500`}
                      style={{ width: `${dataScore}%` }}
                    ></div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Experience Level</span>
                    <Badge variant="secondary" className="text-xs">
                      {candidate.comparisonMetrics?.experience || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Polling Support</span>
                    <span className={`text-sm font-medium ${colors.text}`}>
                      {candidate.pollingSupport && candidate.dataAuthenticity?.hasAuthenticPolling 
                        ? `${candidate.pollingSupport}%` 
                        : 'No verified data'
                      }
                    </span>
                  </div>
                </div>

                {/* Data Source Indicators */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-gray-700">Data Sources</span>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {[
                      { key: 'propublica', label: 'ProPublica', available: candidate.dataSourceAvailability?.propublica },
                      { key: 'fec', label: 'FEC', available: candidate.dataSourceAvailability?.fec },
                      { key: 'voteSmart', label: 'VoteSmart', available: candidate.dataSourceAvailability?.voteSmart },
                      { key: 'openStates', label: 'OpenStates', available: candidate.dataSourceAvailability?.openStates }
                    ].map(source => (
                      <div key={source.key} className="flex items-center gap-1">
                        {source.available ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-gray-300" />
                        )}
                        <span className={source.available ? 'text-gray-700' : 'text-gray-400'}>
                          {source.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Policy Category Analysis */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-700" />
          <h3 className="text-xl font-bold text-gray-900">Policy Position Analysis</h3>
        </div>
        
        {selectedCategories.map((category) => (
          <Card key={category} className="overflow-hidden shadow-sm border-2">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
              <CardTitle className="text-lg font-semibold text-gray-800">{category}</CardTitle>
              <CardDescription>
                Comparative analysis from official voting records and verified sources
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {candidateDetails.map((candidate, index) => {
                  const colors = candidateColorSchemes[index % candidateColorSchemes.length];
                  const policy = candidate.policies?.find(p => p.category === category);
                  const position = policy?.position || 'Position not available from current sources';
                  const strength = getPositionStrength(position);
                  
                  return (
                    <div key={candidate.id} className={`p-6 ${colors.light} border-l-4 ${colors.border.replace('border-', 'border-l-')}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${colors.primary}`}></div>
                          <h4 className={`text-lg font-semibold ${colors.text}`}>
                            {candidate.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${colors.text} border-current`}>
                            {candidate.party}
                          </Badge>
                          {strength === 'strong' && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {strength === 'moderate' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                          {strength === 'weak' && <XCircle className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="bg-white/80 p-4 rounded-lg border">
                          <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Official Position
                          </h5>
                          <p className="text-gray-700 leading-relaxed">{position}</p>
                        </div>

                        {policy?.details && (
                          <div className="bg-white/60 p-3 rounded border">
                            <h6 className="font-medium text-gray-800 mb-1 text-sm">Additional Context</h6>
                            <p className="text-gray-600 text-sm leading-relaxed">{policy.details}</p>
                          </div>
                        )}

                        {policy?.source && (
                          <div className="flex items-center gap-2 text-sm text-blue-600">
                            <Database className="w-4 h-4" />
                            <span className="font-medium">Source:</span>
                            <span>{policy.source}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Statistics */}
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Comparison Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {candidateDetails.length}
              </div>
              <div className="text-sm text-gray-600">Candidates Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {selectedCategories.length}
              </div>
              <div className="text-sm text-gray-600">Policy Categories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {Math.round(candidateDetails.reduce((acc, c) => acc + getDataSourceScore(c), 0) / candidateDetails.length)}%
              </div>
              <div className="text-sm text-gray-600">Avg Data Coverage</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}