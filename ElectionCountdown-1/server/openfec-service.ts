/**
 * OpenFEC API Service
 * Provides authentic campaign finance data from the Federal Election Commission
 */

interface FECCandidate {
  candidate_id: string;
  name: string;
  party: string;
  office: string;
  state: string;
  district?: string;
  incumbent_challenge: string;
  cycle: number;
}

interface FECFinancialSummary {
  candidate_id: string;
  receipts: number;
  disbursements: number;
  cash_on_hand_end_period: number;
  coverage_end_date: string;
  last_report_year: number;
}

interface CandidateFinancialData {
  fecCandidateId: string;
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  lastReportDate: string;
  cycle: number;
}

export class OpenFECService {
  private baseUrl = 'https://api.open.fec.gov/v1';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Search for candidates by name, office, and state
   */
  async searchCandidates(name: string, office: string, state: string, cycle: number = 2024): Promise<FECCandidate[]> {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      name: name,
      office: office,
      state: state,
      cycle: cycle.toString(),
      per_page: '20'
    });

    try {
      const response = await fetch(`${this.baseUrl}/candidates/search/?${params}`);
      if (!response.ok) {
        throw new Error(`FEC API error: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error searching FEC candidates:', error);
      return [];
    }
  }

  /**
   * Get financial summary for a specific candidate
   */
  async getCandidateFinancials(candidateId: string, cycle: number = 2024): Promise<FECFinancialSummary | null> {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      cycle: cycle.toString()
    });

    try {
      const response = await fetch(`${this.baseUrl}/candidate/${candidateId}/totals/?${params}`);
      if (!response.ok) {
        throw new Error(`FEC API error: ${response.status}`);
      }

      const data = await response.json();
      return data.results?.[0] || null;
    } catch (error) {
      console.error('Error fetching candidate financials:', error);
      return null;
    }
  }

  /**
   * Enrich candidate with FEC financial data
   */
  async enrichCandidateWithFECData(candidateName: string, office: string, state: string): Promise<CandidateFinancialData | null> {
    try {
      // Search for the candidate in FEC database
      const candidates = await this.searchCandidates(candidateName, office, state);
      
      if (candidates.length === 0) {
        console.log(`No FEC data found for candidate: ${candidateName}`);
        return null;
      }

      // Use the first matching candidate
      const fecCandidate = candidates[0];
      
      // Get financial data
      const financials = await this.getCandidateFinancials(fecCandidate.candidate_id);
      
      if (!financials) {
        console.log(`No financial data found for FEC candidate: ${fecCandidate.candidate_id}`);
        return null;
      }

      return {
        fecCandidateId: fecCandidate.candidate_id,
        totalRaised: financials.receipts || 0,
        totalSpent: financials.disbursements || 0,
        cashOnHand: financials.cash_on_hand_end_period || 0,
        lastReportDate: financials.coverage_end_date || '',
        cycle: fecCandidate.cycle
      };

    } catch (error) {
      console.error(`Error enriching candidate ${candidateName} with FEC data:`, error);
      return null;
    }
  }

  /**
   * Get election financial summary for all candidates in a race
   */
  async getElectionSummary(office: string, state: string, cycle: number = 2024) {
    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        office: office,
        state: state,
        cycle: cycle.toString(),
        per_page: '100'
      });

      const response = await fetch(`${this.baseUrl}/candidates/?${params}`);
      if (!response.ok) {
        throw new Error(`FEC API error: ${response.status}`);
      }

      const data = await response.json();
      const candidates = data.results || [];

      // Get financial data for each candidate
      const enrichedCandidates = await Promise.all(
        candidates.map(async (candidate: FECCandidate) => {
          const financials = await this.getCandidateFinancials(candidate.candidate_id, cycle);
          return {
            name: candidate.name,
            party: candidate.party,
            candidateId: candidate.candidate_id,
            totalRaised: financials?.receipts || 0,
            totalSpent: financials?.disbursements || 0,
            cashOnHand: financials?.cash_on_hand_end_period || 0,
            lastReportDate: financials?.coverage_end_date || ''
          };
        })
      );

      // Calculate totals
      const totalRaised = enrichedCandidates.reduce((sum, c) => sum + c.totalRaised, 0);
      const totalSpent = enrichedCandidates.reduce((sum, c) => sum + c.totalSpent, 0);

      return {
        office,
        state,
        cycle,
        totalCandidates: candidates.length,
        totalRaised,
        totalSpent,
        candidates: enrichedCandidates.sort((a, b) => b.totalRaised - a.totalRaised)
      };

    } catch (error) {
      console.error('Error getting election financial summary:', error);
      return null;
    }
  }
}

// Singleton instance
let fecService: OpenFECService | null = null;

export function getOpenFECService(): OpenFECService | null {
  if (!process.env.OPENFEC_API_KEY) {
    console.warn('OPENFEC_API_KEY not found. FEC data will not be available.');
    return null;
  }

  if (!fecService) {
    fecService = new OpenFECService(process.env.OPENFEC_API_KEY);
  }

  return fecService;
}