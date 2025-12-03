import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Minus, Calendar, Target, BarChart3 } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import type { Candidate } from "@shared/schema";

interface PollingDataPoint {
  date: string;
  candidateId: number;
  candidateName: string;
  party: string;
  support: number;
  source: string;
  sampleSize?: number;
  marginOfError?: number;
}

interface PollingTrendChartProps {
  electionId: number;
  candidates: Candidate[];
  pollingData: PollingDataPoint[];
  className?: string;
}

export function PollingTrendChart({ electionId, candidates, pollingData, className }: PollingTrendChartProps) {
  const [timeRange, setTimeRange] = useState<string>("30");
  const [chartType, setChartType] = useState<"line" | "area">("line");
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>(
    candidates.map(c => c.id)
  );

  const filteredData = useMemo(() => {
    const cutoffDate = subDays(new Date(), parseInt(timeRange));
    return pollingData.filter(point => 
      parseISO(point.date) >= cutoffDate &&
      selectedCandidates.includes(point.candidateId)
    );
  }, [pollingData, timeRange, selectedCandidates]);

  const chartData = useMemo(() => {
    const dateGroups: { [date: string]: any } = {};
    
    filteredData.forEach(point => {
      const dateKey = format(parseISO(point.date), "MMM dd");
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = { date: dateKey, fullDate: point.date };
      }
      dateGroups[dateKey][`${point.candidateName}`] = point.support;
    });

    return Object.values(dateGroups).sort((a: any, b: any) => 
      new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()
    );
  }, [filteredData]);

  const candidateColors = useMemo(() => {
    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#f97316"];
    const colorMap: { [key: string]: string } = {};
    candidates.forEach((candidate, index) => {
      if (candidate.party?.toLowerCase().includes("republican")) {
        colorMap[candidate.name] = "#dc2626";
      } else if (candidate.party?.toLowerCase().includes("democratic")) {
        colorMap[candidate.name] = "#2563eb";
      } else {
        colorMap[candidate.name] = colors[index % colors.length];
      }
    });
    return colorMap;
  }, [candidates]);

  const getTrendDirection = (candidateName: string) => {
    const candidateData = filteredData
      .filter(d => d.candidateName === candidateName)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (candidateData.length < 2) return "stable";
    
    const recent = candidateData.slice(-3);
    const older = candidateData.slice(0, 3);
    
    const recentAvg = recent.reduce((sum, d) => sum + d.support, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.support, 0) / older.length;
    
    const change = recentAvg - olderAvg;
    if (change > 1) return "up";
    if (change < -1) return "down";
    return "stable";
  };

  const toggleCandidate = (candidateId: number) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId) 
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  if (!pollingData.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Polling Trends
          </CardTitle>
          <CardDescription>
            No polling data available for this election
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Polling data will appear here when available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Polling Trends
            </CardTitle>
            <CardDescription>
              Track candidate support over time from verified polling sources
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={chartType} onValueChange={(v) => setChartType(v as "line" | "area")} className="space-y-4">
          <TabsList>
            <TabsTrigger value="line">Line Chart</TabsTrigger>
            <TabsTrigger value="area">Area Chart</TabsTrigger>
          </TabsList>

          {/* Candidate Selection */}
          <div className="flex flex-wrap gap-2 mb-4">
            {candidates.map(candidate => {
              const isSelected = selectedCandidates.includes(candidate.id);
              const trend = getTrendDirection(candidate.name);
              const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
              
              return (
                <Button
                  key={candidate.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleCandidate(candidate.id)}
                  className="flex items-center gap-2"
                  style={isSelected ? { 
                    backgroundColor: candidateColors[candidate.name],
                    borderColor: candidateColors[candidate.name]
                  } : undefined}
                >
                  <TrendIcon className={`h-3 w-3 ${
                    trend === "up" ? "text-green-500" : 
                    trend === "down" ? "text-red-500" : 
                    "text-gray-500"
                  }`} />
                  {candidate.name}
                  {candidate.pollingSupport && (
                    <Badge variant="secondary" className="ml-1">
                      {candidate.pollingSupport}%
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          <TabsContent value="line" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    label={{ value: 'Support (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: any, name: string) => [
                      `${value}%`, 
                      name
                    ]}
                  />
                  <Legend />
                  {candidates
                    .filter(c => selectedCandidates.includes(c.id))
                    .map(candidate => (
                    <Line
                      key={candidate.id}
                      type="monotone"
                      dataKey={candidate.name}
                      stroke={candidateColors[candidate.name]}
                      strokeWidth={2}
                      dot={{ fill: candidateColors[candidate.name], strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: candidateColors[candidate.name], strokeWidth: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="area" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    label={{ value: 'Support (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: any, name: string) => [
                      `${value}%`, 
                      name
                    ]}
                  />
                  <Legend />
                  {candidates
                    .filter(c => selectedCandidates.includes(c.id))
                    .map(candidate => (
                    <Area
                      key={candidate.id}
                      type="monotone"
                      dataKey={candidate.name}
                      stackId="1"
                      stroke={candidateColors[candidate.name]}
                      fill={candidateColors[candidate.name]}
                      fillOpacity={0.3}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>

        {/* Trend Summary */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Trend Analysis
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates
              .filter(c => selectedCandidates.includes(c.id))
              .map(candidate => {
              const trend = getTrendDirection(candidate.name);
              const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
              const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-600";
              const trendText = trend === "up" ? "Trending Up" : trend === "down" ? "Trending Down" : "Stable";
              
              return (
                <div key={candidate.id} className="flex items-center justify-between p-3 bg-background rounded border">
                  <div>
                    <p className="font-medium">{candidate.name}</p>
                    <p className="text-sm text-muted-foreground">{candidate.party}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                    <span className={`text-sm font-medium ${trendColor}`}>
                      {trendText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}