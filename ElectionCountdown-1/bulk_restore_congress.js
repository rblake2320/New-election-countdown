import fs from 'fs';
import { db } from './server/db.js';
import { congressMembers } from './shared/schema.js';

async function bulkRestoreCongressMembers() {
  try {
    console.log('Starting bulk restore of congressional members...');
    
    // Read the complete congressional data
    const membersData = JSON.parse(fs.readFileSync('./attached_assets/congress_members_complete.json', 'utf8'));
    console.log(`Found ${membersData.length} members in dataset`);
    
    // Clear existing data first
    await db.delete(congressMembers);
    console.log('Cleared existing congressional data');
    
    // Process in batches of 25 to avoid database connection issues
    const batchSize = 25;
    let totalInserted = 0;
    
    for (let i = 0; i < membersData.length; i += batchSize) {
      const batch = membersData.slice(i, i + batchSize);
      
      const insertData = batch.map((member, index) => ({
        bioguideId: member.bioguide_id || `${member.full_name.replace(/\s+/g, '_').toUpperCase()}_${i}_${index}`,
        name: member.full_name,
        party: member.party,
        state: member.state,
        district: member.district === 'Senate' ? null : member.district,
        chamber: member.chamber,
        congress: 119,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      await db.insert(congressMembers).values(insertData).onConflictDoNothing();
      totalInserted += insertData.length;
      
      console.log(`Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(membersData.length/batchSize)} completed. Total: ${totalInserted}`);
    }
    
    // Final verification
    const finalCount = await db.select().from(congressMembers);
    console.log(`\nRestore complete! Total members in database: ${finalCount.length}`);
    
    return finalCount.length;
  } catch (error) {
    console.error('Error during bulk restore:', error);
    throw error;
  }
}

bulkRestoreCongressMembers()
  .then(count => {
    console.log(`Successfully restored ${count} congressional members`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Bulk restore failed:', error);
    process.exit(1);
  });