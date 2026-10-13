import type { Express, RequestHandler } from 'express';
import { z } from 'zod';
import {
  SUBSCRIPTION_TIERS,
  TIER_ACTIVATION,
  type CampaignTier,
  type CreatedCampaignAccount,
  type NewCampaignAccountInput,
} from './campaign-portal-service';

// ET-40: campaign registration used to build the account in memory and hand out a
// Math.random key that was never stored, so every later portal call failed
// validateCampaignAccess. This router persists the account through the storage
// contract and only issues a key when the tier is actually usable today.

export const campaignRegisterSchema = z.object({
  organizationName: z.string().trim().min(2).max(200),
  contactEmail: z.string().trim().email().max(254),
  electionId: z.coerce.number().int().positive(),
  subscriptionTier: z.enum(['basic', 'pro', 'enterprise', 'custom']).default('basic'),
});

export interface CampaignRegisterStorage {
  getElection(id: number): Promise<{ id: number; title: string; location: string | null; date: Date | string } | undefined | null>;
  createCampaignAccount(data: NewCampaignAccountInput): Promise<CreatedCampaignAccount>;
}

export function registerCampaignRegisterRoutes(
  app: Express,
  deps: { storage: CampaignRegisterStorage; limiter?: RequestHandler },
) {
  const handlers: RequestHandler[] = deps.limiter ? [deps.limiter] : [];

  app.post('/api/campaign/register', ...handlers, async (req, res) => {
    const parsed = campaignRegisterSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'invalid_registration',
        error: 'Invalid registration',
        details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    const { organizationName, contactEmail, electionId, subscriptionTier } = parsed.data;

    let election;
    try {
      election = await deps.storage.getElection(electionId);
    } catch (error) {
      console.error('Campaign registration: election lookup failed:', error);
      return res.status(503).json({ success: false, code: 'registration_unavailable', error: 'Registration is temporarily unavailable' });
    }
    if (!election) {
      return res.status(404).json({ success: false, code: 'election_not_found', error: `Election with ID ${electionId} not found` });
    }

    const tier: CampaignTier = subscriptionTier;
    const activation = TIER_ACTIVATION[tier];

    let created: CreatedCampaignAccount;
    try {
      created = await deps.storage.createCampaignAccount({
        organizationName,
        contactEmail,
        electionId,
        subscriptionTier: tier,
        isActive: activation === 'free',
      });
    } catch (error) {
      console.error('Campaign registration: persist failed:', error);
      return res.status(503).json({ success: false, code: 'registration_unavailable', error: 'Registration is temporarily unavailable' });
    }

    const electionInfo = { id: election.id, title: election.title, location: election.location, date: election.date };
    const tierInfo = SUBSCRIPTION_TIERS[tier];

    if (activation !== 'free' || !created.apiKey) {
      // Honest refusal: the portal is invitation-only during early access (owner decision 2026-10-13). The
      // request is recorded inactive and NO key is issued; nothing here quotes a price or implies a purchase.
      return res.status(403).json({
        success: false,
        code: 'INVITATION_REQUIRED',
        error: 'Campaign portal access is by invitation during early access; your request has been recorded',
        data: {
          campaignId: created.account.id,
          subscription: { tier, name: tierInfo.name, isActive: false, status: 'invitation_requested' },
          electionInfo,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Campaign registered successfully',
      data: {
        apiKey: created.apiKey,
        keyLast4: created.account.keyLast4,
        campaignId: created.account.id,
        subscription: {
          tier,
          name: tierInfo.name,
          features: tierInfo.features,
          isActive: true,
          monthlyLimit: created.account.monthlyApiLimit,
        },
        electionInfo,
      },
      nextSteps: [
        'Save your API key securely - it is shown once and cannot be recovered',
        'Use the API key in request headers as "X-API-Key"',
        'Review available analytics endpoints in your dashboard',
        `Your ${tier} plan includes ${created.account.monthlyApiLimit} API calls per month`,
      ],
    });
  });
}
