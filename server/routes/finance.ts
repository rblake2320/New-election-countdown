/**
 * Campaign Finance API Routes
 * Integrates OpenFEC data with election tracking platform
 */

import { Router } from 'express';
import { getOpenFECService } from '../openfec-service';
import { z } from 'zod';

const router = Router();

// Validation schemas
const CandidateFinanceQuerySchema = z.object({
  name: z.string().min(2, 'Candidate name must be at least 2 characters'),
  office: z.enum(['S', 'H', 'P']).optional(), // Senate, House, President
  state: z.string().length(2, 'State must be 2-letter code').optional(),
  cycle: z.coerce.number().min(2020).max(2030).optional()
});

const ElectionFinanceQuerySchema = z.object({
  office: z.enum(['S', 'H', 'P']),
  state: z.string().length(2, 'State must be 2-letter code'),
  district: z.string().optional(),
  cycle: z.coerce.number().min(2020).max(2030).optional()
});

/**
 * GET /api/finance/candidate
 * Search for candidate campaign finance data
 */
router.get('/candidate', async (req, res) => {
  try {
    const validationResult = CandidateFinanceQuerySchema.safeParse(req.query);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validationResult.error.issues
      });
    }

    const { name, office = 'H', state = 'CA', cycle = 2024 } = validationResult.data;

    const fecService = getOpenFECService();
    if (!fecService) {
      return res.status(503).json({
        error: 'Campaign finance service unavailable',
        message: 'OpenFEC API key not configured'
      });
    }

    const financialData = await fecService.enrichCandidateWithFECData(name, office, state);
    
    if (!financialData) {
      return res.status(404).json({
        error: 'No campaign finance data found',
        message: `No FEC data available for ${name} in ${state} for ${cycle} cycle`
      });
    }

    res.json({
      candidate: name,
      office,
      state,
      cycle,
      fec_data: {
        candidate_id: financialData.fecCandidateId,
        total_raised: financialData.totalRaised,
        total_spent: financialData.totalSpent,
        cash_on_hand: financialData.cashOnHand,
        last_report_date: financialData.lastReportDate,
        financial_advantage: financialData.totalRaised - financialData.totalSpent
      }
    });

  } catch (error) {
    console.error('Error fetching candidate finance data:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve campaign finance data'
    });
  }
});

/**
 * GET /api/finance/election-summary
 * Get financial overview for an entire election race
 */
router.get('/election-summary', async (req, res) => {
  try {
    const validationResult = ElectionFinanceQuerySchema.safeParse(req.query);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validationResult.error.issues
      });
    }

    const { office, state, cycle = 2024 } = validationResult.data;

    const fecService = getOpenFECService();
    if (!fecService) {
      return res.status(503).json({
        error: 'Campaign finance service unavailable',
        message: 'OpenFEC API key not configured'
      });
    }

    const electionSummary = await fecService.getElectionSummary(office, state, cycle);
    
    if (!electionSummary) {
      return res.status(404).json({
        error: 'No election finance data found',
        message: `No FEC data available for ${office} race in ${state} for ${cycle} cycle`
      });
    }

    // Calculate additional metrics
    const avgRaised = electionSummary.totalRaised / electionSummary.totalCandidates;
    const topFundraiser = electionSummary.candidates[0];
    const competitionIndex = electionSummary.candidates.length > 1 ? 
      (electionSummary.candidates[1].totalRaised / topFundraiser.totalRaised) : 0;

    res.json({
      race: {
        office: electionSummary.office,
        state: electionSummary.state,
        cycle: electionSummary.cycle
      },
      summary: {
        total_candidates: electionSummary.totalCandidates,
        total_raised: electionSummary.totalRaised,
        total_spent: electionSummary.totalSpent,
        average_raised: avgRaised,
        competition_index: competitionIndex
      },
      top_fundraiser: topFundraiser ? {
        name: topFundraiser.name,
        party: topFundraiser.party,
        total_raised: topFundraiser.totalRaised,
        financial_advantage: topFundraiser.totalRaised - topFundraiser.totalSpent
      } : null,
      candidates: electionSummary.candidates.map(candidate => ({
        name: candidate.name,
        party: candidate.party,
        candidate_id: candidate.candidateId,
        total_raised: candidate.totalRaised,
        total_spent: candidate.totalSpent,
        cash_on_hand: candidate.cashOnHand,
        last_report_date: candidate.lastReportDate,
        fundraising_rank: electionSummary.candidates.indexOf(candidate) + 1
      }))
    });

  } catch (error) {
    console.error('Error fetching election finance summary:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve election finance data'
    });
  }
});

/**
 * GET /api/finance/candidate/:id/enrich
 * Enrich existing candidate data with FEC financial information
 */
router.get('/candidate/:id/enrich', async (req, res) => {
  try {
    const candidateId = Number(req.params.id);
    if (!Number.isFinite(candidateId)) {
      return res.status(400).json({ error: 'Invalid candidate ID' });
    }

    // This would typically fetch from your candidate database
    // For now, we'll require name/office/state parameters
    const { name, office, state, cycle = 2024 } = req.query;
    
    if (!name || !office || !state) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Name, office, and state are required to enrich candidate data'
      });
    }

    const fecService = getOpenFECService();
    if (!fecService) {
      return res.status(503).json({
        error: 'Campaign finance service unavailable'
      });
    }

    const financialData = await fecService.enrichCandidateWithFECData(
      String(name), 
      String(office), 
      String(state)
    );

    if (!financialData) {
      return res.json({
        candidate_id: candidateId,
        fec_data: null,
        message: 'No FEC data available for this candidate'
      });
    }

    res.json({
      candidate_id: candidateId,
      fec_data: {
        candidate_id: financialData.fecCandidateId,
        total_raised: financialData.totalRaised,
        total_spent: financialData.totalSpent,
        cash_on_hand: financialData.cashOnHand,
        last_report_date: financialData.lastReportDate,
        cycle: financialData.cycle,
        efficiency_ratio: financialData.totalSpent > 0 ? 
          (financialData.totalRaised / financialData.totalSpent) : null
      }
    });

  } catch (error) {
    console.error('Error enriching candidate data:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to enrich candidate data'
    });
  }
});

/**
 * GET /api/finance/health
 * Health check for campaign finance service
 */
router.get('/health', async (req, res) => {
  try {
    const fecService = getOpenFECService();
    
    if (!fecService) {
      return res.status(503).json({
        status: 'unavailable',
        message: 'OpenFEC API key not configured',
        timestamp: new Date().toISOString()
      });
    }

    // Test with a simple candidate search
    const testCandidates = await fecService.searchCandidates('Biden', 'P', 'US', 2024);
    
    res.json({
      status: 'available',
      message: 'Campaign finance service operational',
      test_results: {
        candidates_found: testCandidates.length,
        api_responsive: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Finance service health check failed:', error);
    res.status(503).json({
      status: 'degraded',
      message: 'Campaign finance service experiencing issues',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

export default router;