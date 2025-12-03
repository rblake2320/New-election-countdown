import fetch from 'node-fetch';
import { cacheService } from './cache-service';
import { voteSmartService, type VoteSmartBio, type VoteSmartPosition, type VoteSmartVotingRecord, type VoteSmartRating } from './services/votesmart-service';

interface CandidateData {
  id: string;
  name: string;
  party: string;
  office: string;
  state?: string;
  district?: string;
  propublicaData?: any;
  fecData?: any;
  voteSmartData?: {
    bio?: VoteSmartBio;
    detailedBio?: VoteSmartBio;
    positions?: VoteSmartPosition[];
    votingRecord?: VoteSmartVotingRecord[];
    ratings?: VoteSmartRating[];
    photoUrl?: string;
    issues?: string[];
    lastUpdated?: string;
  };
  openStatesData?: any;
  pollingData?: any;
  ukParliamentData?: any;
  wikidataData?: any;
}

interface PolicyComparison {
  category: string;
  positions: Array<{
    candidateId: string;
    candidateName: string;
    position: string;
    details: string;
    source: string;
    confidence: number;
  }>;
}

export class CivicAggregatorService {
  private propublicaKey = process.env.PROPUBLICA_API_KEY;
  private googleCivicKey = process.env.GOOGLE_CIVIC_API_KEY;
  private openFecKey = process.env.OPENFEC_API_KEY;
  private openStatesKey = process.env.OPENSTATES_API_KEY;
  private voteSmartKey = process.env.VOTESMART_API_KEY;

  constructor() {
    this.validateApiKeys();
  }

  private validateApiKeys() {
    const missingKeys = [];
    if (!this.propublicaKey) missingKeys.push('PROPUBLICA_API_KEY');
    if (!this.googleCivicKey) missingKeys.push('GOOGLE_CIVIC_API_KEY');
    if (!this.openFecKey) missingKeys.push('OPENFEC_API_KEY');
    if (!this.openStatesKey) missingKeys.push('OPENSTATES_API_KEY');
    if (!this.voteSmartKey) missingKeys.push('VOTESMART_API_KEY');

    // Log working APIs
    if (this.openStatesKey) {
      console.log('OpenStates API configured (500 requests/day, 1 req/sec limit)');
    }

    if (missingKeys.length > 0) {
      console.warn(`Missing API keys: ${missingKeys.join(', ')}. Some features may be limited.`);
    }
  }

  async getComprehensiveCandidateData(candidateIds: string[], electionId: string): Promise<CandidateData[]> {
    const cacheKey = `civic-agg-${candidateIds.join('-')}-${electionId}`;
    
    const candidateData = await Promise.allSettled(
      candidateIds.map(id => this.aggregateCandidateData(id, electionId))
    );

    const results = candidateData
      .filter((result): result is PromiseFulfilledResult<CandidateData> => result.status === 'fulfilled')
      .map(result => result.value);

    return results;
  }

  private async aggregateCandidateData(candidateId: string, electionId: string): Promise<CandidateData> {
    const baseData: CandidateData = {
      id: candidateId,
      name: '',
      party: '',
      office: ''
    };

    // Run all API calls in parallel
    const [
      propublicaData,
      fecData,
      voteSmartData,
      openStatesData,
      pollingData
    ] = await Promise.allSettled([
      this.fetchPropublicaData(candidateId),
      this.fetchFECData(candidateId),
      this.fetchVoteSmartData(candidateId),
      this.fetchOpenStatesData(candidateId),
      this.fetchPollingData(candidateId)
    ]);

    // Merge successful results
    if (propublicaData.status === 'fulfilled' && propublicaData.value) {
      baseData.propublicaData = propublicaData.value;
      baseData.name = propublicaData.value.first_name + ' ' + propublicaData.value.last_name;
      baseData.party = propublicaData.value.party;
      baseData.office = propublicaData.value.roles?.[0]?.title || 'Representative';
      baseData.state = propublicaData.value.roles?.[0]?.state;
      baseData.district = propublicaData.value.roles?.[0]?.district;
    }

    if (fecData.status === 'fulfilled' && fecData.value) {
      baseData.fecData = fecData.value;
    }

    if (voteSmartData.status === 'fulfilled' && voteSmartData.value) {
      baseData.voteSmartData = voteSmartData.value;
    }

    if (openStatesData.status === 'fulfilled' && openStatesData.value) {
      baseData.openStatesData = openStatesData.value;
    }

    if (pollingData.status === 'fulfilled' && pollingData.value) {
      baseData.pollingData = pollingData.value;
    }

    return baseData;
  }

  private async fetchPropublicaData(candidateId: string): Promise<any> {
    if (!this.propublicaKey) return null;

    try {
      const response = await fetch(`https://api.propublica.org/congress/v1/members/${candidateId}.json`, {
        headers: {
          'X-API-Key': this.propublicaKey
        }
      });

      if (!response.ok) throw new Error(`ProPublica API error: ${response.status}`);
      const data = await response.json() as any;
      return data.results?.[0];
    } catch (error) {
      console.error('ProPublica API error:', error);
      return null;
    }
  }

  private async fetchFECData(candidateId: string): Promise<any> {
    if (!this.openFecKey) return null;

    try {
      const response = await fetch(`https://api.open.fec.gov/v1/candidates/search/?api_key=${this.openFecKey}&candidate_id=${candidateId}&per_page=1`);
      if (!response.ok) throw new Error(`OpenFEC API error: ${response.status}`);
      const data = await response.json() as any;
      return data.results?.[0];
    } catch (error) {
      console.error('OpenFEC API error:', error);
      return null;
    }
  }

  private async fetchVoteSmartData(candidateId: string): Promise<any> {
    if (!voteSmartService) {
      console.warn(`VoteSmart service unavailable for candidate ${candidateId} - API key not configured`);
      return {
        bio: null,
        detailedBio: null,
        positions: [],
        votingRecord: [],
        ratings: [],
        photoUrl: null,
        issues: ['VoteSmart API key not configured - comprehensive candidate data unavailable'],
        lastUpdated: new Date().toISOString()
      };
    }

    try {
      // Get comprehensive candidate data using the new VoteSmart service
      const comprehensiveData = await voteSmartService.getComprehensiveCandidateData(candidateId);
      
      // Extract photo URL from biography data if available
      const photoUrl = comprehensiveData.bio?.photo || 
                      comprehensiveData.detailedBio?.photo || 
                      null;
      
      return {
        bio: comprehensiveData.bio,
        detailedBio: comprehensiveData.detailedBio,
        positions: comprehensiveData.positions,
        votingRecord: comprehensiveData.votingRecord,
        ratings: comprehensiveData.ratings,
        photoUrl,
        issues: comprehensiveData.issues,
        lastUpdated: comprehensiveData.lastUpdated
      };
      
    } catch (error) {
      console.error(`VoteSmart comprehensive data error for candidate ${candidateId}:`, error);
      return {
        bio: null,
        detailedBio: null,
        positions: [],
        votingRecord: [],
        ratings: [],
        photoUrl: null,
        issues: [`VoteSmart API error: ${error instanceof Error ? error.message : String(error)}`],
        lastUpdated: new Date().toISOString()
      };
    }
  }

  private async fetchOpenStatesData(candidateId: string): Promise<any> {
    if (!this.openStatesKey) return null;

    try {
      // First try to get person by ID
      const response = await fetch(`https://v3.openstates.org/people/${candidateId}?apikey=${this.openStatesKey}`);
      
      if (!response.ok) {
        // If direct lookup fails, search by name
        const searchResponse = await fetch(`https://v3.openstates.org/people?apikey=${this.openStatesKey}&jurisdiction=us&name=${candidateId}&per_page=1`);
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json() as any;
          return searchData.results?.[0];
        }
        
        throw new Error(`OpenStates API error: ${response.status}`);
      }
      
      const data = await response.json() as any;
      return data;
    } catch (error) {
      console.error('OpenStates API error:', error);
      return null;
    }
  }

  private async fetchPollingData(candidateId: string): Promise<any> {
    try {
      // FiveThirtyEight polling data from GitHub raw files
      const response = await fetch('https://raw.githubusercontent.com/fivethirtyeight/data/master/polls/polls.csv');
      if (!response.ok) throw new Error(`FiveThirtyEight data error: ${response.status}`);
      
      const csvData = await response.text();
      // Simple CSV parsing - in production, use a proper CSV parser
      const lines = csvData.split('\n');
      const polls = lines.slice(1).map(line => {
        const values = line.split(',');
        return {
          pollster: values[0],
          date: values[1],
          candidate: values[2],
          pct: parseFloat(values[3]) || 0
        };
      });

      return polls.filter(poll => poll.candidate?.toLowerCase().includes(candidateId.toLowerCase()));
    } catch (error) {
      console.error('Polling data error:', error);
      return null;
    }
  }

  async fetchGoogleCivicData(address: string): Promise<any> {
    if (!this.googleCivicKey) return null;

    try {
      const response = await fetch(`https://civicinfo.googleapis.com/civicinfo/v2/voterinfo?key=${this.googleCivicKey}&address=${encodeURIComponent(address)}`);
      if (!response.ok) throw new Error(`Google Civic API error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Google Civic API error:', error);
      return null;
    }
  }

  async fetchInternationalData(candidateName: string, country: string): Promise<any> {
    if (country.toLowerCase() === 'uk' || country.toLowerCase() === 'united kingdom') {
      return this.fetchUKParliamentData(candidateName);
    }
    
    return this.fetchWikidataGlobal(candidateName, country);
  }

  private async fetchUKParliamentData(candidateName: string): Promise<any> {
    try {
      const response = await fetch(`https://members-api.parliament.uk/api/Members/Search?Name=${encodeURIComponent(candidateName)}`);
      if (!response.ok) throw new Error(`UK Parliament API error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('UK Parliament API error:', error);
      return null;
    }
  }

  private async fetchWikidataGlobal(candidateName: string, country: string): Promise<any> {
    try {
      const sparqlQuery = `
        SELECT ?person ?personLabel ?partyLabel ?positionLabel WHERE {
          ?person rdfs:label "${candidateName}"@en .
          ?person wdt:P31 wd:Q5 .
          ?person wdt:P106 wd:Q82955 .
          ?person wdt:P17 ?country .
          ?country rdfs:label "${country}"@en .
          OPTIONAL { ?person wdt:P102 ?party }
          OPTIONAL { ?person wdt:P39 ?position }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
        }
        LIMIT 5
      `;

      const response = await fetch('https://query.wikidata.org/sparql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: `query=${encodeURIComponent(sparqlQuery)}`
      });

      if (!response.ok) throw new Error(`Wikidata SPARQL error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Wikidata SPARQL error:', error);
      return null;
    }
  }

  async comparePolicies(candidateIds: string[], policyCategories: string[]): Promise<PolicyComparison[]> {
    const candidateData = await this.getComprehensiveCandidateData(candidateIds, 'comparison');
    
    return policyCategories.map(category => ({
      category,
      positions: candidateData.map(candidate => ({
        candidateId: candidate.id,
        candidateName: candidate.name,
        position: this.extractPolicyPosition(candidate, category),
        details: this.extractPolicyDetails(candidate, category),
        source: this.getBestSourceForPolicy(candidate, category),
        confidence: this.calculateConfidenceScore(candidate, category)
      }))
    }));
  }

  private extractPolicyPosition(candidate: CandidateData, category: string): string {
    // Extract policy positions from VoteSmart positions data
    if (candidate.voteSmartData?.positions && candidate.voteSmartData.positions.length > 0) {
      const position = candidate.voteSmartData.positions.find((p) => 
        p.categoryName?.toLowerCase().includes(category.toLowerCase()) ||
        p.position?.toLowerCase().includes(category.toLowerCase())
      );
      if (position) {
        return position.position || `Position available on ${position.categoryName}`;
      }
    }

    // Use VoteSmart voting record for policy inference
    if (candidate.voteSmartData?.votingRecord && candidate.voteSmartData.votingRecord.length > 0) {
      const relevantVotes = candidate.voteSmartData.votingRecord.filter((vote) =>
        vote.billTitle?.toLowerCase().includes(category.toLowerCase()) ||
        vote.desc?.toLowerCase().includes(category.toLowerCase())
      );
      if (relevantVotes.length > 0) {
        const supportVotes = relevantVotes.filter((v) => v.vote === 'Yes').length;
        const totalVotes = relevantVotes.length;
        const supportRate = (supportVotes / totalVotes) * 100;
        return `${supportRate.toFixed(0)}% support based on ${totalVotes} relevant votes`;
      }
    }

    // Fallback to ProPublica data if available
    if (candidate.propublicaData?.votes) {
      const relevantVotes = candidate.propublicaData.votes.filter((vote: any) =>
        vote.description?.toLowerCase().includes(category.toLowerCase())
      );
      if (relevantVotes.length > 0) {
        const supportVotes = relevantVotes.filter((v: any) => v.position === 'Yes').length;
        const totalVotes = relevantVotes.length;
        const supportRate = (supportVotes / totalVotes) * 100;
        return `${supportRate.toFixed(0)}% support based on congressional voting record`;
      }
    }

    return 'Position not available from current sources';
  }

  private extractPolicyDetails(candidate: CandidateData, category: string): string {
    // Combine details from multiple sources, prioritizing VoteSmart data
    const details = [];

    // VoteSmart biographical information
    if (candidate.voteSmartData?.bio?.education || candidate.voteSmartData?.detailedBio?.education) {
      const education = candidate.voteSmartData.bio?.education || candidate.voteSmartData.detailedBio?.education;
      details.push(`Education: ${education}`);
    }

    if (candidate.voteSmartData?.bio?.profession || candidate.voteSmartData?.detailedBio?.profession) {
      const profession = candidate.voteSmartData.bio?.profession || candidate.voteSmartData.detailedBio?.profession;
      details.push(`Professional background: ${profession}`);
    }

    // VoteSmart ratings from interest groups
    if (candidate.voteSmartData?.ratings && candidate.voteSmartData.ratings.length > 0) {
      const categoryRatings = candidate.voteSmartData.ratings.filter(rating =>
        rating.sigName?.toLowerCase().includes(category.toLowerCase()) ||
        rating.ratingText?.toLowerCase().includes(category.toLowerCase())
      );
      if (categoryRatings.length > 0) {
        const ratingSummary = categoryRatings.map(r => `${r.sigName}: ${r.rating}`).join(', ');
        details.push(`Interest group ratings: ${ratingSummary}`);
      }
    }

    // Congressional committee experience from ProPublica
    if (candidate.propublicaData?.committees) {
      const relevantCommittees = candidate.propublicaData.committees.filter((c: any) =>
        c.name?.toLowerCase().includes(category.toLowerCase())
      );
      if (relevantCommittees.length > 0) {
        details.push(`Committee experience: ${relevantCommittees.map((c: any) => c.name).join(', ')}`);
      }
    }

    // Campaign finance data from FEC
    if (candidate.fecData?.total_receipts) {
      details.push(`Campaign funding: $${candidate.fecData.total_receipts.toLocaleString()}`);
    }

    // VoteSmart voting record count
    if (candidate.voteSmartData?.votingRecord && candidate.voteSmartData.votingRecord.length > 0) {
      details.push(`Voting record: ${candidate.voteSmartData.votingRecord.length} recorded votes`);
    }

    return details.join(' | ') || 'No additional details available';
  }

  private getBestSourceForPolicy(candidate: CandidateData, category: string): string {
    // Prioritize VoteSmart data sources
    if (candidate.voteSmartData?.positions && candidate.voteSmartData.positions.length > 0) {
      return 'VoteSmart.org - Position statements';
    }
    if (candidate.voteSmartData?.votingRecord && candidate.voteSmartData.votingRecord.length > 0) {
      return 'VoteSmart.org - Voting record';
    }
    if (candidate.voteSmartData?.ratings && candidate.voteSmartData.ratings.length > 0) {
      return 'VoteSmart.org - Interest group ratings';
    }
    
    // Fallback to other sources
    if (candidate.propublicaData?.votes) return 'ProPublica Congress API';
    if (candidate.openStatesData?.bills) return 'Open States';
    if (candidate.fecData) return 'Federal Election Commission';
    
    return 'Multiple government sources';
  }

  private calculateConfidenceScore(candidate: CandidateData, category: string): number {
    let score = 0;

    // VoteSmart data provides the highest confidence
    if (candidate.voteSmartData?.positions && candidate.voteSmartData.positions.length > 0) score += 0.35;
    if (candidate.voteSmartData?.votingRecord && candidate.voteSmartData.votingRecord.length > 0) score += 0.25;
    if (candidate.voteSmartData?.ratings && candidate.voteSmartData.ratings.length > 0) score += 0.15;
    if (candidate.voteSmartData?.bio || candidate.voteSmartData?.detailedBio) score += 0.1;
    
    // Other data sources
    if (candidate.propublicaData?.votes) score += 0.1;
    if (candidate.fecData) score += 0.05;

    return Math.min(score, 1.0);
  }

  getServiceStatus(): any {
    return {
      apis: {
        propublica: !!this.propublicaKey,
        openFEC: !!this.openFecKey,
        googleCivic: !!this.googleCivicKey,
        openStates: !!this.openStatesKey,
        voteSmart: !!voteSmartService
      },
      voteSmartCapabilities: {
        available: !!voteSmartService,
        features: voteSmartService ? [
          'Candidate biographies',
          'Position statements',
          'Voting records',
          'Interest group ratings',
          'Photo URLs',
          'Educational background',
          'Professional history'
        ] : ['VoteSmart API key required for comprehensive candidate data'],
        fallbackBehavior: 'Returns informative placeholder content when API unavailable'
      },
      internationalSupport: {
        ukParliament: true,
        wikidata: true,
        euParlGov: false // Would require additional setup
      },
      lastUpdated: new Date().toISOString()
    };
  }
}

export const civicAggregatorService = new CivicAggregatorService();