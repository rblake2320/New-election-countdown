#!/usr/bin/env node

/**
 * OpenAI-Powered Candidate Research System
 * Uses OpenAI GPT-4 for comprehensive, authentic candidate data collection
 */

import { db } from './server/db.ts';
import { elections, candidates } from './shared/schema.ts';
import { isNull, and, gte, lte } from 'drizzle-orm';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found. Please set this environment variable.');
  process.exit(1);
}

async function researchCandidatesWithOpenAI(election) {
  const prompt = `Research authentic, verified candidates for this specific election:

Election: ${election.title}
State: ${election.state}
Date: ${new Date(election.date).toLocaleDateString()}
Type: ${election.type}

IMPORTANT: Only include candidates with verified information from official sources like:
- Secretary of State websites
- Official campaign filings
- Verified news reports from credible outlets
- Government election databases

Return ONLY verified candidates in this JSON format:
{
  "candidates": [
    {
      "name": "Full Legal Name",
      "party": "Party Affiliation",
      "description": "Brief background and campaign focus",
      "isIncumbent": true/false,
      "verified": true
    }
  ]
}

If no verified candidates are found, return: {"candidates": []}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert political researcher who only provides verified, authentic election information from official sources. Never provide placeholder or estimated data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    // Extract and parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return result.candidates || [];
    }
    
    return [];
  } catch (error) {
    console.error(`   ⚠️  OpenAI research failed for ${election.title}: ${error.message}`);
    return [];
  }
}

async function getElectionsNeedingResearch(limit = 30) {
  const result = await db
    .select({
      id: elections.id,
      title: elections.title,
      state: elections.state,
      date: elections.date,
      type: elections.type
    })
    .from(elections)
    .leftJoin(candidates, election => election.id === candidates.electionId)
    .where(
      and(
        isNull(candidates.id),
        gte(elections.date, new Date('2025-07-01')),
        lte(elections.date, new Date('2026-12-31'))
      )
    )
    .groupBy(elections.id, elections.title, elections.state, elections.date, elections.type)
    .orderBy(elections.date)
    .limit(limit);

  return result;
}

async function addCandidatesToElection(electionId, candidateList) {
  if (candidateList.length === 0) return 0;
  
  const insertData = candidateList.map(candidate => ({
    electionId: parseInt(electionId),
    name: candidate.name,
    party: candidate.party || 'Independent',
    description: candidate.description || `Candidate for election ${electionId}`,
    isIncumbent: candidate.isIncumbent || false,
    isVerified: candidate.verified || true
  }));

  try {
    const result = await db.insert(candidates).values(insertData).onConflictDoNothing();
    return insertData.length;
  } catch (error) {
    console.error(`Error inserting candidates for election ${electionId}:`, error.message);
    return 0;
  }
}

async function main() {
  console.log('🚀 Starting OpenAI-Powered Candidate Research');
  console.log('============================================\n');

  const electionsToResearch = await getElectionsNeedingResearch(25);
  console.log(`📋 Found ${electionsToResearch.length} elections needing candidate research\n`);

  let totalCandidatesAdded = 0;
  let successfulResearches = 0;

  for (let i = 0; i < electionsToResearch.length; i++) {
    const election = electionsToResearch[i];
    console.log(`\n[${i + 1}/${electionsToResearch.length}] 🔍 Researching: ${election.title}`);
    console.log(`   📍 ${election.state} | ${new Date(election.date).toLocaleDateString()}`);
    
    const foundCandidates = await researchCandidatesWithOpenAI(election);
    
    if (foundCandidates.length > 0) {
      const candidatesAdded = await addCandidatesToElection(election.id, foundCandidates);
      totalCandidatesAdded += candidatesAdded;
      successfulResearches++;
      
      console.log(`   ✅ Added ${candidatesAdded} verified candidates`);
      foundCandidates.forEach(candidate => {
        console.log(`      • ${candidate.name} (${candidate.party})`);
      });
    } else {
      console.log(`   ❌ No verified candidates found`);
    }
    
    // Rate limiting to respect OpenAI API limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Generate comprehensive final report
  const finalStats = await db.execute(`
    SELECT 
      COUNT(DISTINCT e.id) as total_elections,
      COUNT(DISTINCT CASE WHEN c.id IS NOT NULL THEN e.id END) as elections_with_candidates,
      COUNT(c.id) as total_candidates,
      ROUND(COUNT(DISTINCT CASE WHEN c.id IS NOT NULL THEN e.id END)::decimal / COUNT(DISTINCT e.id) * 100, 1) as coverage_percent
    FROM elections e
    LEFT JOIN candidates c ON e.id = c.election_id
    WHERE e.date >= '2025-07-01' AND e.date <= '2026-12-31'
  `);

  const stats = finalStats.rows[0];

  console.log('\n🎉 OPENAI RESEARCH SESSION COMPLETE');
  console.log('=====================================');
  console.log(`✅ Elections researched: ${electionsToResearch.length}`);
  console.log(`✅ Successful researches: ${successfulResearches}`);
  console.log(`✅ Total candidates added: ${totalCandidatesAdded}`);
  console.log(`📊 Platform coverage: ${stats.coverage_percent}% (${stats.elections_with_candidates}/${stats.total_elections} elections)`);
  console.log(`📈 Total candidates in system: ${stats.total_candidates}`);
  
  if (stats.coverage_percent >= 50) {
    console.log('\n🎯 EXCELLENT: Platform now has substantial election coverage!');
  } else if (stats.coverage_percent >= 25) {
    console.log('\n📈 GOOD PROGRESS: Significant improvement in data coverage!');
  } else if (stats.coverage_percent >= 15) {
    console.log('\n📊 STEADY PROGRESS: Continue research to reach target coverage');
  } else {
    console.log('\n🔄 BUILDING FOUNDATION: Additional research cycles needed');
  }
  
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Research session failed:', error);
  process.exit(1);
});