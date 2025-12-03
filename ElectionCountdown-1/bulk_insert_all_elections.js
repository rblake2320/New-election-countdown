import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

// Configure neon for serverless
const neonConfig = require('@neondatabase/serverless').neonConfig;
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function insertAllElections() {
  try {
    console.log('Starting comprehensive election data insertion...');
    
    // Define all U.S. House districts by state
    const states = {
      'CA': 52, 'TX': 38, 'FL': 28, 'NY': 26, 'PA': 17, 'IL': 17, 'OH': 15, 'GA': 14, 'NC': 14, 'MI': 13,
      'NJ': 12, 'VA': 11, 'WA': 10, 'AZ': 9, 'IN': 9, 'MA': 9, 'TN': 9, 'MD': 8, 'MN': 8, 'MO': 8,
      'WI': 8, 'CO': 8, 'AL': 7, 'SC': 7, 'LA': 6, 'KY': 6, 'OR': 6, 'OK': 5, 'CT': 5, 'IA': 4,
      'AR': 4, 'KS': 4, 'MS': 4, 'NV': 4, 'UT': 4, 'NM': 3, 'WV': 2, 'ID': 2, 'HI': 2, 'ME': 2,
      'NH': 2, 'RI': 2, 'NE': 3, 'MT': 2, 'ND': 1, 'SD': 1, 'DE': 1, 'VT': 1, 'WY': 1, 'AK': 1
    };

    // Generate all 435 House districts
    const houseElections = [];
    Object.entries(states).forEach(([state, count]) => {
      for (let i = 1; i <= count; i++) {
        const district = count === 1 ? 'At-Large' : `District ${i}`;
        houseElections.push({
          title: `2026 U.S. House Election - ${state} ${district}`,
          subtitle: `U.S. House ${district}`,
          location: district,
          state: state,
          date: '2026-11-03',
          type: 'General',
          level: 'Federal',
          description: `${state} ${district} House seat election focusing on local and national priorities.`,
          is_active: true
        });
      }
    });

    console.log(`Generated ${houseElections.length} House elections`);

    // Add major state legislative elections for 2026
    const stateElections = [
      // State Senate Elections (many states elect senators in 2026)
      { title: '2026 California State Senate Elections', subtitle: 'Half of State Senate', location: 'Statewide', state: 'CA', date: '2026-11-03', type: 'General', level: 'State', description: 'California State Senate elections for half the seats.', is_active: true },
      { title: '2026 Texas State Senate Elections', subtitle: 'Half of State Senate', location: 'Statewide', state: 'TX', date: '2026-11-03', type: 'General', level: 'State', description: 'Texas State Senate elections for half the seats.', is_active: true },
      { title: '2026 Florida State Senate Elections', subtitle: 'Half of State Senate', location: 'Statewide', state: 'FL', date: '2026-11-03', type: 'General', level: 'State', description: 'Florida State Senate elections for half the seats.', is_active: true },
      { title: '2026 New York State Senate Elections', subtitle: 'All 63 Seats', location: 'Statewide', state: 'NY', date: '2026-11-03', type: 'General', level: 'State', description: 'New York State Senate elections for all seats.', is_active: true },
      { title: '2026 Pennsylvania State Senate Elections', subtitle: 'Half of State Senate', location: 'Statewide', state: 'PA', date: '2026-11-03', type: 'General', level: 'State', description: 'Pennsylvania State Senate elections for half the seats.', is_active: true },

      // State House Elections (most states elect their entire lower chamber every 2 years)
      { title: '2026 California Assembly Elections', subtitle: 'All 80 Seats', location: 'Statewide', state: 'CA', date: '2026-11-03', type: 'General', level: 'State', description: 'California State Assembly elections for all seats.', is_active: true },
      { title: '2026 Texas House Elections', subtitle: 'All 150 Seats', location: 'Statewide', state: 'TX', date: '2026-11-03', type: 'General', level: 'State', description: 'Texas House of Representatives elections for all seats.', is_active: true },
      { title: '2026 Florida House Elections', subtitle: 'All 120 Seats', location: 'Statewide', state: 'FL', date: '2026-11-03', type: 'General', level: 'State', description: 'Florida House of Representatives elections for all seats.', is_active: true },
      { title: '2026 New York Assembly Elections', subtitle: 'All 150 Seats', location: 'Statewide', state: 'NY', date: '2026-11-03', type: 'General', level: 'State', description: 'New York State Assembly elections for all seats.', is_active: true },
      { title: '2026 Pennsylvania House Elections', subtitle: 'All 203 Seats', location: 'Statewide', state: 'PA', date: '2026-11-03', type: 'General', level: 'State', description: 'Pennsylvania House of Representatives elections for all seats.', is_active: true },
      { title: '2026 Illinois House Elections', subtitle: 'All 118 Seats', location: 'Statewide', state: 'IL', date: '2026-11-03', type: 'General', level: 'State', description: 'Illinois House of Representatives elections for all seats.', is_active: true },
      { title: '2026 Ohio House Elections', subtitle: 'All 99 Seats', location: 'Statewide', state: 'OH', date: '2026-11-03', type: 'General', level: 'State', description: 'Ohio House of Representatives elections for all seats.', is_active: true },
      { title: '2026 Georgia House Elections', subtitle: 'All 180 Seats', location: 'Statewide', state: 'GA', date: '2026-11-03', type: 'General', level: 'State', description: 'Georgia House of Representatives elections for all seats.', is_active: true },
      { title: '2026 North Carolina House Elections', subtitle: 'All 120 Seats', location: 'Statewide', state: 'NC', date: '2026-11-03', type: 'General', level: 'State', description: 'North Carolina House of Representatives elections for all seats.', is_active: true },
      { title: '2026 Michigan House Elections', subtitle: 'All 110 Seats', location: 'Statewide', state: 'MI', date: '2026-11-03', type: 'General', level: 'State', description: 'Michigan House of Representatives elections for all seats.', is_active: true }
    ];

    // Add major local elections
    const localElections = [
      // Major mayoral elections in 2026
      { title: '2026 Chicago Mayoral Election', subtitle: 'Mayor', location: 'Chicago', state: 'IL', date: '2026-02-24', type: 'General', level: 'Local', description: 'Chicago mayoral election addressing urban policy and public safety.', is_active: true },
      { title: '2026 Philadelphia Mayoral Election', subtitle: 'Mayor', location: 'Philadelphia', state: 'PA', date: '2026-05-19', type: 'Primary', level: 'Local', description: 'Philadelphia mayoral primary election.', is_active: true },
      { title: '2026 Phoenix Mayoral Election', subtitle: 'Mayor', location: 'Phoenix', state: 'AZ', date: '2026-08-25', type: 'Primary', level: 'Local', description: 'Phoenix mayoral election addressing growth and water management.', is_active: true },
      { title: '2026 San Antonio Mayoral Election', subtitle: 'Mayor', location: 'San Antonio', state: 'TX', date: '2026-05-02', type: 'General', level: 'Local', description: 'San Antonio mayoral election focusing on economic development.', is_active: true },
      { title: '2026 San Diego Mayoral Election', subtitle: 'Mayor', location: 'San Diego', state: 'CA', date: '2026-06-02', type: 'Primary', level: 'Local', description: 'San Diego mayoral election addressing housing and climate issues.', is_active: true },
      { title: '2026 Dallas Mayoral Election', subtitle: 'Mayor', location: 'Dallas', state: 'TX', date: '2026-05-02', type: 'General', level: 'Local', description: 'Dallas mayoral election focusing on transportation and economic growth.', is_active: true },
      { title: '2026 San Jose Mayoral Election', subtitle: 'Mayor', location: 'San Jose', state: 'CA', date: '2026-06-02', type: 'Primary', level: 'Local', description: 'San Jose mayoral election addressing tech industry and housing.', is_active: true },
      { title: '2026 Jacksonville Mayoral Election', subtitle: 'Mayor', location: 'Jacksonville', state: 'FL', date: '2026-03-24', type: 'General', level: 'Local', description: 'Jacksonville mayoral election focusing on port development and infrastructure.', is_active: true },
      { title: '2026 Indianapolis Mayoral Election', subtitle: 'Mayor', location: 'Indianapolis', state: 'IN', date: '2026-11-03', type: 'General', level: 'Local', description: 'Indianapolis mayoral election addressing urban development and public safety.', is_active: true },
      { title: '2026 Charlotte Mayoral Election', subtitle: 'Mayor', location: 'Charlotte', state: 'NC', date: '2026-11-03', type: 'General', level: 'Local', description: 'Charlotte mayoral election focusing on banking sector and growth management.', is_active: true }
    ];

    // Combine all elections
    const allElections = [...houseElections, ...stateElections, ...localElections];
    
    console.log(`Total elections to insert: ${allElections.length}`);

    // Insert in batches to avoid memory issues
    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < allElections.length; i += batchSize) {
      const batch = allElections.slice(i, i + batchSize);
      
      const values = batch.map(election => 
        `('${election.title.replace(/'/g, "''")}', '${election.subtitle.replace(/'/g, "''")}', '${election.location.replace(/'/g, "''")}', '${election.state}', '${election.date}', '${election.type}', '${election.level}', '${election.description.replace(/'/g, "''")}', ${election.is_active})`
      ).join(',\n');

      const query = `
        INSERT INTO elections (title, subtitle, location, state, date, type, level, description, is_active) 
        VALUES ${values}
      `;

      await pool.query(query);
      inserted += batch.length;
      console.log(`Inserted batch: ${inserted}/${allElections.length} elections`);
    }

    // Verify final count
    const result = await pool.query('SELECT COUNT(*) as total FROM elections');
    console.log(`Total elections in database: ${result.rows[0].total}`);

    console.log('✅ Comprehensive election data insertion completed successfully!');
    
  } catch (error) {
    console.error('Error inserting election data:', error);
  } finally {
    await pool.end();
  }
}

insertAllElections();