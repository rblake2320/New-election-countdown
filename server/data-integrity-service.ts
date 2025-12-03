// Data Integrity Service
// Ensures only real, verified election data is in the system

import { db } from './db';
import { elections, candidates } from '@shared/schema';
import { eq, and, or, ilike, sql, notIlike } from 'drizzle-orm';
import { validateElectionData, validateNotMockData } from './validators/state-election-rules';

export class DataIntegrityService {
  // Remove all mock/placeholder data from the database
  async removeMockData(): Promise<{ electionsRemoved: number; candidatesRemoved: number }> {
    const mockPatterns = ['%test%', '%demo%', '%example%', '%placeholder%', '%mock%', '%sample%', '%dummy%'];
    
    // Find and deactivate mock elections
    const mockElectionConditions = mockPatterns.map(pattern => 
      or(
        ilike(elections.title, pattern),
        ilike(elections.description, pattern)
      )
    );
    
    const [electionsResult] = await db
      .update(elections)
      .set({ isActive: false })
      .where(or(...mockElectionConditions))
      .returning({ id: elections.id });
    
    // Find and remove mock candidates
    const mockCandidateConditions = mockPatterns.map(pattern =>
      or(
        ilike(candidates.name, pattern),
        ilike(candidates.description, pattern)
      )
    );
    
    const candidatesDeleted = await db
      .delete(candidates)
      .where(or(...mockCandidateConditions))
      .returning({ id: candidates.id });
    
    return {
      electionsRemoved: electionsResult?.id ? 1 : 0,
      candidatesRemoved: candidatesDeleted.length
    };
  }
  
  // Validate and fix Louisiana elections
  async fixLouisianaElections(): Promise<{ fixed: number; deactivated: number }> {
    // Get all Louisiana elections
    const laElections = await db
      .select()
      .from(elections)
      .where(eq(elections.state, 'LA'));
    
    let fixed = 0;
    let deactivated = 0;
    
    for (const election of laElections) {
      const date = new Date(election.date);
      const dayOfWeek = date.getUTCDay();
      
      if (dayOfWeek !== 6) { // Not Saturday
        // Check if we can move it to the nearest Saturday
        const daysToSaturday = (6 - dayOfWeek + 7) % 7 || 7;
        const nearestSaturday = new Date(date);
        nearestSaturday.setDate(date.getDate() + daysToSaturday);
        
        // If the move is less than 3 days, fix it; otherwise deactivate
        if (daysToSaturday <= 3) {
          await db
            .update(elections)
            .set({ date: nearestSaturday })
            .where(eq(elections.id, election.id));
          fixed++;
        } else {
          await db
            .update(elections)
            .set({ isActive: false })
            .where(eq(elections.id, election.id));
          deactivated++;
        }
      }
    }
    
    return { fixed, deactivated };
  }
  
  // Validate all elections in the database
  async validateAllElections(): Promise<{
    total: number;
    valid: number;
    invalid: number;
    deactivated: number;
    errors: Array<{ electionId: number; title: string; errors: string[] }>;
  }> {
    const allElections = await db.select().from(elections);
    let valid = 0;
    let invalid = 0;
    let deactivated = 0;
    const errorList: Array<{ electionId: number; title: string; errors: string[] }> = [];
    
    for (const election of allElections) {
      const validationErrors = validateElectionData({
        state: election.state,
        date: election.date,
        level: election.level,
        type: election.type
      });
      
      const mockCheck = validateNotMockData(election);
      
      if (validationErrors.length > 0 || !mockCheck.ok) {
        invalid++;
        const errors: string[] = [];
        
        if (validationErrors.length > 0) {
          errors.push(...validationErrors.map(e => e.message || ''));
        }
        if (!mockCheck.ok) {
          errors.push(mockCheck.message || 'Mock data detected');
        }
        
        errorList.push({
          electionId: election.id,
          title: election.title,
          errors
        });
        
        // Deactivate invalid elections
        await db
          .update(elections)
          .set({ isActive: false })
          .where(eq(elections.id, election.id));
        deactivated++;
      } else {
        valid++;
      }
    }
    
    return {
      total: allElections.length,
      valid,
      invalid,
      deactivated,
      errors: errorList
    };
  }
  
  // Remove elections with unrealistic dates
  async removeUnrealisticElections(): Promise<number> {
    const now = new Date();
    const fourYearsFromNow = new Date();
    fourYearsFromNow.setFullYear(now.getFullYear() + 4);
    
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(now.getFullYear() - 2);
    
    // Deactivate elections more than 4 years in future or more than 2 years in past
    const result = await db
      .update(elections)
      .set({ isActive: false })
      .where(
        or(
          sql`${elections.date} > ${fourYearsFromNow}`,
          sql`${elections.date} < ${twoYearsAgo}`
        )
      )
      .returning({ id: elections.id });
    
    return result.length;
  }
  
  // Clean up duplicate elections
  async removeDuplicateElections(): Promise<number> {
    // Find duplicates based on title, state, and date
    const duplicates = await db.execute(sql`
      WITH duplicates AS (
        SELECT id, title, state, date,
               ROW_NUMBER() OVER (PARTITION BY title, state, date ORDER BY id) as rn
        FROM elections
      )
      UPDATE elections
      SET is_active = false
      WHERE id IN (
        SELECT id FROM duplicates WHERE rn > 1
      )
      RETURNING id
    `);
    
    return duplicates.rows.length;
  }
  
  // Comprehensive data cleanup
  async performFullCleanup(): Promise<{
    mockDataRemoved: { elections: number; candidates: number };
    louisianaFixed: { fixed: number; deactivated: number };
    unrealisticRemoved: number;
    duplicatesRemoved: number;
    validationResults: any;
  }> {
    console.log('Starting comprehensive data cleanup...');
    
    // 1. Remove mock data
    const mockData = await this.removeMockData();
    console.log(`Removed mock data: ${mockData.electionsRemoved} elections, ${mockData.candidatesRemoved} candidates`);
    
    // 2. Fix Louisiana elections
    const louisianaFixed = await this.fixLouisianaElections();
    console.log(`Louisiana elections: ${louisianaFixed.fixed} fixed, ${louisianaFixed.deactivated} deactivated`);
    
    // 3. Remove unrealistic elections
    const unrealisticRemoved = await this.removeUnrealisticElections();
    console.log(`Removed ${unrealisticRemoved} unrealistic elections`);
    
    // 4. Remove duplicates
    const duplicatesRemoved = await this.removeDuplicateElections();
    console.log(`Removed ${duplicatesRemoved} duplicate elections`);
    
    // 5. Validate all remaining elections
    const validationResults = await this.validateAllElections();
    console.log(`Validation: ${validationResults.valid} valid, ${validationResults.invalid} invalid`);
    
    return {
      mockDataRemoved: {
        elections: mockData.electionsRemoved,
        candidates: mockData.candidatesRemoved
      },
      louisianaFixed,
      unrealisticRemoved,
      duplicatesRemoved,
      validationResults
    };
  }
}

export const dataIntegrityService = new DataIntegrityService();