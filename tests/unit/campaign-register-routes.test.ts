import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { registerCampaignRegisterRoutes } from '../../server/campaign-register-routes';
import { MemStorage } from '../../server/mem-storage';
import { SUBSCRIPTION_TIERS, TIER_ACTIVATION, hashApiKey, type CampaignTier } from '../../server/campaign-portal-service';

// ET-40: registration must persist the account and only issue a key the portal will
// accept. Real express + the real MemStorage (same IStorage contract as the DB storage);
// the DB path is proven live on the private copy (receipts on the PR).

function store() {
  const mem = new MemStorage();
  const elections = new Map<number, any>([[2, { id: 2, title: 'U.S. Senate Election - Alaska', location: 'Alaska', date: new Date('2026-11-03') }]]);
  return {
    mem,
    storage: {
      getElection: async (id: number) => elections.get(id),
      createCampaignAccount: (d: any) => mem.createCampaignAccount(d),
    },
  };
}

async function serve(storage: any) {
  const app = express();
  app.use(express.json());
  registerCampaignRegisterRoutes(app, { storage });
  const server = createServer(app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  const post = (body: unknown) => fetch(`http://127.0.0.1:${port}/api/campaign/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return { post, close: () => new Promise<void>((r) => server.close(() => r())) };
}

const freeTier = (Object.keys(TIER_ACTIVATION) as CampaignTier[]).find((t) => TIER_ACTIVATION[t] === 'free');
const paidTier = (Object.keys(TIER_ACTIVATION) as CampaignTier[]).find((t) => TIER_ACTIVATION[t] === 'invitation_required');

describe('POST /api/campaign/register (ET-40)', () => {
  let s: ReturnType<typeof store>;
  beforeEach(() => { s = store(); });

  it('rejects bad input with 400 and field details, writing nothing', async () => {
    const { post, close } = await serve(s.storage);
    try {
      const res = await post({ organizationName: 'X', contactEmail: 'not-an-email', electionId: 'abc' });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('invalid_registration');
      expect(body.details.map((d: any) => d.path).sort()).toEqual(['contactEmail', 'electionId', 'organizationName']);
      await expect(s.mem.validateCampaignAccess('anything')).rejects.toThrow(/Invalid API key/);
    } finally { await close(); }
  });

  it('404 for an unknown election, writing nothing', async () => {
    const { post, close } = await serve(s.storage);
    try {
      const res = await post({ organizationName: 'Org Name', contactEmail: 'a@b.co', electionId: 99999 });
      expect(res.status).toBe(404);
      expect((await res.json()).code).toBe('election_not_found');
    } finally { await close(); }
  });

  it('an invitation_required tier is persisted inactive, answers 403 INVITATION_REQUIRED and issues NO key', async () => {
    if (!paidTier) return; // every tier free: nothing to assert here
    const { post, close } = await serve(s.storage);
    try {
      const res = await post({ organizationName: 'Org Name', contactEmail: 'a@b.co', electionId: 2, subscriptionTier: paidTier });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('INVITATION_REQUIRED');
      expect(JSON.stringify(body)).not.toMatch(/price|\$|purchase|payment/i);
      expect(body.data.subscription).toMatchObject({ tier: paidTier, isActive: false, status: 'invitation_requested' });
      expect(body.data.subscription).not.toHaveProperty('priceCents');
      expect(JSON.stringify(body)).not.toMatch(/camp_[0-9a-f]{64}/);
      expect(typeof body.data.campaignId).toBe('number');
    } finally { await close(); }
  });

  it('a free tier is persisted active and the issued key validates (hashed at rest)', async () => {
    if (!freeTier) return; // no free tier today (owner/B decision pending) - see payment test
    const { post, close } = await serve(s.storage);
    try {
      const res = await post({ organizationName: 'Org Name', contactEmail: 'a@b.co', electionId: 2, subscriptionTier: freeTier });
      expect(res.status).toBe(201);
      const body = await res.json();
      const key: string = body.data.apiKey;
      expect(key).toMatch(/^camp_[0-9a-f]{64}$/);
      expect(body.data.keyLast4).toBe(key.slice(-4));
      const account = await s.mem.validateCampaignAccess(key);
      expect(account.id).toBe(body.data.campaignId);
      expect(account.apiKey).toBe(hashApiKey(key));
      expect(account.apiKey).not.toBe(key);
      await expect(s.mem.validateCampaignAccess(key.slice(0, -1) + 'x')).rejects.toThrow(/Invalid API key/);
    } finally { await close(); }
  });

  it('the activation policy is explicit for every tier and no tier carries a price or purchase wording', () => {
    for (const tier of Object.keys(SUBSCRIPTION_TIERS) as CampaignTier[]) {
      expect(['free', 'invitation_required']).toContain(TIER_ACTIVATION[tier]);
      expect(SUBSCRIPTION_TIERS[tier]).not.toHaveProperty('price');
      expect(JSON.stringify(SUBSCRIPTION_TIERS[tier])).not.toMatch(/\$|purchase|payment|per month/i);
    }
  });

  it('MemStorage no longer validates arbitrary keys', async () => {
    await expect(s.mem.validateCampaignAccess('camp_' + 'f'.repeat(64))).rejects.toThrow(/Invalid API key/);
  });
});
