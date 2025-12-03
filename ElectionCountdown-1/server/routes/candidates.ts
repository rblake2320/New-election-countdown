import { Router } from 'express';
import { storage } from '../storage';
import { civicAggregatorService } from '../civic-aggregator-service';
import { voteSmartService } from '../services/votesmart-service';
import { getPerplexityService } from '../perplexity-service';
import { db } from '../db';
import { candidates, candidateBiography, candidatePositions } from '@shared/schema';
import { ilike, eq } from 'drizzle-orm';

const router = Router();

// Search candidates by name or fragment with enriched data preview
router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const includePreview = req.query.preview === 'true';
  
  if (!q) return res.json([]);
  
  try {
    // Use storage interface which handles memory fallback automatically
    const allCandidates = await storage.getCandidates();
    
    // Filter candidates by name search (case-insensitive)
    const results = allCandidates
      .filter(candidate => 
        candidate.name.toLowerCase().includes(q.toLowerCase())
      )
      .slice(0, 20); // Limit to 20 results
    
    // Basic response format with actual schema fields
    const formattedResults = results.map(candidate => ({
      id: candidate.id,
      name: candidate.name,
      party: candidate.party,
      election_id: candidate.electionId,
      is_incumbent: candidate.isIncumbent,
      description: candidate.description,
      // Add preview data structure for consistency
      preview_data: {
        has_biography: !!candidate.description,
        photo_url: candidate.profileImageUrl,
        profession: null,
        data_available: voteSmartService ? 'API available but no key configured' : 'VoteSmart integration available'
      }
    }));
    
    res.json(formattedResults);
    
  } catch (error) {
    console.error('Candidate search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Resolve any ID into our canonical row (simplified to work with existing schema)
router.get('/resolve-id', async (req, res) => {
  // Since external ID fields don't exist in schema, search by name instead
  const searchName = req.query.name;
  
  if (!searchName) {
    return res.status(400).json({ error: 'Name parameter required for candidate resolution' });
  }
  
  try {
    const results = await db.select({
      id: candidates.id,
      name: candidates.name,
      party: candidates.party,
      electionId: candidates.electionId,
      isIncumbent: candidates.isIncumbent,
      profileImageUrl: candidates.profileImageUrl,
    })
    .from(candidates)
    .where(ilike(candidates.name, `%${String(searchName)}%`))
    .limit(10);
    
    res.json(results);
  } catch (error) {
    console.error('ID resolution error:', error);
    res.status(500).json({ error: 'ID resolution failed' });
  }
});

// Get individual candidate details (public endpoint)
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid candidate ID' });
    }

    // Use storage interface which handles memory fallback automatically  
    const allCandidates = await storage.getCandidates();
    const candidate = allCandidates.find(c => c.id === id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Query local database for biography and policy positions
    const [localBiography] = await db.select()
      .from(candidateBiography)
      .where(ilike(candidateBiography.name, candidate.name))
      .limit(1);
    
    const localPositions = await db.select()
      .from(candidatePositions)
      .where(eq(candidatePositions.candidateId, id));

    // Try to get enriched data using CivicAggregator
    try {
      const searchId = candidate.name; // Use name since votesmart_id field doesn't exist in schema
      const comprehensiveData = await civicAggregatorService.getComprehensiveCandidateData([searchId], 'public');
      
      const baseResponse: any = {
        id: candidate.id,
        name: candidate.name,
        party: candidate.party,
        election_id: candidate.electionId,
        incumbent: candidate.isIncumbent,
        verified: candidate.isVerified,
        profile_image_url: candidate.profileImageUrl,
        website: candidate.website,
        contact_email: candidate.contactEmail,
        description: candidate.description,
        campaign_bio: candidate.campaignBio,
        // Enhanced fields
        biography: null as any,
        photo_url: candidate.profileImageUrl,
        professional_background: null as any,
        education: null as any,
        positions: [] as any[],
        voting_record: [] as any[],
        // Frontend compatibility aliases
        preferredName: candidate.name,
        currentOccupation: null as any,
        employmentHistory: [] as any[],
        topPriorities: [] as any[],
        data_completeness: {
          has_biography: false,
          has_positions: false,
          has_voting_record: false
        },
        data_issues: [] as string[]
      };

      // Merge local database data first (highest priority)
      if (localBiography) {
        baseResponse.biography = {
          full_bio: `${localBiography.name} - ${localBiography.currentPosition || 'Candidate'} from ${localBiography.state || 'Michigan'}`,
          profession: localBiography.currentPosition,
          district: localBiography.district,
          sources: localBiography.sources || []
        };
        baseResponse.professional_background = localBiography.currentPosition;
        baseResponse.currentOccupation = localBiography.currentPosition;
        baseResponse.education = (localBiography as any).education || null;
        baseResponse.employmentHistory = (localBiography as any).employmentHistory || [];
        baseResponse.data_completeness.has_biography = true;
      }
      
      if (localPositions && localPositions.length > 0) {
        baseResponse.positions = localPositions.map(pos => ({
          category: pos.category,
          position: pos.position,
          detailed_statement: pos.detailedStatement,
          source_url: pos.sourceUrl,
          is_verified: pos.isVerified
        }));
        baseResponse.topPriorities = localPositions.map(pos => ({
          title: pos.category,
          description: pos.position
        }));
        baseResponse.data_completeness.has_positions = true;
      }
      
      // If comprehensive data is available from external APIs, add it as supplementary data
      if (comprehensiveData && comprehensiveData.length > 0 && comprehensiveData[0].voteSmartData) {
        const vsData = comprehensiveData[0].voteSmartData;
        const bio = vsData.bio || vsData.detailedBio;
        
        // Only use external bio if we don't have local data
        if (bio && !localBiography) {
          baseResponse.biography = bio;
          baseResponse.professional_background = bio.profession;
          baseResponse.education = bio.education;
          baseResponse.data_completeness.has_biography = true;
        }
        
        if (vsData.photoUrl) {
          baseResponse.photo_url = vsData.photoUrl;
        }
        
        // Merge external positions with local ones
        if (vsData.positions && vsData.positions.length > 0 && localPositions.length === 0) {
          baseResponse.positions = vsData.positions;
          baseResponse.data_completeness.has_positions = true;
        }
        
        if (vsData.votingRecord && vsData.votingRecord.length > 0) {
          baseResponse.voting_record = vsData.votingRecord;
          baseResponse.data_completeness.has_voting_record = true;
        }
        
        baseResponse.data_issues = vsData.issues || [];
      } else if (!localBiography && !localPositions.length) {
        // Only show API key messages if we have no local data
        if (!voteSmartService) {
          baseResponse.data_issues = [
            'VoteSmart API key required for comprehensive candidate data - configure VOTESMART_API_KEY to unlock detailed biographies, positions, and voting records'
          ];
        } else {
          baseResponse.data_issues = [
            'Comprehensive candidate data is being retrieved - detailed information will be available soon'
          ];
        }
      }
      
      res.json(baseResponse);
      
    } catch (enrichmentError) {
      console.warn(`Failed to enrich candidate ${id}:`, enrichmentError);
      
      // Return basic data with error context
      res.json({
        id: candidate.id,
        name: candidate.name,
        party: candidate.party,
        incumbent: candidate.isIncumbent,
        profile_image_url: candidate.profileImageUrl,
        data_issues: [`Data enrichment temporarily unavailable: ${enrichmentError instanceof Error ? enrichmentError.message : 'Unknown error'}`]
      });
    }
    
  } catch (error) {
    console.error('Error fetching candidate details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch candidate details',
      timestamp: new Date().toISOString()
    });
  }
});

// Get enriched candidate details with real-time Perplexity AI data
router.get('/:id/enriched', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid candidate ID' });
    }

    const allCandidates = await storage.getCandidates();
    const candidate = allCandidates.find(c => c.id === id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const perplexityService = getPerplexityService();
    if (!perplexityService) {
      return res.status(503).json({ 
        error: 'Perplexity service unavailable',
        message: 'PERPLEXITY_API_KEY not configured'
      });
    }

    // Build a comprehensive prompt for Perplexity
    const electionQuery = candidate.electionId 
      ? `election ID ${candidate.electionId}` 
      : `their current race`;
    
    const prompt = `Provide the most current information about political candidate ${candidate.name} (${candidate.party}) running in ${electionQuery}. Include:

1. Recent Biography (last 6 months): Current position, recent activities, latest news
2. Latest Policy Positions: Most recent stances on key issues (economy, healthcare, education, environment, etc.)
3. Recent News & Updates: Any breaking news, campaign announcements, or significant events from the past month
4. Campaign Status: Polling numbers if available, endorsements, fundraising updates
5. Public Statements: Recent quotes or position statements

Focus on information from the last 30 days when possible. Format as JSON with keys: 
- recentBio (string)
- policyPositions (array of {issue: string, stance: string, date: string})
- recentNews (array of {title: string, date: string, source: string, summary: string})
- campaignStatus (object with polling, endorsements, fundraising)
- recentStatements (array of {statement: string, date: string, context: string})`;

    const perplexityResponse = await perplexityService.searchElections(prompt);
    
    // Parse the response
    let enrichedData: any = {
      candidateId: id,
      candidateName: candidate.name,
      party: candidate.party,
      lastUpdated: new Date().toISOString(),
      dataSource: 'Perplexity AI',
    };

    // Try to extract JSON from the response
    try {
      const jsonMatch = perplexityResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        enrichedData = {
          ...enrichedData,
          ...parsedData
        };
      } else {
        // If no JSON, return the raw text response
        enrichedData.rawResponse = perplexityResponse;
        enrichedData.recentBio = perplexityResponse.substring(0, 500);
      }
    } catch (parseError) {
      console.warn('Could not parse Perplexity response as JSON:', parseError);
      enrichedData.rawResponse = perplexityResponse;
      enrichedData.recentBio = perplexityResponse.substring(0, 500);
    }

    // Merge with basic candidate data
    const response = {
      ...candidate,
      enrichedData,
      basicInfo: {
        id: candidate.id,
        name: candidate.name,
        party: candidate.party,
        isIncumbent: candidate.isIncumbent,
        website: candidate.website,
        profileImageUrl: candidate.profileImageUrl,
        description: candidate.description
      }
    };

    res.json(response);
    
  } catch (error) {
    console.error('Error fetching enriched candidate data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch enriched candidate data',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;