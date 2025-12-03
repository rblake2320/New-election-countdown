/**
 * Inline seeding function for November 4, 2025 election results
 * Called during server startup to populate sample data
 */

import { storage } from './storage';

export default async function seedNovemberResults(): Promise<void> {
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
    
    if (nov4Elections.length === 0) {
      return; // Silent return if no Nov 4 elections
    }
    
    // Add sample results for each election
    for (const election of nov4Elections) {
      // Get candidates for this election
      const candidates = await storage.getCandidatesByElection(election.id);
      
      if (candidates.length === 0) {
        // Create sample candidates if none exist
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
    }
  } catch (error) {
    // Silent failure - don't crash server startup
    console.error('Error seeding November results:', error);
  }
}
