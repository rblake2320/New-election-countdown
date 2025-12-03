/**
 * Percentage Data Validation Endpoint
 * Shows comprehensive analysis of all percentage values in the system
 */

import type { Express } from "express";
import { dataAuthenticityService } from './data-authenticity-service';

export function addPercentageValidationEndpoint(app: Express) {
  // Comprehensive percentage data audit endpoint
  app.get("/api/data-audit/percentages", async (req, res) => {
    try {
      const { storage } = await import('./storage');
      
      // Get all candidates with percentage data
      const candidates = await storage.getCandidates();
      
      const audit = {
        totalCandidates: candidates.length,
        candidatesWithPollingData: 0,
        candidatesWithVoteData: 0,
        candidatesWithAuthenticPolling: 0,
        candidatesWithAuthenticVotes: 0,
        dataQualityBreakdown: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0
        },
        detailedReport: [] as any[]
      };

      for (const candidate of candidates) {
        const report = dataAuthenticityService.getCandidateDataReport(candidate);
        
        if (candidate.pollingSupport) audit.candidatesWithPollingData++;
        if (candidate.votePercentage) audit.candidatesWithVoteData++;
        if (report.hasAuthenticPolling) audit.candidatesWithAuthenticPolling++;
        if (report.hasAuthenticVotes) audit.candidatesWithAuthenticVotes++;
        
        audit.dataQualityBreakdown[report.dataQuality]++;
        
        // Include candidates with percentage data in detailed report
        if (candidate.pollingSupport || candidate.votePercentage) {
          audit.detailedReport.push({
            id: candidate.id,
            name: candidate.name,
            electionId: candidate.electionId,
            pollingSupport: candidate.pollingSupport,
            votePercentage: candidate.votePercentage,
            lastPollingUpdate: candidate.lastPollingUpdate,
            pollingSource: candidate.pollingSource,
            ...report
          });
        }
      }

      res.json({
        timestamp: new Date().toISOString(),
        summary: audit,
        authenticityCriteria: {
          pollingRequirements: [
            'Must have pollingSource from verified API',
            'Must have lastPollingUpdate within 7 days',
            'Source must be in verified list'
          ],
          voteRequirements: [
            'Must have resultSource from official source',
            'Must have resultCertified = true',
            'Must have both votePercentage and votesReceived'
          ],
          verifiedSources: Array.from(dataAuthenticityService['verifiedSources'])
        }
      });

    } catch (error) {
      console.error("Error performing percentage data audit:", error);
      res.status(500).json({ error: "Failed to audit percentage data" });
    }
  });

  // Fix static polling data endpoint
  app.post("/api/data-audit/fix-static-polling", async (req, res) => {
    try {
      const { storage } = await import('./storage');
      
      // Get all candidates with static polling data (no authentic sources)
      const candidates = await storage.getCandidates();
      const staticPollingCandidates = candidates.filter(candidate => 
        candidate.pollingSupport && !candidate.pollingSource
      );

      let fixed = 0;
      for (const candidate of staticPollingCandidates) {
        // Clear static polling data since it's not from authentic source
        await storage.updateCandidatePolling(candidate.id, {
          pollingSupport: null,
          pollingSource: null,
          lastPollingUpdate: null,
          pollingTrend: null
        });
        fixed++;
      }

      res.json({
        message: `Cleared static polling data from ${fixed} candidates`,
        fixedCandidates: staticPollingCandidates.map(c => ({
          id: c.id,
          name: c.name,
          previousPollingSupport: c.pollingSupport
        }))
      });

    } catch (error) {
      console.error("Error fixing static polling data:", error);
      res.status(500).json({ error: "Failed to fix static polling data" });
    }
  });
}