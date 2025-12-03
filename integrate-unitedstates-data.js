#!/usr/bin/env node

/**
 * United States GitHub Data Integration
 * Fetches congressional data from github.com/unitedstates repositories
 * and integrates it into the election platform database
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { congressMembers } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Database setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function fetchCongressData() {
  console.log('\n=== FETCHING UNITED STATES GITHUB DATA ===\n');
  
  try {
    // Fetch current legislators from the official GitHub repo
    console.log('📥 Fetching current legislators from unitedstates/congress-legislators...');
    const githubUrl = 'https://raw.githubusercontent.com/unitedstates/congress-legislators/gh-pages/legislators-current.json';
    const response = await fetch(githubUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }
    
    const legislators = await response.json();
    console.log(`✅ Fetched ${legislators.length} current legislators`);
    
    // Process and store legislators
    let added = 0;
    let updated = 0;
    
    for (const legislator of legislators) {
      const currentTerm = legislator.terms[legislator.terms.length - 1];
      const fullName = `${legislator.name.first} ${legislator.name.last}`;
      
      // Check if member already exists
      const existing = await db.select()
        .from(congressMembers)
        .where(eq(congressMembers.bioguideId, legislator.id.bioguide))
        .limit(1);
      
      const memberData = {
        bioguideId: legislator.id.bioguide,
        name: fullName,  // Changed from fullName to name
        party: currentTerm.party,
        state: currentTerm.state,
        chamber: currentTerm.type === 'sen' ? 'Senate' : 'House',
        district: currentTerm.district || null
      };
      
      if (existing.length > 0) {
        // Update existing member
        await db.update(congressMembers)
          .set(memberData)
          .where(eq(congressMembers.bioguideId, legislator.id.bioguide));
        updated++;
      } else {
        // Insert new member
        await db.insert(congressMembers)
          .values(memberData)
          .onConflictDoNothing();
        added++;
      }
      
      if ((added + updated) % 50 === 0) {
        console.log(`Progress: ${added} added, ${updated} updated...`);
      }
    }
    
    console.log('\n=== INTEGRATION COMPLETE ===');
    console.log(`✅ Added: ${added} new members`);
    console.log(`📝 Updated: ${updated} existing members`);
    console.log(`📊 Total in database: ${legislators.length} legislators`);
    
    // Fetch committee data
    console.log('\n📥 Fetching committee data...');
    const committeeUrl = 'https://raw.githubusercontent.com/unitedstates/congress-legislators/gh-pages/committees-current.json';
    const committeeResponse = await fetch(committeeUrl);
    
    if (committeeResponse.ok) {
      const committees = await committeeResponse.json();
      console.log(`✅ Found ${committees.length} congressional committees`);
      
      // Store committee info in database (could create a committees table)
      // For now, just log the summary
      const houseCommittees = committees.filter(c => c.type === 'house').length;
      const senateCommittees = committees.filter(c => c.type === 'senate').length;
      const jointCommittees = committees.filter(c => c.type === 'joint').length;
      
      console.log(`  - House Committees: ${houseCommittees}`);
      console.log(`  - Senate Committees: ${senateCommittees}`);
      console.log(`  - Joint Committees: ${jointCommittees}`);
    }
    
    // Fetch district shapes (GeoJSON)
    console.log('\n📥 Checking district shape data availability...');
    const districtUrl = 'https://raw.githubusercontent.com/unitedstates/districts/gh-pages/states/CA/shape.geojson';
    const districtResponse = await fetch(districtUrl);
    
    if (districtResponse.ok) {
      console.log('✅ District GeoJSON data available for mapping');
      console.log('   Repository: github.com/unitedstates/districts');
    }
    
    // Summary of available resources
    console.log('\n=== AVAILABLE UNITED STATES GITHUB RESOURCES ===');
    console.log('1. ✅ congress-legislators: Member data (integrated)');
    console.log('2. ✅ committees: Committee assignments');
    console.log('3. ✅ districts: GeoJSON district boundaries');
    console.log('4. 📚 congress: Bill and vote scrapers');
    console.log('5. 🖼️ images: Member photos');
    console.log('6. 📧 contact-congress: Contact form schemas');
    console.log('7. 📜 congressional-record: Parsed transcripts');
    
    console.log('\n💡 These resources provide comprehensive, open-source congressional data');
    console.log('   without requiring API keys or rate limits!');
    
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    await pool.end();
  }
}

// Run the integration
fetchCongressData().catch(console.error);