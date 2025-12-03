const { neonConfig, Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function resetAndPopulateDatabase() {
  try {
    console.log('Clearing existing election data...');
    
    // Clear existing data
    await db.execute(`DELETE FROM candidates WHERE election_id IN (SELECT id FROM elections)`);
    await db.execute(`DELETE FROM elections`);
    
    console.log('Adding comprehensive 2025-2026 election data...');
    
    // Insert comprehensive election data
    const electionsQuery = `
      INSERT INTO elections (title, description, date, type, level, state, district, is_active) VALUES
      -- 2025 Off-Year Elections
      ('2025 Virginia Gubernatorial Election', 'Statewide election for Governor of Virginia. Key issues include education funding, healthcare access, and economic development.', '2025-11-04', 'General', 'State', 'VA', NULL, true),
      ('2025 New Jersey Gubernatorial Election', 'Statewide election for Governor of New Jersey. Focus on property taxes, infrastructure, and climate resilience.', '2025-11-04', 'General', 'State', 'NJ', NULL, true),
      ('2025 Virginia House of Delegates Elections', 'All 100 seats in the Virginia House of Delegates up for election.', '2025-11-04', 'General', 'State', 'VA', NULL, true),
      ('2025 New Jersey General Assembly Elections', 'All 80 seats in the New Jersey General Assembly up for election.', '2025-11-04', 'General', 'State', 'NJ', NULL, true),
      
      -- 2026 Federal Elections
      ('2026 U.S. Senate Election - Texas', 'U.S. Senate seat currently held by John Cornyn (R). Major issues include border security, energy policy, and healthcare.', '2026-11-03', 'General', 'Federal', 'TX', NULL, true),
      ('2026 U.S. Senate Election - Florida', 'U.S. Senate seat currently held by Marco Rubio (R). Key focus on immigration, climate adaptation, and economic growth.', '2026-11-03', 'General', 'Federal', 'FL', NULL, true),
      ('2026 U.S. Senate Election - Maine', 'U.S. Senate seat currently held by Susan Collins (R). Focus on healthcare, fishing industry, and rural broadband.', '2026-11-03', 'General', 'Federal', 'ME', NULL, true),
      ('2026 U.S. Senate Election - North Carolina', 'U.S. Senate seat currently held by Thom Tillis (R). Key issues include education, manufacturing, and infrastructure.', '2026-11-03', 'General', 'Federal', 'NC', NULL, true),
      
      -- 2026 Gubernatorial Elections
      ('2026 California Gubernatorial Election', 'Statewide election for Governor of California. Major issues include housing crisis, wildfire management, and tech regulation.', '2026-11-03', 'General', 'State', 'CA', NULL, true),
      ('2026 Texas Gubernatorial Election', 'Statewide election for Governor of Texas. Focus on energy independence, education funding, and border security.', '2026-11-03', 'General', 'State', 'TX', NULL, true),
      ('2026 Florida Gubernatorial Election', 'Statewide election for Governor of Florida. Key issues include hurricane preparedness, tourism recovery, and education policy.', '2026-11-03', 'General', 'State', 'FL', NULL, true),
      ('2026 New York Gubernatorial Election', 'Statewide election for Governor of New York. Focus on economic recovery, public safety, and infrastructure modernization.', '2026-11-03', 'General', 'State', 'NY', NULL, true),
      ('2026 Pennsylvania Gubernatorial Election', 'Statewide election for Governor of Pennsylvania. Key issues include job creation, healthcare access, and environmental protection.', '2026-11-03', 'General', 'State', 'PA', NULL, true),
      
      -- Key House Elections
      ('2026 U.S. House Election - California District 12', 'U.S. House election covering San Francisco area. Focus on tech policy and housing affordability.', '2026-11-03', 'General', 'Federal', 'CA', '12', true),
      ('2026 U.S. House Election - Texas District 7', 'Competitive House district in Houston suburbs. Key issues include healthcare, immigration, and economic development.', '2026-11-03', 'General', 'Federal', 'TX', '7', true),
      ('2026 U.S. House Election - Florida District 27', 'Swing district in Miami-Dade County. Focus on climate resilience, trade, and healthcare access.', '2026-11-03', 'General', 'Federal', 'FL', '27', true),
      ('2026 U.S. House Election - Virginia District 2', 'Competitive district including Virginia Beach. Key issues include military support and coastal resilience.', '2026-11-03', 'General', 'Federal', 'VA', '2', true),
      ('2026 U.S. House Election - Arizona District 1', 'Swing district covering rural and suburban Arizona. Focus on water rights, immigration, and tribal sovereignty.', '2026-11-03', 'General', 'Federal', 'AZ', '1', true),
      
      -- Special Elections
      ('South Carolina Special General Election', 'Special election for U.S. House District 1 following resignation. Key issues include coastal preservation and military support.', '2025-01-28', 'Special', 'Federal', 'SC', '1', true),
      
      -- Major Local Elections
      ('2025 Boston Mayoral Election', 'Citywide election for Mayor of Boston. Focus on housing affordability, transportation, and education equity.', '2025-11-04', 'General', 'Local', 'MA', 'Boston', true),
      ('2025 Seattle Mayoral Election', 'Citywide election for Mayor of Seattle. Key issues include homelessness, public safety, and climate action.', '2025-11-04', 'General', 'Local', 'WA', 'Seattle', true),
      ('2025 Denver Mayoral Election', 'Citywide election for Mayor of Denver. Focus on affordable housing, transportation, and economic development.', '2025-11-05', 'General', 'Local', 'CO', 'Denver', true),
      ('2025 Atlanta Mayoral Election', 'Citywide election for Mayor of Atlanta. Key issues include public safety, transit expansion, and affordable housing.', '2025-11-04', 'General', 'Local', 'GA', 'Atlanta', true)
    `;
    
    await db.execute(electionsQuery);
    
    console.log('Adding candidate data for key elections...');
    
    // Add candidate data for major elections
    const candidatesQuery = `
      INSERT INTO candidates (name, party, election_id, polling_support, is_incumbent, background) 
      SELECT 
        candidate_data.name,
        candidate_data.party,
        e.id,
        candidate_data.polling_support,
        candidate_data.is_incumbent,
        candidate_data.background
      FROM elections e
      JOIN (VALUES
        -- Virginia Governor 2025
        ('Glenn Youngkin', 'R', '2025 Virginia Gubernatorial Election', 48, true, 'Current Governor, former business executive'),
        ('Abigail Spanberger', 'D', '2025 Virginia Gubernatorial Election', 46, false, 'U.S. Representative, former CIA officer'),
        
        -- New Jersey Governor 2025
        ('Phil Murphy', 'D', '2025 New Jersey Gubernatorial Election', 51, true, 'Current Governor, former Goldman Sachs executive'),
        ('Jack Ciattarelli', 'R', '2025 New Jersey Gubernatorial Election', 44, false, 'Former Assemblyman, business owner'),
        
        -- Texas Senator 2026
        ('John Cornyn', 'R', '2026 U.S. Senate Election - Texas', 52, true, 'Current U.S. Senator since 2002'),
        ('Colin Allred', 'D', '2026 U.S. Senate Election - Texas', 43, false, 'U.S. Representative, former NFL player'),
        
        -- California Governor 2026
        ('Gavin Newsom', 'D', '2026 California Gubernatorial Election', 54, true, 'Current Governor, former San Francisco Mayor'),
        ('Brian Dahle', 'R', '2026 California Gubernatorial Election', 38, false, 'State Senator, farmer'),
        
        -- South Carolina Special Election
        ('Nancy Mace', 'R', 'South Carolina Special General Election', 55, true, 'Current U.S. Representative'),
        ('Annie Andrews', 'D', 'South Carolina Special General Election', 42, false, 'Pediatrician, community advocate')
      ) AS candidate_data(name, party, title, polling_support, is_incumbent, background)
      ON e.title = candidate_data.title
    `;
    
    await db.execute(candidatesQuery);
    
    console.log('Database successfully reset and populated with comprehensive election data');
    
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    await pool.end();
  }
}

resetAndPopulateDatabase();