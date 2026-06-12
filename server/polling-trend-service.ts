import { db } from "./db";
import { candidates, pollingData } from "@shared/schema";
import { eq, and, gte, asc } from "drizzle-orm";
import { subDays } from "date-fns";

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

/**
 * Serves ONLY real polling data stored in the polling_data table
 * (populated by verified sources). If no real polls exist for an
 * election, it returns empty arrays — never synthetic numbers.
 */
export class PollingTrendService {
  async getPollingHistory(electionId: number, days: number = 90): Promise<PollingDataPoint[]> {
    const cutoffDate = subDays(new Date(), days);

    const [electionCandidates, polls] = await Promise.all([
      db.select().from(candidates).where(eq(candidates.electionId, electionId)),
      db
        .select()
        .from(pollingData)
        .where(and(eq(pollingData.electionId, electionId), gte(pollingData.createdAt, cutoffDate)))
        .orderBy(asc(pollingData.createdAt)),
    ]);

    // Map party-level poll numbers onto the election's candidates by party
    const dataPoints: PollingDataPoint[] = [];
    for (const poll of polls) {
      for (const candidate of electionCandidates) {
        const support = this.supportForParty(poll, candidate.party);
        if (support === null) continue;
        dataPoints.push({
          date: poll.createdAt.toISOString(),
          candidateId: candidate.id,
          candidateName: candidate.name,
          party: candidate.party || "Independent",
          support,
          source: poll.pollsterName,
          sampleSize: poll.sampleSize ?? undefined,
          marginOfError: poll.marginOfError ? parseFloat(poll.marginOfError) : undefined,
        });
      }
    }

    return dataPoints;
  }

  private supportForParty(poll: typeof pollingData.$inferSelect, party: string | null): number | null {
    const p = (party || "").toLowerCase();
    if (p.includes("democrat")) return parseFloat(poll.democraticSupport);
    if (p.includes("republican")) return parseFloat(poll.republicanSupport);
    if (p.includes("independent")) return parseFloat(poll.independentSupport);
    return null;
  }

  async getTrendAnalysis(electionId: number): Promise<TrendAnalysis[]> {
    const pollingHistory = await this.getPollingHistory(electionId, 30);
    const electionCandidates = await db
      .select()
      .from(candidates)
      .where(eq(candidates.electionId, electionId));

    const analysis: TrendAnalysis[] = [];

    for (const candidate of electionCandidates) {
      const candidatePolling = pollingHistory
        .filter((p) => p.candidateId === candidate.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (candidatePolling.length < 2) {
        // Not enough real data for a trend — report honestly
        analysis.push({
          candidateId: candidate.id,
          candidateName: candidate.name,
          party: candidate.party || "Independent",
          currentSupport: candidatePolling[0]?.support ?? 0,
          trend: "stable",
          change: 0,
          momentum: 0,
        });
        continue;
      }

      const recent = candidatePolling.slice(-3);
      const older = candidatePolling.slice(0, Math.min(3, candidatePolling.length - 3));

      const recentAvg = recent.reduce((sum, p) => sum + p.support, 0) / recent.length;
      const olderAvg =
        older.length > 0 ? older.reduce((sum, p) => sum + p.support, 0) / older.length : recentAvg;

      const change = recentAvg - olderAvg;
      const momentum = this.calculateMomentum(candidatePolling);

      analysis.push({
        candidateId: candidate.id,
        candidateName: candidate.name,
        party: candidate.party || "Independent",
        currentSupport: recentAvg,
        trend: change > 1 ? "up" : change < -1 ? "down" : "stable",
        change: Math.round(change * 10) / 10,
        momentum: Math.round(momentum * 10) / 10,
      });
    }

    return analysis;
  }

  private calculateMomentum(history: PollingDataPoint[]): number {
    if (history.length < 3) return 0;

    const recent = history.slice(-5);
    let momentum = 0;

    for (let i = 1; i < recent.length; i++) {
      const change = recent[i].support - recent[i - 1].support;
      momentum += change * (i / recent.length); // Weight recent changes more
    }

    return momentum / (recent.length - 1);
  }

  async getPollingDataForElection(
    electionId: number,
    timeRange: string = "30",
  ): Promise<{ pollingData: PollingDataPoint[]; analysis: TrendAnalysis[] }> {
    const days = parseInt(timeRange);
    const [history, analysis] = await Promise.all([
      this.getPollingHistory(electionId, days),
      this.getTrendAnalysis(electionId),
    ]);

    return { pollingData: history, analysis };
  }
}

export const pollingTrendService = new PollingTrendService();
