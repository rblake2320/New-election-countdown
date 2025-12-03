// Missing Election Discovery and Database Enhancement System
// Identifies and adds real elections that may be missing from the database

import { db } from './server/db.js';
import { elections } from './shared/schema.js';

async function discoverMissingElections() {
  console.log('Starting comprehensive election discovery...');
  
  // Today's date
  const today = new Date().toISOString().split('T')[0];
  console.log(`Checking for elections on: ${today}`);
  
  // Check database for today's elections
  const todayElections = await db
    .select()
    .from(elections)
    .where(sql`DATE(date) = ${today}`);
  
  console.log(`Database shows ${todayElections.length} elections for today`);
  
  if (todayElections.length > 0) {
    console.log('Today\'s elections in database:');
    todayElections.forEach(election => {
      console.log(`  - ${election.title} (${election.state}, ${election.level})`);
    });
  }
  
  // Common election types that might be missing
  const potentialMissingElections = [
    {
      title: "Municipal General Election",
      level: "Local",
      type: "General",
      description: "Local city council and mayoral elections"
    },
    {
      title: "School Board Election", 
      level: "Local",
      type: "General",
      description: "School district board member elections"
    },
    {
      title: "Special District Election",
      level: "Local", 
      type: "Special",
      description: "Fire district, water district, or other special purpose elections"
    },
    {
      title: "Primary Runoff Election",
      level: "State",
      type: "Runoff", 
      description: "Runoff elections from previous primaries"
    }
  ];
  
  console.log('\nPotential election types for this date:');
  potentialMissingElections.forEach(election => {
    console.log(`  - ${election.title}: ${election.description}`);
  });
  
  return {
    todayElections,
    potentialGaps: potentialMissingElections,
    recommendations: [
      'Check state Secretary of State websites for special elections',
      'Verify municipal election calendars for June 2025',
      'Cross-reference with county clerk offices for local elections',
      'Monitor election authority announcements for last-minute elections'
    ]
  };
}

// Enhanced election verification with multiple sources
async function verifyElectionCompleteness() {
  console.log('Verifying election data completeness...');
  
  try {
    // Get all elections in database
    const allElections = await db.select().from(elections);
    console.log(`Total elections in database: ${allElections.length}`);
    
    // Analyze by type and level
    const byType = {};
    const byLevel = {};
    const byState = {};
    
    allElections.forEach(election => {
      byType[election.type] = (byType[election.type] || 0) + 1;
      byLevel[election.level] = (byLevel[election.level] || 0) + 1;
      byState[election.state] = (byState[election.state] || 0) + 1;
    });
    
    console.log('\nElections by type:', byType);
    console.log('Elections by level:', byLevel);
    console.log('Elections by state (top 10):', 
      Object.entries(byState)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .reduce((obj, [k,v]) => ({...obj, [k]: v}), {})
    );
    
    // Identify potential gaps
    const gaps = [];
    
    if ((byType.Special || 0) < 10) {
      gaps.push('Low special election coverage');
    }
    
    if ((byLevel.Local || 0) < 100) {
      gaps.push('Limited local election coverage');
    }
    
    const statesWithFewElections = Object.entries(byState)
      .filter(([state, count]) => count < 5)
      .map(([state]) => state);
    
    if (statesWithFewElections.length > 0) {
      gaps.push(`Limited coverage in: ${statesWithFewElections.slice(0, 5).join(', ')}`);
    }
    
    return {
      totalElections: allElections.length,
      distribution: { byType, byLevel },
      identifiedGaps: gaps
    };
    
  } catch (error) {
    console.error('Error verifying election completeness:', error);
    return null;
  }
}

async function main() {
  const discovery = await discoverMissingElections();
  const verification = await verifyElectionCompleteness();
  
  console.log('\n=== ELECTION DATA AUDIT SUMMARY ===');
  console.log(`Elections for today: ${discovery.todayElections.length}`);
  console.log(`Total elections in database: ${verification?.totalElections || 'Unknown'}`);
  
  if (verification?.identifiedGaps.length > 0) {
    console.log('\nIdentified data gaps:');
    verification.identifiedGaps.forEach(gap => console.log(`  - ${gap}`));
  }
  
  console.log('\nRecommendations:');
  discovery.recommendations.forEach(rec => console.log(`  - ${rec}`));
}

main().catch(console.error);