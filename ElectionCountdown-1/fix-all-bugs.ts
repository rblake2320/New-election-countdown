import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function fixAllBugs() {
  console.log('🔧 Fixing all database issues...\n');
  
  try {
    console.log('1️⃣  Fixing local elections categorization...');
    const localFix = await sql`UPDATE elections SET level = 'local' WHERE title LIKE '%Mayor%' AND level != 'local'`;
    console.log(`   ✅ Fixed ${localFix.length} mayoral elections\n`);
    
    console.log('2️⃣  Fixing Louisiana election dates...');
    const laFix = await sql`UPDATE elections SET date = '2026-12-05'::timestamp WHERE state = 'Louisiana' AND date = '2026-11-03'::timestamp`;
    console.log(`   ✅ Fixed ${laFix.length} Louisiana elections\n`);
    
    console.log('3️⃣  Fixing Colorado election dates...');
    const coFix = await sql`UPDATE elections SET date = '2025-11-04'::timestamp WHERE state = 'Colorado' AND date = '2025-11-05'::timestamp`;
    console.log(`   ✅ Fixed ${coFix.length} Colorado elections\n`);
    
    console.log('✨ All fixes completed!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

fixAllBugs();
