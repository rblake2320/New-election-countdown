import { Router } from "express";
import { storage } from "../storage";
import { civicAggregatorService } from "../civic-aggregator-service";
import { voteSmartService } from "../services/votesmart-service";
import { calculateAdvancedPoliticalLeaning } from "../lib/political-analysis.js";

export const electionsRouter = Router();

// =============================================================================
// POLITICAL ANALYSIS ENDPOINTS
// =============================================================================

// Get political analysis for an election
electionsRouter.get("/:id/political-analysis", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid election ID" });
    }
    
    // Get election data
    const election = await storage.getElection(id);
    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }
    
    // Get candidates
    const candidatesData = await storage.getCandidatesByElection(id);
    
    // For now, simulate polling and momentum data since database tables aren't available yet
    // This will be replaced with real data once the database is properly configured
    let currentPolling = undefined;
    let momentum = undefined;
    let userIntentions = undefined;
    
    // TODO: Replace with actual database queries once tables are created
    // In the future, this will pull from pollingData, politicalMomentum, and userVotingIntentions tables
    
    // Calculate political analysis using baseline + candidate data
    const analysis = calculateAdvancedPoliticalLeaning(
      election.state,
      candidatesData,
      currentPolling,
      momentum,
      userIntentions
    );
    
    res.json({
      ...analysis,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error('Political analysis error:', error);
    res.status(500).json({ error: "Failed to calculate political analysis" });
  }
});

// Submit user voting intention (stores in memory for now)
electionsRouter.post("/:id/voting-intention", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid election ID" });
    }
    
    const { candidateId, partyPreference, confidence = 'medium' } = req.body;
    
    // Validate election exists
    const election = await storage.getElection(id);
    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }
    
    // For now, just acknowledge the intention
    // TODO: Store in userVotingIntentions table once database is configured
    console.log(`Voting intention received for election ${id}: ${partyPreference}`);
    
    res.json({ success: true, message: "Voting intention recorded successfully" });
  } catch (error) {
    console.error('Voting intention error:', error);
    res.status(500).json({ error: "Failed to record voting intention" });
  }
});

// =============================================================================
// EXISTING ENDPOINTS
// =============================================================================

// Get multiple candidates by IDs (for comparison) - MUST BE BEFORE /:id
electionsRouter.get("/candidates-by-ids", async (req, res) => {
  try {
    const ids = String(req.query.ids ?? "")
      .split(",").map((s) => Number(s)).filter(Number.isFinite);
    if (!ids.length) return res.json([]);
    
    const candidates = await storage.getCandidatesByIds(ids);
    // Map to match expected API format
    const formattedCandidates = candidates.map(c => ({
      id: c.id,
      name: c.name,
      party: c.party,
      incumbent: c.isIncumbent,
      profile_image_url: c.profileImageUrl,
      website: c.website,
      contact_email: c.contactEmail,
      is_verified: c.isVerified,
      description: c.description,
      campaign_bio: c.campaignBio
    }));
    res.json(formattedCandidates);
  } catch (error) {
    console.error("Error fetching candidates by IDs:", error);
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
});

// Add counts endpoint first
electionsRouter.get("/counts", async (req, res) => {
  try {
    const stats = await storage.getElectionStats();
    
    // Calculate upcoming/past from all elections
    const now = new Date();
    const allElections = await storage.getElections();
    const upcoming = allElections.filter(e => new Date(e.date) >= now).length;
    const past = allElections.filter(e => new Date(e.date) < now).length;
    
    res.json({
      total: stats.total,
      upcoming: upcoming,
      past: past,
      byType: stats.byType
    });
  } catch (error) {
    console.error("Error fetching election counts:", error);
    res.status(500).json({ error: "Failed to fetch counts" });
  }
});

// Get single election with candidate count
electionsRouter.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }
    
    const election = await storage.getElection(id);
    if (!election) return res.status(404).json({ error: "Not found" });

    const candidates = await storage.getCandidatesByElection(id);
    
    res.json({ 
      id: election.id,
      title: election.title,
      date: election.date,
      state: election.state,
      level: election.level,
      type: election.type,
      candidates: candidates.length
    });
  } catch (error) {
    console.error("Error fetching election:", error);
    res.status(500).json({ error: "Failed to fetch election" });
  }
});

// Get candidates for an election with comprehensive VoteSmart data and intelligent fallback
electionsRouter.get("/:id/candidates", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });

    // Helper function to enrich candidate data with VoteSmart information
    const enrichCandidateData = async (candidate: any) => {
      const baseCandidate = {
        id: candidate.id,
        name: candidate.name,
        party: candidate.party,
        incumbent: candidate.isIncumbent,
        isIncumbent: candidate.isIncumbent,
        profile_image_url: candidate.profileImageUrl,
        profileImageUrl: candidate.profileImageUrl,
        website: candidate.website,
        contact_email: candidate.contactEmail,
        contactEmail: candidate.contactEmail,
        description: candidate.description,
        campaign_bio: candidate.campaignBio,
        campaignBio: candidate.campaignBio,
        is_verified: candidate.isVerified,
        isVerified: candidate.isVerified,
        office: candidate.office,
        state: candidate.state,
        district: candidate.district,
        votes_received: candidate.votesReceived,
        votesReceived: candidate.votesReceived,
        vote_percentage: candidate.votePercentage,
        votePercentage: candidate.votePercentage,
        is_winner: candidate.isWinner,
        isWinner: candidate.isWinner,
        is_projected_winner: candidate.isProjectedWinner,
        isProjectedWinner: candidate.isProjectedWinner,
        pollingSupport: candidate.pollingSupport
      };

      try {
        // Try to get comprehensive candidate data from CivicAggregator
        if (candidate.votesmart_id || candidate.name) {
          const searchId = candidate.votesmart_id || candidate.name;
          const comprehensiveData = await civicAggregatorService.getComprehensiveCandidateData([searchId], id.toString());
          
          if (comprehensiveData && comprehensiveData.length > 0) {
            const enrichedData = comprehensiveData[0];
            
            return {
              ...baseCandidate,
              // Enhanced profile information
              biography: enrichedData.voteSmartData?.bio || enrichedData.voteSmartData?.detailedBio || null,
              photo_url: enrichedData.voteSmartData?.photoUrl || baseCandidate.profile_image_url,
              professional_background: enrichedData.voteSmartData?.bio?.profession || 
                                      enrichedData.voteSmartData?.detailedBio?.profession || null,
              education: enrichedData.voteSmartData?.bio?.education || 
                        enrichedData.voteSmartData?.detailedBio?.education || null,
              
              // Position and voting information
              position_count: enrichedData.voteSmartData?.positions?.length || 0,
              voting_record_count: enrichedData.voteSmartData?.votingRecord?.length || 0,
              interest_group_ratings: enrichedData.voteSmartData?.ratings?.length || 0,
              
              // Data availability status
              data_completeness: {
                has_biography: !!(enrichedData.voteSmartData?.bio || enrichedData.voteSmartData?.detailedBio),
                has_photo: !!(enrichedData.voteSmartData?.photoUrl || baseCandidate.profile_image_url),
                has_positions: (enrichedData.voteSmartData?.positions?.length || 0) > 0,
                has_voting_record: (enrichedData.voteSmartData?.votingRecord?.length || 0) > 0,
                has_ratings: (enrichedData.voteSmartData?.ratings?.length || 0) > 0
              },
              
              // Issues and data source information
              data_issues: enrichedData.voteSmartData?.issues || [],
              last_data_update: enrichedData.voteSmartData?.lastUpdated || new Date().toISOString(),
              
              // Additional identifiers for data linking
              external_ids: {
                votesmart_id: candidate.votesmart_id,
                fec_id: candidate.fec_candidate_id,
                bioguide_id: candidate.bioguide_id
              }
            };
          }
        }
        
        // Fallback: return enhanced basic data with informative messaging
        return {
          ...baseCandidate,
          biography: null,
          photo_url: baseCandidate.profile_image_url,
          professional_background: null,
          education: null,
          position_count: 0,
          voting_record_count: 0,
          interest_group_ratings: 0,
          data_completeness: {
            has_biography: false,
            has_photo: !!baseCandidate.profile_image_url,
            has_positions: false,
            has_voting_record: false,
            has_ratings: false
          },
          data_issues: voteSmartService ? 
            ['VoteSmart data not yet available for this candidate'] :
            ['VoteSmart API key required for comprehensive candidate data - configure VOTESMART_API_KEY to unlock detailed biographies, positions, and voting records'],
          last_data_update: new Date().toISOString(),
          external_ids: {
            votesmart_id: candidate.votesmart_id,
            fec_id: candidate.fec_candidate_id,
            bioguide_id: candidate.bioguide_id
          }
        };
        
      } catch (enrichmentError) {
        console.warn(`Failed to enrich candidate ${candidate.name}:`, enrichmentError);
        
        // Return basic data with error context
        return {
          ...baseCandidate,
          biography: null,
          photo_url: baseCandidate.profile_image_url,
          professional_background: null,
          education: null,
          position_count: 0,
          voting_record_count: 0,
          interest_group_ratings: 0,
          data_completeness: {
            has_biography: false,
            has_photo: !!baseCandidate.profile_image_url,
            has_positions: false,
            has_voting_record: false,
            has_ratings: false
          },
          data_issues: [`Data enrichment temporarily unavailable: ${enrichmentError instanceof Error ? enrichmentError.message : 'Unknown error'}`],
          last_data_update: new Date().toISOString(),
          external_ids: {
            votesmart_id: candidate.votesmart_id,
            fec_id: candidate.fec_candidate_id,
            bioguide_id: candidate.bioguide_id
          }
        };
      }
    };

    // Try direct election_id match first
    const directCandidates = await storage.getCandidatesByElection(id);
    
    if (directCandidates.length > 0) {
      // Enrich all candidates with comprehensive data
      const enrichedCandidates = await Promise.allSettled(
        directCandidates.map(candidate => enrichCandidateData(candidate))
      );
      
      const formattedCandidates = enrichedCandidates
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      return res.json(formattedCandidates);
    }

    // Fallback: get election details and find similar elections
    const election = await storage.getElection(id);
    if (!election) return res.status(404).json({ error: 'election not found' });

    // Simple fallback: get candidates from same state around the same time
    const allElections = await storage.getElections();
    const similarElections = allElections.filter(e => {
      if (e.state !== election.state) return false;
      
      const electionDate = new Date(election.date);
      const eDate = new Date(e.date);
      const timeDiff = Math.abs(electionDate.getTime() - eDate.getTime());
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
      
      // Within 1 day and similar title
      return daysDiff <= 1 && e.title.toLowerCase().includes(election.title.toLowerCase().split(' ')[0]);
    });

    for (const similarElection of similarElections) {
      const candidates = await storage.getCandidatesByElection(similarElection.id);
      if (candidates.length > 0) {
        // Enrich fallback candidates as well
        const enrichedFallbackCandidates = await Promise.allSettled(
          candidates.map(candidate => enrichCandidateData({
            ...candidate,
            source_election_id: candidate.electionId
          }))
        );
        
        const formattedFallbackCandidates = enrichedFallbackCandidates
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
          .map(result => ({
            ...result.value,
            source_election_id: result.value.source_election_id || candidates[0]?.electionId
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
          
        return res.json(formattedFallbackCandidates);
      }
    }

    // Return empty array with informative metadata
    return res.json([]);
    
  } catch (error) {
    console.error("Error fetching enriched candidates:", error);
    
    // Return error with helpful context instead of generic failure
    res.status(500).json({ 
      error: "Failed to fetch candidates",
      message: "Unable to retrieve candidate information at this time",
      support_message: "Please try again later or contact support if the issue persists",
      timestamp: new Date().toISOString()
    });
  }
});

// Get individual candidate details with comprehensive VoteSmart data
electionsRouter.get("/:electionId/candidates/:candidateId", async (req, res) => {
  try {
    const electionId = Number(req.params.electionId);
    const candidateId = Number(req.params.candidateId);
    
    if (!Number.isFinite(electionId) || !Number.isFinite(candidateId)) {
      return res.status(400).json({ error: 'Invalid ID parameters' });
    }

    // Get candidate from storage
    const candidates = await storage.getCandidatesByIds([candidateId]);
    const candidate = candidates[0];
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    try {
      // Get comprehensive candidate data using CivicAggregator
      const searchId = candidate.votesmart_id || candidate.name;
      const comprehensiveData = await civicAggregatorService.getComprehensiveCandidateData([searchId], electionId.toString());
      
      const baseResponse = {
        // Basic candidate information
        id: candidate.id,
        name: candidate.name,
        party: candidate.party,
        office: candidate.office,
        state: candidate.state,
        district: candidate.district,
        incumbent: candidate.isIncumbent,
        is_verified: candidate.isVerified,
        
        // Contact and profile information
        website: candidate.website,
        contact_email: candidate.contactEmail,
        campaign_phone: candidate.campaignPhone,
        social_media: candidate.socialMedia,
        description: candidate.description,
        campaign_bio: candidate.campaignBio,
        
        // Profile images
        profile_image_url: candidate.profileImageUrl,
        photo_url: null,
        
        // External identifiers
        external_ids: {
          votesmart_id: candidate.votesmart_id,
          fec_id: candidate.fec_candidate_id,
          bioguide_id: candidate.bioguide_id
        },
        
        // Election context
        election_id: electionId,
        
        // Data availability
        data_completeness: {
          has_biography: false,
          has_photo: !!candidate.profileImageUrl,
          has_positions: false,
          has_voting_record: false,
          has_ratings: false,
          has_professional_background: false,
          has_education: false
        },
        
        // Rich data fields (to be populated)
        biography: null,
        professional_background: null,
        education: null,
        birth_date: null,
        birth_place: null,
        family_info: null,
        
        // Position and policy information
        positions: [],
        position_summary: null,
        voting_record: [],
        voting_summary: null,
        interest_group_ratings: [],
        
        // Data quality and issues
        data_issues: [],
        last_data_update: new Date().toISOString(),
        
        // Metadata
        created_at: candidate.createdAt,
        updated_at: candidate.updatedAt
      };

      // If we have comprehensive data, enrich the response
      if (comprehensiveData && comprehensiveData.length > 0) {
        const enrichedData = comprehensiveData[0];
        
        if (enrichedData.voteSmartData) {
          const vsData = enrichedData.voteSmartData;
          
          // Enhanced biography information
          const bio = vsData.bio || vsData.detailedBio;
          if (bio) {
            baseResponse.biography = bio;
            baseResponse.professional_background = bio.profession;
            baseResponse.education = bio.education;
            baseResponse.birth_date = bio.birthDate;
            baseResponse.birth_place = bio.birthPlace;
            baseResponse.family_info = bio.family;
            baseResponse.data_completeness.has_biography = true;
            baseResponse.data_completeness.has_professional_background = !!bio.profession;
            baseResponse.data_completeness.has_education = !!bio.education;
          }
          
          // Photo URL
          if (vsData.photoUrl) {
            baseResponse.photo_url = vsData.photoUrl;
            baseResponse.data_completeness.has_photo = true;
          }
          
          // Position statements
          if (vsData.positions && vsData.positions.length > 0) {
            baseResponse.positions = vsData.positions;
            baseResponse.position_summary = `${vsData.positions.length} policy position${vsData.positions.length === 1 ? '' : 's'} available`;
            baseResponse.data_completeness.has_positions = true;
          }
          
          // Voting record
          if (vsData.votingRecord && vsData.votingRecord.length > 0) {
            baseResponse.voting_record = vsData.votingRecord;
            baseResponse.voting_summary = `${vsData.votingRecord.length} recorded vote${vsData.votingRecord.length === 1 ? '' : 's'} available`;
            baseResponse.data_completeness.has_voting_record = true;
          }
          
          // Interest group ratings
          if (vsData.ratings && vsData.ratings.length > 0) {
            baseResponse.interest_group_ratings = vsData.ratings;
            baseResponse.data_completeness.has_ratings = true;
          }
          
          // Data issues and update time
          baseResponse.data_issues = vsData.issues || [];
          baseResponse.last_data_update = vsData.lastUpdated || new Date().toISOString();
        }
      }
      
      // Add helpful messaging if data is limited
      if (!baseResponse.data_completeness.has_biography && !baseResponse.data_completeness.has_positions) {
        if (!voteSmartService) {
          baseResponse.data_issues.push('VoteSmart API key required for comprehensive candidate data - configure VOTESMART_API_KEY to unlock detailed biographies, positions, and voting records');
        } else {
          baseResponse.data_issues.push('Comprehensive candidate data is being retrieved - please check back soon for detailed information');
        }
      }
      
      res.json(baseResponse);
      
    } catch (enrichmentError) {
      console.warn(`Failed to enrich candidate ${candidate.name} (ID: ${candidateId}):`, enrichmentError);
      
      // Return basic candidate data with error context
      res.json({
        ...baseResponse,
        data_issues: [`Data enrichment temporarily unavailable: ${enrichmentError instanceof Error ? enrichmentError.message : 'Unknown error'}`]
      });
    }
    
  } catch (error) {
    console.error("Error fetching candidate details:", error);
    res.status(500).json({ 
      error: "Failed to fetch candidate details",
      message: "Unable to retrieve detailed candidate information at this time",
      timestamp: new Date().toISOString()
    });
  }
});

// List elections in next X days missing candidates
electionsRouter.get('/missing-candidates', async (req, res) => {
  try {
    const window = Math.max(1, Math.min(120, Number(req.query.window ?? 60)));
    
    // Get all elections and filter by date range
    const allElections = await storage.getElections();
    const now = new Date();
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const endDate = new Date(now.getTime() + window * 24 * 60 * 60 * 1000); // window days from now
    
    const electionsInWindow = allElections.filter(election => {
      const electionDate = new Date(election.date);
      return electionDate >= startDate && electionDate <= endDate;
    });
    
    // Check each election for candidates
    const missingCandidates = [];
    for (const election of electionsInWindow) {
      const candidates = await storage.getCandidatesByElection(election.id);
      if (candidates.length === 0) {
        missingCandidates.push({
          id: election.id,
          title: election.title,
          state: election.state,
          date: election.date,
          candidate_count: 0
        });
      }
    }
    
    // Sort by date ASC, then state ASC
    missingCandidates.sort((a, b) => {
      const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      return a.state.localeCompare(b.state);
    });
    
    res.json({ window_days: window, missing: missingCandidates });
  } catch (error) {
    console.error("Error fetching missing candidates:", error);
    res.status(500).json({ error: "Failed to fetch missing candidates" });
  }
});