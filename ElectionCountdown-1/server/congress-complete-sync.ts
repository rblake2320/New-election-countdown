import { getCongressBillService } from './congress-bill-service';

interface StateCongressData {
  state: string;
  houseDelegation: number;
  senators: number;
}

// Complete list of US states and territories with their congressional delegations
const US_CONGRESSIONAL_DELEGATIONS: StateCongressData[] = [
  { state: 'AL', houseDelegation: 7, senators: 2 },
  { state: 'AK', houseDelegation: 1, senators: 2 },
  { state: 'AZ', houseDelegation: 9, senators: 2 },
  { state: 'AR', houseDelegation: 4, senators: 2 },
  { state: 'CA', houseDelegation: 52, senators: 2 },
  { state: 'CO', houseDelegation: 8, senators: 2 },
  { state: 'CT', houseDelegation: 5, senators: 2 },
  { state: 'DE', houseDelegation: 1, senators: 2 },
  { state: 'FL', houseDelegation: 28, senators: 2 },
  { state: 'GA', houseDelegation: 14, senators: 2 },
  { state: 'HI', houseDelegation: 2, senators: 2 },
  { state: 'ID', houseDelegation: 2, senators: 2 },
  { state: 'IL', houseDelegation: 17, senators: 2 },
  { state: 'IN', houseDelegation: 9, senators: 2 },
  { state: 'IA', houseDelegation: 4, senators: 2 },
  { state: 'KS', houseDelegation: 4, senators: 2 },
  { state: 'KY', houseDelegation: 6, senators: 2 },
  { state: 'LA', houseDelegation: 6, senators: 2 },
  { state: 'ME', houseDelegation: 2, senators: 2 },
  { state: 'MD', houseDelegation: 8, senators: 2 },
  { state: 'MA', houseDelegation: 9, senators: 2 },
  { state: 'MI', houseDelegation: 13, senators: 2 },
  { state: 'MN', houseDelegation: 8, senators: 2 },
  { state: 'MS', houseDelegation: 4, senators: 2 },
  { state: 'MO', houseDelegation: 8, senators: 2 },
  { state: 'MT', houseDelegation: 2, senators: 2 },
  { state: 'NE', houseDelegation: 3, senators: 2 },
  { state: 'NV', houseDelegation: 4, senators: 2 },
  { state: 'NH', houseDelegation: 2, senators: 2 },
  { state: 'NJ', houseDelegation: 12, senators: 2 },
  { state: 'NM', houseDelegation: 3, senators: 2 },
  { state: 'NY', houseDelegation: 26, senators: 2 },
  { state: 'NC', houseDelegation: 14, senators: 2 },
  { state: 'ND', houseDelegation: 1, senators: 2 },
  { state: 'OH', houseDelegation: 15, senators: 2 },
  { state: 'OK', houseDelegation: 5, senators: 2 },
  { state: 'OR', houseDelegation: 6, senators: 2 },
  { state: 'PA', houseDelegation: 17, senators: 2 },
  { state: 'RI', houseDelegation: 2, senators: 2 },
  { state: 'SC', houseDelegation: 7, senators: 2 },
  { state: 'SD', houseDelegation: 1, senators: 2 },
  { state: 'TN', houseDelegation: 9, senators: 2 },
  { state: 'TX', houseDelegation: 38, senators: 2 },
  { state: 'UT', houseDelegation: 4, senators: 2 },
  { state: 'VT', houseDelegation: 1, senators: 2 },
  { state: 'VA', houseDelegation: 11, senators: 2 },
  { state: 'WA', houseDelegation: 10, senators: 2 },
  { state: 'WV', houseDelegation: 2, senators: 2 },
  { state: 'WI', houseDelegation: 8, senators: 2 },
  { state: 'WY', houseDelegation: 1, senators: 2 },
  // Territories and non-voting delegates
  { state: 'DC', houseDelegation: 1, senators: 0 },
  { state: 'PR', houseDelegation: 1, senators: 0 },
  { state: 'VI', houseDelegation: 1, senators: 0 },
  { state: 'GU', houseDelegation: 1, senators: 0 },
  { state: 'AS', houseDelegation: 1, senators: 0 },
  { state: 'MP', houseDelegation: 1, senators: 0 }
];

export class CongressCompleteSyncService {
  private congressService = getCongressBillService();

  async fetchAllCurrentMembers() {
    if (!this.congressService) {
      console.error('Congress API service not available');
      return [];
    }

    console.log('Starting comprehensive Congress member sync by state...');
    const allMembers = [];
    let totalExpected = 0;

    // Calculate expected total
    for (const delegation of US_CONGRESSIONAL_DELEGATIONS) {
      totalExpected += delegation.houseDelegation + delegation.senators;
    }

    console.log(`Expected total: ${totalExpected} members (435 House + 100 Senate + 6 delegates)`);

    // Fetch members state by state to ensure completeness
    for (const delegation of US_CONGRESSIONAL_DELEGATIONS) {
      try {
        console.log(`Fetching members for ${delegation.state}...`);
        
        const stateMembers = await this.congressService.fetchMembersByState(delegation.state);
        
        if (stateMembers && stateMembers.length > 0) {
          allMembers.push(...stateMembers);
          console.log(`Found ${stateMembers.length} members for ${delegation.state} (expected: ${delegation.houseDelegation + delegation.senators})`);
        } else {
          console.log(`No members found for ${delegation.state} - using general API as fallback`);
        }

        // Rate limiting to avoid API throttling
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching members for ${delegation.state}:`, error);
      }
    }

    // Deduplicate by bioguideId
    const uniqueMembers = allMembers.filter((member, index, self) => 
      index === self.findIndex(m => m.bioguideId === member.bioguideId)
    );

    console.log(`Fetched ${uniqueMembers.length} unique members from state-by-state approach`);

    // If we're still missing members, try the general endpoint as a fallback
    if (uniqueMembers.length < 500) { // Should be closer to 541
      console.log('State-by-state approach incomplete, trying general endpoint as supplement...');
      
      try {
        const generalMembers = await this.congressService.fetchAllMembers();
        
        // Merge and deduplicate
        const combinedMembers = [...uniqueMembers, ...generalMembers];
        const finalMembers = combinedMembers.filter((member, index, self) => 
          index === self.findIndex(m => m.bioguideId === member.bioguideId)
        );

        console.log(`Combined approach yielded ${finalMembers.length} total members`);
        return finalMembers;
      } catch (error) {
        console.error('General endpoint fallback failed:', error);
        return uniqueMembers;
      }
    }

    return uniqueMembers;
  }

  // Verify we have the expected number of members per state
  validateMemberCounts(members: any[]) {
    const membersByState = members.reduce((acc, member) => {
      const state = member.state;
      if (!acc[state]) acc[state] = { house: 0, senate: 0 };
      
      if (member.chamber === 'House') acc[state].house++;
      else if (member.chamber === 'Senate') acc[state].senate++;
      
      return acc;
    }, {});

    console.log('Member count validation:');
    for (const delegation of US_CONGRESSIONAL_DELEGATIONS) {
      const actual = membersByState[delegation.state] || { house: 0, senate: 0 };
      const expectedHouse = delegation.houseDelegation;
      const expectedSenate = delegation.senators;
      
      if (actual.house !== expectedHouse || actual.senate !== expectedSenate) {
        console.log(`${delegation.state}: Expected ${expectedHouse}H+${expectedSenate}S, Got ${actual.house}H+${actual.senate}S`);
      }
    }

    const totalHouse = Object.values(membersByState).reduce((sum: number, state: any) => sum + state.house, 0);
    const totalSenate = Object.values(membersByState).reduce((sum: number, state: any) => sum + state.senate, 0);
    
    console.log(`Total validation: ${totalHouse} House + ${totalSenate} Senate = ${totalHouse + totalSenate} members`);
    
    return { totalHouse, totalSenate, total: totalHouse + totalSenate };
  }
}

export const congressCompleteSyncService = new CongressCompleteSyncService();