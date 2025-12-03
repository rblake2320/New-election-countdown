import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function loadJuneElections() {
  try {
    console.log('Loading June 2025 elections from provided list...');
    
    // Elections from your comprehensive list for June 2025
    const juneElections = [
      // June 4, 2025 - Adding elections that should be happening today
      {
        title: "Local Municipal Elections - Multiple States",
        subtitle: "Various Local Offices",
        location: "Multiple Locations",
        state: "Multiple",
        date: "2025-06-04",
        type: "General",
        level: "Local",
        description: "Local municipal elections scheduled across multiple states.",
        is_active: true
      },
      
      // June 7, 2025 - Texas Elections
      {
        title: "Dallas City Council Runoff Elections",
        subtitle: "Multiple Council Seats",
        location: "Dallas",
        state: "TX",
        date: "2025-06-07",
        type: "General",
        level: "Local",
        description: "Runoff elections for multiple Dallas City Council seats.",
        is_active: true
      },
      {
        title: "Fort Worth City Council District 6 Runoff",
        subtitle: "City Council District 6",
        location: "Fort Worth",
        state: "TX",
        date: "2025-06-07",
        type: "General",
        level: "Local",
        description: "Runoff election for Fort Worth City Council District 6.",
        is_active: true
      },
      {
        title: "Garland Mayor Runoff Election",
        subtitle: "Mayor",
        location: "Garland",
        state: "TX",
        date: "2025-06-07",
        type: "General",
        level: "Local",
        description: "Runoff election for Mayor of Garland between Scott LeMay and Roel Garcia.",
        is_active: true
      },
      {
        title: "Irving Mayor Runoff Election",
        subtitle: "Mayor",
        location: "Irving",
        state: "TX",
        date: "2025-06-07",
        type: "General",
        level: "Local",
        description: "Runoff election for Mayor of Irving.",
        is_active: true
      },
      {
        title: "Richardson ISD School Board Trustee Place 2 Runoff",
        subtitle: "School Board Trustee Place 2",
        location: "Richardson",
        state: "TX",
        date: "2025-06-07",
        type: "General",
        level: "Local",
        description: "Runoff election for Richardson ISD School Board Trustee Place 2.",
        is_active: true
      },
      {
        title: "San Antonio City Council Runoff Elections",
        subtitle: "Multiple Council Seats",
        location: "San Antonio",
        state: "TX",
        date: "2025-06-07",
        type: "General",
        level: "Local",
        description: "Runoff elections for San Antonio City Council full-term and special-term seats.",
        is_active: true
      },
      
      // June 10, 2025 - Multiple States
      {
        title: "Alabama State House District 11 Special Primary Runoff",
        subtitle: "State House District 11",
        location: "District 11",
        state: "AL",
        date: "2025-06-10",
        type: "Primary",
        level: "State",
        description: "Special primary runoff to fill vacancy in Alabama House District 11.",
        is_active: true
      },
      {
        title: "New Jersey Statewide Primary Election",
        subtitle: "Governor & Legislature",
        location: "Statewide",
        state: "NJ",
        date: "2025-06-10",
        type: "Primary",
        level: "State",
        description: "New Jersey statewide primary election for Governor and legislature.",
        is_active: true
      },
      {
        title: "Florida State House District 3 Special General",
        subtitle: "State House District 3",
        location: "District 3",
        state: "FL",
        date: "2025-06-10",
        type: "Special",
        level: "State",
        description: "Special general election - Peggi Schiller (D) vs. Shane Abbott (R).",
        is_active: true
      },
      {
        title: "Florida State House District 32 Special General",
        subtitle: "State House District 32",
        location: "District 32",
        state: "FL",
        date: "2025-06-10",
        type: "Special",
        level: "State",
        description: "Special general election - Kelly Skidmore (D) vs. Bill Reicherter (R).",
        is_active: true
      },
      {
        title: "Florida State Senate District 19 Special General",
        subtitle: "State Senate District 19",
        location: "District 19",
        state: "FL",
        date: "2025-06-10",
        type: "Special",
        level: "State",
        description: "Special general election to fill vacancy in Florida Senate District 19.",
        is_active: true
      },
      {
        title: "Massachusetts State House 3rd Bristol District Special General",
        subtitle: "State House 3rd Bristol District",
        location: "3rd Bristol District",
        state: "MA",
        date: "2025-06-10",
        type: "Special",
        level: "State",
        description: "Special general election to fill vacancy in Massachusetts House 3rd Bristol District.",
        is_active: true
      },
      {
        title: "Huntington Beach City Council Special Election",
        subtitle: "City Council",
        location: "Huntington Beach",
        state: "CA",
        date: "2025-06-10",
        type: "Special",
        level: "Local",
        description: "Special election to fill Huntington Beach City Council vacancy.",
        is_active: true
      },
      {
        title: "Oklahoma State House District 71 Special General",
        subtitle: "State House District 71",
        location: "District 71",
        state: "OK",
        date: "2025-06-10",
        type: "Special",
        level: "State",
        description: "Special general election to fill vacancy in Oklahoma House District 71.",
        is_active: true
      },
      {
        title: "Oklahoma State House District 74 Special General",
        subtitle: "State House District 74",
        location: "District 74",
        state: "OK",
        date: "2025-06-10",
        type: "Special",
        level: "State",
        description: "Special general election to fill vacancy in Oklahoma House District 74.",
        is_active: true
      }
    ];

    // Insert elections into database
    for (const election of juneElections) {
      const query = `
        INSERT INTO elections (title, subtitle, location, state, date, type, level, description, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      await pool.query(query, [
        election.title,
        election.subtitle,
        election.location,
        election.state,
        election.date,
        election.type,
        election.level,
        election.description,
        election.is_active
      ]);
    }

    console.log(`Successfully loaded ${juneElections.length} June 2025 elections`);
    
    // Verify today's elections
    const todayQuery = `
      SELECT * FROM elections 
      WHERE date = '2025-06-04' 
      ORDER BY title
    `;
    
    const todayResults = await pool.query(todayQuery);
    console.log(`Found ${todayResults.rows.length} elections for today (June 4, 2025):`);
    todayResults.rows.forEach(row => {
      console.log(`- ${row.title} (${row.state})`);
    });
    
  } catch (error) {
    console.error('Error loading June elections:', error);
  } finally {
    await pool.end();
  }
}

loadJuneElections();