/**
 * One-time script to seed sample election results for November 4, 2025 elections
 * Run with: tsx server/seed-nov-results.ts
 */

import { storage } from './storage';

async function seedNovemberResults() {
  console.log('🌱 Seeding November 4, 2025 election results...');
  
  try {
    // Get all elections
    const allElections = await storage.getElections({});
    
    // Find Nov 4, 2025 elections
    const nov4Elections = allElections.filter(e => {
      const electionDate = new Date(e.date);
      return electionDate.getFullYear() === 2025 &&
             electionDate.getMonth() === 10 && // November is month 10 (0-indexed)
             electionDate.getDate() === 4 &&
             e.isActive;
    });
    
    console.log(`Found ${nov4Elections.length} elections on November 4, 2025:`);
    nov4Elections.forEach(e => console.log(`  - ${e.title} (ID: ${e.id})`));
    
    if (nov4Elections.length === 0) {
      console.log('❌ No Nov 4 elections found. Exiting.');
      return;
    }
    
    // Add sample results for each election
    for (const election of nov4Elections) {
      console.log(`\n📊 Adding results for: ${election.title}`);
      
      // Get candidates for this election
      const candidates = await storage.getCandidatesByElection(election.id);
      console.log(`  Found ${candidates.length} candidates`);
      
      if (candidates.length === 0) {
        // Create sample candidates if none exist
        console.log('  Creating sample candidates...');
        const sampleCandidates = [
          { name: 'Democratic Candidate', party: 'Democratic' },
          { name: 'Republican Candidate', party: 'Republican' },
        ];
        
        for (const candidate of sampleCandidates) {
          await storage.createCandidate({
            name: candidate.name,
            party: candidate.party,
            electionId: election.id,
            age: 50,
            occupation: 'Politician',
            education: 'Graduate Degree',
            experience: '10+ years in public service',
          });
        }
      }
      
      // Re-fetch candidates
      const updatedCandidates = await storage.getCandidatesByElection(election.id);
      
      // Generate realistic vote totals
      const totalVotes = Math.floor(Math.random() * 1000000) + 500000; // 500K-1.5M votes
      const reportingPrecincts = 250;
      const totalPrecincts = 250;
      
      // Distribute votes among candidates
      const candidateResults = updatedCandidates.map((c, index) => {
        const basePercentage = index === 0 ? 52.5 : 47.5; // Winner gets 52.5%
        const variance = (Math.random() - 0.5) * 2; // ±1% variance
        const votePercentage = basePercentage + variance;
        const votesReceived = Math.floor((totalVotes * votePercentage) / 100);
        
        return {
          candidateId: c.id,
          votesReceived,
          votePercentage,
          isWinner: index === 0, // First candidate wins
          isProjectedWinner: false,
        };
      });
      
      // Update election results
      await storage.updateElectionResults(election.id, {
        totalVotes,
        reportingPrecincts,
        totalPrecincts,
        percentReporting: 100,
        isComplete: true,
        candidateResults,
      });
      
      console.log(`  ✅ Added results: ${totalVotes.toLocaleString()} total votes, 100% reporting`);
      console.log(`     Winner: ${candidateResults[0].candidateId} with ${candidateResults[0].votePercentage.toFixed(1)}%`);
    }
    
    console.log('\n✨ Seeding complete! November 4 elections now have live results.');
    console.log('   Visit /happening-now to see them.');
    
  } catch (error) {
    console.error('❌ Error seeding results:', error);
    throw error;
  }
}

// Run the seeding
seedNovemberResults()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
