import { type Election, type InsertElection, type Candidate, type InsertCandidate, type ElectionFilters, type CongressMember, type InsertCongressMember, type User, type UpsertUser, type WatchlistItem, type InsertWatchlistItem, type CandidateAccount, type InsertCandidateAccount, type CandidateProfile, type InsertCandidateProfile, type CandidateDataSource, type InsertCandidateDataSource, type CandidatePosition, type InsertCandidatePosition, type CandidateQA, type InsertCandidateQA } from "@shared/schema";
import { IStorage } from "./storage";
import { getGoogleCivicService } from "./google-civic-service";
import { getCongressBillService } from './congress-bill-service';
import { getPerplexityService } from './perplexity-service';
import { censusService } from './census-service';
import bcrypt from 'bcryptjs';

export class MemStorage implements IStorage {
  private elections = new Map<number, Election>();
  private candidates = new Map<number, Candidate>();
  private candidatesByElection = new Map<number, number[]>(); // electionId -> candidateIds
  private congressMembers = new Map<number, CongressMember>();
  private users = new Map<string, User>();
  private watchlists = new Map<string, number[]>(); // userId -> electionIds
  private candidateAccounts = new Map<number, CandidateAccount>();
  private candidateProfiles = new Map<number, CandidateProfile>();
  private candidateDataSources = new Map<number, CandidateDataSource[]>(); // candidateId -> sources
  private candidatePositions = new Map<number, CandidatePosition[]>(); // candidateId -> positions
  private candidateQAs = new Map<number, CandidateQA[]>(); // candidateId -> Q&As
  
  // Platform Continuity Storage Maps
  private secretsVault = new Map<number, any>(); // secretId -> secret
  private secretsByName = new Map<string, any>(); // secretName -> secret
  private secretsRotationHistory = new Map<string, any>(); // rotationId -> rotation record
  private artifactStorage = new Map<number, any>(); // artifactId -> artifact
  private artifactsByHash = new Map<string, any>(); // contentHash -> artifact
  private deploymentHistory = new Map<string, any>(); // deploymentId -> deployment
  private environmentConfigurations = new Map<number, any>(); // configId -> config
  private platformContinuityEvents = new Map<string, any>(); // eventId -> event
  
  private nextId = 1;
  
  private apiCache = new Map<string, { data: any; expiry: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Health checking implementation - memory storage is always healthy
  isDbHealthy(): boolean {
    return true;
  }

  constructor() {
    this.initializeWithSeedData();
  }

  // Cache utilities
  private getCachedData<T>(key: string): T | null {
    const cached = this.apiCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    return null;
  }

  private setCachedData<T>(key: string, data: T): void {
    this.apiCache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_TTL
    });
  }

  private async initializeWithSeedData(): Promise<void> {
    console.log('Initializing MemStorage with comprehensive election data...');
    
    // Initialize seed elections data - comprehensive 2025-2026 elections
    const seedElections: InsertElection[] = [
      // 2025 Elections
      { title: "2025 New Jersey Governor Election", subtitle: "Governor", location: "Statewide", state: "NJ", date: new Date('2025-11-04'), type: "general", level: "state", offices: ["Governor"], description: "New Jersey gubernatorial election with multiple candidates competing for the governorship.", pollsOpen: "6:00 AM", pollsClose: "8:00 PM", timezone: "EST", isActive: true },
      { title: "2025 Virginia Governor Election", subtitle: "Governor", location: "Statewide", state: "VA", date: new Date('2025-11-04'), type: "general", level: "state", offices: ["Governor"], description: "Virginia gubernatorial election featuring incumbent vs challenger race.", pollsOpen: "6:00 AM", pollsClose: "7:00 PM", timezone: "EST", isActive: true },
      { title: "2025 Kentucky Governor Election", subtitle: "Governor", location: "Statewide", state: "KY", date: new Date('2025-11-04'), type: "general", level: "state", offices: ["Governor"], description: "Kentucky gubernatorial election with current governor seeking reelection.", pollsOpen: "6:00 AM", pollsClose: "6:00 PM", timezone: "EST", isActive: true },
      { title: "2025 Mississippi Governor Election", subtitle: "Governor", location: "Statewide", state: "MS", date: new Date('2025-11-04'), type: "general", level: "state", offices: ["Governor"], description: "Mississippi gubernatorial election with competitive primary results.", pollsOpen: "7:00 AM", pollsClose: "7:00 PM", timezone: "CST", isActive: true },

      // 2026 Midterm Elections - All 435 House Districts
      ...this.generate2026HouseElections(),
      
      // 2026 Senate Elections (34 seats up)
      ...this.generate2026SenateElections(),
      
      // 2026 Gubernatorial Elections (36 states + 3 territories)
      ...this.generate2026GovernorElections(),
      
      // 2026 State Legislative Elections
      ...this.generate2026StateLegislativeElections(),
      
      // 2026 Major Mayoral Elections
      ...this.generate2026MayoralElections(),
      
      // Special Elections throughout 2025-2026
      ...this.generateSpecialElections()
    ];

    // Insert elections
    for (const election of seedElections) {
      const newElection: Election = {
        id: this.nextId++,
        ...election,
        subtitle: election.subtitle ?? null,
        offices: election.offices ?? null,
        description: election.description ?? null,
        pollsOpen: election.pollsOpen ?? null,
        pollsClose: election.pollsClose ?? null,
        timezone: election.timezone ?? null,
        isActive: election.isActive ?? null
      };
      this.elections.set(newElection.id, newElection);
    }

    // Generate realistic candidate data for elections
    await this.generateCandidateData();

    console.log(`MemStorage initialized with ${this.elections.size} elections and ${this.candidates.size} candidates`);
  }

  private generate2026HouseElections(): InsertElection[] {
    const states = {
      'CA': 52, 'TX': 38, 'FL': 28, 'NY': 26, 'PA': 17, 'IL': 17, 'OH': 15, 'GA': 14, 'NC': 14, 'MI': 13,
      'NJ': 12, 'VA': 11, 'WA': 10, 'AZ': 9, 'IN': 9, 'MA': 9, 'TN': 9, 'MD': 8, 'MN': 8, 'MO': 8,
      'WI': 8, 'CO': 8, 'AL': 7, 'SC': 7, 'LA': 6, 'KY': 6, 'OR': 6, 'OK': 5, 'CT': 5, 'IA': 4,
      'AR': 4, 'KS': 4, 'MS': 4, 'NV': 4, 'UT': 4, 'NM': 3, 'WV': 2, 'ID': 2, 'HI': 2, 'ME': 2,
      'NH': 2, 'RI': 2, 'NE': 3, 'MT': 2, 'ND': 1, 'SD': 1, 'DE': 1, 'VT': 1, 'WY': 1, 'AK': 1
    };

    const houseElections: InsertElection[] = [];
    Object.entries(states).forEach(([state, count]) => {
      for (let i = 1; i <= count; i++) {
        const district = count === 1 ? 'At-Large' : `District ${i}`;
        houseElections.push({
          title: `2026 U.S. House - ${state} ${district}`,
          subtitle: `U.S. House ${district}`,
          location: district,
          state: state,
          date: new Date('2026-11-03'),
          type: 'general',
          level: 'federal',
          offices: [`U.S. House ${district}`],
          description: `${state} ${district} House seat election focusing on local and national priorities.`,
          pollsOpen: '7:00 AM',
          pollsClose: '7:00 PM',
          timezone: 'Local',
          isActive: true
        });
      }
    });

    return houseElections;
  }

  private generate2026SenateElections(): InsertElection[] {
    const senateStates = ['AL', 'AK', 'AR', 'CO', 'DE', 'GA', 'ID', 'IA', 'KS', 'KY', 'LA', 'ME', 'MA', 'MI', 'MN', 'MS', 'MT', 'NE', 'NH', 'NJ', 'NM', 'NC', 'OK', 'OR', 'RI', 'SC', 'SD', 'TN', 'TX', 'VA', 'WV', 'WY'];
    
    return senateStates.map(state => ({
      title: `2026 U.S. Senate - ${state}`,
      subtitle: 'U.S. Senate',
      location: 'Statewide',
      state: state,
      date: new Date('2026-11-03'),
      type: 'general' as const,
      level: 'federal' as const,
      offices: ['U.S. Senate'],
      description: `${state} U.S. Senate election with major implications for party control.`,
      pollsOpen: '7:00 AM',
      pollsClose: '7:00 PM',
      timezone: 'Local',
      isActive: true
    }));
  }

  private generate2026GovernorElections(): InsertElection[] {
    const governorStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'FL', 'GA', 'HI', 'ID', 'IL', 'IA', 'KS', 'ME', 'MD', 'MA', 'MI', 'MN', 'NE', 'NV', 'NH', 'NM', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'VT', 'WI', 'WY'];
    
    return governorStates.map(state => ({
      title: `2026 ${state} Governor Election`,
      subtitle: 'Governor',
      location: 'Statewide',
      state: state,
      date: new Date('2026-11-03'),
      type: 'general' as const,
      level: 'state' as const,
      offices: ['Governor'],
      description: `${state} gubernatorial election with key state policy implications.`,
      pollsOpen: '7:00 AM',
      pollsClose: '8:00 PM',
      timezone: 'Local',
      isActive: true
    }));
  }

  private generate2026StateLegislativeElections(): InsertElection[] {
    const stateElections: InsertElection[] = [];
    
    // Major state legislative elections
    const states = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI', 'NJ', 'VA', 'WA', 'AZ', 'MA'];
    
    states.forEach(state => {
      // State House/Assembly elections
      stateElections.push({
        title: `2026 ${state} State House Elections`,
        subtitle: 'State House/Assembly',
        location: 'Statewide',
        state: state,
        date: new Date('2026-11-03'),
        type: 'general',
        level: 'state',
        offices: ['State House/Assembly'],
        description: `${state} State House/Assembly elections for control of lower chamber.`,
        pollsOpen: '7:00 AM',
        pollsClose: '8:00 PM',
        timezone: 'Local',
        isActive: true
      });
      
      // State Senate elections (many states)
      stateElections.push({
        title: `2026 ${state} State Senate Elections`,
        subtitle: 'State Senate',
        location: 'Statewide',
        state: state,
        date: new Date('2026-11-03'),
        type: 'general',
        level: 'state',
        offices: ['State Senate'],
        description: `${state} State Senate elections for upper chamber seats.`,
        pollsOpen: '7:00 AM',
        pollsClose: '8:00 PM',
        timezone: 'Local',
        isActive: true
      });
    });

    return stateElections;
  }

  private generate2026MayoralElections(): InsertElection[] {
    const cities = [
      { name: 'New York City', state: 'NY', population: 8400000 },
      { name: 'Los Angeles', state: 'CA', population: 4000000 },
      { name: 'Chicago', state: 'IL', population: 2700000 },
      { name: 'Houston', state: 'TX', population: 2300000 },
      { name: 'Phoenix', state: 'AZ', population: 1700000 },
      { name: 'Philadelphia', state: 'PA', population: 1600000 },
      { name: 'San Antonio', state: 'TX', population: 1500000 },
      { name: 'San Diego', state: 'CA', population: 1400000 },
      { name: 'Dallas', state: 'TX', population: 1300000 },
      { name: 'Austin', state: 'TX', population: 1000000 }
    ];

    return cities.map(city => ({
      title: `2026 ${city.name} Mayoral Election`,
      subtitle: 'Mayor',
      location: city.name,
      state: city.state,
      date: new Date('2026-11-03'),
      type: 'general' as const,
      level: 'local' as const,
      offices: ['Mayor'],
      description: `${city.name} mayoral election for the nation's ${city.population > 2000000 ? 'largest' : 'major'} cities.`,
      pollsOpen: '7:00 AM',
      pollsClose: '8:00 PM',
      timezone: 'Local',
      isActive: true
    }));
  }

  private generateSpecialElections(): InsertElection[] {
    return [
      {
        title: "2025 CA-45 Special Election",
        subtitle: "U.S. House District 45",
        location: "District 45",
        state: "CA",
        date: new Date('2025-12-10'),
        type: 'special',
        level: 'federal',
        offices: ["U.S. House District 45"],
        description: "Special election to fill vacant House seat in California's 45th district.",
        pollsOpen: '7:00 AM',
        pollsClose: '8:00 PM',
        timezone: 'PST',
        isActive: true
      },
      {
        title: "2026 OH-15 Special Primary",
        subtitle: "U.S. House District 15 Primary",
        location: "District 15",
        state: "OH",
        date: new Date('2026-03-17'),
        type: 'special',
        level: 'federal',
        offices: ["U.S. House District 15"],
        description: "Special primary election for Ohio's 15th congressional district.",
        pollsOpen: '6:30 AM',
        pollsClose: '7:30 PM',
        timezone: 'EST',
        isActive: true
      }
    ];
  }

  private async generateCandidateData(): Promise<void> {
    const candidateTemplates = [
      { parties: ['Democratic', 'Republican'], incumbentChance: 0.15 },
      { parties: ['Democratic', 'Republican', 'Independent'], incumbentChance: 0.10 },
      { parties: ['Democratic', 'Republican', 'Green', 'Libertarian'], incumbentChance: 0.05 }
    ];

    const firstNames = ['John', 'Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Maria', 'James', 'Patricia', 'William', 'Linda', 'Richard', 'Barbara', 'Joseph', 'Elizabeth', 'Thomas', 'Susan', 'Christopher', 'Jessica', 'Charles', 'Ashley', 'Daniel', 'Dorothy', 'Matthew', 'Nancy', 'Anthony', 'Lisa', 'Mark', 'Betty'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];

    for (const [electionId, election] of Array.from(this.elections.entries())) {
      const template = candidateTemplates[Math.floor(Math.random() * candidateTemplates.length)];
      const candidateIds: number[] = [];

      for (let i = 0; i < template.parties.length; i++) {
        const party = template.parties[i];
        const isIncumbent = Math.random() < template.incumbentChance && i < 2; // Only D/R can be incumbents
        
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        
        const candidate: Candidate = {
          id: this.nextId++,
          name: `${firstName} ${lastName}`,
          party: party,
          electionId: electionId,
          pollingSupport: this.generatePollingSupport(party, isIncumbent),
          pollingTrend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)],
          lastPollingUpdate: new Date(),
          pollingSource: 'Composite Polling Average',
          isIncumbent: isIncumbent,
          description: this.generateCandidateDescription(party, isIncumbent, election.level, election.offices?.[0]),
          website: `https://${firstName.toLowerCase()}${lastName.toLowerCase()}2026.com`,
          votesReceived: null,
          votePercentage: null,
          isWinner: false,
          isProjectedWinner: false,
          isVerified: true,
          subscriptionTier: null,
          profileImageUrl: null,
          campaignBio: null,
          contactEmail: `contact@${firstName.toLowerCase()}${lastName.toLowerCase()}2026.com`,
          campaignPhone: null,
          socialMedia: {
            twitter: `@${firstName.toLowerCase()}${lastName.toLowerCase()}`,
            facebook: `${firstName}${lastName}Campaign`,
            instagram: `@${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        this.candidates.set(candidate.id, candidate);
        candidateIds.push(candidate.id);
      }

      this.candidatesByElection.set(electionId, candidateIds);
    }
  }

  private generatePollingSupport(party: string, isIncumbent: boolean): number {
    let base = 35;
    if (party === 'Democratic') base = 42;
    if (party === 'Republican') base = 41;
    if (isIncumbent) base += 8;
    
    return Math.min(65, Math.max(15, base + Math.floor(Math.random() * 20) - 10));
  }

  private generateCandidateDescription(party: string, isIncumbent: boolean, level: string, office?: string): string {
    const incumbentPrefix = isIncumbent ? 'Incumbent ' : '';
    const partyName = party === 'Democratic' ? 'Democrat' : party === 'Republican' ? 'Republican' : party;
    
    const backgrounds = [
      'former state legislator',
      'business executive',
      'community organizer',
      'attorney',
      'educator', 
      'military veteran',
      'healthcare professional',
      'nonprofit leader'
    ];
    
    const background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    
    return `${incumbentPrefix}${partyName} candidate and ${background} running for ${office || 'office'}.`;
  }

  // Elections methods
  async getElections(filters?: ElectionFilters): Promise<Election[]> {
    let results = Array.from(this.elections.values());

    if (filters) {
      // Filter by time range
      if (filters.timeframe && filters.timeframe !== 'all') {
        const now = new Date();
        let endDate = new Date();
        
        switch (filters.timeframe) {
          case 'week':
            endDate.setDate(now.getDate() + 7);
            break;
          case 'month':
            endDate.setMonth(now.getMonth() + 1);
            break;
          case 'quarter':
            endDate.setMonth(now.getMonth() + 3);
            break;
          case 'year':
            endDate.setFullYear(now.getFullYear() + 1);
            break;
        }
        
        results = results.filter(e => e.date >= now && e.date <= endDate);
      }

      // Filter by election type
      if (filters.type) {
        const types = Array.isArray(filters.type) ? filters.type : [filters.type];
        // Convert types to lowercase for case-insensitive comparison
        const lowercaseTypes = types.map(t => t.toLowerCase());
        results = results.filter(e => lowercaseTypes.includes(e.type.toLowerCase()));
      }

      // Filter by election type array (from frontend)
      if (filters.electionType) {
        const types = Array.isArray(filters.electionType) ? filters.electionType : [filters.electionType];
        // Convert types to lowercase for case-insensitive comparison
        const lowercaseTypes = types.map(t => t.toLowerCase());
        results = results.filter(e => lowercaseTypes.includes(e.type.toLowerCase()));
      }

      // Filter by level (case-insensitive)
      if (filters.level) {
        const levels = Array.isArray(filters.level) ? filters.level : [filters.level];
        // Convert levels to lowercase for case-insensitive comparison
        const lowercaseLevels = levels.map(l => l.toLowerCase());
        results = results.filter(e => lowercaseLevels.includes(e.level.toLowerCase()));
      }

      // Filter by party (check candidates)
      if (filters.party) {
        const parties = Array.isArray(filters.party) ? filters.party : [filters.party];
        results = results.filter(election => {
          const candidateIds = this.candidatesByElection.get(election.id) || [];
          return candidateIds.some(candidateId => {
            const candidate = this.candidates.get(candidateId);
            return candidate && parties.includes(candidate.party);
          });
        });
      }

      // Filter by state
      if (filters.state && filters.state !== 'all') {
        // Handle both full names and abbreviations
        const stateAbbreviations: { [key: string]: string } = {
          'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
          'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
          'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
          'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
          'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
          'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
          'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
          'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
          'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
          'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
        };
        
        const stateValue = stateAbbreviations[filters.state] || filters.state;
        results = results.filter(e => e.state === stateValue);
      }

      // Filter by search
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase().trim();
        results = results.filter(e => 
          e.title.toLowerCase().includes(searchTerm) ||
          e.subtitle?.toLowerCase().includes(searchTerm) ||
          e.location.toLowerCase().includes(searchTerm)
        );
      }
    }

    // Sort by date (ascending)
    results.sort((a, b) => a.date.getTime() - b.date.getTime());

    return results;
  }

  async getElection(id: number): Promise<Election | undefined> {
    return this.elections.get(id);
  }

  async createElection(election: InsertElection): Promise<Election> {
    const newElection: Election = {
      id: this.nextId++,
      ...election,
      subtitle: election.subtitle ?? null,
      offices: election.offices ?? null,
      description: election.description ?? null,
      pollsOpen: election.pollsOpen ?? null,
      pollsClose: election.pollsClose ?? null,
      timezone: election.timezone ?? null,
      isActive: election.isActive ?? null
    };
    this.elections.set(newElection.id, newElection);
    return newElection;
  }

  async deleteElection(id: number): Promise<void> {
    this.elections.delete(id);
    this.candidatesByElection.delete(id);
  }

  // Candidates methods
  async getCandidatesByElection(electionId: number): Promise<Candidate[]> {
    const candidateIds = this.candidatesByElection.get(electionId) || [];
    return candidateIds.map(id => this.candidates.get(id)!).filter(Boolean);
  }

  async getCandidates(electionId?: number): Promise<Candidate[]> {
    if (electionId) {
      return this.getCandidatesByElection(electionId);
    }
    return Array.from(this.candidates.values());
  }

  async getCandidatesByIds(ids: number[]): Promise<Candidate[]> {
    return ids.map(id => this.candidates.get(id)!).filter(Boolean);
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const newCandidate: Candidate = {
      id: this.nextId++,
      ...candidate,
      description: candidate.description ?? null,
      electionId: candidate.electionId ?? null,
      pollingSupport: candidate.pollingSupport ?? null,
      pollingTrend: candidate.pollingTrend ?? null,
      lastPollingUpdate: candidate.lastPollingUpdate ?? null,
      pollingSource: candidate.pollingSource ?? null,
      isIncumbent: candidate.isIncumbent ?? null,
      website: candidate.website ?? null,
      votesReceived: candidate.votesReceived ?? null,
      votePercentage: candidate.votePercentage ?? null,
      isWinner: candidate.isWinner ?? null,
      isProjectedWinner: candidate.isProjectedWinner ?? null,
      isVerified: candidate.isVerified ?? null,
      subscriptionTier: candidate.subscriptionTier ?? null,
      profileImageUrl: candidate.profileImageUrl ?? null,
      campaignBio: candidate.campaignBio ?? null,
      contactEmail: candidate.contactEmail ?? null,
      campaignPhone: candidate.campaignPhone ?? null,
      socialMedia: candidate.socialMedia ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.candidates.set(newCandidate.id, newCandidate);
    
    if (candidate.electionId) {
      const existing = this.candidatesByElection.get(candidate.electionId) || [];
      this.candidatesByElection.set(candidate.electionId, [...existing, newCandidate.id]);
    }
    
    return newCandidate;
  }

  async updateCandidatePolling(candidateId: number, pollingData: {
    pollingSupport?: number;
    pollingTrend?: string;
    lastPollingUpdate?: Date;
    pollingSource?: string;
  }): Promise<void> {
    const candidate = this.candidates.get(candidateId);
    if (candidate) {
      Object.assign(candidate, pollingData, { updatedAt: new Date() });
      this.candidates.set(candidateId, candidate);
    }
  }

  // Election Results methods
  async getElectionResults(electionId: number): Promise<any> {
    // Return mock results structure
    return {
      electionId,
      totalVotes: 0,
      reportingPrecincts: 0,
      totalPrecincts: 100,
      percentReporting: 0,
      isComplete: false,
      isCertified: false,
      lastUpdated: new Date()
    };
  }

  async updateElectionResults(electionId: number, resultsData: any): Promise<any> {
    // In memory storage, just return the data
    return { electionId, ...resultsData, lastUpdated: new Date() };
  }

  // Stats methods
  async getElectionStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byLevel: Record<string, number>;
    nextElection: Election | null;
  }> {
    const elections = Array.from(this.elections.values());
    const now = new Date();
    
    const byType: Record<string, number> = {};
    const byLevel: Record<string, number> = {};
    
    elections.forEach(election => {
      byType[election.type] = (byType[election.type] || 0) + 1;
      byLevel[election.level] = (byLevel[election.level] || 0) + 1;
    });

    const futureElections = elections
      .filter(e => e.date > now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      total: elections.length,
      byType,
      byLevel,
      nextElection: futureElections[0] || null
    };
  }

  // API Integration methods (with caching)
  async syncElectionsFromGoogleCivic(): Promise<void> {
    try {
      const googleCivicService = getGoogleCivicService();
      if (googleCivicService) {
        const apiElections = await googleCivicService.fetchElections();
        
        for (const election of apiElections) {
          if (!this.elections.has(election.id)) {
            this.elections.set(election.id, election);
          }
        }
      }
    } catch (error) {
      console.log('Google Civic sync failed in MemStorage:', error);
    }
  }

  async getVoterInfo(address: string): Promise<any> {
    const cacheKey = `voter_info_${address}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const googleCivicService = getGoogleCivicService();
      if (googleCivicService) {
        const voterInfo = await googleCivicService.fetchVoterInfo(address);
        this.setCachedData(cacheKey, voterInfo);
        return voterInfo;
      }
    } catch (error) {
      console.log('Voter info API failed:', error);
    }
    
    return null;
  }

  // Congress API methods (with caching)
  async getAllBills(): Promise<any[]> {
    const cacheKey = 'all_bills';
    const cached = this.getCachedData<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const congressBillService = getCongressBillService();
      if (!congressBillService) {
        console.log('Congress bill service not available');
        return [];
      }
      const bills = await congressBillService.fetchAllBills();
      this.setCachedData(cacheKey, bills);
      return bills;
    } catch (error) {
      console.log('Congress bills API failed:', error);
      return [];
    }
  }

  async getBillsByCongress(congress: string): Promise<any[]> {
    const cacheKey = `bills_${congress}`;
    const cached = this.getCachedData<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const congressBillService = getCongressBillService();
      if (!congressBillService) {
        console.log('Congress bill service not available');
        return [];
      }
      const bills = await congressBillService.fetchBillsByCongress(congress);
      this.setCachedData(cacheKey, bills);
      return bills;
    } catch (error) {
      console.log('Congress bills by congress API failed:', error);
      return [];
    }
  }

  async getAllMembers(): Promise<any[]> {
    const cacheKey = 'all_members';
    const cached = this.getCachedData<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const congressBillService = getCongressBillService();
      if (!congressBillService) {
        console.log('Congress bill service not available');
        return [];
      }
      const members = await congressBillService.fetchAllMembers();
      this.setCachedData(cacheKey, members);
      return members;
    } catch (error) {
      console.log('Congress members API failed:', error);
      return [];
    }
  }

  async getAllCongressMembers(): Promise<CongressMember[]> {
    return Array.from(this.congressMembers.values());
  }

  async getMembersByState(state: string): Promise<any[]> {
    const cacheKey = `members_${state}`;
    const cached = this.getCachedData<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const congressBillService = getCongressBillService();
      if (!congressBillService) {
        console.log('Congress bill service not available');
        return [];
      }
      const members = await congressBillService.fetchMembersByState(state);
      this.setCachedData(cacheKey, members);
      return members;
    } catch (error) {
      console.log('Congress members by state API failed:', error);
      return [];
    }
  }

  async getAllCommittees(): Promise<any[]> {
    const cacheKey = 'all_committees';
    const cached = this.getCachedData<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const congressBillService = getCongressBillService();
      if (!congressBillService) {
        console.log('Congress bill service not available');
        return [];
      }
      const committees = await congressBillService.fetchAllCommittees();
      this.setCachedData(cacheKey, committees);
      return committees;
    } catch (error) {
      console.log('Congress committees API failed:', error);
      return [];
    }
  }

  async getCommitteeMembers(chamber: string, committeeCode: string): Promise<any[]> {
    const cacheKey = `committee_${chamber}_${committeeCode}`;
    const cached = this.getCachedData<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const congressBillService = getCongressBillService();
      if (!congressBillService) {
        console.log('Congress bill service not available');
        return [];
      }
      const members = await congressBillService.fetchCommitteeMembers(chamber, committeeCode);
      this.setCachedData(cacheKey, members);
      return members;
    } catch (error) {
      console.log('Committee members API failed:', error);
      return [];
    }
  }

  async getDailyCongressionalRecords(): Promise<any[]> {
    return []; // Not implemented for mem storage
  }

  async getSenateCommunications(): Promise<any[]> {
    return []; // Not implemented for mem storage
  }

  async getAllNominations(): Promise<any[]> {
    return []; // Not implemented for mem storage
  }

  async getHouseVotes(): Promise<any[]> {
    return []; // Not implemented for mem storage
  }

  // AI Integration methods
  async searchElectionsWithAI(query: string): Promise<string> {
    try {
      const perplexityService = getPerplexityService();
      if (!perplexityService) {
        return 'AI search service not available';
      }
      return await perplexityService.searchElections(query);
    } catch (error) {
      console.log('AI search failed:', error);
      return `Search results not available: ${error}`;
    }
  }

  async expandElectionData(): Promise<void> {
    // Not implemented for mem storage
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserById(id: string): Promise<User | undefined> {
    // Search through users Map by ID since users are stored by email key
    for (const user of this.users.values()) {
      if (user.id === id) {
        return user;
      }
    }
    return undefined;
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const existingUser = this.users.get(user.id);
    const newUser: User = {
      ...existingUser,
      ...user,
      profileImageUrl: user.profileImageUrl ?? null,
      email: user.email ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      updatedAt: new Date(),
      createdAt: existingUser?.createdAt || new Date()
    };
    this.users.set(user.id, newUser);
    return newUser;
  }

  // Watchlist methods
  async getUserWatchlist(userId: string): Promise<WatchlistItem[]> {
    const electionIds = this.watchlists.get(userId) || [];
    return electionIds.map((electionId, index) => ({
      id: index + 1,
      userId,
      electionId,
      createdAt: new Date()
    }));
  }

  async addToWatchlist(userId: string, electionId: number): Promise<WatchlistItem> {
    const existing = this.watchlists.get(userId) || [];
    if (!existing.includes(electionId)) {
      this.watchlists.set(userId, [...existing, electionId]);
    }
    return {
      id: existing.length + 1,
      userId,
      electionId,
      createdAt: new Date()
    };
  }

  async removeFromWatchlist(userId: string, electionId: number): Promise<void> {
    const existing = this.watchlists.get(userId) || [];
    this.watchlists.set(userId, existing.filter(id => id !== electionId));
  }

  // Version Control & Election Cycles
  async getElectionCycles(): Promise<any[]> {
    return [
      { id: 1, name: '2025 Elections', slug: '2025', year: 2025, isActive: true },
      { id: 2, name: '2026 Midterms', slug: '2026', year: 2026, isActive: true }
    ];
  }

  async getElectionCycle(slug: string): Promise<any> {
    const cycles = await this.getElectionCycles();
    return cycles.find(c => c.slug === slug);
  }

  // Analytics methods
  async logInteraction(data: any): Promise<void> {
    // In memory - just log it
    console.log('Analytics interaction:', data);
  }

  // Candidate Portal methods (stub implementations)
  async authenticateCandidate(email: string, password: string): Promise<CandidateAccount | null> {
    // Simple stub - in production would hash/verify password
    return Array.from(this.candidateAccounts.values())
      .find(account => account.email === email) || null;
  }

  async createCandidateAccount(account: InsertCandidateAccount): Promise<CandidateAccount> {
    const newAccount: CandidateAccount = {
      id: this.nextId++,
      ...account,
      isActive: account.isActive ?? null,
      subscriptionTier: account.subscriptionTier ?? 'basic',
      lastLogin: account.lastLogin ?? null,
      emailVerified: account.emailVerified ?? null,
      role: account.role ?? 'candidate',
      campaignName: account.campaignName ?? null,
      campaignTitle: account.campaignTitle ?? null,
      accessLevel: account.accessLevel ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.candidateAccounts.set(newAccount.id, newAccount);
    return newAccount;
  }

  async getCandidateProfile(candidateId: number): Promise<CandidateProfile | null> {
    return this.candidateProfiles.get(candidateId) || null;
  }

  async updateCandidateProfile(candidateId: number, profile: Partial<CandidateProfile>): Promise<CandidateProfile> {
    const existing = this.candidateProfiles.get(candidateId);
    const updated: CandidateProfile = {
      id: candidateId,
      candidateId,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
      ...existing,
      ...profile,
      fullName: (profile.fullName !== undefined ? profile.fullName : existing?.fullName) ?? null,
      preferredName: (profile.preferredName !== undefined ? profile.preferredName : existing?.preferredName) ?? null,
      age: (profile.age !== undefined ? profile.age : existing?.age) ?? null,
      birthPlace: (profile.birthPlace !== undefined ? profile.birthPlace : existing?.birthPlace) ?? null,
      currentResidence: (profile.currentResidence !== undefined ? profile.currentResidence : existing?.currentResidence) ?? null,
      familyStatus: (profile.familyStatus !== undefined ? profile.familyStatus : existing?.familyStatus) ?? null,
      currentOccupation: (profile.currentOccupation !== undefined ? profile.currentOccupation : existing?.currentOccupation) ?? null,
      employmentHistory: (profile.employmentHistory !== undefined ? profile.employmentHistory : existing?.employmentHistory) ?? null,
      education: (profile.education !== undefined ? profile.education : existing?.education) ?? null,
      militaryService: (profile.militaryService !== undefined ? profile.militaryService : existing?.militaryService) ?? null,
      previousOffices: (profile.previousOffices !== undefined ? profile.previousOffices : existing?.previousOffices) ?? null,
      politicalExperience: (profile.politicalExperience !== undefined ? profile.politicalExperience : existing?.politicalExperience) ?? null,
      endorsements: (profile.endorsements !== undefined ? profile.endorsements : existing?.endorsements) ?? null,
      economyPosition: (profile.economyPosition !== undefined ? profile.economyPosition : existing?.economyPosition) ?? null,
      healthcarePosition: (profile.healthcarePosition !== undefined ? profile.healthcarePosition : existing?.healthcarePosition) ?? null,
      educationPosition: (profile.educationPosition !== undefined ? profile.educationPosition : existing?.educationPosition) ?? null,
      environmentPosition: (profile.environmentPosition !== undefined ? profile.environmentPosition : existing?.environmentPosition) ?? null,
      immigrationPosition: (profile.immigrationPosition !== undefined ? profile.immigrationPosition : existing?.immigrationPosition) ?? null,
      criminalJusticePosition: (profile.criminalJusticePosition !== undefined ? profile.criminalJusticePosition : existing?.criminalJusticePosition) ?? null,
      infrastructurePosition: (profile.infrastructurePosition !== undefined ? profile.infrastructurePosition : existing?.infrastructurePosition) ?? null,
      taxesPosition: (profile.taxesPosition !== undefined ? profile.taxesPosition : existing?.taxesPosition) ?? null,
      foreignPolicyPosition: (profile.foreignPolicyPosition !== undefined ? profile.foreignPolicyPosition : existing?.foreignPolicyPosition) ?? null,
      socialIssuesPosition: (profile.socialIssuesPosition !== undefined ? profile.socialIssuesPosition : existing?.socialIssuesPosition) ?? null,
      campaignWebsite: (profile.campaignWebsite !== undefined ? profile.campaignWebsite : existing?.campaignWebsite) ?? null,
      campaignSlogan: (profile.campaignSlogan !== undefined ? profile.campaignSlogan : existing?.campaignSlogan) ?? null,
      topPriorities: (profile.topPriorities !== undefined ? profile.topPriorities : existing?.topPriorities) ?? null,
      keyAccomplishments: (profile.keyAccomplishments !== undefined ? profile.keyAccomplishments : existing?.keyAccomplishments) ?? null,
      dataCompleteness: (profile.dataCompleteness !== undefined ? profile.dataCompleteness : existing?.dataCompleteness) ?? null,
      verificationStatus: (profile.verificationStatus !== undefined ? profile.verificationStatus : existing?.verificationStatus) ?? null,
      lastUpdatedBy: (profile.lastUpdatedBy !== undefined ? profile.lastUpdatedBy : existing?.lastUpdatedBy) ?? null
    };
    this.candidateProfiles.set(candidateId, updated);
    return updated;
  }

  async getCandidateDataSources(candidateId: number): Promise<CandidateDataSource[]> {
    return this.candidateDataSources.get(candidateId) || [];
  }

  async recordDataSource(source: InsertCandidateDataSource): Promise<CandidateDataSource> {
    const newSource: CandidateDataSource = {
      id: this.nextId++,
      ...source,
      sourceDescription: source.sourceDescription ?? null,
      sourceUrl: source.sourceUrl ?? null,
      lastVerified: source.lastVerified ?? null,
      confidenceScore: source.confidenceScore ?? null,
      createdAt: new Date()
    };
    
    const existing = this.candidateDataSources.get(source.candidateId) || [];
    this.candidateDataSources.set(source.candidateId, [...existing, newSource]);
    
    return newSource;
  }

  // Stub methods for remaining interface
  async getCandidateWithRAG(candidateId: number): Promise<any> {
    return { candidateId, message: "RAG data not available in memory storage" };
  }

  async recordEngagement(data: any): Promise<void> {
    console.log('Engagement recorded:', data);
  }

  async updateUserPreferences(userId: number, preferences: any): Promise<void> {
    console.log('User preferences updated:', { userId, preferences });
  }

  async updateUserDemographics(userId: number, demographics: any): Promise<void> {
    console.log('User demographics updated:', { userId, demographics });
  }

  async exportUserData(userId: number): Promise<any> {
    return { userId, message: "Data export not available in memory storage" };
  }

  async deleteUserData(userId: number): Promise<boolean> {
    console.log('User data deletion requested:', userId);
    return true;
  }

  async createCampaignAccount(data: any): Promise<any> {
    return { id: this.nextId++, ...data, createdAt: new Date() };
  }

  async validateCampaignAccess(apiKey: string): Promise<any> {
    return { valid: true, tier: 'basic' };
  }

  async getCampaignAnalytics(campaignId: number, electionId: number, tier: string): Promise<any> {
    return { campaignId, electionId, tier, analytics: {} };
  }

  async getCampaignGeographics(campaignId: number, region: string, tier: string): Promise<any> {
    return { campaignId, region, tier, demographics: {} };
  }

  async getCampaignPolling(campaignId: number, electionId: number, dateRange: string): Promise<any> {
    return { campaignId, electionId, dateRange, polling: [] };
  }

  async purchaseDataExport(campaignId: number, datasetType: string, format?: string): Promise<any> {
    return { campaignId, datasetType, format, downloadUrl: "#" };
  }

  async getCampaignSubscription(campaignId: number): Promise<any> {
    return { campaignId, tier: 'basic', expiresAt: new Date() };
  }

  // User Authentication Methods Implementation - Memory Mode
  async createUser(email: string, password: string): Promise<any> {
    // Memory-only user creation - no database dependency
    const bcrypt = await import('bcryptjs');
    const jwt = await import('jsonwebtoken');
    const crypto = await import('crypto');
    
    // Check if user already exists in memory
    if (this.users.has(email)) {
      throw new Error('User already exists with this email');
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user in memory
    const userId = this.nextId++;
    const user = {
      id: userId.toString(),
      email,
      passwordHash,
      emailVerified: false,
      createdAt: new Date(),
      lastLogin: null,
      profileImageUrl: null,
      firstName: null,
      lastName: null,
      updatedAt: null
    };
    
    this.users.set(email, user);
    
    // Create session token
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
    const jti = crypto.randomUUID();
    const token = jwt.default.sign(
      { uid: userId, jti },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return AuthService-compatible response
    return {
      user: {
        id: userId,
        email,
        emailVerified: false,
        createdAt: user.createdAt
      },
      token
    };
  }

  async authenticateUser(email: string, password: string): Promise<any> {
    const { authService } = await import('./auth-service');
    return await authService.signin(email, password);
  }

  async signoutUser(token: string): Promise<void> {
    const { authService } = await import('./auth-service');
    return await authService.signout(token);
  }

  async validateUserSession(token: string): Promise<User | null> {
    const { authService } = await import('./auth-service');
    return await authService.validateSession(token);
  }

  // Congressional Search & Missing Member Detection
  async searchCongressMembers(searchTerm: string): Promise<CongressMember[]> {
    const searchLower = searchTerm.toLowerCase();
    const results: CongressMember[] = [];
    
    for (const member of Array.from(this.congressMembers.values())) {
      if (
        member.name?.toLowerCase().includes(searchLower) ||
        member.state?.toLowerCase().includes(searchLower) ||
        member.party?.toLowerCase().includes(searchLower) ||
        member.bioguideId?.toLowerCase().includes(searchLower)
      ) {
        results.push(member);
        if (results.length >= 50) break; // Limit results
      }
    }
    
    return results;
  }

  async findMissingCongressMember(): Promise<any> {
    const { congressService } = await import('./congress-api-service');
    return await congressService.findMissingMembers();
  }

  // ============================================================================
  // PLATFORM CONTINUITY METHODS IMPLEMENTATION (Track 3)
  // ============================================================================

  // Secrets Management Methods
  async getSecretByName(secretName: string): Promise<any> {
    return this.secretsByName.get(secretName) || null;
  }

  async getSecretById(secretId: number): Promise<any> {
    return this.secretsVault.get(secretId) || null;
  }

  async getAllSecrets(): Promise<any[]> {
    return Array.from(this.secretsVault.values());
  }

  async getExpiredSecrets(): Promise<any[]> {
    const now = new Date();
    return Array.from(this.secretsVault.values()).filter(secret => 
      secret.nextRotation && new Date(secret.nextRotation) <= now
    );
  }

  async createSecret(secret: any): Promise<number> {
    const id = this.nextId++;
    const secretRecord = {
      id,
      ...secret,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.secretsVault.set(id, secretRecord);
    this.secretsByName.set(secret.secretName, secretRecord);
    return id;
  }

  async updateSecret(secretId: number, updates: any): Promise<void> {
    const existing = this.secretsVault.get(secretId);
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      this.secretsVault.set(secretId, updated);
      this.secretsByName.set(updated.secretName, updated);
    }
  }

  async createSecretRotationHistory(history: any): Promise<void> {
    const record = {
      ...history,
      startedAt: new Date(),
      id: this.nextId++
    };
    this.secretsRotationHistory.set(history.rotationId, record);
  }

  async updateSecretRotationHistory(rotationId: string, updates: any): Promise<void> {
    const existing = this.secretsRotationHistory.get(rotationId);
    if (existing) {
      const updated = { ...existing, ...updates };
      if (updates.status === 'completed' || updates.status === 'failed') {
        updated.completedAt = new Date();
      }
      this.secretsRotationHistory.set(rotationId, updated);
    }
  }

  async getRotationHistory(filters: any): Promise<any[]> {
    let history = Array.from(this.secretsRotationHistory.values());
    
    if (filters.secretId) {
      history = history.filter(h => h.secretId === filters.secretId);
    }
    if (filters.status) {
      history = history.filter(h => h.status === filters.status);
    }
    if (filters.rotationType) {
      history = history.filter(h => h.rotationType === filters.rotationType);
    }
    
    return history.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  async getRecentRotationFailures(days: number): Promise<any[]> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return Array.from(this.secretsRotationHistory.values())
      .filter(h => h.status === 'failed' && new Date(h.startedAt) >= cutoff)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  async deleteOldRotationHistory(cutoffDate: Date): Promise<number> {
    let deletedCount = 0;
    for (const [rotationId, history] of this.secretsRotationHistory.entries()) {
      if (new Date(history.startedAt) < cutoffDate) {
        this.secretsRotationHistory.delete(rotationId);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  // Artifact Storage Methods
  async createArtifact(artifact: any): Promise<number> {
    const id = this.nextId++;
    const artifactRecord = {
      id,
      ...artifact,
      createdAt: new Date()
    };
    this.artifactStorage.set(id, artifactRecord);
    if (artifact.contentHash) {
      this.artifactsByHash.set(artifact.contentHash, artifactRecord);
    }
    return id;
  }

  async getArtifactByHash(contentHash: string): Promise<any> {
    return this.artifactsByHash.get(contentHash) || null;
  }

  async getArtifactByNameVersion(artifactName: string, version: string, environment?: string): Promise<any> {
    return Array.from(this.artifactStorage.values()).find(artifact => 
      artifact.artifactName === artifactName && 
      artifact.version === version &&
      (!environment || artifact.environment === environment)
    ) || null;
  }

  async getArtifactVersions(artifactName: string, environment?: string): Promise<any[]> {
    return Array.from(this.artifactStorage.values())
      .filter(artifact => 
        artifact.artifactName === artifactName &&
        (!environment || artifact.environment === environment)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getArtifactById(artifactId: number): Promise<any> {
    return this.artifactStorage.get(artifactId) || null;
  }

  async updateArtifact(artifactId: number, updates: any): Promise<void> {
    const existing = this.artifactStorage.get(artifactId);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.artifactStorage.set(artifactId, updated);
      if (updated.contentHash) {
        this.artifactsByHash.set(updated.contentHash, updated);
      }
    }
  }

  async deleteArtifact(artifactId: number): Promise<void> {
    const artifact = this.artifactStorage.get(artifactId);
    if (artifact) {
      this.artifactStorage.delete(artifactId);
      if (artifact.contentHash) {
        this.artifactsByHash.delete(artifact.contentHash);
      }
    }
  }

  async getArtifacts(filters: any): Promise<any[]> {
    let artifacts = Array.from(this.artifactStorage.values());
    
    if (filters.artifactType) {
      artifacts = artifacts.filter(a => a.artifactType === filters.artifactType);
    }
    if (filters.environment) {
      artifacts = artifacts.filter(a => a.environment === filters.environment);
    }
    if (filters.isActive !== undefined) {
      artifacts = artifacts.filter(a => a.isActive === filters.isActive);
    }
    
    return artifacts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getActiveArtifacts(): Promise<any[]> {
    return Array.from(this.artifactStorage.values()).filter(a => a.isActive);
  }

  async getAllArtifacts(): Promise<any[]> {
    return Array.from(this.artifactStorage.values());
  }

  async getExpiredArtifacts(): Promise<any[]> {
    const now = new Date();
    return Array.from(this.artifactStorage.values()).filter(artifact => 
      artifact.retentionDate && new Date(artifact.retentionDate) <= now
    );
  }

  // Deployment History Methods
  async createDeploymentHistory(deployment: any): Promise<void> {
    const record = {
      ...deployment,
      startedAt: new Date(),
      id: this.nextId++
    };
    this.deploymentHistory.set(deployment.deploymentId, record);
  }

  async updateDeploymentHistory(deploymentId: string, updates: any): Promise<void> {
    const existing = this.deploymentHistory.get(deploymentId);
    if (existing) {
      const updated = { ...existing, ...updates };
      if (updates.status === 'completed' || updates.status === 'failed' || updates.status === 'rolled_back') {
        updated.completedAt = new Date();
        if (updated.startedAt) {
          updated.duration = Math.round((updated.completedAt.getTime() - new Date(updated.startedAt).getTime()) / 1000);
        }
      }
      this.deploymentHistory.set(deploymentId, updated);
    }
  }

  async getRecentDeployments(limit: number): Promise<any[]> {
    return Array.from(this.deploymentHistory.values())
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit);
  }

  async getDeploymentById(deploymentId: string): Promise<any> {
    return this.deploymentHistory.get(deploymentId) || null;
  }

  // Environment Configuration Methods
  async createEnvironmentConfiguration(config: any): Promise<number> {
    const id = this.nextId++;
    const configRecord = {
      id,
      ...config,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.environmentConfigurations.set(id, configRecord);
    return id;
  }

  async getEnvironmentConfigurations(): Promise<any[]> {
    return Array.from(this.environmentConfigurations.values());
  }

  // Platform Continuity Events Methods
  async createPlatformContinuityEvent(event: any): Promise<void> {
    const record = {
      ...event,
      startedAt: new Date(),
      id: this.nextId++
    };
    this.platformContinuityEvents.set(event.eventId, record);
  }

  async getRecentPlatformContinuityEvents(limit: number): Promise<any[]> {
    return Array.from(this.platformContinuityEvents.values())
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit);
  }

  async getPlatformContinuityEvents(filters: any): Promise<any[]> {
    let events = Array.from(this.platformContinuityEvents.values());
    
    if (filters.eventType) {
      events = events.filter(e => e.eventType === filters.eventType);
    }
    if (filters.severity) {
      events = events.filter(e => e.severity === filters.severity);
    }
    if (filters.status) {
      events = events.filter(e => e.status === filters.status);
    }
    if (filters.environment) {
      events = events.filter(e => e.environment === filters.environment);
    }
    
    return events.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  // Health checking for platform services
  async getHealth(): Promise<void> {
    // Memory storage is always healthy - this is a no-op for MemStorage
    return;
  }

  // ============================================================================
  // TRACK 4: MONITORING & RUNBOOKS IMPLEMENTATION - MEMORY STORAGE
  // ============================================================================
  
  // Track 4 Memory Storage Maps
  private drillConfigurations = new Map<number, any>();
  private drillExecutions = new Map<string, any>(); // executionId -> execution
  private drillSteps = new Map<string, any[]>(); // executionId -> steps
  private backupMonitoringConfigs = new Map<number, any>();
  private backupAlerts = new Map<string, any>(); // alertId -> alert
  private backupHealthMetrics = new Map<number, any>();
  private rtoRpoTargets = new Map<number, any>();
  private rtoRpoMeasurements = new Map<string, any>(); // measurementId -> measurement
  private performanceBenchmarks = new Map<number, any>();
  private incidentRunbooks = new Map<string, any>(); // runbookId -> runbook
  private runbookSteps = new Map<string, any[]>(); // runbookId -> steps
  private runbookContacts = new Map<string, any>(); // contactId -> contact
  private contactEscalationTrees = new Map<string, any>(); // treeId -> tree
  private runbookExecutions = new Map<string, any>(); // executionId -> execution

  // Synthetic Failover Drill System - Drill Configurations
  async getFailoverDrillConfigurations(filters?: { enabled?: boolean; drillType?: string; scenario?: string }): Promise<any[]> {
    let configs = Array.from(this.drillConfigurations.values());
    
    if (filters?.enabled !== undefined) {
      configs = configs.filter(c => c.isEnabled === filters.enabled);
    }
    if (filters?.drillType) {
      configs = configs.filter(c => c.drillType === filters.drillType);
    }
    if (filters?.scenario) {
      configs = configs.filter(c => c.scenario === filters.scenario);
    }
    
    return configs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getFailoverDrillConfiguration(id: number): Promise<any | undefined> {
    return this.drillConfigurations.get(id);
  }

  async createFailoverDrillConfiguration(config: any): Promise<any> {
    const newConfig = {
      ...config,
      id: this.nextId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.drillConfigurations.set(newConfig.id, newConfig);
    return newConfig;
  }

  async updateFailoverDrillConfiguration(id: number, updates: Partial<any>): Promise<any> {
    const existing = this.drillConfigurations.get(id);
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      this.drillConfigurations.set(id, updated);
      return updated;
    }
    throw new Error('Drill configuration not found');
  }

  async deleteFailoverDrillConfiguration(id: number): Promise<void> {
    this.drillConfigurations.delete(id);
  }

  async getScheduledDrillConfigurations(): Promise<any[]> {
    return Array.from(this.drillConfigurations.values())
      .filter(c => c.isEnabled && c.triggerType === 'scheduled')
      .sort((a, b) => new Date(b.nextScheduledRun || 0).getTime() - new Date(a.nextScheduledRun || 0).getTime());
  }

  // Drill Executions
  async getDrillExecutions(filters?: { configurationId?: number; status?: string; triggerType?: string; page?: number; limit?: number }): Promise<any[]> {
    let executions = Array.from(this.drillExecutions.values());
    
    if (filters?.configurationId) {
      executions = executions.filter(e => e.configurationId === filters.configurationId);
    }
    if (filters?.status) {
      executions = executions.filter(e => e.status === filters.status);
    }
    if (filters?.triggerType) {
      executions = executions.filter(e => e.triggerType === filters.triggerType);
    }
    
    executions = executions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    
    if (filters?.limit) {
      const start = filters.page ? (filters.page - 1) * filters.limit : 0;
      executions = executions.slice(start, start + filters.limit);
    }
    
    return executions;
  }

  async getDrillExecution(executionId: string): Promise<any | undefined> {
    return this.drillExecutions.get(executionId);
  }

  async createDrillExecution(execution: any): Promise<any> {
    const newExecution = {
      ...execution,
      id: this.nextId++,
      startedAt: new Date()
    };
    this.drillExecutions.set(execution.executionId, newExecution);
    return newExecution;
  }

  async updateDrillExecution(executionId: string, updates: Partial<any>): Promise<any> {
    const existing = this.drillExecutions.get(executionId);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.drillExecutions.set(executionId, updated);
      return updated;
    }
    throw new Error('Drill execution not found');
  }

  async getRecentDrillExecutions(limit: number): Promise<any[]> {
    return Array.from(this.drillExecutions.values())
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit);
  }

  async getDrillExecutionsByConfiguration(configurationId: number): Promise<any[]> {
    return Array.from(this.drillExecutions.values())
      .filter(e => e.configurationId === configurationId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  async getDrillExecutionsForDashboard(days: number): Promise<any[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    return Array.from(this.drillExecutions.values())
      .filter(e => new Date(e.startedAt) >= since)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  // Drill Steps  
  async getDrillSteps(executionId: string): Promise<any[]> {
    return this.drillSteps.get(executionId) || [];
  }

  async createDrillStep(step: any): Promise<any> {
    const newStep = {
      ...step,
      id: this.nextId++
    };
    
    const steps = this.drillSteps.get(step.executionId) || [];
    steps.push(newStep);
    this.drillSteps.set(step.executionId, steps);
    
    return newStep;
  }

  async updateDrillStep(id: number, updates: Partial<any>): Promise<any> {
    for (const [executionId, steps] of this.drillSteps.entries()) {
      const stepIndex = steps.findIndex(s => s.id === id);
      if (stepIndex !== -1) {
        const updated = { ...steps[stepIndex], ...updates };
        steps[stepIndex] = updated;
        this.drillSteps.set(executionId, steps);
        return updated;
      }
    }
    throw new Error('Drill step not found');
  }

  async getDrillStepsByExecution(executionId: string): Promise<any[]> {
    return (this.drillSteps.get(executionId) || [])
      .sort((a, b) => a.stepOrder - b.stepOrder);
  }

  // Backup Success Alert System - Backup Monitoring Configurations
  async getBackupMonitoringConfigurations(filters?: { enabled?: boolean; monitoringType?: string }): Promise<any[]> {
    let configs = Array.from(this.backupMonitoringConfigs.values());
    
    if (filters?.enabled !== undefined) {
      configs = configs.filter(c => c.isEnabled === filters.enabled);
    }
    if (filters?.monitoringType) {
      configs = configs.filter(c => c.monitoringType === filters.monitoringType);
    }
    
    return configs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getBackupMonitoringConfiguration(id: number): Promise<any | undefined> {
    return this.backupMonitoringConfigs.get(id);
  }

  async createBackupMonitoringConfiguration(config: any): Promise<any> {
    const newConfig = {
      ...config,
      id: this.nextId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.backupMonitoringConfigs.set(newConfig.id, newConfig);
    return newConfig;
  }

  async updateBackupMonitoringConfiguration(id: number, updates: Partial<any>): Promise<any> {
    const existing = this.backupMonitoringConfigs.get(id);
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      this.backupMonitoringConfigs.set(id, updated);
      return updated;
    }
    throw new Error('Backup monitoring configuration not found');
  }

  async deleteBackupMonitoringConfiguration(id: number): Promise<void> {
    this.backupMonitoringConfigs.delete(id);
  }

  async getActiveMonitoringConfigurations(): Promise<any[]> {
    return Array.from(this.backupMonitoringConfigs.values())
      .filter(c => c.isEnabled)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Backup Alerts
  async getBackupAlerts(filters?: { status?: string; severity?: string; alertType?: string; page?: number; limit?: number }): Promise<any[]> {
    let alerts = Array.from(this.backupAlerts.values());
    
    if (filters?.status) {
      alerts = alerts.filter(a => a.status === filters.status);
    }
    if (filters?.severity) {
      alerts = alerts.filter(a => a.severity === filters.severity);
    }
    if (filters?.alertType) {
      alerts = alerts.filter(a => a.alertType === filters.alertType);
    }
    
    alerts = alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (filters?.limit) {
      const start = filters.page ? (filters.page - 1) * filters.limit : 0;
      alerts = alerts.slice(start, start + filters.limit);
    }
    
    return alerts;
  }

  async getBackupAlert(alertId: string): Promise<any | undefined> {
    return this.backupAlerts.get(alertId);
  }

  async createBackupAlert(alert: any): Promise<any> {
    const newAlert = {
      ...alert,
      id: this.nextId++,
      createdAt: new Date()
    };
    this.backupAlerts.set(alert.alertId, newAlert);
    return newAlert;
  }

  async updateBackupAlert(alertId: string, updates: Partial<any>): Promise<any> {
    const existing = this.backupAlerts.get(alertId);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.backupAlerts.set(alertId, updated);
      return updated;
    }
    throw new Error('Backup alert not found');
  }

  async acknowledgeBackupAlert(alertId: string, acknowledgedBy: string): Promise<any> {
    const existing = this.backupAlerts.get(alertId);
    if (existing) {
      const updated = { 
        ...existing, 
        status: 'acknowledged',
        acknowledgedBy,
        acknowledgedAt: new Date()
      };
      this.backupAlerts.set(alertId, updated);
      return updated;
    }
    throw new Error('Backup alert not found');
  }

  async resolveBackupAlert(alertId: string, resolvedBy: string): Promise<any> {
    const existing = this.backupAlerts.get(alertId);
    if (existing) {
      const updated = { 
        ...existing, 
        status: 'resolved',
        resolvedBy,
        resolvedAt: new Date()
      };
      this.backupAlerts.set(alertId, updated);
      return updated;
    }
    throw new Error('Backup alert not found');
  }

  async getActiveBackupAlerts(): Promise<any[]> {
    return Array.from(this.backupAlerts.values())
      .filter(a => ['new', 'acknowledged', 'investigating'].includes(a.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getBackupAlertsByConfiguration(configurationId: number): Promise<any[]> {
    return Array.from(this.backupAlerts.values())
      .filter(a => a.configurationId === configurationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Backup Health Metrics
  async getBackupHealthMetrics(filters?: { metricType?: string; dateFrom?: Date; dateTo?: Date }): Promise<any[]> {
    let metrics = Array.from(this.backupHealthMetrics.values());
    
    if (filters?.metricType) {
      metrics = metrics.filter(m => m.metricType === filters.metricType);
    }
    if (filters?.dateFrom) {
      metrics = metrics.filter(m => new Date(m.metricTimestamp) >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      metrics = metrics.filter(m => new Date(m.metricTimestamp) <= filters.dateTo!);
    }
    
    return metrics.sort((a, b) => new Date(b.metricTimestamp).getTime() - new Date(a.metricTimestamp).getTime());
  }

  async createBackupHealthMetric(metric: any): Promise<any> {
    const newMetric = {
      ...metric,
      id: this.nextId++,
      createdAt: new Date()
    };
    this.backupHealthMetrics.set(newMetric.id, newMetric);
    return newMetric;
  }

  async getLatestBackupHealthMetrics(metricType: string): Promise<any | undefined> {
    const metrics = Array.from(this.backupHealthMetrics.values())
      .filter(m => m.metricType === metricType)
      .sort((a, b) => new Date(b.metricTimestamp).getTime() - new Date(a.metricTimestamp).getTime());
    
    return metrics[0];
  }

  async getBackupHealthTrends(days: number): Promise<any[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    return Array.from(this.backupHealthMetrics.values())
      .filter(m => new Date(m.metricTimestamp) >= since)
      .sort((a, b) => new Date(b.metricTimestamp).getTime() - new Date(a.metricTimestamp).getTime());
  }

  async generateBackupHealthSummary(dateFrom: Date, dateTo: Date): Promise<any> {
    const metrics = Array.from(this.backupHealthMetrics.values())
      .filter(m => {
        const timestamp = new Date(m.metricTimestamp);
        return timestamp >= dateFrom && timestamp <= dateTo;
      });

    const summary = metrics.reduce((acc, metric) => {
      if (!acc[metric.metricType]) {
        acc[metric.metricType] = {
          metric_type: metric.metricType,
          total_measurements: 0,
          values: []
        };
      }
      acc[metric.metricType].total_measurements++;
      acc[metric.metricType].values.push(metric.metricValue);
      return acc;
    }, {} as any);

    return Object.values(summary).map((s: any) => ({
      ...s,
      avg_value: s.values.reduce((a: number, b: number) => a + b, 0) / s.values.length,
      min_value: Math.min(...s.values),
      max_value: Math.max(...s.values)
    }));
  }

  // RTO/RPO Performance Tracking - RTO/RPO Targets
  async getRtoRpoTargets(filters?: { active?: boolean; serviceType?: string; businessCriticality?: string }): Promise<any[]> {
    let targets = Array.from(this.rtoRpoTargets.values());
    
    if (filters?.active !== undefined) {
      targets = targets.filter(t => t.isActive === filters.active);
    }
    if (filters?.serviceType) {
      targets = targets.filter(t => t.serviceType === filters.serviceType);
    }
    if (filters?.businessCriticality) {
      targets = targets.filter(t => t.businessCriticality === filters.businessCriticality);
    }
    
    return targets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getRtoRpoTarget(id: number): Promise<any | undefined> {
    return this.rtoRpoTargets.get(id);
  }

  async createRtoRpoTarget(target: any): Promise<any> {
    const newTarget = {
      ...target,
      id: this.nextId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.rtoRpoTargets.set(newTarget.id, newTarget);
    return newTarget;
  }

  async updateRtoRpoTarget(id: number, updates: Partial<any>): Promise<any> {
    const existing = this.rtoRpoTargets.get(id);
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      this.rtoRpoTargets.set(id, updated);
      return updated;
    }
    throw new Error('RTO/RPO target not found');
  }

  async deleteRtoRpoTarget(id: number): Promise<void> {
    this.rtoRpoTargets.delete(id);
  }

  async getActiveRtoRpoTargets(): Promise<any[]> {
    return Array.from(this.rtoRpoTargets.values())
      .filter(t => t.isActive)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // RTO/RPO Measurements  
  async getRtoRpoMeasurements(filters?: { targetId?: number; measurementType?: string; dateFrom?: Date; dateTo?: Date; page?: number; limit?: number }): Promise<any[]> {
    let measurements = Array.from(this.rtoRpoMeasurements.values());
    
    if (filters?.targetId) {
      measurements = measurements.filter(m => m.targetId === filters.targetId);
    }
    if (filters?.measurementType) {
      measurements = measurements.filter(m => m.measurementType === filters.measurementType);
    }
    if (filters?.dateFrom) {
      measurements = measurements.filter(m => new Date(m.measuredAt) >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      measurements = measurements.filter(m => new Date(m.measuredAt) <= filters.dateTo!);
    }
    
    measurements = measurements.sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
    
    if (filters?.limit) {
      const start = filters.page ? (filters.page - 1) * filters.limit : 0;
      measurements = measurements.slice(start, start + filters.limit);
    }
    
    return measurements;
  }

  async getRtoRpoMeasurement(measurementId: string): Promise<any | undefined> {
    return this.rtoRpoMeasurements.get(measurementId);
  }

  async createRtoRpoMeasurement(measurement: any): Promise<any> {
    const newMeasurement = {
      ...measurement,
      id: this.nextId++,
      createdAt: new Date()
    };
    this.rtoRpoMeasurements.set(measurement.measurementId, newMeasurement);
    return newMeasurement;
  }

  async updateRtoRpoMeasurement(measurementId: string, updates: Partial<any>): Promise<any> {
    const existing = this.rtoRpoMeasurements.get(measurementId);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.rtoRpoMeasurements.set(measurementId, updated);
      return updated;
    }
    throw new Error('RTO/RPO measurement not found');
  }

  async getRtoRpoMeasurementsByTarget(targetId: number): Promise<any[]> {
    return Array.from(this.rtoRpoMeasurements.values())
      .filter(m => m.targetId === targetId)
      .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
  }

  async getRecentRtoRpoMeasurements(limit: number): Promise<any[]> {
    return Array.from(this.rtoRpoMeasurements.values())
      .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
      .slice(0, limit);
  }

  async getRtoRpoPerformanceTrends(targetId: number, days: number): Promise<any[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    return Array.from(this.rtoRpoMeasurements.values())
      .filter(m => m.targetId === targetId && new Date(m.measuredAt) >= since)
      .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
  }

  async getRtoRpoComplianceReport(dateFrom: Date, dateTo: Date): Promise<any> {
    const measurements = Array.from(this.rtoRpoMeasurements.values())
      .filter(m => {
        const measuredAt = new Date(m.measuredAt);
        return measuredAt >= dateFrom && measuredAt <= dateTo;
      });

    const targets = Array.from(this.rtoRpoTargets.values()).filter(t => t.isActive);
    
    return targets.map(target => {
      const targetMeasurements = measurements.filter(m => m.targetId === target.id);
      const rtoCompliant = targetMeasurements.filter(m => m.actualRtoMinutes <= target.rtoTargetMinutes).length;
      const rpoCompliant = targetMeasurements.filter(m => m.actualRpoMinutes <= target.rpoTargetMinutes).length;
      
      return {
        service_name: target.serviceName,
        service_type: target.serviceType,
        business_criticality: target.businessCriticality,
        rto_target_minutes: target.rtoTargetMinutes,
        rpo_target_minutes: target.rpoTargetMinutes,
        total_measurements: targetMeasurements.length,
        avg_rto_actual: targetMeasurements.reduce((sum, m) => sum + m.actualRtoMinutes, 0) / targetMeasurements.length || 0,
        avg_rpo_actual: targetMeasurements.reduce((sum, m) => sum + m.actualRpoMinutes, 0) / targetMeasurements.length || 0,
        rto_compliant_count: rtoCompliant,
        rpo_compliant_count: rpoCompliant
      };
    });
  }

  // Performance Benchmarks
  async getPerformanceBenchmarks(filters?: { active?: boolean; industry?: string; sourceType?: string }): Promise<any[]> {
    let benchmarks = Array.from(this.performanceBenchmarks.values());
    
    if (filters?.active !== undefined) {
      benchmarks = benchmarks.filter(b => b.isActive === filters.active);
    }
    if (filters?.industry) {
      benchmarks = benchmarks.filter(b => b.industry === filters.industry);
    }
    if (filters?.sourceType) {
      benchmarks = benchmarks.filter(b => b.sourceType === filters.sourceType);
    }
    
    return benchmarks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getPerformanceBenchmark(id: number): Promise<any | undefined> {
    return this.performanceBenchmarks.get(id);
  }

  async createPerformanceBenchmark(benchmark: any): Promise<any> {
    const newBenchmark = {
      ...benchmark,
      id: this.nextId++,
      createdAt: new Date()
    };
    this.performanceBenchmarks.set(newBenchmark.id, newBenchmark);
    return newBenchmark;
  }

  async updatePerformanceBenchmark(id: number, updates: Partial<any>): Promise<any> {
    const existing = this.performanceBenchmarks.get(id);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.performanceBenchmarks.set(id, updated);
      return updated;
    }
    throw new Error('Performance benchmark not found');
  }

  async deletePerformanceBenchmark(id: number): Promise<void> {
    this.performanceBenchmarks.delete(id);
  }

  async getIndustryBenchmarks(industry: string, serviceCategory: string): Promise<any[]> {
    return Array.from(this.performanceBenchmarks.values())
      .filter(b => b.industry === industry && b.serviceCategory === serviceCategory && b.isActive)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Incident Runbook Management System - Incident Runbooks
  async getIncidentRunbooks(filters?: { status?: string; incidentType?: string; severity?: string; accessLevel?: string; page?: number; limit?: number }): Promise<any[]> {
    let runbooks = Array.from(this.incidentRunbooks.values());
    
    if (filters?.status) {
      runbooks = runbooks.filter(r => r.status === filters.status);
    }
    if (filters?.incidentType) {
      runbooks = runbooks.filter(r => r.incidentType === filters.incidentType);
    }
    if (filters?.severity) {
      runbooks = runbooks.filter(r => r.severity === filters.severity);
    }
    if (filters?.accessLevel) {
      runbooks = runbooks.filter(r => r.accessLevel === filters.accessLevel);
    }
    
    runbooks = runbooks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (filters?.limit) {
      const start = filters.page ? (filters.page - 1) * filters.limit : 0;
      runbooks = runbooks.slice(start, start + filters.limit);
    }
    
    return runbooks;
  }

  async getIncidentRunbook(runbookId: string): Promise<any | undefined> {
    return this.incidentRunbooks.get(runbookId);
  }

  async createIncidentRunbook(runbook: any): Promise<any> {
    const newRunbook = {
      ...runbook,
      id: this.nextId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.incidentRunbooks.set(runbook.runbookId, newRunbook);
    return newRunbook;
  }

  async updateIncidentRunbook(runbookId: string, updates: Partial<any>): Promise<any> {
    const existing = this.incidentRunbooks.get(runbookId);
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      this.incidentRunbooks.set(runbookId, updated);
      return updated;
    }
    throw new Error('Incident runbook not found');
  }

  async deleteIncidentRunbook(runbookId: string): Promise<void> {
    this.incidentRunbooks.delete(runbookId);
  }

  async getRunbooksByIncidentType(incidentType: string): Promise<any[]> {
    return Array.from(this.incidentRunbooks.values())
      .filter(r => r.incidentType === incidentType && r.status === 'active')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getPublishedRunbooks(): Promise<any[]> {
    return Array.from(this.incidentRunbooks.values())
      .filter(r => ['approved', 'active'].includes(r.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async approveRunbook(runbookId: string, approvedBy: string): Promise<any> {
    const existing = this.incidentRunbooks.get(runbookId);
    if (existing) {
      const updated = { 
        ...existing, 
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date()
      };
      this.incidentRunbooks.set(runbookId, updated);
      return updated;
    }
    throw new Error('Incident runbook not found');
  }

  async getRunbookVersions(runbookId: string): Promise<any[]> {
    return Array.from(this.incidentRunbooks.values())
      .filter(r => r.runbookId === runbookId)
      .sort((a, b) => b.version - a.version);
  }

  // Runbook Steps
  async getRunbookSteps(runbookId: string): Promise<any[]> {
    return (this.runbookSteps.get(runbookId) || [])
      .sort((a, b) => a.stepOrder - b.stepOrder);
  }

  async getRunbookStep(id: number): Promise<any | undefined> {
    for (const steps of this.runbookSteps.values()) {
      const step = steps.find(s => s.id === id);
      if (step) return step;
    }
    return undefined;
  }

  async createRunbookStep(step: any): Promise<any> {
    const newStep = {
      ...step,
      id: this.nextId++
    };
    
    const steps = this.runbookSteps.get(step.runbookId) || [];
    steps.push(newStep);
    this.runbookSteps.set(step.runbookId, steps);
    
    return newStep;
  }

  async updateRunbookStep(id: number, updates: Partial<any>): Promise<any> {
    for (const [runbookId, steps] of this.runbookSteps.entries()) {
      const stepIndex = steps.findIndex(s => s.id === id);
      if (stepIndex !== -1) {
        const updated = { ...steps[stepIndex], ...updates };
        steps[stepIndex] = updated;
        this.runbookSteps.set(runbookId, steps);
        return updated;
      }
    }
    throw new Error('Runbook step not found');
  }

  async deleteRunbookStep(id: number): Promise<void> {
    for (const [runbookId, steps] of this.runbookSteps.entries()) {
      const filteredSteps = steps.filter(s => s.id !== id);
      if (filteredSteps.length !== steps.length) {
        this.runbookSteps.set(runbookId, filteredSteps);
        return;
      }
    }
  }

  async getRunbookStepsByOrder(runbookId: string): Promise<any[]> {
    return (this.runbookSteps.get(runbookId) || [])
      .sort((a, b) => a.stepOrder - b.stepOrder);
  }

  async reorderRunbookSteps(runbookId: string, stepOrders: { id: number; order: number }[]): Promise<void> {
    const steps = this.runbookSteps.get(runbookId) || [];
    
    stepOrders.forEach(({ id, order }) => {
      const step = steps.find(s => s.id === id);
      if (step) {
        step.stepOrder = order;
      }
    });
    
    this.runbookSteps.set(runbookId, steps);
  }

  // Runbook Contacts
  async getRunbookContacts(filters?: { active?: boolean; available24x7?: boolean; escalationLevel?: number }): Promise<any[]> {
    let contacts = Array.from(this.runbookContacts.values());
    
    if (filters?.active !== undefined) {
      contacts = contacts.filter(c => c.isActive === filters.active);
    }
    if (filters?.available24x7 !== undefined) {
      contacts = contacts.filter(c => c.isAvailable24x7 === filters.available24x7);
    }
    if (filters?.escalationLevel !== undefined) {
      contacts = contacts.filter(c => c.escalationLevel === filters.escalationLevel);
    }
    
    return contacts.sort((a, b) => a.escalationLevel - b.escalationLevel || a.name.localeCompare(b.name));
  }

  async getRunbookContact(contactId: string): Promise<any | undefined> {
    return this.runbookContacts.get(contactId);
  }

  async createRunbookContact(contact: any): Promise<any> {
    const newContact = {
      ...contact,
      id: this.nextId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.runbookContacts.set(contact.contactId, newContact);
    return newContact;
  }

  async updateRunbookContact(contactId: string, updates: Partial<any>): Promise<any> {
    const existing = this.runbookContacts.get(contactId);
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      this.runbookContacts.set(contactId, updated);
      return updated;
    }
    throw new Error('Runbook contact not found');
  }

  async deleteRunbookContact(contactId: string): Promise<void> {
    this.runbookContacts.delete(contactId);
  }

  async getContactsByEscalationLevel(escalationLevel: number): Promise<any[]> {
    return Array.from(this.runbookContacts.values())
      .filter(c => c.escalationLevel === escalationLevel && c.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getAvailableContacts(timezone?: string): Promise<any[]> {
    let contacts = Array.from(this.runbookContacts.values()).filter(c => c.isActive);
    
    if (timezone) {
      contacts = contacts.filter(c => c.isAvailable24x7 || c.timezone === timezone);
    }
    
    return contacts.sort((a, b) => a.escalationLevel - b.escalationLevel || a.name.localeCompare(b.name));
  }

  async updateContactLastContacted(contactId: string): Promise<void> {
    const existing = this.runbookContacts.get(contactId);
    if (existing) {
      existing.lastContactedAt = new Date();
      this.runbookContacts.set(contactId, existing);
    }
  }

  // Contact Escalation Trees
  async getContactEscalationTrees(filters?: { active?: boolean; incidentTypes?: string[] }): Promise<any[]> {
    let trees = Array.from(this.contactEscalationTrees.values());
    
    if (filters?.active !== undefined) {
      trees = trees.filter(t => t.isActive === filters.active);
    }
    if (filters?.incidentTypes && filters.incidentTypes.length > 0) {
      trees = trees.filter(t => t.incidentTypes && 
        filters.incidentTypes.some(type => t.incidentTypes.includes(type))
      );
    }
    
    return trees.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getContactEscalationTree(treeId: string): Promise<any | undefined> {
    return this.contactEscalationTrees.get(treeId);
  }

  async createContactEscalationTree(tree: any): Promise<any> {
    const newTree = {
      ...tree,
      id: this.nextId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.contactEscalationTrees.set(tree.treeId, newTree);
    return newTree;
  }

  async updateContactEscalationTree(treeId: string, updates: Partial<any>): Promise<any> {
    const existing = this.contactEscalationTrees.get(treeId);
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      this.contactEscalationTrees.set(treeId, updated);
      return updated;
    }
    throw new Error('Contact escalation tree not found');
  }

  async deleteContactEscalationTree(treeId: string): Promise<void> {
    this.contactEscalationTrees.delete(treeId);
  }

  async getEscalationTreeByIncidentType(incidentType: string, severity: string): Promise<any | undefined> {
    for (const tree of this.contactEscalationTrees.values()) {
      if (tree.isActive && 
          tree.incidentTypes?.includes(incidentType) && 
          tree.severityLevels?.includes(severity)) {
        return tree;
      }
    }
    return undefined;
  }

  // Runbook Executions
  async getRunbookExecutions(filters?: { runbookId?: string; status?: string; executedBy?: string; page?: number; limit?: number }): Promise<any[]> {
    let executions = Array.from(this.runbookExecutions.values());
    
    if (filters?.runbookId) {
      executions = executions.filter(e => e.runbookId === filters.runbookId);
    }
    if (filters?.status) {
      executions = executions.filter(e => e.status === filters.status);
    }
    if (filters?.executedBy) {
      executions = executions.filter(e => e.executedBy === filters.executedBy);
    }
    
    executions = executions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    
    if (filters?.limit) {
      const start = filters.page ? (filters.page - 1) * filters.limit : 0;
      executions = executions.slice(start, start + filters.limit);
    }
    
    return executions;
  }

  async getRunbookExecution(executionId: string): Promise<any | undefined> {
    return this.runbookExecutions.get(executionId);
  }

  async createRunbookExecution(execution: any): Promise<any> {
    const newExecution = {
      ...execution,
      id: this.nextId++,
      startedAt: new Date()
    };
    this.runbookExecutions.set(execution.executionId, newExecution);
    return newExecution;
  }

  async updateRunbookExecution(executionId: string, updates: Partial<any>): Promise<any> {
    const existing = this.runbookExecutions.get(executionId);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.runbookExecutions.set(executionId, updated);
      return updated;
    }
    throw new Error('Runbook execution not found');
  }

  async getRecentRunbookExecutions(limit: number): Promise<any[]> {
    return Array.from(this.runbookExecutions.values())
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit);
  }

  async getRunbookExecutionsByRunbook(runbookId: string): Promise<any[]> {
    return Array.from(this.runbookExecutions.values())
      .filter(e => e.runbookId === runbookId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  async getActiveRunbookExecutions(): Promise<any[]> {
    return Array.from(this.runbookExecutions.values())
      .filter(e => ['pending', 'in_progress', 'paused'].includes(e.status))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  async completeRunbookExecution(executionId: string, results: any): Promise<any> {
    const existing = this.runbookExecutions.get(executionId);
    if (existing) {
      const updated = { 
        ...existing, 
        status: 'completed',
        completedAt: new Date(),
        stepResults: results,
        isSuccessful: true
      };
      this.runbookExecutions.set(executionId, updated);
      return updated;
    }
    throw new Error('Runbook execution not found');
  }

  // Dashboard and Analytics Methods
  async getMonitoringDashboardData(): Promise<{
    drillSummary: any;
    backupHealth: any;
    rtoRpoCompliance: any;
    activeAlerts: any[];
    recentExecutions: any[];
  }> {
    const drillExecutions = Array.from(this.drillExecutions.values());
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const recentDrills = drillExecutions.filter(d => new Date(d.startedAt) >= last30Days);
    
    const drillSummary = {
      total_drills: recentDrills.length,
      successful_drills: recentDrills.filter(d => d.status === 'completed').length,
      failed_drills: recentDrills.filter(d => d.status === 'failed').length,
      avg_rto_minutes: recentDrills.reduce((sum, d) => sum + (d.actualRtoMinutes || 0), 0) / recentDrills.length || 0
    };

    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);
    
    const recentMetrics = Array.from(this.backupHealthMetrics.values())
      .filter(m => new Date(m.metricTimestamp) >= last24Hours);
    
    const backupHealthGroups = recentMetrics.reduce((acc, metric) => {
      if (!acc[metric.metricType]) {
        acc[metric.metricType] = [];
      }
      acc[metric.metricType].push(metric.metricValue);
      return acc;
    }, {} as any);

    const backupHealth = Object.entries(backupHealthGroups).map(([metricType, values]: [string, number[]]) => ({
      metric_type: metricType,
      avg_value: values.reduce((a, b) => a + b, 0) / values.length,
      measurement_count: values.length
    }));

    const measurements = Array.from(this.rtoRpoMeasurements.values())
      .filter(m => new Date(m.measuredAt) >= last30Days);
    
    const targets = Array.from(this.rtoRpoTargets.values());
    
    let totalMeasurements = 0;
    let rtoCompliant = 0;
    let rpoCompliant = 0;
    
    measurements.forEach(measurement => {
      const target = targets.find(t => t.id === measurement.targetId);
      if (target) {
        totalMeasurements++;
        if (measurement.actualRtoMinutes <= target.rtoTargetMinutes) rtoCompliant++;
        if (measurement.actualRpoMinutes <= target.rpoTargetMinutes) rpoCompliant++;
      }
    });

    const rtoRpoCompliance = {
      total_measurements: totalMeasurements,
      rto_compliant: rtoCompliant,
      rpo_compliant: rpoCompliant
    };

    const activeAlerts = Array.from(this.backupAlerts.values())
      .filter(a => ['new', 'acknowledged', 'investigating'].includes(a.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    const recentExecutions = Array.from(this.runbookExecutions.values())
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 10);

    return {
      drillSummary,
      backupHealth,
      rtoRpoCompliance,
      activeAlerts,
      recentExecutions
    };
  }

  async getPerformanceDashboardData(serviceType?: string, days?: number): Promise<{
    targets: any[];
    measurements: any[];
    trends: any[];
    complianceScore: number;
  }> {
    const daysPeriod = days || 30;
    const since = new Date();
    since.setDate(since.getDate() - daysPeriod);

    let targets = Array.from(this.rtoRpoTargets.values()).filter(t => t.isActive);
    if (serviceType) {
      targets = targets.filter(t => t.serviceType === serviceType);
    }

    const measurements = Array.from(this.rtoRpoMeasurements.values())
      .filter(m => new Date(m.measuredAt) >= since)
      .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());

    // Generate daily trends
    const trendMap = new Map<string, { date: string; measurements: any[] }>();
    measurements.forEach(m => {
      const dateKey = new Date(m.measuredAt).toISOString().split('T')[0];
      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, { date: dateKey, measurements: [] });
      }
      trendMap.get(dateKey)!.measurements.push(m);
    });

    const trends = Array.from(trendMap.values()).map(trend => ({
      date: trend.date,
      avg_rto: trend.measurements.reduce((sum, m) => sum + m.actualRtoMinutes, 0) / trend.measurements.length,
      avg_rpo: trend.measurements.reduce((sum, m) => sum + m.actualRpoMinutes, 0) / trend.measurements.length,
      measurement_count: trend.measurements.length
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate compliance score
    let totalCompliant = 0;
    let totalMeasurements = 0;
    
    measurements.forEach(measurement => {
      const target = targets.find(t => t.id === measurement.targetId);
      if (target) {
        totalMeasurements++;
        if (measurement.actualRtoMinutes <= target.rtoTargetMinutes && 
            measurement.actualRpoMinutes <= target.rpoTargetMinutes) {
          totalCompliant++;
        }
      }
    });

    const complianceScore = totalMeasurements > 0 ? (totalCompliant / totalMeasurements) * 100 : 0;

    return {
      targets,
      measurements,
      trends,
      complianceScore: Number(complianceScore.toFixed(2))
    };
  }

  async getRunbookDashboardData(): Promise<{
    totalRunbooks: number;
    activeExecutions: any[];
    recentExecutions: any[];
    contactAvailability: any[];
  }> {
    const totalRunbooks = Array.from(this.incidentRunbooks.values())
      .filter(r => r.status === 'active').length;

    const activeExecutions = Array.from(this.runbookExecutions.values())
      .filter(e => ['pending', 'in_progress', 'paused'].includes(e.status))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    const recentExecutions = Array.from(this.runbookExecutions.values())
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 20);

    const contactGroups = new Map<number, { total: number; active: number; available24x7: number }>();
    Array.from(this.runbookContacts.values()).forEach(contact => {
      const level = contact.escalationLevel;
      if (!contactGroups.has(level)) {
        contactGroups.set(level, { total: 0, active: 0, available24x7: 0 });
      }
      const group = contactGroups.get(level)!;
      group.total++;
      if (contact.isActive) group.active++;
      if (contact.isAvailable24x7) group.available24x7++;
    });

    const contactAvailability = Array.from(contactGroups.entries()).map(([level, data]) => ({
      escalation_level: level,
      total_contacts: data.total,
      active_contacts: data.active,
      always_available: data.available24x7
    })).sort((a, b) => a.escalation_level - b.escalation_level);

    return {
      totalRunbooks,
      activeExecutions,
      recentExecutions,
      contactAvailability
    };
  }
}