import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { congressMembers } from './shared/schema.js';
import { like } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function cleanDuplicates() {
  console.log('🧹 Cleaning duplicate Congress members...\n');
  
  // Get current counts
  const allMembers = await db.select().from(congressMembers);
  const importMembers = allMembers.filter(m => m.bioguideId.startsWith('IMPORT_'));
  const realMembers = allMembers.filter(m => !m.bioguideId.startsWith('IMPORT_'));
  
  console.log(`Current status:`);
  console.log(`- Total members: ${allMembers.length}`);
  console.log(`- Real bioguide IDs: ${realMembers.length}`);
  console.log(`- Import placeholders: ${importMembers.length}\n`);
  
  if (importMembers.length > 0) {
    console.log('Removing placeholder members with IMPORT_ IDs...');
    
    // Delete all members with IMPORT_ bioguide IDs
    await db.delete(congressMembers)
      .where(like(congressMembers.bioguideId, 'IMPORT_%'));
    
    console.log(`✅ Removed ${importMembers.length} placeholder members`);
    
    // Verify final count
    const remaining = await db.select().from(congressMembers);
    console.log(`\n✅ Final count: ${remaining.length} authentic Congress members`);
    
    // Show sample of real members
    const sample = remaining.slice(0, 3);
    console.log('\nSample of authentic members:');
    sample.forEach(m => {
      console.log(`- ${m.name} (${m.party}) - ${m.state} ${m.chamber} - Bioguide: ${m.bioguideId}`);
    });
  } else {
    console.log('✅ No duplicate members found - database is clean!');
  }
  
  process.exit(0);
}

cleanDuplicates().catch(console.error);