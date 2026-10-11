import fs from 'fs';
import { Pool } from '@neondatabase/serverless';

async function restoreCongressMembers() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Read the complete congressional data
    const membersData = JSON.parse(fs.readFileSync('./attached_assets/congress_members_complete.json', 'utf8'));
    console.log(`Found ${membersData.length} members to restore`);
    
    // Clear existing data
    await pool.query('DELETE FROM congress_members');
    console.log('Cleared existing congressional data');
    
    // Prepare insert statements
    const insertPromises = membersData.map(member => {
      const bioguideId = member.bioguide_id || member.full_name || 'Unknown';
      const name = member.full_name || member.name;
      const party = member.party;
      const state = member.state;
      const district = member.district === 'Senate' ? null : member.district;
      const chamber = member.chamber;
      
      return pool.query(`
        INSERT INTO congress_members (bioguide_id, name, party, state, district, chamber, congress, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (bioguide_id) DO NOTHING
      `, [bioguideId, name, party, state, district, chamber, 119]);
    });
    
    // Execute all inserts
    await Promise.all(insertPromises);
    
    // Check final count
    const result = await pool.query('SELECT COUNT(*) as count FROM congress_members');
    console.log(`Successfully restored ${result.rows[0].count} congressional members`);
    
  } catch (error) {
    console.error('Error restoring congressional members:', error);
  } finally {
    await pool.end();
  }
}

restoreCongressMembers();