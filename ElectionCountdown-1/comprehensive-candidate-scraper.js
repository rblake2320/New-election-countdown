#!/usr/bin/env node

/**
 * Comprehensive Candidate Data Scraper
 * Uses Firecrawl API and other sources to gather candidate information
 * and store it in the database for use when VoteSmart data isn't available
 */

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { 
  elections, 
  candidates, 
  candidatePositions,
  candidateBiography
} from './shared/schema.js';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

// Database setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const OPENSTATES_API_KEY = process.env.OPENSTATES_API_KEY;

// Rate limiting helpers
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Firecrawl scraping function with retry logic
async function scrapeWithFirecrawl(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔍 Scraping ${url} (attempt ${i + 1}/${retries})...`);
      
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url,
          formats: ['markdown', 'html'],
          timeout: 30000,
          waitFor: 2000
        })
      });

      if (response.status === 408) {
        console.log('⏳ Timeout, retrying...');
        await sleep(5000);
        continue;
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      
      console.log(`❌ Failed to scrape: ${data.error}`);
      await sleep(3000);
    } catch (error) {
      console.error(`❌ Scraping error: ${error.message}`);
      await sleep(3000);
    }
  }
  return null;
}

// Use Perplexity to research candidate information
async function researchWithPerplexity(candidateName, office, state) {
  try {
    const prompt = `Provide detailed information about ${candidateName} running for ${office} in ${state}. Include:
    1. Brief biography (2-3 sentences)
    2. Current position and experience
    3. Key policy positions (list 3-5)
    4. Notable endorsements
    5. Campaign website if available
    Format as JSON with keys: biography, experience, policies (array), endorsements (array), website`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 500
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      try {
        // Extract JSON from the response
        const content = data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.log('Could not parse JSON from Perplexity response');
      }
    }
  } catch (error) {
    console.error(`Perplexity research error: ${error.message}`);
  }
  return null;
}

// Fetch state legislature data from OpenStates
async function fetchFromOpenStates(state) {
  if (!OPENSTATES_API_KEY) {
    return [];
  }

  try {
    console.log(`🏛️ Fetching ${state} legislature data from OpenStates...`);
    
    const response = await fetch(
      `https://v3.openstates.org/people?jurisdiction=${state}&page=1&per_page=50&apikey=${OPENSTATES_API_KEY}`,
      {
        headers: {
          'X-API-Key': OPENSTATES_API_KEY
        }
      }
    );

    if (!response.ok) {
      console.log(`OpenStates API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`OpenStates error: ${error.message}`);
    return [];
  }
}

// Scrape campaign websites for candidate information
async function scrapeCampaignWebsite(websiteUrl) {
  const scrapedData = await scrapeWithFirecrawl(websiteUrl);
  
  if (!scrapedData) return null;
  
  const result = {
    biography: '',
    positions: [],
    endorsements: [],
    contactInfo: {}
  };

  try {
    const markdown = scrapedData.markdown || '';
    
    // Extract biography (look for About section)
    const aboutMatch = markdown.match(/#{1,3}\s*About.*?\n([\s\S]*?)(?=\n#{1,3}|$)/i);
    if (aboutMatch) {
      result.biography = aboutMatch[1].trim().slice(0, 500);
    }

    // Extract policy positions
    const policyMatch = markdown.match(/#{1,3}\s*(?:Issues|Policies|Platform|Priorities).*?\n([\s\S]*?)(?=\n#{1,3}|$)/i);
    if (policyMatch) {
      const policies = policyMatch[1].match(/[-*]\s*(.+)/g) || [];
      result.positions = policies.map(p => p.replace(/[-*]\s*/, '').trim()).slice(0, 10);
    }

    // Extract endorsements
    const endorseMatch = markdown.match(/#{1,3}\s*Endorse.*?\n([\s\S]*?)(?=\n#{1,3}|$)/i);
    if (endorseMatch) {
      const endorsements = endorseMatch[1].match(/[-*]\s*(.+)/g) || [];
      result.endorsements = endorsements.map(e => e.replace(/[-*]\s*/, '').trim()).slice(0, 10);
    }

    // Extract contact information
    const emailMatch = markdown.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      result.contactInfo.email = emailMatch[1];
    }

    const phoneMatch = markdown.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
    if (phoneMatch) {
      result.contactInfo.phone = phoneMatch[1];
    }

  } catch (error) {
    console.error('Error parsing scraped data:', error);
  }

  return result;
}

// Main function to enrich candidate data
async function enrichCandidateData() {
  console.log('🚀 Starting Comprehensive Candidate Data Enrichment');
  console.log('================================================\n');

  try {
    // Get all candidates that need enrichment
    const candidatesNeedingData = await db
      .select()
      .from(candidates)
      .where(
        and(
          isNull(candidates.biography),
          isNull(candidates.website)
        )
      )
      .limit(50); // Process in batches

    console.log(`📊 Found ${candidatesNeedingData.length} candidates needing enrichment\n`);

    let enrichedCount = 0;
    let failedCount = 0;

    for (const candidate of candidatesNeedingData) {
      console.log(`\n🔎 Processing: ${candidate.name} (${candidate.party})`);
      
      // Get election details for context
      const [election] = await db
        .select()
        .from(elections)
        .where(eq(elections.id, candidate.electionId))
        .limit(1);

      if (!election) continue;

      // Step 1: Research with Perplexity
      const researchData = await researchWithPerplexity(
        candidate.name,
        election.office,
        election.state
      );

      await sleep(1000); // Rate limiting

      // Step 2: If we have a website, scrape it
      let scrapedData = null;
      if (researchData?.website) {
        scrapedData = await scrapeCampaignWebsite(researchData.website);
        await sleep(2000); // Rate limiting for Firecrawl
      }

      // Step 3: Combine data and update database
      const updates = {};
      
      if (researchData) {
        updates.biography = researchData.biography || scrapedData?.biography;
        updates.website = researchData.website;
        updates.experience = researchData.experience;
        
        // Store positions
        if (researchData.policies?.length > 0 || scrapedData?.positions?.length > 0) {
          const positions = [...(researchData.policies || []), ...(scrapedData?.positions || [])];
          for (const position of positions.slice(0, 5)) {
            await db.insert(candidatePositions).values({
              candidateId: candidate.id,
              issue: position.slice(0, 100),
              position: position,
              source: researchData.website || 'Perplexity Research'
            }).onConflictDoNothing();
          }
        }
      }

      // Update candidate record
      if (Object.keys(updates).length > 0) {
        await db
          .update(candidates)
          .set({
            ...updates,
            updatedAt: new Date()
          })
          .where(eq(candidates.id, candidate.id));

        enrichedCount++;
        console.log(`✅ Enriched: ${candidate.name}`);
      } else {
        failedCount++;
        console.log(`⚠️ No data found for: ${candidate.name}`);
      }

      // Rate limiting
      await sleep(2000);
    }

    // Fetch OpenStates data for key states
    const keyStates = ['California', 'Texas', 'Florida', 'New York', 'Pennsylvania'];
    
    for (const state of keyStates) {
      const legislators = await fetchFromOpenStates(state);
      console.log(`\n🏛️ Found ${legislators.length} legislators in ${state}`);
      
      // Store this data for future use
      for (const legislator of legislators) {
        // Check if this person is already a candidate
        const existingCandidate = await db
          .select()
          .from(candidates)
          .where(eq(candidates.name, legislator.name))
          .limit(1);

        if (existingCandidate.length === 0 && legislator.current_role) {
          // Find or create appropriate election
          const office = legislator.current_role.title;
          const district = legislator.current_role.district;
          
          console.log(`  Adding: ${legislator.name} - ${office} ${district}`);
          
          // Store biographical data for future reference
          await db.insert(candidateBiography).values({
            name: legislator.name,
            state: state,
            currentPosition: office,
            district: district,
            party: legislator.party,
            imageUrl: legislator.image,
            sources: JSON.stringify(['OpenStates']),
            lastUpdated: new Date()
          }).onConflictDoNothing();
        }
      }
      
      await sleep(3000);
    }

    console.log('\n\n📊 ENRICHMENT COMPLETE');
    console.log('=======================');
    console.log(`✅ Successfully enriched: ${enrichedCount} candidates`);
    console.log(`⚠️ Failed to enrich: ${failedCount} candidates`);
    console.log(`🏛️ Added state legislature data for ${keyStates.length} states`);

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await pool.end();
  }
}

// Run the enrichment
enrichCandidateData().catch(console.error);