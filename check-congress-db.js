import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { congressMembers } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function check() {
  const members = await db.select().from(congressMembers).limit(5);
  console.log('Sample members:', JSON.stringify(members, null, 2));
  
  const allMembers = await db.select().from(congressMembers);
  console.log('Total count:', allMembers.length);
  
  // Check for real bioguide IDs vs IMPORT_ IDs
  const realBioguides = allMembers.filter(m => !m.bioguideId.startsWith('IMPORT_'));
  const importBioguides = allMembers.filter(m => m.bioguideId.startsWith('IMPORT_'));
  
  console.log('Real bioguide IDs:', realBioguides.length);
  console.log('Import placeholder IDs:', importBioguides.length);
  
  if (realBioguides.length > 0) {
    console.log('Sample real member:', realBioguides[0]);
  }
  
  process.exit(0);
}

check().catch(console.error);