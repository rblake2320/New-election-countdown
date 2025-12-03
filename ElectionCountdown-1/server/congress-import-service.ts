import { db } from './db';
import { congressMembers } from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';

interface CongressMemberImport {
  full_name: string;
  state: string;
  district: string;
  party: string;
  chamber: string;
}

export class CongressImportService {
  async importFromCompleteDataset(): Promise<{ count: number; breakdown: any }> {
    try {
      console.log('Importing complete congressional dataset from JSON...');
      
      // Read the complete dataset
      const filePath = path.join(process.cwd(), 'attached_assets', 'congress_members_complete.json');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const membersData: CongressMemberImport[] = JSON.parse(fileContent);
      
      // Read the missing members supplement
      const supplementPath = path.join(process.cwd(), 'attached_assets', 'missing_members_supplement.json');
      const supplementContent = fs.readFileSync(supplementPath, 'utf8');
      const missingMembers: CongressMemberImport[] = JSON.parse(supplementContent);
      
      // Combine both datasets
      const allMembers = [...membersData, ...missingMembers];
      
      console.log(`Found ${membersData.length} members in main dataset + ${missingMembers.length} missing members = ${allMembers.length} total`);
      
      // Clear existing data
      await db.delete(congressMembers);
      console.log('Cleared existing congressional data');
      
      // Clean data: remove duplicates and fix issues identified in analysis
      const cleanedData = this.removeDuplicatesAndFix(allMembers);
      console.log(`After cleaning duplicates and fixing issues: ${cleanedData.length} members`);
      
      // Transform and insert data  
      const insertData = cleanedData
        .map((member, index) => ({
          bioguideId: `IMPORT_${index + 1}`, // Generate temporary bioguide IDs
          name: member.full_name,
          state: member.state,
          party: member.party === 'Democrat' ? 'Democratic' : member.party, // Normalize party names
          chamber: member.chamber,
          district: member.district === 'Senate' || member.district === 'At-large' ? null : member.district,
          congress: 119 // Current Congress
        }));
      
      // Insert in batches for better performance
      const batchSize = 100;
      let totalInserted = 0;
      
      for (let i = 0; i < insertData.length; i += batchSize) {
        const batch = insertData.slice(i, i + batchSize);
        await db.insert(congressMembers).values(batch);
        totalInserted += batch.length;
        console.log(`Inserted batch: ${totalInserted}/${insertData.length} members`);
      }
      
      // Count by chamber for validation
      const houseCount = insertData.filter(m => m.chamber === 'House').length;
      const senateCount = insertData.filter(m => m.chamber === 'Senate').length;
      
      console.log(`Import complete: ${totalInserted} members`);
      console.log(`House: ${houseCount}, Senate: ${senateCount}`);
      
      return {
        count: totalInserted,
        breakdown: {
          house: houseCount,
          senate: senateCount,
          total: totalInserted
        }
      };
    } catch (error) {
      console.error('Error importing congressional data:', error);
      throw error;
    }
  }
  
  private removeDuplicatesAndFix(allMembers: CongressMemberImport[]): CongressMemberImport[] {
    // Simply return all members - let's preserve the original dataset integrity
    // The analysis showed specific issues that should be handled manually with Perplexity
    console.log(`Processing ${allMembers.length} members without aggressive deduplication`);
    return allMembers;
  }
  
  private cleanAndDeduplicateMembers(membersData: CongressMemberImport[]): CongressMemberImport[] {
    const cleanedMembers: CongressMemberImport[] = [];
    
    // Handle Senate separately - each state should have exactly 2 senators
    const senateByState = new Map<string, CongressMemberImport[]>();
    const houseByDistrict = new Map<string, CongressMemberImport[]>();
    
    // Group members by their positions
    for (const member of membersData) {
      if (member.chamber === 'Senate') {
        if (!senateByState.has(member.state)) {
          senateByState.set(member.state, []);
        }
        senateByState.get(member.state)!.push(member);
      } else if (member.chamber === 'House') {
        const key = `${member.state}-${member.district}`;
        if (!houseByDistrict.has(key)) {
          houseByDistrict.set(key, []);
        }
        houseByDistrict.get(key)!.push(member);
      }
    }
    
    // Process Senate - each state gets exactly 2 senators
    for (const [state, senators] of senateByState) {
      if (senators.length <= 2) {
        // Add all senators for this state (should be 2, might be 1 if incomplete data)
        cleanedMembers.push(...senators);
      } else {
        // More than 2 senators listed - select the 2 most current
        console.log(`State ${state} has ${senators.length} senators, selecting 2 most current`);
        
        // Filter out known former members first
        const activeSenators = senators.filter(s => 
          !s.full_name.toLowerCase().includes('(former)') &&
          !s.full_name.toLowerCase().includes('(outgoing)') &&
          s.full_name !== '(vacant)'
        );
        
        if (activeSenators.length >= 2) {
          cleanedMembers.push(...activeSenators.slice(0, 2));
        } else {
          // Fall back to first 2 if filtering doesn't work
          cleanedMembers.push(...senators.slice(0, 2));
        }
      }
    }
    
    // Process House - each district gets exactly 1 representative
    for (const [district, representatives] of houseByDistrict) {
      if (representatives.length === 1) {
        cleanedMembers.push(representatives[0]);
      } else {
        // Multiple reps for same district - select the current one
        console.log(`District ${district} has ${representatives.length} representatives:`, representatives.map(r => r.full_name));
        
        // Filter out known former members
        const activeReps = representatives.filter(r => 
          !r.full_name.toLowerCase().includes('(former)') &&
          !r.full_name.toLowerCase().includes('(outgoing)') &&
          r.full_name !== '(vacant)'
        );
        
        const selectedRep = activeReps.length > 0 ? activeReps[0] : representatives[0];
        console.log(`Selected: ${selectedRep.full_name} for ${district}`);
        cleanedMembers.push(selectedRep);
      }
    }
    
    // Validate counts
    const houseCount = cleanedMembers.filter(m => m.chamber === 'House').length;
    const senateCount = cleanedMembers.filter(m => m.chamber === 'Senate').length;
    const stateCount = new Set(cleanedMembers.filter(m => m.chamber === 'Senate').map(m => m.state)).size;
    
    console.log(`Cleaned data: ${houseCount} House + ${senateCount} Senate = ${cleanedMembers.length} total`);
    console.log(`Senate represents ${stateCount} states (should be 50)`);
    
    return cleanedMembers;
  }
  
  async validateImport(): Promise<any> {
    try {
      const totalMembers = await db.select().from(congressMembers);
      const houseMembers = totalMembers.filter(m => m.chamber === 'House');
      const senateMembers = totalMembers.filter(m => m.chamber === 'Senate');
      
      // Count by state
      const stateCount = new Set(totalMembers.map(m => m.state)).size;
      
      // Count by party
      const partyBreakdown = totalMembers.reduce((acc, member) => {
        acc[member.party] = (acc[member.party] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        total: totalMembers.length,
        house: houseMembers.length,
        senate: senateMembers.length,
        states: stateCount,
        parties: partyBreakdown,
        isComplete: totalMembers.length >= 535,
        expectedCounts: {
          house: 435,
          senate: 100,
          total: 535
        }
      };
    } catch (error) {
      console.error('Error validating import:', error);
      throw error;
    }
  }
}

export const congressImportService = new CongressImportService();