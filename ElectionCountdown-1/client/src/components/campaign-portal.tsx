import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Building2, TrendingUp, Users, MapPin, Download, DollarSign } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CampaignData {
  apiKey: string;
  subscription: {
    tier: string;
    features: string[];
    isActive: boolean;
  };
}

const SUBSCRIPTION_TIERS = {
  basic: { price: 99, name: 'Basic', color: 'bg-blue-500' },
  pro: { price: 499, name: 'Pro', color: 'bg-purple-500' },
  enterprise: { price: 2499, name: 'Enterprise', color: 'bg-orange-500' },
  custom: { price: 0, name: 'Custom', color: 'bg-green-500' }
};

export function CampaignPortal() {
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [selectedElection, setSelectedElection] = useState(1);

  // Campaign registration mutation
  const registerCampaign = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/campaign/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }
      
      return result;
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        setCampaignData(result.data);
        setApiKey(result.data.apiKey);
      }
    },
  });

  // Analytics query
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/campaign/analytics', selectedElection, apiKey],
    enabled: !!apiKey,
    queryFn: async () => {
      const response = await fetch(`/api/campaign/analytics/${selectedElection}`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
  });

  // Subscription query
  const { data: subscription } = useQuery({
    queryKey: ['/api/campaign/subscription', apiKey],
    enabled: !!apiKey,
    queryFn: async () => {
      const response = await fetch('/api/campaign/subscription', {
        headers: {
          'X-API-Key': apiKey,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch subscription');
      return response.json();
    },
  });

  const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      organizationName: formData.get('campaignName') as string,
      candidateName: formData.get('candidateName') as string,
      officeSeeking: formData.get('officeSeeking') as string,
      contactEmail: formData.get('contactEmail') as string,
      electionId: selectedElection,
    };
    registerCampaign.mutate(data);
  };

  if (!campaignData) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Campaign Data Portal
          </CardTitle>
          <CardDescription>
            Register your campaign to access voter analytics and insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="campaignName">Campaign Name</Label>
                <Input name="campaignName" placeholder="Smith for Congress" required />
              </div>
              <div>
                <Label htmlFor="candidateName">Candidate Name</Label>
                <Input name="candidateName" placeholder="John Smith" required />
              </div>
            </div>
            <div>
              <Label htmlFor="officeSeeking">Office Seeking</Label>
              <Input name="officeSeeking" placeholder="U.S. House of Representatives" required />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input name="contactEmail" type="email" placeholder="campaign@example.com" required />
            </div>
            <div>
              <Label htmlFor="electionId">Election ID</Label>
              <Input 
                name="electionId" 
                type="number" 
                value={selectedElection} 
                onChange={(e) => setSelectedElection(parseInt(e.target.value))}
                placeholder="1" 
                required 
              />
            </div>
            <Button type="submit" className="w-full" disabled={registerCampaign.isPending}>
              {registerCampaign.isPending ? 'Registering...' : 'Register Campaign'}
            </Button>
          </form>

          {registerCampaign.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
              Error: {(registerCampaign.error as Error).message}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with API Key and Subscription */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Campaign Analytics Dashboard</h1>
          <p className="text-muted-foreground">Access real-time voter insights and engagement data</p>
        </div>
        <div className="text-right space-y-2">
          <div className="text-sm text-muted-foreground">API Key</div>
          <code className="text-xs bg-muted px-2 py-1 rounded">{apiKey.slice(0, 20)}...</code>
          {subscription && (
            <Badge className={SUBSCRIPTION_TIERS[subscription.tier as keyof typeof SUBSCRIPTION_TIERS]?.color}>
              {SUBSCRIPTION_TIERS[subscription.tier as keyof typeof SUBSCRIPTION_TIERS]?.name} Plan
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="polling">Polling Data</TabsTrigger>
          <TabsTrigger value="exports">Data Exports</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          {analyticsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                      <div className="h-8 bg-muted rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Total Views</span>
                    </div>
                    <div className="text-2xl font-bold">{analytics.totalViews?.toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Engagement Score</span>
                    </div>
                    <div className="text-2xl font-bold">{analytics.engagementScore}/100</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium">Geographic Reach</span>
                    </div>
                    <div className="text-2xl font-bold">{analytics.stateLevel?.geographicSpread || 0}</div>
                  </CardContent>
                </Card>
              </div>

              {/* State Level Analytics */}
              {analytics.stateLevel && (
                <Card>
                  <CardHeader>
                    <CardTitle>State-Level Analytics</CardTitle>
                    <CardDescription>Aggregated engagement metrics by state</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Total Engagement</div>
                        <div className="text-lg font-semibold">{analytics.stateLevel.totalEngagement}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Average Interest Level</div>
                        <div className="text-lg font-semibold">{analytics.stateLevel.averageInterest?.toFixed(1)}/10</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Demographics (Pro+ only) */}
              {analytics.demographics && (
                <Card>
                  <CardHeader>
                    <CardTitle>Demographic Breakdown</CardTitle>
                    <CardDescription>User segments viewing your election</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analytics.demographics.segments.map((segment: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                          <span className="font-medium">{segment.name}</span>
                          <span className="text-sm text-muted-foreground">{segment.size} users</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Real-time Metrics (Enterprise only) */}
              {analytics.realTimeMetrics && (
                <Card>
                  <CardHeader>
                    <CardTitle>Real-Time Metrics</CardTitle>
                    <CardDescription>Live viewer activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {analytics.realTimeMetrics.liveViewers} live viewers
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No analytics data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="demographics">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Demographics</CardTitle>
              <CardDescription>Voter engagement by region</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Geographic analytics will be displayed here based on your subscription tier.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="polling">
          <Card>
            <CardHeader>
              <CardTitle>Polling Data</CardTitle>
              <CardDescription>Public polling results for your election</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Polling data will be displayed here when available.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports">
          <Card>
            <CardHeader>
              <CardTitle>Data Exports</CardTitle>
              <CardDescription>Purchase and download detailed analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Basic Analytics', price: 25, type: 'basic_analytics' },
                  { name: 'Demographic Data', price: 50, type: 'demographic_data' },
                  { name: 'Engagement Metrics', price: 75, type: 'engagement_metrics' },
                  { name: 'Geographic Clusters', price: 100, type: 'geographic_clusters' },
                ].map((exportType) => (
                  <Card key={exportType.type} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold">{exportType.name}</h4>
                          <p className="text-sm text-muted-foreground">${exportType.price}</p>
                        </div>
                        <Button size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Purchase
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Subscription Features */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Your Subscription</CardTitle>
            <CardDescription>
              {SUBSCRIPTION_TIERS[subscription.tier as keyof typeof SUBSCRIPTION_TIERS]?.name} Plan Features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscription.features?.map((feature: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">{feature}</span>
                </div>
              )) || <p className="text-sm text-muted-foreground">No features available</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}