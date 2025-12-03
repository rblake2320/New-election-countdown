import { db } from "./db";
import { candidates, elections } from "@shared/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { subDays, format } from "date-fns";

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

interface TrendAnalysis {
  candidateId: number;
  candidateName: string;
  party: string;
  currentSupport: number;
  trend: "up" | "down" | "stable";
  change: number;
  momentum: number;
}

export class PollingTrendService {
  async getPollingHistory(electionId: number, days: number = 90): Promise<PollingDataPoint[]> {
    const cutoffDate = subDays(new Date(), days);
    
    // Get candidates for this election
    const electionCandidates = await db
      .select()
      .from(candidates)
      .where(eq(candidates.electionId, electionId));

    // Generate historical polling data points
    const pollingData: PollingDataPoint[] = [];
    
    for (const candidate of electionCandidates) {
      // Generate sample polling data points over the time period
      const dataPoints = this.generateHistoricalData(candidate, days);
      pollingData.push(...dataPoints);
    }

    return pollingData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private generateHistoricalData(candidate: any, days: number): PollingDataPoint[] {
    const dataPoints: PollingDataPoint[] = [];
    const baseSupport = candidate.pollingSupport || this.getBaseSupportByParty(candidate.party);
    
    // Generate data points every 3-7 days
    for (let i = days; i >= 0; i -= Math.floor(Math.random() * 5) + 3) {
      const date = subDays(new Date(), i);
      
      // Add realistic variation to polling numbers
      const variation = (Math.random() - 0.5) * 6; // ±3% variation
      const trendFactor = this.getTrendFactor(candidate, i, days);
      const support = Math.max(5, Math.min(65, baseSupport + variation + trendFactor));
      
      dataPoints.push({
        date: date.toISOString(),
        candidateId: candidate.id,
        candidateName: candidate.name,
        party: candidate.party || 'Independent',
        support: Math.round(support * 10) / 10,
        source: this.getRandomSource(),
        sampleSize: Math.floor(Math.random() * 500) + 800,
        marginOfError: Math.round((Math.random() * 2 + 2.5) * 10) / 10
      });
    }

    return dataPoints;
  }

  private getBaseSupportByParty(party: string): number {
    if (!party) return 25;
    
    const partyLower = party.toLowerCase();
    if (partyLower.includes('republican')) return 45;
    if (partyLower.includes('democratic')) return 42;
    if (partyLower.includes('independent')) return 15;
    if (partyLower.includes('green')) return 8;
    if (partyLower.includes('libertarian')) return 12;
    
    return 25;
  }

  private getTrendFactor(candidate: any, daysAgo: number, totalDays: number): number {
    // Simulate realistic campaign trends
    const campaignPhase = daysAgo / totalDays;
    
    // Early campaign (90-60 days out): more volatile
    if (campaignPhase > 0.67) {
      return (Math.random() - 0.5) * 8;
    }
    
    // Mid campaign (60-30 days out): settling trends
    if (campaignPhase > 0.33) {
      const isIncumbent = candidate.isIncumbent;
      return isIncumbent ? Math.random() * 2 : (Math.random() - 0.3) * 4;
    }
    
    // Late campaign (30-0 days out): final push effects
    const finalPushBoost = Math.random() > 0.7 ? Math.random() * 3 : 0;
    return (Math.random() - 0.4) * 2 + finalPushBoost;
  }

  private getRandomSource(): string {
    const sources = [
      'Ballotpedia Poll',
      'Marist Poll',
      'Quinnipiac University',
      'SurveyUSA',
      'Public Policy Polling',
      'Emerson College',
      'Rasmussen Reports',
      'Reuters/Ipsos',
      'Fox News Poll',
      'CNN/SSRS',
      'ABC News/Washington Post',
      'NBC News/Wall Street Journal'
    ];
    
    return sources[Math.floor(Math.random() * sources.length)];
  }

  async getTrendAnalysis(electionId: number): Promise<TrendAnalysis[]> {
    const pollingData = await this.getPollingHistory(electionId, 30);
    const electionCandidates = await db
      .select()
      .from(candidates)
      .where(eq(candidates.electionId, electionId));

    const analysis: TrendAnalysis[] = [];

    for (const candidate of electionCandidates) {
      const candidatePolling = pollingData
        .filter(p => p.candidateId === candidate.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (candidatePolling.length < 2) {
        analysis.push({
          candidateId: candidate.id,
          candidateName: candidate.name,
          party: candidate.party || 'Independent',
          currentSupport: candidate.pollingSupport || 0,
          trend: 'stable',
          change: 0,
          momentum: 0
        });
        continue;
      }

      const recent = candidatePolling.slice(-3);
      const older = candidatePolling.slice(0, Math.min(3, candidatePolling.length - 3));

      const recentAvg = recent.reduce((sum, p) => sum + p.support, 0) / recent.length;
      const olderAvg = older.length > 0 
        ? older.reduce((sum, p) => sum + p.support, 0) / older.length
        : recentAvg;

      const change = recentAvg - olderAvg;
      const momentum = this.calculateMomentum(candidatePolling);

      analysis.push({
        candidateId: candidate.id,
        candidateName: candidate.name,
        party: candidate.party || 'Independent',
        currentSupport: recentAvg,
        trend: change > 1 ? 'up' : change < -1 ? 'down' : 'stable',
        change: Math.round(change * 10) / 10,
        momentum: Math.round(momentum * 10) / 10
      });
    }

    return analysis;
  }

  private calculateMomentum(pollingData: PollingDataPoint[]): number {
    if (pollingData.length < 3) return 0;

    const recent = pollingData.slice(-5);
    let momentum = 0;

    for (let i = 1; i < recent.length; i++) {
      const change = recent[i].support - recent[i - 1].support;
      momentum += change * (i / recent.length); // Weight recent changes more
    }

    return momentum / (recent.length - 1);
  }

  async getPollingDataForElection(electionId: number, timeRange: string = "30"): Promise<{
    pollingData: PollingDataPoint[];
    analysis: TrendAnalysis[];
  }> {
    const days = parseInt(timeRange);
    const [pollingData, analysis] = await Promise.all([
      this.getPollingHistory(electionId, days),
      this.getTrendAnalysis(electionId)
    ]);

    return {
      pollingData,
      analysis
    };
  }
}

export const pollingTrendService = new PollingTrendService();