import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { TrendingUp, Database, Server, Zap } from 'lucide-react';

/**
 * API Cost Calculator
 * Shows infrastructure costs at different scales - proves high gross margins
 */
export function CostCalculator() {
  const [dailyUsers, setDailyUsers] = useState([1000]);
  
  const users = dailyUsers[0];
  
  // Calculate costs based on usage
  const calculateCosts = (userCount: number) => {
    // Database (Neon PostgreSQL serverless)
    // $20 base + $0.000001 per query
    // Assume 50 queries per user per day
    const queriesPerDay = userCount * 50;
    const databaseCost = 20 + (queriesPerDay * 30 * 0.000001); // Monthly
    
    // API costs (most are free up to limits)
    // Google Civic: Free tier 25K/day, then $0.50 per 1K
    // OpenFEC: Free
    // ProPublica: Free for non-commercial use
    const apiCallsPerDay = userCount * 5; // 5 API calls per user
    const googleCivicCost = apiCallsPerDay > 25000 
      ? ((apiCallsPerDay - 25000) / 1000) * 0.50 * 30
      : 0;
    const apiCost = googleCivicCost;
    
    // Infrastructure (Vercel/Railway)
    // Free tier: 0-1K users
    // Pro tier: 1K-10K users ($20/mo)
    // Team tier: 10K-100K users ($500/mo)
    // Enterprise: 100K+ users ($2000/mo)
    let infraCost = 0;
    if (userCount > 100000) infraCost = 2000;
    else if (userCount > 10000) infraCost = 500;
    else if (userCount > 1000) infraCost = 100;
    else infraCost = 20;
    
    // Total monthly cost
    const totalCost = Math.ceil(databaseCost + apiCost + infraCost);
    
    // Revenue calculation (conservative)
    // Assume 2% convert to premium ($5/mo) and 0.5% to candidates ($150/mo)
    const premiumRevenue = userCount * 0.02 * 5;
    const candidateRevenue = userCount * 0.005 * 150;
    const totalRevenue = Math.ceil(premiumRevenue + candidateRevenue);
    
    // Gross margin
    const grossMargin = ((totalRevenue - totalCost) / totalRevenue * 100).toFixed(1);
    
    return {
      database: Math.ceil(databaseCost),
      api: Math.ceil(apiCost),
      infrastructure: infraCost,
      total: totalCost,
      revenue: totalRevenue,
      grossMargin: isNaN(parseFloat(grossMargin)) ? '0.0' : grossMargin
    };
  };
  
  const costs = calculateCosts(users);
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Structure Analysis</CardTitle>
        <CardDescription>
          Infrastructure costs at scale - showing high gross margins
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Daily Active Users</Label>
            <span className="text-2xl font-bold">{formatNumber(users)}</span>
          </div>
          <Slider
            value={dailyUsers}
            onValueChange={setDailyUsers}
            min={100}
            max={100000}
            step={100}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>100</span>
            <span>10K</span>
            <span>50K</span>
            <span>100K</span>
          </div>
        </div>
        
        {/* Cost Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Database</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">${costs.database}</p>
            <p className="text-xs text-blue-700">per month</p>
          </div>
          
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">APIs</span>
            </div>
            <p className="text-2xl font-bold text-green-900">${costs.api}</p>
            <p className="text-xs text-green-700">per month</p>
          </div>
          
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Hosting</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">${costs.infrastructure}</p>
            <p className="text-xs text-purple-700">per month</p>
          </div>
          
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Total Cost</span>
            </div>
            <p className="text-2xl font-bold text-orange-900">${costs.total}</p>
            <p className="text-xs text-orange-700">per month</p>
          </div>
        </div>
        
        {/* Revenue & Margin */}
        <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-green-700 mb-1">Estimated Revenue</p>
              <p className="text-3xl font-bold text-green-900">${costs.revenue.toLocaleString()}</p>
              <p className="text-xs text-green-600 mt-1">per month (2% premium conversion)</p>
            </div>
            <div>
              <p className="text-sm text-green-700 mb-1">Monthly Profit</p>
              <p className="text-3xl font-bold text-green-900">${(costs.revenue - costs.total).toLocaleString()}</p>
              <p className="text-xs text-green-600 mt-1">after infrastructure costs</p>
            </div>
            <div>
              <p className="text-sm text-green-700 mb-1">Gross Margin</p>
              <p className="text-3xl font-bold text-green-900">{costs.grossMargin}%</p>
              <p className="text-xs text-green-600 mt-1">SaaS average: 70-80%</p>
            </div>
          </div>
        </div>
        
        {/* Key Insights */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Why Margins Are High</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Serverless = pay only for what you use</li>
              <li>• Government APIs are free or cheap</li>
              <li>• No expensive server infrastructure</li>
              <li>• Scales automatically without hiring DevOps</li>
            </ul>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Competitive Advantage</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• FiveThirtyEight: $50K+/month in servers</li>
              <li>• Ballotpedia: Manual updates = high labor</li>
              <li>• Us: ${costs.total}/month for {formatNumber(users)} users</li>
              <li>• Scales to millions without rewrite</li>
            </ul>
          </div>
        </div>
        
        {/* Investor Talking Point */}
        <div className="p-4 bg-blue-50 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-blue-900">
            💡 Investor Talking Point
          </p>
          <p className="text-sm text-blue-700 mt-1">
            "At {formatNumber(users)} daily active users, our infrastructure costs are just ${costs.total}/month, 
            giving us {costs.grossMargin}% gross margins. This compares to 70-80% for typical SaaS and 
            40-50% for media companies. Our serverless architecture means costs scale linearly with revenue."
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
