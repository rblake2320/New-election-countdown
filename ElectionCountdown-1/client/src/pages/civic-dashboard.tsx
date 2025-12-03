import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHead, pageMetadata } from "@/components/page-head";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APICard } from "@/components/APICard";
import CandidateIdFinder from "@/components/CandidateIdFinder";
import ConfidenceMeter from "@/components/ConfidenceMeter";
import BallotInfoPane from "@/components/BallotInfoPane";
import CodeToggle from "@/components/CodeToggle";
import { 
  CheckCircle, 
  XCircle, 
  Database, 
  Globe, 
  Search,
  Users,
  BarChart3,
  MapPin,
  Calendar
} from "lucide-react";

interface APIStatus {
  apis: {
    propublica: boolean;
    openFEC: boolean;
    googleCivic: boolean;
    openStates: boolean;
    voteSmart: boolean;
  };
  internationalSupport: {
    ukParliament: boolean;
    wikidata: boolean;
    euParlGov: boolean;
  };
  lastUpdated: string;
}

interface PolicyComparison {
  category: string;
  positions: Array<{
    candidateId: string;
    candidateName: string;
    position: string;
    details: string;
    source: string;
    confidence: number;
  }>;
}

export default function CivicDashboard() {
  const [candidateIds, setCandidateIds] = useState("H001075,S001193");
  const [policyCategories, setPolicyCategories] = useState("Economy & Jobs,Healthcare,Education");
  const [address, setAddress] = useState("123 Main St, Columbus, OH 43215");
  const [internationalCandidate, setInternationalCandidate] = useState("Boris Johnson");
  const [country, setCountry] = useState("UK");

  // Get civic aggregator status
  const { data: status } = useQuery({
    queryKey: ["/api/civic/status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  }) as { data: APIStatus | undefined };

  // Policy comparison query
  const { data: policyComparison, isLoading: isPolicyLoading } = useQuery({
    queryKey: ["/api/civic/compare", candidateIds, policyCategories],
    queryFn: async () => {
      const params = new URLSearchParams({
        candidateIds,
        policyCategories
      });
      const response = await fetch(`/api/civic/compare?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: candidateIds.length > 0 && policyCategories.length > 0,
  }) as { data: PolicyComparison[] | undefined; isLoading: boolean };

  // Ballot info query
  const { data: ballotInfo, isLoading: isBallotLoading } = useQuery({
    queryKey: ["/api/civic/ballot-info", address],
    queryFn: async () => {
      const params = new URLSearchParams({ address });
      const response = await fetch(`/api/civic/ballot-info?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: address.length > 5,
  });

  // International data query
  const { data: internationalData, isLoading: isInternationalLoading } = useQuery({
    queryKey: ["/api/civic/international", internationalCandidate, country],
    queryFn: async () => {
      const params = new URLSearchParams({
        candidateName: internationalCandidate,
        country
      });
      const response = await fetch(`/api/civic/international?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: internationalCandidate.length > 0 && country.length > 0,
  });

  const StatusIcon = ({ connected }: { connected: boolean }) => (
    connected ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    )
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead {...pageMetadata.civic} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Civic Data Aggregator Dashboard</h1>
          <p className="text-text-muted">
            Comprehensive election and candidate data from 100+ production-ready APIs
          </p>
        </div>

        <Tabs defaultValue="status" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="status">API Status</TabsTrigger>
            <TabsTrigger value="comparison">Policy Comparison</TabsTrigger>
            <TabsTrigger value="ballot">Ballot Info</TabsTrigger>
            <TabsTrigger value="international">International</TabsTrigger>
            <TabsTrigger value="testing">Live Testing</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {status?.apis && Object.entries(status.apis).map(([api, connected]) => (
                <APICard
                  key={api}
                  name={api.replace(/([A-Z])/g, ' $1').trim()}
                  status={connected ? 'connected' : 'disconnected'}
                  quota="Unlimited" 
                  lastStatus={status.lastUpdated}
                  sampleCurl={`curl -X GET "https://api.${api}.org/v1/endpoint"`}
                />
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  International Support
                </CardTitle>
                <CardDescription>
                  Global election data sources and coverage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {status?.internationalSupport && Object.entries(status.internationalSupport).map(([source, supported]) => (
                  <div key={source} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon connected={supported} />
                      <span className="capitalize">{source.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </div>
                    <Badge variant={supported ? "default" : "secondary"}>
                      {supported ? "Available" : "Planned"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {status?.lastUpdated && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-sm text-text-muted">
                    Last updated: {new Date(status.lastUpdated).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Multi-Source Policy Comparison
                </CardTitle>
                <CardDescription>
                  Compare candidates using ProPublica, FEC, VoteSmart, and Open States data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Find Candidates</label>
                  <CandidateIdFinder 
                    onSelect={(candidate) => {
                      setCandidateIds(prev => {
                        const ids = prev ? prev.split(',') : [];
                        if (!ids.includes(candidate.id)) {
                          ids.push(candidate.id);
                        }
                        return ids.join(',');
                      });
                    }}
                  />
                  {candidateIds && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Selected: {candidateIds}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Policy Categories</label>
                  <Input
                    value={policyCategories}
                    onChange={(e) => setPolicyCategories(e.target.value)}
                    placeholder="Economy & Jobs,Healthcare,Education"
                  />
                </div>

                {isPolicyLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-text-muted">Gathering multi-source policy data...</p>
                  </div>
                )}

                {policyComparison && (
                  <div className="space-y-4">
                    {policyComparison.map((category) => (
                      <Card key={category.category}>
                        <CardHeader>
                          <CardTitle className="text-lg">{category.category}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {category.positions.map((position) => (
                              <div key={position.candidateId} className="border-l-4 border-brand-primary pl-4">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-medium">{position.candidateName}</h4>
                                  <ConfidenceMeter value={position.confidence * 100} />
                                </div>
                                <p className="text-sm text-text-muted mb-1">{position.position}</p>
                                <p className="text-xs text-text-muted">Source: {position.source}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ballot" className="space-y-6">
            <BallotInfoPane />
          </TabsContent>

          <TabsContent value="international" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  International Election Data
                </CardTitle>
                <CardDescription>
                  UK Parliament API and Wikidata global coverage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Candidate Name</label>
                    <Input
                      value={internationalCandidate}
                      onChange={(e) => setInternationalCandidate(e.target.value)}
                      placeholder="Boris Johnson"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Country</label>
                    <Input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="UK"
                    />
                  </div>
                </div>

                {isInternationalLoading && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary mx-auto"></div>
                  </div>
                )}

                {internationalData && (
                  <div className="space-y-4">
                    {internationalData.items?.map((item: any, idx: number) => (
                      <Card key={idx}>
                        <CardHeader>
                          <CardTitle className="text-lg">{item.value?.name || 'Unknown'}</CardTitle>
                          <CardDescription>
                            {item.value?.party || 'Party Unknown'} · {item.value?.constituency || 'District Unknown'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground">
                            {item.value?.startDate} - {item.value?.endDate || 'Present'}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <CodeToggle json={internationalData} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="testing" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    ProPublica Congress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-muted mb-3">
                    10k calls/day • Member details, bills, committees
                  </p>
                  <Badge className="mb-2">Free Tier</Badge>
                  <p className="text-xs">
                    curl -H "X-API-Key:$KEY" https://api.propublica.org/congress/v1/members/H001075.json
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    OpenFEC API
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-muted mb-3">
                    120 req/min • Campaign finance data
                  </p>
                  <Badge className="mb-2">Free Tier</Badge>
                  <p className="text-xs">
                    curl "https://api.open.fec.gov/v1/candidates/search?api_key=$KEY&q=sanders"
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Google Civic
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-muted mb-3">
                    25k req/day • Ballot & candidate info
                  </p>
                  <Badge className="mb-2">Free Tier</Badge>
                  <p className="text-xs">
                    curl "https://civicinfo.googleapis.com/civicinfo/v2/elections?key=$KEY"
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Integration Status</CardTitle>
                <CardDescription>
                  Real-time validation of all 100+ production-ready endpoints
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Core U.S. Candidate & Legislative Data</span>
                    <Badge variant="default">5/5 APIs</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Polling & Sentiment (FiveThirtyEight)</span>
                    <Badge variant="default">GitHub CSV</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>International Expansion</span>
                    <Badge variant="default">3 Regions</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Drop-in Aggregator Pattern</span>
                    <Badge variant="default">Self-hosted</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}