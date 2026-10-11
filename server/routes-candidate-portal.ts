import { Express, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { storage, type IStorage } from './storage';
// The exported storage is a forwarding proxy typed as the factory; the account methods live on IStorage.
const accounts = storage as unknown as IStorage;

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
import { getRequiredSecret } from './config/secrets';
import { createHash } from 'crypto';
import { isAuthenticated } from './auth';
import { requireAdmin } from './middleware/require-admin';
import type { CandidateAccount } from '@shared/schema';
const JWT_SECRET = getRequiredSecret('JWT_SECRET');

// ---------------------------------------------------------------------------
// OR-01 policy (security-orange.md): a portal request is authorized only when the
// token is bound to an account that is currently active, still attached to the
// same candidate, and whose credential has not changed since the token was issued.
// Registration never activates an account; an admin approves it.
// ---------------------------------------------------------------------------
export const CANDIDATE_TOKEN_AUDIENCE = 'electiontracker:candidate-portal';
export const CANDIDATE_TOKEN_ISSUER = 'electiontracker';
export const WRITE_ROLES = new Set(['candidate', 'campaign_manager']);
export type CandidateAccessLevel = 'pending' | 'full' | 'limited' | 'view_only';

/** Changes whenever the password hash changes, so a password reset revokes every outstanding token. */
export function candidateTokenVersion(account: Pick<CandidateAccount, 'passwordHash'>): string {
  return createHash('sha256').update(String(account.passwordHash ?? '')).digest('hex').slice(0, 16);
}

export function buildCandidateClaims(account: CandidateAccount) {
  return { sub: String(account.id), candidateId: account.candidateId, role: account.role, tv: candidateTokenVersion(account) };
}

export function signCandidateToken(account: CandidateAccount): string {
  return jwt.sign(buildCandidateClaims(account), JWT_SECRET, { expiresIn: '7d', audience: CANDIDATE_TOKEN_AUDIENCE, issuer: CANDIDATE_TOKEN_ISSUER });
}

export type SessionVerdict = { ok: true } | { ok: false; reason: 'no_account' | 'inactive' | 'pending' | 'candidate_mismatch' | 'credential_changed' };

/** Pure decision used by the middleware; unit-tested with synthetic pending/approved/deactivated accounts. */
export function evaluateCandidateSession(decoded: { sub?: string; candidateId?: number; tv?: string }, account: CandidateAccount | null): SessionVerdict {
  if (!account) return { ok: false, reason: 'no_account' };
  if ((account.accessLevel ?? 'pending') === 'pending') return { ok: false, reason: 'pending' };
  if (account.isActive !== true) return { ok: false, reason: 'inactive' };
  if (Number(decoded.candidateId) !== Number(account.candidateId)) return { ok: false, reason: 'candidate_mismatch' };
  if (decoded.tv !== candidateTokenVersion(account)) return { ok: false, reason: 'credential_changed' };
  return { ok: true };
}

/** Write authority: role must be a writing role and the account must not be view-only. */
export function canWriteCandidateData(account: Pick<CandidateAccount, 'role' | 'accessLevel' | 'isActive'>): boolean {
  return account.isActive === true && WRITE_ROLES.has(String(account.role)) && !['view_only', 'pending'].includes(String(account.accessLevel ?? 'pending'));
}

export function publicAccount(a: CandidateAccount) {
  const { passwordHash: _omit, ...rest } = a as any;
  return rest;
}

type PortalRequest = Request & { candidate?: any; candidateAccount?: CandidateAccount };

// Middleware to authenticate candidate requests (per-request account binding)
export const authenticateCandidate = async (req: PortalRequest, res: Response, next: Function) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET, { audience: CANDIDATE_TOKEN_AUDIENCE, issuer: CANDIDATE_TOKEN_ISSUER }) as any;
    const account = await accounts.getCandidateAccountById(Number(decoded.sub));
    const verdict = evaluateCandidateSession(decoded, account);
    if (verdict.ok !== true) return res.status(401).json({ error: 'Invalid token', reason: (verdict as { reason?: string }).reason });

    const candidate = await storage.getCandidateWithRAG(account!.candidateId);
    if (!candidate) return res.status(401).json({ error: 'Invalid token', reason: 'candidate_missing' });

    req.candidate = candidate;
    req.candidateAccount = account!;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Write routes additionally require a writing role on a non-view-only account.
export const requireCandidateWrite = (req: PortalRequest, res: Response, next: Function) => {
  if (!req.candidateAccount || !canWriteCandidateData(req.candidateAccount)) {
    return res.status(403).json({ error: 'This account may not modify candidate data' });
  }
  next();
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

      // OR-01: a login only succeeds for an approved, active account.
      if ((account.accessLevel ?? 'pending') === 'pending' || account.isActive !== true) {
        return res.status(403).json({ error: 'Account pending approval', status: 'pending_approval' });
      }
      const token = signCandidateToken(account);

      res.json({
        success: true,
        token,
        candidate: {
          id: account.candidateId,
          email: account.email,
          role: account.role,
          accessLevel: account.accessLevel,
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

      // OR-01: registration creates a PENDING account. Nobody can act for a candidate
      // until an administrator approves the claim; no token is issued here.
      const account = await storage.createCandidateAccount({
        candidateId: data.candidateId,
        email: data.email,
        passwordHash: data.password, // Will be hashed in storage method
        role: data.role,
        campaignName: data.campaignName,
        campaignTitle: data.campaignTitle,
        subscriptionTier: 'basic',
        emailVerified: false,
        isActive: false,
        accessLevel: 'pending',
      });

      // Record data source for accountability
      await storage.recordDataSource({
        candidateId: data.candidateId,
        fieldName: 'campaign_account',
        sourceType: 'candidate_supplied',
        sourceDescription: 'Candidate Campaign Portal Registration',
        confidenceScore: 100,
      });

      res.status(202).json({
        success: true,
        status: 'pending_approval',
        message: 'Registration received. An administrator must approve this campaign claim before the portal can be used.',
        candidate: { id: account.candidateId, email: account.email, role: account.role },
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
  app.put('/api/candidate/profile', authenticateCandidate, requireCandidateWrite, async (req: Request & { candidate?: any }, res: Response) => {
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
  app.put('/api/candidate-portal/profile', authenticateCandidate, requireCandidateWrite, async (req: Request & { candidate?: any }, res: Response) => {
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
  app.post('/api/candidate-portal/positions', authenticateCandidate, requireCandidateWrite, async (req: Request & { candidate?: any }, res: Response) => {
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
  app.put('/api/candidate-portal/positions/:id', authenticateCandidate, requireCandidateWrite, async (req: Request & { candidate?: any }, res: Response) => {
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
  app.delete('/api/candidate-portal/positions/:id', authenticateCandidate, requireCandidateWrite, async (req: Request & { candidate?: any }, res: Response) => {
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

  // === ADMIN: CANDIDATE CLAIM APPROVAL (OR-01) ===
  const adminOnly = [isAuthenticated, requireAdmin] as const;

  app.get('/api/admin/candidate-accounts', ...adminOnly, async (req: Request, res: Response) => {
    try {
      const status = String(req.query.status ?? 'pending');
      const accounts = await accounts.listCandidateAccounts(status === 'all' ? {} : { isActive: status === 'active' });
      res.json({ accounts: accounts.map(publicAccount) });
    } catch (error) {
      console.error('Candidate account list error:', error);
      res.status(500).json({ error: 'Failed to list candidate accounts' });
    }
  });

  app.post('/api/admin/candidate-accounts/:id/approve', ...adminOnly, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const parsed = z.object({ accessLevel: z.enum(['full', 'limited', 'view_only']).default('full') }).safeParse(req.body ?? {});
      if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ error: 'bad_request' });
      const updated = await accounts.setCandidateAccountActive(id, true, parsed.data.accessLevel);
      if (!updated) return res.status(404).json({ error: 'not_found' });
      console.log(`Candidate account ${id} approved by admin ${(req as any).userId} (accessLevel=${parsed.data.accessLevel})`);
      res.json({ account: publicAccount(updated) });
    } catch (error) {
      console.error('Candidate account approve error:', error);
      res.status(500).json({ error: 'Failed to approve candidate account' });
    }
  });

  app.post('/api/admin/candidate-accounts/:id/deactivate', ...adminOnly, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'bad_request' });
      // Deactivation takes effect on the next request: authenticateCandidate re-reads isActive.
      const updated = await accounts.setCandidateAccountActive(id, false);
      if (!updated) return res.status(404).json({ error: 'not_found' });
      console.log(`Candidate account ${id} deactivated by admin ${(req as any).userId}`);
      res.json({ account: publicAccount(updated) });
    } catch (error) {
      console.error('Candidate account deactivate error:', error);
      res.status(500).json({ error: 'Failed to deactivate candidate account' });
    }
  });
}