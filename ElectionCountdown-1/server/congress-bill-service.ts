export interface Bill {
  congress: number;
  number: string;
  title: string;
  type: string;
  introducedDate: string;
  latestAction: {
    actionDate: string;
    text: string;
  };
  sponsors: Array<{
    bioguideId: string;
    fullName: string;
    party: string;
    state: string;
  }>;
}

export interface CongressMember {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: string;
}

export interface Committee {
  systemCode: string;
  name: string;
  chamber: string;
  subcommittees?: Array<{
    systemCode: string;
    name: string;
  }>;
}

export interface CongressionalRecord {
  congress: number;
  session: number;
  chamber: string;
  date: string;
  title: string;
  url: string;
}

export interface SenateCommunication {
  congress: number;
  number: string;
  communicationType: string;
  title: string;
  presentedDate: string;
}

export interface Nomination {
  congress: number;
  number: string;
  description: string;
  receivedDate: string;
  latestAction: {
    actionDate: string;
    text: string;
  };
}

export interface HouseVote {
  congress: number;
  session: number;
  rollCallNumber: number;
  url: string;
  actionDate: string;
  description: string;
  result: string;
  voteType: string;
}

export class CongressBillService {
  private apiKey: string;
  private baseUrl = 'https://api.congress.gov/v3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('api_key', this.apiKey);
    url.searchParams.append('format', 'json');
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // List all bills - using 119th Congress (current)
  async fetchAllBills(congress: string = '119'): Promise<Bill[]> {
    try {
      // Fetch multiple pages to get comprehensive bill data
      const allBills: Bill[] = [];
      let offset = 0;
      const limit = 250; // Maximum per request
      
      while (true) {
        const data = await this.makeRequest(`/bill/${congress}`, {
          offset: offset.toString(),
          limit: limit.toString()
        });
        
        if (!data.bills || data.bills.length === 0) break;
        
        allBills.push(...data.bills);
        
        // Check if we've gotten all bills
        if (data.bills.length < limit) break;
        
        offset += limit;
        
        // Safety limit to prevent infinite loops
        if (offset > 10000) break;
      }
      
      return allBills;
    } catch (error) {
      console.error('Error fetching all bills:', error);
      return [];
    }
  }

  // Bills by Congress - comprehensive data fetching
  async fetchBillsByCongress(congress: string): Promise<Bill[]> {
    try {
      // Fetch multiple pages to get comprehensive bill data
      const allBills: Bill[] = [];
      let offset = 0;
      const limit = 250; // Maximum per request
      
      while (true) {
        const data = await this.makeRequest(`/bill/${congress}`, {
          offset: offset.toString(),
          limit: limit.toString()
        });
        
        if (!data.bills || data.bills.length === 0) break;
        
        allBills.push(...data.bills);
        
        // Check if we've gotten all bills
        if (data.bills.length < limit) break;
        
        offset += limit;
        
        // Safety limit to prevent infinite loops
        if (offset > 10000) break;
      }
      
      return allBills;
    } catch (error) {
      console.error('Error fetching bills by congress:', error);
      return [];
    }
  }

  // Fetch members from specific Congress (118th has complete 554 members)
  async fetchMembersByCongress(congressNumber: number): Promise<CongressMember[]> {
    try {
      const allMembers: CongressMember[] = [];
      let offset = 0;
      const limit = 250;
      
      console.log(`Fetching all members from ${congressNumber}th Congress...`);
      
      while (true) {
        console.log(`Fetching batch: offset ${offset}, limit ${limit}`);
        
        const data = await this.makeRequest(`/member/congress/${congressNumber}`, {
          offset: offset.toString(),
          limit: limit.toString()
        });
        
        if (!data.members || data.members.length === 0) break;
        
        console.log(`Retrieved ${data.members.length} members in this batch`);
        
        const members = data.members.map((member: any) => ({
          bioguideId: member.bioguideId,
          name: member.name,
          party: member.partyName,
          state: member.state,
          chamber: member.terms?.item?.[0]?.chamber?.replace('House of Representatives', 'House') || 'Unknown',
          district: member.district
        }));
        
        allMembers.push(...members);
        
        // Check if we've gotten all members from this Congress
        if (!data.pagination?.next || data.members.length < limit) break;
        
        offset += limit;
      }
      
      console.log(`${congressNumber}th Congress: ${allMembers.length} members fetched`);
      return allMembers;
    } catch (error) {
      console.error(`Error fetching ${congressNumber}th Congress members:`, error);
      return [];
    }
  }

  // List all current serving members (use 119th Congress - current Congress)
  async fetchAllMembers(): Promise<CongressMember[]> {
    try {
      console.log('Fetching current serving members from 119th Congress (current Congress)...');
      
      // Fetch from 119th Congress (current Congress)
      let members = await this.fetchMembersByCongress(119);
      
      if (members.length < 500) {
        console.log(`Only got ${members.length} from 119th Congress, trying 118th as supplement...`);
        // If 119th doesn't have enough, supplement with 118th for continuity
        const congress118 = await this.fetchMembersByCongress(118);
        
        // Combine and deduplicate by bioguideId
        const combined = [...members, ...congress118];
        const uniqueMembers = combined.filter((member, index, self) => 
          index === self.findIndex(m => m.bioguideId === member.bioguideId)
        );
        
        members = uniqueMembers;
        console.log(`Combined total: ${members.length} unique members`);
      }
      
      console.log(`Final count: ${members.length} current serving members`);
      return members;
    } catch (error) {
      console.error('Error fetching all members:', error);
      return [];
    }
  }

  // Fetch current House members specifically
  private async fetchCurrentHouseMembers(): Promise<CongressMember[]> {
    try {
      const data = await this.makeRequest('/member/house', { limit: '450' });
      return data.members?.map((member: any) => ({
        bioguideId: member.bioguideId,
        name: member.name,
        party: member.partyName,
        state: member.state,
        chamber: 'House',
        district: member.district
      })) || [];
    } catch (error) {
      console.log('House-specific endpoint not available, using general endpoint');
      return [];
    }
  }

  // Fetch current Senate members specifically
  private async fetchCurrentSenateMembers(): Promise<CongressMember[]> {
    try {
      const data = await this.makeRequest('/member/senate', { limit: '100' });
      return data.members?.map((member: any) => ({
        bioguideId: member.bioguideId,
        name: member.name,
        party: member.partyName,
        state: member.state,
        chamber: 'Senate',
        district: null
      })) || [];
    } catch (error) {
      console.log('Senate-specific endpoint not available, using general endpoint');
      return [];
    }
  }

  // Members by State
  async fetchMembersByState(state: string): Promise<CongressMember[]> {
    try {
      const allMembers = await this.fetchAllMembers();
      return allMembers.filter(member => member.state === state);
    } catch (error) {
      console.error('Error fetching members by state:', error);
      return [];
    }
  }

  // List all committees
  async fetchAllCommittees(): Promise<Committee[]> {
    try {
      const houseData = await this.makeRequest('/committee/house');
      const senateData = await this.makeRequest('/committee/senate');
      return [...(houseData.committees || []), ...(senateData.committees || [])];
    } catch (error) {
      console.error('Error fetching all committees:', error);
      return [];
    }
  }

  // Committee Members
  async fetchCommitteeMembers(chamber: string, committeeCode: string): Promise<any[]> {
    try {
      const data = await this.makeRequest(`/committee/${chamber}/${committeeCode}`);
      return data.committee?.members || [];
    } catch (error) {
      console.error('Error fetching committee members:', error);
      return [];
    }
  }

  // List daily congressional records
  async fetchDailyCongressionalRecords(year?: string, month?: string): Promise<CongressionalRecord[]> {
    try {
      const endpoint = year && month ? 
        `/congressional-record/${year}/${month}` : 
        '/congressional-record';
      const data = await this.makeRequest(endpoint);
      return data.congressionalRecords || [];
    } catch (error) {
      console.error('Error fetching congressional records:', error);
      return [];
    }
  }

  // List Senate communications
  async fetchSenateCommunications(congress: string = '118'): Promise<SenateCommunication[]> {
    try {
      const data = await this.makeRequest(`/senate-communication/${congress}`);
      return data.senateCommunications || [];
    } catch (error) {
      console.error('Error fetching senate communications:', error);
      return [];
    }
  }

  // List all nominations
  async fetchAllNominations(congress: string = '118'): Promise<Nomination[]> {
    try {
      const data = await this.makeRequest(`/nomination/${congress}`);
      return data.nominations || [];
    } catch (error) {
      console.error('Error fetching nominations:', error);
      return [];
    }
  }

  // [BETA] List votes
  async fetchHouseVotes(congress: string = '118', session: string = '1'): Promise<HouseVote[]> {
    try {
      const data = await this.makeRequest(`/house-vote/${congress}/${session}`);
      return data.houseVotes || [];
    } catch (error) {
      console.error('Error fetching house votes:', error);
      return [];
    }
  }
}

export function getCongressBillService(): CongressBillService | null {
  const apiKey = process.env.CONGRESS_API_KEY || 'cc9mECbK6VKcz0ChKLUo85xZr6kySbIM9kTiy45M';
  if (!apiKey) {
    console.warn('Congress API key not found');
    return null;
  }
  return new CongressBillService(apiKey);
}