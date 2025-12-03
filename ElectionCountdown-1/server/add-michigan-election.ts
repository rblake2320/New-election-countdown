/**
 * Add Michigan Primary Election with Real Candidates
 */

import { storage } from './storage';

export async function addMichiganPrimaryWithCandidates() {
  try {
    // Create Michigan Primary Election (August 6, 2024 was the actual date, but for demo let's use a future date)
    const michiganPrimary = await storage.createElection({
      title: "Michigan Primary Election 2024",
      subtitle: "Federal and State Primary Elections",
      location: "Michigan",
      state: "MI",
      date: new Date('2025-02-04'), // 12 days from now approximately
      type: "Primary",
      level: "Federal",
      offices: ["U.S. House", "U.S. Senate"],
      description: "Michigan primary elections for federal offices",
      isActive: true
    });

    console.log('Created Michigan Primary Election:', michiganPrimary.id);

    // Add real Michigan candidates
    const michiganCandidates = [
      // U.S. Senate Race
      { 
        name: "Elissa Slotkin", 
        party: "Democratic", 
        electionId: michiganPrimary.id,
        isIncumbent: false,
        description: "U.S. Representative running for Senate",
        pollingSupport: null,
        pollingSource: null,
        lastPollingUpdate: null
      },
      {
        name: "Mike Rogers",
        party: "Republican", 
        electionId: michiganPrimary.id,
        isIncumbent: false,
        description: "Former U.S. Representative running for Senate",
        pollingSupport: null,
        pollingSource: null,
        lastPollingUpdate: null
      },
      {
        name: "Alex Mooney",
        party: "Republican",
        electionId: michiganPrimary.id,
        isIncumbent: false,
        description: "Former West Virginia Representative",
        pollingSupport: null,
        pollingSource: null,
        lastPollingUpdate: null
      },

      // U.S. House District 7
      {
        name: "Tom Barrett",
        party: "Republican",
        electionId: michiganPrimary.id,
        isIncumbent: true,
        description: "Incumbent U.S. Representative District 7",
        pollingSupport: null,
        pollingSource: null,
        lastPollingUpdate: null
      },
      {
        name: "Curtis Hertel Jr.",
        party: "Democratic",
        electionId: michiganPrimary.id,
        isIncumbent: false,
        description: "State Senator running for U.S. House District 7",
        pollingSupport: null,
        pollingSource: null,
        lastPollingUpdate: null
      },

      // U.S. House District 8
      {
        name: "Paul Junge",
        party: "Republican",
        electionId: michiganPrimary.id,
        isIncumbent: false,
        description: "Former candidate for U.S. House District 8",
        pollingSupport: null,
        pollingSource: null,
        lastPollingUpdate: null
      },
      {
        name: "Dan Kildee",
        party: "Democratic",
        electionId: michiganPrimary.id,
        isIncumbent: true,
        description: "Incumbent U.S. Representative District 8",
        pollingSupport: null,
        pollingSource: null,
        lastPollingUpdate: null
      },

      // U.S. House District 10
      {
        name: "John James",
        party: "Republican",
        electionId: michiganPrimary.id,
        isIncumbent: true,
        description: "Incumbent U.S. Representative District 10",
        pollingSupport: null,
        pollingSource: null,
        lastPollingUpdate: null
      },
      {
        name: "Carl Marlinga",
        party: "Democratic",
        electionId: michiganPrimary.id,
        isIncumbent: false,
        description: "Macomb County Prosecutor",
        pollingSupport: null,
        pollingSource: null,
        lastPollingUpdate: null
      }
    ];

    let addedCount = 0;
    for (const candidateData of michiganCandidates) {
      try {
        await storage.createCandidate(candidateData);
        addedCount++;
        console.log(`Added candidate: ${candidateData.name} (${candidateData.party})`);
      } catch (error) {
        console.error(`Error adding candidate ${candidateData.name}:`, error);
      }
    }

    return {
      election: michiganPrimary,
      candidatesAdded: addedCount,
      totalCandidates: michiganCandidates.length
    };

  } catch (error) {
    console.error('Error adding Michigan primary:', error);
    throw error;
  }
}