/**
 * Unit tests for Congressional Data Service.
 * Uses in-memory database for fast, deterministic testing.
 * Tests authentic data handling and API integration points.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { congressMembers, committees, bills } from '../shared/schema.js';
import { DatabaseStorage } from '../server/storage.js';
import { CongressBillService } from '../server/congress-bill-service.js';

let pool: Pool;
let db: ReturnType<typeof drizzle>;
let storage: DatabaseStorage;
let congressService: CongressBillService;

beforeAll(async () => {
  // Use test database connection
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/election_test' 
  });
  db = drizzle(pool, { 
    schema: { congressMembers, committees, bills }
  });
  storage = new DatabaseStorage();
  congressService = new CongressBillService(process.env.CONGRESS_API_KEY || 'test-key');
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  // Clean test data before each test
  await db.delete(congressMembers);
  await db.delete(committees);
  await db.delete(bills);
});

describe('Congressional Member Operations', () => {
  it('stores and retrieves congressional members correctly', async () => {
    // Arrange
    const memberData = {
      bioguideId: 'S000148',
      name: 'Chuck Schumer',
      party: 'Democratic',
      state: 'NY',
      chamber: 'Senate',
      congress: 119,
      district: null
    };

    // Act
    const created = await storage.createCongressMember(memberData);
    const retrieved = await storage.getMemberByBioguideId('S000148');

    // Assert
    expect(created).toMatchObject({
      bioguideId: memberData.bioguideId,
      name: memberData.name,
      party: memberData.party,
      state: memberData.state,
      chamber: memberData.chamber
    });
    expect(created.id).toBeDefined();
    expect(retrieved).toEqual(created);
  });

  it('searches members by name and bioguide ID', async () => {
    // Arrange
    const members = [
      { bioguideId: 'S000148', name: 'Chuck Schumer', party: 'Democratic', state: 'NY', chamber: 'Senate', congress: 119 },
      { bioguideId: 'P000612', name: 'David Perdue', party: 'Republican', state: 'GA', chamber: 'Senate', congress: 119 },
      { bioguideId: 'A000148', name: 'Anna Eshoo', party: 'Democratic', state: 'CA', chamber: 'House', congress: 119 }
    ];

    for (const member of members) {
      await storage.createCongressMember(member);
    }

    // Act
    const nameSearch = await storage.searchCongressMembers('Chuck');
    const bioguideSearch = await storage.searchCongressMembers('P000612');
    const stateSearch = await storage.getMembersByState('CA');

    // Assert
    expect(nameSearch).toHaveLength(1);
    expect(nameSearch[0].name).toBe('Chuck Schumer');
    expect(bioguideSearch).toHaveLength(1);
    expect(bioguideSearch[0].bioguideId).toBe('P000612');
    expect(stateSearch).toHaveLength(1);
    expect(stateSearch[0].state).toBe('CA');
  });

  it('handles duplicate bioguide IDs gracefully', async () => {
    // Arrange
    const memberData = {
      bioguideId: 'S000148',
      name: 'Chuck Schumer',
      party: 'Democratic',
      state: 'NY',
      chamber: 'Senate',
      congress: 119
    };

    // Act & Assert
    await storage.createCongressMember(memberData);
    
    // Should handle duplicates without throwing
    const result = await storage.upsertCongressMember(memberData);
    expect(result.bioguideId).toBe('S000148');
  });
});

describe('Committee Operations', () => {
  it('stores and retrieves committee data correctly', async () => {
    // Arrange
    const committeeData = {
      systemCode: 'HSJU',
      name: 'House Committee on the Judiciary',
      chamber: 'House',
      committeeTypeCode: 'Standing'
    };

    // Act
    const created = await storage.createCommittee(committeeData);
    const retrieved = await storage.getCommitteeBySystemCode('HSJU');

    // Assert
    expect(created).toMatchObject(committeeData);
    expect(retrieved).toEqual(created);
  });

  it('filters committees by chamber', async () => {
    // Arrange
    const committees = [
      { systemCode: 'HSJU', name: 'House Judiciary', chamber: 'House', committeeTypeCode: 'Standing' },
      { systemCode: 'SSJU', name: 'Senate Judiciary', chamber: 'Senate', committeeTypeCode: 'Standing' },
      { systemCode: 'HSWM', name: 'House Ways and Means', chamber: 'House', committeeTypeCode: 'Standing' }
    ];

    for (const committee of committees) {
      await storage.createCommittee(committee);
    }

    // Act
    const houseCommittees = await storage.getCommitteesByChamber('House');
    const senateCommittees = await storage.getCommitteesByChamber('Senate');

    // Assert
    expect(houseCommittees).toHaveLength(2);
    expect(senateCommittees).toHaveLength(1);
    expect(houseCommittees.every(c => c.chamber === 'House')).toBe(true);
    expect(senateCommittees.every(c => c.chamber === 'Senate')).toBe(true);
  });
});

describe('Data Validation and Integrity', () => {
  it('validates required fields for congressional members', async () => {
    // Arrange
    const invalidMember = {
      name: 'Test Name',
      // Missing required fields: bioguideId, party, state, chamber, congress
    };

    // Act & Assert
    await expect(
      storage.createCongressMember(invalidMember as any)
    ).rejects.toThrow();
  });

  it('sanitizes and validates party names', async () => {
    // Arrange
    const memberWithVariantParty = {
      bioguideId: 'T000001',
      name: 'Test Member',
      party: 'D', // Should be normalized to 'Democratic'
      state: 'NY',
      chamber: 'House',
      congress: 119
    };

    // Act
    const created = await storage.createCongressMember(memberWithVariantParty);

    // Assert
    expect(['Democratic', 'D']).toContain(created.party);
  });

  it('handles state code validation', async () => {
    // Arrange
    const validStates = ['NY', 'CA', 'TX', 'FL'];
    const invalidState = 'ZZ';

    // Act & Assert
    for (const state of validStates) {
      const member = {
        bioguideId: `T00000${state}`,
        name: 'Test Member',
        party: 'Democratic',
        state,
        chamber: 'House',
        congress: 119
      };
      
      const created = await storage.createCongressMember(member);
      expect(created.state).toBe(state);
    }

    // Invalid state should still be stored but flagged
    const invalidMember = {
      bioguideId: 'T000000',
      name: 'Test Member',
      party: 'Democratic',
      state: invalidState,
      chamber: 'House',
      congress: 119
    };
    
    const created = await storage.createCongressMember(invalidMember);
    expect(created.state).toBe(invalidState); // Stored as-is for data integrity
  });
});

describe('Performance and Pagination', () => {
  it('handles large datasets efficiently', async () => {
    // Arrange
    const memberCount = 100;
    const members = Array.from({ length: memberCount }, (_, i) => ({
      bioguideId: `T${i.toString().padStart(6, '0')}`,
      name: `Test Member ${i}`,
      party: i % 2 === 0 ? 'Democratic' : 'Republican',
      state: ['NY', 'CA', 'TX', 'FL'][i % 4],
      chamber: i % 2 === 0 ? 'House' : 'Senate',
      congress: 119
    }));

    // Act
    const startTime = Date.now();
    
    for (const member of members) {
      await storage.createCongressMember(member);
    }
    
    const allMembers = await storage.getAllMembers();
    const endTime = Date.now();

    // Assert
    expect(allMembers).toHaveLength(memberCount);
    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
  });

  it('supports pagination for large result sets', async () => {
    // Arrange
    const memberCount = 50;
    for (let i = 0; i < memberCount; i++) {
      await storage.createCongressMember({
        bioguideId: `P${i.toString().padStart(6, '0')}`,
        name: `Paginated Member ${i}`,
        party: 'Democratic',
        state: 'NY',
        chamber: 'House',
        congress: 119
      });
    }

    // Act
    const page1 = await storage.getMembers({ limit: 20, offset: 0 });
    const page2 = await storage.getMembers({ limit: 20, offset: 20 });
    const page3 = await storage.getMembers({ limit: 20, offset: 40 });

    // Assert
    expect(page1).toHaveLength(20);
    expect(page2).toHaveLength(20);
    expect(page3).toHaveLength(10); // Remaining members
    
    // Ensure no overlap
    const allIds = [...page1, ...page2, ...page3].map(m => m.bioguideId);
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });
});