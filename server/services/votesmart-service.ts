/**
 * VoteSmart API Service
 * Provides comprehensive candidate biographical information, positions, and voting records
 * Documentation: https://api.votesmart.org/docs/
 */

import { z } from 'zod';

// Zod schemas for API validation
export const VoteSmartCandidateSchema = z.object({
  candidateId: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  middleName: z.string().optional(),
  preferredName: z.string().optional(),
  nickname: z.string().optional(),
  suffix: z.string().optional(),
  title: z.string().optional(),
  electionParties: z.string().optional(),
  electionStatus: z.string().optional(),
  electionStage: z.string().optional(),
  electionDistrictId: z.string().optional(),
  electionDistrictName: z.string().optional(),
  electionOffice: z.string().optional(),
  electionOfficeId: z.string().optional(),
  electionStateId: z.string().optional(),
  electionYear: z.string().optional(),
  stage: z.string().optional(),
  runningMateId: z.string().optional(),
  runningMateName: z.string().optional()
});

export const VoteSmartBioSchema = z.object({
  candidateId: z.string(),
  crpId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  middleName: z.string().optional(),
  suffix: z.string().optional(),
  nickname: z.string().optional(),
  birthDate: z.string().optional(),
  birthPlace: z.string().optional(),
  pronunciation: z.string().optional(),
  gender: z.string().optional(),
  family: z.string().optional(),
  photo: z.string().optional(),
  homeCity: z.string().optional(),
  homeState: z.string().optional(),
  education: z.string().optional(),
  profession: z.string().optional(),
  political: z.string().optional(),
  religion: z.string().optional(),
  congMembership: z.string().optional(),
  orgMembership: z.string().optional(),
  specialMsg: z.string().optional()
});

export const VoteSmartPositionSchema = z.object({
  categoryId: z.string(),
  categoryName: z.string(),
  position: z.string(),
  positionId: z.string().optional(),
  source: z.string().optional(),
  date: z.string().optional()
});

export const VoteSmartVotingRecordSchema = z.object({
  actionId: z.string(),
  stage: z.string().optional(),
  billId: z.string().optional(),
  billNumber: z.string().optional(),
  billTitle: z.string().optional(),
  vote: z.string(), // 'Yes', 'No', 'Not Voting', 'Present'
  desc: z.string().optional(),
  actionDate: z.string().optional()
});

export const VoteSmartRatingSchema = z.object({
  ratingId: z.string(),
  sigId: z.string(),
  sigName: z.string(),
  rating: z.string(),
  ratingName: z.string().optional(),
  ratingText: z.string().optional(),
  timespan: z.string().optional(),
  ratingDate: z.string().optional()
});

// Type exports
export type VoteSmartCandidate = z.infer<typeof VoteSmartCandidateSchema>;
export type VoteSmartBio = z.infer<typeof VoteSmartBioSchema>;
export type VoteSmartPosition = z.infer<typeof VoteSmartPositionSchema>;
export type VoteSmartVotingRecord = z.infer<typeof VoteSmartVotingRecordSchema>;
export type VoteSmartRating = z.infer<typeof VoteSmartRatingSchema>;

export interface VoteSmartError {
  code: string;
  message: string;
  details?: any;
}

export interface VoteSmartServiceOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class VoteSmartService {
  private baseUrl = 'https://api.votesmart.org';
  private apiKey: string;
  private timeout: number;
  private retries: number;
  private retryDelay: number;

  constructor(apiKey: string, options: VoteSmartServiceOptions = {}) {
    this.apiKey = apiKey;
    this.timeout = options.timeout || 10000; // 10 second timeout
    this.retries = options.retries || 3;
    this.retryDelay = options.retryDelay || 1000; // 1 second delay between retries
  }

  /**
   * Make a request to the VoteSmart API with retry logic and validation
   */
  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}, schema?: z.ZodSchema<T>): Promise<T | null> {
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    
    // Add API key and format
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('o', 'JSON');
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            'User-Agent': 'ElectionTracker/1.0 (Replit Election Platform)',
            'Accept': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`VoteSmart API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Handle VoteSmart API error responses
        if (data.error) {
          throw new Error(`VoteSmart API error: ${data.error.errorMessage || data.error}`);
        }
        
        // Validate response if schema provided
        if (schema) {
          try {
            return schema.parse(data);
          } catch (validationError) {
            console.warn(`VoteSmart API response validation warning for ${endpoint}:`, validationError);
            // Return raw data if validation fails but data exists
            return data as T;
          }
        }
        
        return data as T;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.retries) {
          console.warn(`VoteSmart API attempt ${attempt + 1} failed for ${endpoint}, retrying in ${this.retryDelay}ms:`, lastError.message);
          await this.sleep(this.retryDelay);
        }
      }
    }
    
    console.error(`VoteSmart API failed after ${this.retries + 1} attempts for ${endpoint}:`, lastError?.message);
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Search for candidates by name, office, or state
   */
  async searchCandidates(query: {
    firstName?: string;
    lastName?: string;
    office?: string;
    state?: string;
    electionYear?: string;
  }): Promise<VoteSmartCandidate[]> {
    try {
      const params: Record<string, string> = {};
      
      if (query.firstName) params.firstName = query.firstName;
      if (query.lastName) params.lastName = query.lastName;
      if (query.office) params.office = query.office;
      if (query.state) params.state = query.state;
      if (query.electionYear) params.electionYear = query.electionYear;
      
      const response = await this.makeRequest('Candidates.getByOfficeState', params);
      
      if (!response || !response.candidateList) {
        return [];
      }
      
      const candidates = Array.isArray(response.candidateList.candidate) 
        ? response.candidateList.candidate 
        : [response.candidateList.candidate];
        
      return candidates
        .map(candidate => {
          try {
            return VoteSmartCandidateSchema.parse(candidate);
          } catch {
            return null;
          }
        })
        .filter((candidate): candidate is VoteSmartCandidate => candidate !== null);
        
    } catch (error) {
      console.error('VoteSmart candidate search error:', error);
      return [];
    }
  }

  /**
   * Get detailed candidate biography
   */
  async getCandidateBio(candidateId: string): Promise<VoteSmartBio | null> {
    try {
      const response = await this.makeRequest('CandidateBio.getBio', { candidateId });
      
      if (!response || !response.bio) {
        return null;
      }
      
      return VoteSmartBioSchema.parse(response.bio);
      
    } catch (error) {
      console.error(`VoteSmart bio error for candidate ${candidateId}:`, error);
      return null;
    }
  }

  /**
   * Get detailed candidate biography with extended information
   */
  async getDetailedCandidateBio(candidateId: string): Promise<VoteSmartBio | null> {
    try {
      const response = await this.makeRequest('CandidateBio.getDetailedBio', { candidateId });
      
      if (!response || !response.bio) {
        return null;
      }
      
      return VoteSmartBioSchema.parse(response.bio);
      
    } catch (error) {
      console.error(`VoteSmart detailed bio error for candidate ${candidateId}:`, error);
      return null;
    }
  }

  /**
   * Get candidate positions on issues
   */
  async getCandidatePositions(candidateId: string, categoryId?: string): Promise<VoteSmartPosition[]> {
    try {
      const params: Record<string, string> = { candidateId };
      if (categoryId) params.categoryId = categoryId;
      
      const response = await this.makeRequest('Npat.getNpat', params);
      
      if (!response || !response.npat) {
        return [];
      }
      
      const positions = Array.isArray(response.npat) ? response.npat : [response.npat];
      
      return positions
        .map(position => {
          try {
            return VoteSmartPositionSchema.parse(position);
          } catch {
            return null;
          }
        })
        .filter((position): position is VoteSmartPosition => position !== null);
        
    } catch (error) {
      console.error(`VoteSmart positions error for candidate ${candidateId}:`, error);
      return [];
    }
  }

  /**
   * Get candidate voting record
   */
  async getVotingRecord(candidateId: string, categoryId?: string, year?: string): Promise<VoteSmartVotingRecord[]> {
    try {
      const params: Record<string, string> = { candidateId };
      if (categoryId) params.categoryId = categoryId;
      if (year) params.year = year;
      
      const response = await this.makeRequest('Votes.getByCandidate', params);
      
      if (!response || !response.votes) {
        return [];
      }
      
      const votes = Array.isArray(response.votes.vote) ? response.votes.vote : [response.votes.vote];
      
      return votes
        .map(vote => {
          try {
            return VoteSmartVotingRecordSchema.parse(vote);
          } catch {
            return null;
          }
        })
        .filter((vote): vote is VoteSmartVotingRecord => vote !== null);
        
    } catch (error) {
      console.error(`VoteSmart voting record error for candidate ${candidateId}:`, error);
      return [];
    }
  }

  /**
   * Get candidate ratings from special interest groups
   */
  async getCandidateRatings(candidateId: string): Promise<VoteSmartRating[]> {
    try {
      const response = await this.makeRequest('Rating.getCandidateRating', { candidateId });
      
      if (!response || !response.candidateRating) {
        return [];
      }
      
      const ratings = Array.isArray(response.candidateRating.rating) 
        ? response.candidateRating.rating 
        : [response.candidateRating.rating];
        
      return ratings
        .map(rating => {
          try {
            return VoteSmartRatingSchema.parse(rating);
          } catch {
            return null;
          }
        })
        .filter((rating): rating is VoteSmartRating => rating !== null);
        
    } catch (error) {
      console.error(`VoteSmart ratings error for candidate ${candidateId}:`, error);
      return [];
    }
  }

  /**
   * Get comprehensive candidate data combining biography, positions, voting record, and ratings
   */
  async getComprehensiveCandidateData(candidateId: string) {
    try {
      const [bio, detailedBio, positions, votingRecord, ratings] = await Promise.allSettled([
        this.getCandidateBio(candidateId),
        this.getDetailedCandidateBio(candidateId),
        this.getCandidatePositions(candidateId),
        this.getVotingRecord(candidateId),
        this.getCandidateRatings(candidateId)
      ]);

      const result = {
        candidateId,
        bio: bio.status === 'fulfilled' ? bio.value : null,
        detailedBio: detailedBio.status === 'fulfilled' ? detailedBio.value : null,
        positions: positions.status === 'fulfilled' ? positions.value || [] : [],
        votingRecord: votingRecord.status === 'fulfilled' ? votingRecord.value || [] : [],
        ratings: ratings.status === 'fulfilled' ? ratings.value || [] : [],
        issues: [] as string[],
        lastUpdated: new Date().toISOString()
      };

      // Track issues that occurred
      if (bio.status === 'rejected') result.issues.push('Biography data unavailable');
      if (detailedBio.status === 'rejected') result.issues.push('Detailed biography unavailable');
      if (positions.status === 'rejected') result.issues.push('Position data unavailable');
      if (votingRecord.status === 'rejected') result.issues.push('Voting record unavailable');
      if (ratings.status === 'rejected') result.issues.push('Rating data unavailable');

      return result;
      
    } catch (error) {
      console.error(`VoteSmart comprehensive data error for candidate ${candidateId}:`, error);
      return {
        candidateId,
        bio: null,
        detailedBio: null,
        positions: [],
        votingRecord: [],
        ratings: [],
        issues: ['VoteSmart API service unavailable'],
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Get available issue categories for position statements
   */
  async getIssueCategories(): Promise<Array<{ categoryId: string; name: string }>> {
    try {
      const response = await this.makeRequest('Npat.getCategories');
      
      if (!response || !response.categories) {
        return [];
      }
      
      const categories = Array.isArray(response.categories.category) 
        ? response.categories.category 
        : [response.categories.category];
        
      return categories.map(cat => ({
        categoryId: cat.categoryId || '',
        name: cat.name || ''
      }));
      
    } catch (error) {
      console.error('VoteSmart categories error:', error);
      return [];
    }
  }

  /**
   * Health check for the VoteSmart API
   */
  async healthCheck(): Promise<{ available: boolean; message: string; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      // Try to get categories as a simple health check
      const response = await this.makeRequest('Npat.getCategories');
      const responseTime = Date.now() - startTime;
      
      if (response) {
        return { 
          available: true, 
          message: 'VoteSmart API is available and responding',
          responseTime
        };
      } else {
        return { 
          available: false, 
          message: 'VoteSmart API returned empty response' 
        };
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return { 
        available: false, 
        message: `VoteSmart API health check failed: ${error instanceof Error ? error.message : String(error)}`,
        responseTime
      };
    }
  }
}

// Factory function with graceful fallback
export function createVoteSmartService(): VoteSmartService | null {
  const apiKey = process.env.VOTESMART_API_KEY;
  
  if (!apiKey) {
    console.warn('VOTESMART_API_KEY not found - VoteSmart features will be unavailable');
    return null;
  }

  return new VoteSmartService(apiKey, {
    timeout: 10000,
    retries: 3,
    retryDelay: 1000
  });
}

// Global instance
export const voteSmartService = createVoteSmartService();