import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Building, MapPin, TrendingUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface MidtermData {
  summary: {
    totalOffices: string;
    electionDate: string;
    countdownDays: number;
    categories: {
      congress: string;
      governors: string;
      mayors: string;
    };
  };
  elections: Array<{
    title: string;
    date: string;
    type: string;
    level: string;
    location: string;
    description: string;
    subtitle: string;
    estimatedTurnout: number;
    competitiveRating: string;
    keyIssues: string[];
    source: string;
  }>;
  categories: {
    congress: { house: number; senate: number; total: number };
    governors: number;
    mayors: number;
  };
}

export function Midterm2026Dashboard() {
  const { data: midtermData, isLoading, error } = useQuery<MidtermData>({
    queryKey: ["/api/elections/2026/midterms"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !midtermData) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="p-6">
          <div className="text-center text-red-600 dark:text-red-400">
            Failed to load 2026 midterm election data. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  const { summary, elections, categories } = midtermData;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          2026 Midterm Elections
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
          {summary.totalOffices}
        </p>
        <div className="flex items-center justify-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-gray-900 dark:text-white">
            November 3, 2026
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Building className="h-5 w-5" />
              Congress
            </CardTitle>
            <CardDescription>Federal Legislative Seats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-3">
              {categories.congress.total}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">House</span>
                <span className="font-semibold">{categories.congress.house}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Senate</span>
                <span className="font-semibold">{categories.congress.senate}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <MapPin className="h-5 w-5" />
              Governors
            </CardTitle>
            <CardDescription>State & Territory Elections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-3">
              {categories.governors}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">States</span>
                <span className="font-semibold">36</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Territories</span>
                <span className="font-semibold">3</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Users className="h-5 w-5" />
              Major Mayors
            </CardTitle>
            <CardDescription>Top 100 Cities + Capitals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-3">
              {categories.mayors}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Estimated range: 30-35 races
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Elections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Featured 2026 Elections
          </CardTitle>
          <CardDescription>
            Major races to watch in the 2026 midterm cycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {elections.slice(0, 8).map((election, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {election.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {election.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs">
                      <Badge variant="outline" className="text-xs">
                        {election.type}
                      </Badge>
                      <span className="text-gray-500 dark:text-gray-400">
                        {election.location}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        Turnout: {election.estimatedTurnout}%
                      </span>
                    </div>
                    {election.keyIssues.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {election.keyIssues.slice(0, 3).map((issue, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {issue}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                    <div>{election.competitiveRating}</div>
                    <div className="mt-1">{election.source}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sources */}
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-sm">Data Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div>• Senate.gov Class II Register</div>
            <div>• National Governors Association</div>
            <div>• Ballotpedia Major Cities Database</div>
            <div>• 270toWin Electoral Calendars</div>
            <div>• U.S. Constitutional Requirements</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}