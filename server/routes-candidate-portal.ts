import { Express, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { storage } from './storage';

// Candidate Authentication Schemas
const candidateLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const candidateSignupSchema = z.object({
  candidateId: z.number(),
  email: z.string().email(),
  password: z.string().min(8),
  campaignName: z.string().min(1),
  campaignTitle: z.string().optional(),
  role: z.enum(['candidate', 'campaign_manager', 'staff']).default('campaign_manager'),
});

const candidateProfileSchema = z.object({
  fullName: z.string().optional(),
  preferredName: z.string().optional(),
  age: z.number().optional(),
  birthPlace: z.string().optional(),
  currentResidence: z.string().optional(),
  familyStatus: z.string().optional(),
  currentOccupation: z.string().optional(),
  employmentHistory: z.array(z.object({
    company: z.string(),
    position: z.string(),
    years: z.string(),
    description: z.string().optional(),
  })).optional(),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    year: z.string(),
    field: z.string(),
  })).optional(),
  militaryService: z.string().optional(),
  previousOffices: z.array(z.object({
    office: z.string(),
    years: z.string(),
    achievements: z.string().optional(),
  })).optional(),
  politicalExperience: z.string().optional(),
  endorsements: z.array(z.object({
    organization: z.string(),
    description: z.string(),
    date: z.string(),
  })).optional(),
  // Policy Positions
  economyPosition: z.string().optional(),
  healthcarePosition: z.string().optional(),
  educationPosition: z.string().optional(),
  environmentPosition: z.string().optional(),
  immigrationPosition: z.string().optional(),
  criminalJusticePosition: z.string().optional(),
  infrastructurePosition: z.string().optional(),
  taxesPosition: z.string().optional(),
  foreignPolicyPosition: z.string().optional(),
  socialIssuesPosition: z.string().optional(),
  // Campaign Information
  campaignWebsite: z.string().url().optional(),
  campaignSlogan: z.string().optional(),
  topPriorities: z.array(z.object({
    priority: z.string(),
    description: z.string(),
  })).optional(),
  keyAccomplishments: z.array(z.string()).optional(),
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here';

// Middleware to authenticate candidate requests
export const authenticateCandidate = async (req: Request & { candidate?: any }, res: Response, next: Function) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const candidate = await storage.getCandidateWithRAG(decoded.candidateId);
    
    if (!candidate) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.candidate = candidate;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export function registerCandidatePortalRoutes(app: Express) {
  
  // === CANDIDATE AUTHENTICATION ===
  
  // Candidate Login
  app.post('/api/candidate/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = candidateLoginSchema.parse(req.body);
      
      const account = await storage.authenticateCandidate(email, password);
      
      if (!account) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          candidateId: account.candidateId, 
          accountId: account.id,
          role: account.role,
          subscriptionTier: account.subscriptionTier
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        candidate: {
          id: account.candidateId,
          email: account.email,
          role: account.role,
          subscriptionTier: account.subscriptionTier,
          campaignName: account.campaignName,
          campaignTitle: account.campaignTitle,
        }
      });
    } catch (error) {
      console.error('Candidate login error:', error);
      res.status(400).json({ error: 'Invalid request data' });
    }
  });

  // Candidate Signup
  app.post('/api/candidate/signup', async (req: Request, res: Response) => {
    try {
      const data = candidateSignupSchema.parse(req.body);
      
      // Check if candidate exists and account doesn't already exist
      const [existingCandidate] = await storage.getCandidatesByIds([data.candidateId]);
      if (!existingCandidate) {
        return res.status(400).json({ error: 'Candidate not found in our database' });
      }

      // Create candidate account
      const account = await storage.createCandidateAccount({
        candidateId: data.candidateId,
        email: data.email,
        passwordHash: data.password, // Will be hashed in storage method
        role: data.role,
        campaignName: data.campaignName,
        campaignTitle: data.campaignTitle,
        subscriptionTier: 'basic',
        emailVerified: false,
        isActive: true,
      });

      // Record data source for accountability
      await storage.recordDataSource({
        candidateId: data.candidateId,
        fieldName: 'campaign_account',
        sourceType: 'candidate_supplied',
        sourceDescription: 'Candidate Campaign Portal Registration',
        confidenceScore: 100,
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          candidateId: account.candidateId, 
          accountId: account.id,
          role: account.role,
          subscriptionTier: account.subscriptionTier
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        candidate: {
          id: account.candidateId,
          email: account.email,
          role: account.role,
          subscriptionTier: account.subscriptionTier,
          campaignName: account.campaignName,
        }
      });
    } catch (error) {
      console.error('Candidate signup error:', error);
      res.status(400).json({ error: 'Failed to create account' });
    }
  });

  // === CANDIDATE PROFILE MANAGEMENT ===
  
  // Get Candidate Profile with RAG
  app.get('/api/candidate/profile', authenticateCandidate, async (req: Request & { candidate?: any }, res: Response) => {
    try {
      const candidateData = await storage.getCandidateWithRAG(req.candidate.id);
      res.json({
        success: true,
        candidate: candidateData,
      });
    } catch (error) {
      console.error('Error fetching candidate profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  // Update Candidate Profile
  app.put('/api/candidate/profile', authenticateCandidate, async (req: Request & { candidate?: any }, res: Response) => {
    try {
      const profileData = candidateProfileSchema.parse(req.body);
      
      // Record which fields were updated by the candidate
      const updatedFields = Object.keys(profileData);
      
      // Update the profile
      const updatedProfile = await storage.updateCandidateProfile(req.candidate.id, profileData);
      
      // Record data sources for each updated field
      for (const fieldName of updatedFields) {
        await storage.recordDataSource({
          candidateId: req.candidate.id,
          fieldName,
          sourceType: 'candidate_supplied',
          sourceDescription: 'Candidate Campaign Portal',
          confidenceScore: 100,
        });
      }

      // Get enhanced candidate data with RAG
      const enhancedCandidate = await storage.getCandidateWithRAG(req.candidate.id);

      res.json({
        success: true,
        candidate: enhancedCandidate,
        message: `Profile updated. Data completeness: ${updatedProfile.dataCompleteness}%`
      });
    } catch (error) {
      console.error('Error updating candidate profile:', error);
      res.status(400).json({ error: 'Failed to update profile' });
    }
  });

  // Get Policy Positions Template
  app.get('/api/candidate/policy-template', authenticateCandidate, async (req: Request, res: Response) => {
    const policyCategories = [
      {
        id: 'economy',
        name: 'Economy & Jobs',
        description: 'Economic policy, job creation, business regulation',
        questions: [
          'What is your position on minimum wage?',
          'How do you plan to support small businesses?',
          'What are your views on corporate taxes?'
        ]
      },
      {
        id: 'healthcare',
        name: 'Healthcare',
        description: 'Healthcare policy, insurance, medical costs',
        questions: [
          'What is your position on healthcare reform?',
          'How do you plan to address prescription drug costs?',
          'What are your views on mental health funding?'
        ]
      },
      {
        id: 'education',
        name: 'Education',
        description: 'Public education, higher education, school funding',
        questions: [
          'What is your position on education funding?',
          'How do you plan to address student debt?',
          'What are your views on school choice?'
        ]
      },
      {
        id: 'environment',
        name: 'Environment',
        description: 'Climate change, clean energy, conservation',
        questions: [
          'What is your position on climate change?',
          'How do you plan to promote clean energy?',
          'What are your views on environmental regulation?'
        ]
      },
      {
        id: 'immigration',
        name: 'Immigration',
        description: 'Immigration policy, border security, citizenship',
        questions: [
          'What is your position on immigration reform?',
          'How do you plan to address border security?',
          'What are your views on a pathway to citizenship?'
        ]
      },
      {
        id: 'criminalJustice',
        name: 'Criminal Justice',
        description: 'Law enforcement, prison reform, public safety',
        questions: [
          'What is your position on criminal justice reform?',
          'How do you plan to address police accountability?',
          'What are your views on prison reform?'
        ]
      },
      {
        id: 'infrastructure',
        name: 'Infrastructure',
        description: 'Transportation, broadband, public works',
        questions: [
          'What is your position on infrastructure investment?',
          'How do you plan to improve transportation?',
          'What are your views on broadband expansion?'
        ]
      },
      {
        id: 'taxes',
        name: 'Taxes',
        description: 'Tax policy, government spending, fiscal responsibility',
        questions: [
          'What is your position on tax reform?',
          'How do you plan to balance the budget?',
          'What are your views on government spending?'
        ]
      },
      {
        id: 'foreignPolicy',
        name: 'Foreign Policy',
        description: 'International relations, defense, trade',
        questions: [
          'What is your position on international trade?',
          'How do you plan to address national security?',
          'What are your views on foreign aid?'
        ]
      },
      {
        id: 'socialIssues',
        name: 'Social Issues',
        description: 'Civil rights, equality, social programs',
        questions: [
          'What is your position on civil rights?',
          'How do you plan to address inequality?',
          'What are your views on social safety net programs?'
        ]
      }
    ];

    res.json({
      success: true,
      categories: policyCategories,
    });
  });

  // Get Data Sources Attribution
  app.get('/api/candidate/data-sources', authenticateCandidate, async (req: Request & { candidate?: any }, res: Response) => {
    try {
      const dataSources = await storage.getCandidateDataSources(req.candidate.id);
      res.json({
        success: true,
        dataSources,
      });
    } catch (error) {
      console.error('Error fetching data sources:', error);
      res.status(500).json({ error: 'Failed to fetch data sources' });
    }
  });

  // Dashboard Analytics for Candidate
  app.get('/api/candidate/analytics', authenticateCandidate, async (req: Request & { candidate?: any }, res: Response) => {
    try {
      const candidateData = await storage.getCandidateWithRAG(req.candidate.id);
      
      // Calculate profile completion stats
      const profileStats = {
        dataCompleteness: candidateData.dataCompleteness || 0,
        totalFields: 25,
        completedFields: Math.round((candidateData.dataCompleteness || 0) * 25 / 100),
        verificationStatus: candidateData.verificationStatus || 'pending'
      };

      // Get data source breakdown
      const dataSources = await storage.getCandidateDataSources(req.candidate.id);
      const sourceBreakdown = dataSources.reduce((acc, source) => {
        acc[source.sourceType] = (acc[source.sourceType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        success: true,
        analytics: {
          profileStats,
          sourceBreakdown,
          recommendations: [
            profileStats.dataCompleteness < 50 ? 'Complete your profile to improve voter visibility' : null,
            !candidateData.policyPositions?.economy ? 'Add your economic policy positions' : null,
            !candidateData.campaignWebsite ? 'Add your campaign website URL' : null,
          ].filter(Boolean)
        }
      });
    } catch (error) {
      console.error('Error fetching candidate analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // === PROTECTED CANDIDATE PORTAL ENDPOINTS ===

  // Candidate Portal Dashboard
  app.get('/api/candidate-portal/dashboard', authenticateCandidate, async (req: Request & { candidate?: any }, res: Response) => {
    try {
      const candidateId = req.candidate.id;
      
      // Get basic candidate data
      const candidate = await storage.getCandidateWithRAG(candidateId);
      
      // Get profile completion status
      const profile = await storage.getCandidateProfile(candidateId);
      
      // Get positions count
      const positions = await storage.getCandidatePositions(candidateId);
      
      // Get Q&A entries count
      const qaEntries = await storage.getCandidateQAEntries(candidateId);
      
      // Calculate completion percentage
      const completionFactors = [
        profile?.fullName ? 20 : 0,
        profile?.currentOccupation ? 15 : 0,
        profile?.education ? 15 : 0,
        profile?.campaignWebsite ? 10 : 0,
        positions.length >= 3 ? 25 : (positions.length * 8),
        qaEntries.length >= 5 ? 15 : (qaEntries.length * 3)
      ];
      
      const completionPercentage = Math.min(100, completionFactors.reduce((sum, val) => sum + val, 0));
      
      const dashboard = {
        candidate: {
          id: candidateId,
          name: candidate.name,
          office: candidate.office || 'Not specified',
          party: candidate.party,
          state: candidate.state,
          profileImageUrl: candidate.profileImageUrl
        },
        profile: {
          completionPercentage,
          hasBasicInfo: !!(profile?.fullName && profile?.currentOccupation),
          hasEducation: !!profile?.education,
          hasWebsite: !!profile?.campaignWebsite,
          positionsCount: positions.length,
          qaEntriesCount: qaEntries.length
        },
        recentActivity: {
          lastLogin: new Date().toISOString(),
          lastProfileUpdate: profile?.updatedAt || null,
          lastPositionUpdate: positions[0]?.lastUpdated || null
        },
        subscriptionTier: 'basic',
        nextSteps: []
      };
      
      // Add next steps based on completion
      if (completionPercentage < 40) {
        (dashboard.nextSteps as string[]).push('Complete your basic profile information');
      }
      if (positions.length < 3) {
        (dashboard.nextSteps as string[]).push('Add your key policy positions');
      }
      if (qaEntries.length < 5) {
        (dashboard.nextSteps as string[]).push('Answer frequently asked questions');
      }
      
      res.json(dashboard);
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ error: 'Failed to load dashboard' });
    }
  });

  // Candidate Portal Profile
  app.get('/api/candidate-portal/profile', authenticateCandidate, async (req: Request & { candidate?: any }, res: Response) => {
    try {
      const candidateId = req.candidate.id;
      const profile = await storage.getCandidateProfile(candidateId);
      
      if (!profile) {
        // Create empty profile if none exists
        const newProfile = await storage.createCandidateProfile({
          candidateId,
          fullName: req.candidate.name || '',
          dataCompleteness: 0,
          verificationStatus: 'unverified'
        });
        return res.json(newProfile);
      }
      
      res.json(profile);
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  // Update Candidate Portal Profile
  app.put('/api/candidate-portal/profile', authenticateCandidate, async (req: Request & { candidate?: any }, res: Response) => {
    try {
      const candidateId = req.candidate.id;
      const updates = req.body;
      
      // Update the profile
      const updated = await storage.updateCandidateProfile(candidateId, updates);
      
      // Record data sources for accountability
      const updatedFields = Object.keys(updates);
      for (const fieldName of updatedFields) {
        await storage.recordDataSource({
          candidateId,
          fieldName,
          sourceType: 'candidate_supplied',
          sourceDescription: 'Candidate Campaign Portal Profile Update',
          confidenceScore: 100,
        });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // Candidate Portal Positions
  app.get('/api/candidate-portal/positions', authenticateCandidate, async (req: Request & { candidate?: any }, res: Response) => {
    try {
      const candidateId = req.candidate.id;
      const category = req.query.category as string;
      
      const positions = await storage.getCandidatePositions(candidateId, category);
      res.json(positions);
    } catch (error) {
      console.error('Positions fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch positions' });
    }
  });

  // Create Candidate Position
  app.post('/api/candidate-portal/positions', authenticateCandidate, async (req: Request & { candidate?: any }, res: Response) => {
    try {
      const candidateId = req.candidate.id;
      const positionData = {
        ...req.body,
        candidateId,
        isVerified: true // Candidate-supplied positions are considered verified
      };
      
      const position = await storage.createCandidatePosition(positionData);
      
      // Record data source
      await storage.recordDataSource({
        candidateId,
        fieldName: `position_${positionData.category}`,
        sourceType: 'candidate_supplied',
        sourceDescription: 'Candidate Campaign Portal Position Statement',
        confidenceScore: 100,
      });
      
      res.json(position);
    } catch (error) {
      console.error('Position creation error:', error);
      res.status(500).json({ error: 'Failed to create position' });
    }
  });

  // Update Candidate Position
  app.put('/api/candidate-portal/positions/:id', authenticateCandidate, async (req: Request & { candidate?: any }, res: Response) => {
    try {
      const positionId = parseInt(req.params.id);
      const candidateId = req.candidate.id;
      const updates = req.body;
      
      // Verify the position belongs to this candidate
      const existing = await storage.getCandidatePositionById(positionId);
      if (!existing || existing.candidateId !== candidateId) {
        return res.status(404).json({ error: 'Position not found' });
      }
      
      const updated = await storage.updateCandidatePosition(positionId, updates);
      
      // Record data source update
      await storage.recordDataSource({
        candidateId,
        fieldName: `position_${existing.category}`,
        sourceType: 'candidate_supplied',
        sourceDescription: 'Candidate Campaign Portal Position Update',
        confidenceScore: 100,
      });
      
      res.json(updated);
    } catch (error) {
      console.error('Position update error:', error);
      res.status(500).json({ error: 'Failed to update position' });
    }
  });

  // Delete Candidate Position
  app.delete('/api/candidate-portal/positions/:id', authenticateCandidate, async (req: Request & { candidate?: any }, res: Response) => {
    try {
      const positionId = parseInt(req.params.id);
      const candidateId = req.candidate.id;
      
      // Verify the position belongs to this candidate
      const existing = await storage.getCandidatePositionById(positionId);
      if (!existing || existing.candidateId !== candidateId) {
        return res.status(404).json({ error: 'Position not found' });
      }
      
      await storage.deleteCandidatePosition(positionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Position deletion error:', error);
      res.status(500).json({ error: 'Failed to delete position' });
    }
  });

  // Candidate Portal Q&A
  app.get('/api/candidate-portal/qa', authenticateCandidate, async (req: Request & { candidate?: any }, res: Response) => {
    try {
      const candidateId = req.candidate.id;
      const category = req.query.category as string;
      
      const qaEntries = await storage.getCandidateQAEntries(candidateId, category);
      res.json(qaEntries);
    } catch (error) {
      console.error('Q&A fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch Q&A entries' });
    }
  });
}