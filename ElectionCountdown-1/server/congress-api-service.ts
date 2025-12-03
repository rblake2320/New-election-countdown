// Using global fetch available in Node.js 18+

export interface CongressMember {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  url?: string;
}

export interface MemberAnalysis {
  total: number;
  house: number;
  senate: number;
  byState: Record<string, number>;
  byParty: Record<string, number>;
  issues: string[];
  missing: CongressMember[];
  source: string;
}

class CongressGovAPI {
  name = 'Congress.gov';
  
  async getMembers(): Promise<CongressMember[]> {
    const apiKey = process.env.CONGRESS_API_KEY;
    if (!apiKey) {
      throw new Error('CONGRESS_API_KEY not configured');
    }
    
    const url = `https://api.congress.gov/v3/member?api_key=${apiKey}&limit=250&currentMember=true`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Congress.gov API error: ${response.status}`);
    }
    
    const data = await response.json() as any;
    return data.members.map((member: any) => ({
      bioguideId: member.bioguideId,
      name: member.name,
      firstName: member.firstName,
      lastName: member.lastName,
      party: member.partyName || 'Unknown',
      state: member.state,
      district: member.district?.toString(),
      chamber: member.terms?.[0]?.chamber === 'House of Representatives' ? 'House' : 'Senate',
      title: member.honorificName || member.directOrderName,
      url: member.url
    }));
  }
}

class ProPublicaAPI {
  name = 'ProPublica';
  
  async getMembers(): Promise<CongressMember[]> {
    const apiKey = process.env.PROPUBLICA_API_KEY;
    if (!apiKey) {
      throw new Error('PROPUBLICA_API_KEY not configured');
    }
    
    const congress = 118; // Current Congress
    
    const [houseResponse, senateResponse] = await Promise.all([
      fetch(`https://api.propublica.org/congress/v1/${congress}/house/members.json`, {
        headers: { 'X-API-Key': apiKey }
      }),
      fetch(`https://api.propublica.org/congress/v1/${congress}/senate/members.json`, {
        headers: { 'X-API-Key': apiKey }
      })
    ]);
    
    if (!houseResponse.ok || !senateResponse.ok) {
      throw new Error('ProPublica API error');
    }
    
    const houseData = await houseResponse.json() as any;
    const senateData = await senateResponse.json() as any;
    
    const members = [
      ...houseData.results[0].members.map((m: any) => ({
        bioguideId: m.id,
        name: `${m.first_name} ${m.last_name}`,
        firstName: m.first_name,
        lastName: m.last_name,
        party: m.party,
        state: m.state,
        district: m.district,
        chamber: 'House' as const,
        title: m.title,
        url: m.url
      })),
      ...senateData.results[0].members.map((m: any) => ({
        bioguideId: m.id,
        name: `${m.first_name} ${m.last_name}`,
        firstName: m.first_name,
        lastName: m.last_name,
        party: m.party,
        state: m.state,
        chamber: 'Senate' as const,
        title: m.title,
        url: m.url
      }))
    ];
    
    return members;
  }
}

class GitHubLegislatorsAPI {
  name = 'GitHub Legislators';
  
  async getMembers(): Promise<CongressMember[]> {
    const url = 'https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.json';
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('GitHub legislators API error');
    }
    
    const legislators = await response.json() as any[];
    
    return legislators.map(legislator => {
      const term = legislator.terms[legislator.terms.length - 1];
      return {
        bioguideId: legislator.id.bioguide,
        name: `${legislator.name.first} ${legislator.name.last}`,
        firstName: legislator.name.first,
        lastName: legislator.name.last,
        party: term.party,
        state: term.state,
        district: term.district?.toString(),
        chamber: term.type === 'rep' ? 'House' : 'Senate',
        title: term.type === 'rep' ? 'Representative' : 'Senator'
      };
    });
  }
}

export class CongressAPIService {
  private apis = [
    new CongressGovAPI(),
    new ProPublicaAPI(),
    new GitHubLegislatorsAPI()
  ];
  
  async findMissingMembers(): Promise<MemberAnalysis> {
    for (const api of this.apis) {
      try {
        console.log(`Trying ${api.name} API...`);
        const members = await api.getMembers();
        const analysis = this.analyzeMembers(members, api.name);
        console.log(`${api.name} API successful - found ${members.length} members`);
        return analysis;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`${api.name} failed:`, errorMessage);
        continue;
      }
    }
    
    throw new Error('All Congress APIs failed');
  }
  
  private analyzeMembers(members: CongressMember[], source: string): MemberAnalysis {
    const analysis: MemberAnalysis = {
      total: members.length,
      house: 0,
      senate: 0,
      byState: {},
      byParty: {},
      issues: [],
      missing: [],
      source
    };
    
    // Count by chamber
    members.forEach(member => {
      if (member.chamber === 'House') {
        analysis.house++;
      } else if (member.chamber === 'Senate') {
        analysis.senate++;
      }
      
      // Count by state
      analysis.byState[member.state] = (analysis.byState[member.state] || 0) + 1;
      
      // Count by party
      analysis.byParty[member.party] = (analysis.byParty[member.party] || 0) + 1;
    });
    
    // Check for missing House members
    if (analysis.house < 435) {
      analysis.issues.push(`Missing ${435 - analysis.house} House members (${analysis.house}/435)`);
    } else if (analysis.house > 435) {
      analysis.issues.push(`Extra ${analysis.house - 435} House members (${analysis.house}/435)`);
    }
    
    // Check for missing Senate members
    if (analysis.senate < 100) {
      analysis.issues.push(`Missing ${100 - analysis.senate} Senate members (${analysis.senate}/100)`);
    } else if (analysis.senate > 100) {
      analysis.issues.push(`Extra ${analysis.senate - 100} Senate members (${analysis.senate}/100)`);
    }
    
    // Check Senate by state (should be 2 per state)
    const states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
    
    const senators = members.filter(m => m.chamber === 'Senate');
    const senateByState: Record<string, number> = {};
    
    senators.forEach(senator => {
      senateByState[senator.state] = (senateByState[senator.state] || 0) + 1;
    });
    
    states.forEach(state => {
      const count = senateByState[state] || 0;
      if (count !== 2) {
        analysis.issues.push(`${state}: ${count} senators (expected 2)`);
      }
    });
    
    // Check for total expected count
    if (analysis.total < 535) {
      analysis.issues.push(`Missing ${535 - analysis.total} total members (${analysis.total}/535)`);
    }
    
    return analysis;
  }
}

export const congressService = new CongressAPIService();