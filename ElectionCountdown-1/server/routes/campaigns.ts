import { Router } from "express";
import { pool } from "../db";
import { z } from "zod";
import { authRequired, makeApiKey, hashPassword } from "../auth";
import argon2 from "argon2";
import { storageFactory } from "../storage-factory";

const router = Router();

// Register a campaign
router.post("/register", authRequired(), async (req, res) => {
  // Check database health first
  if (!storageFactory.isDatabaseAvailable()) {
    console.log('Campaign registration blocked: Database unhealthy');
    return res.status(503).json({
      error: 'Campaign registration temporarily unavailable',
      message: 'Database is unhealthy - campaign registration is temporarily disabled',
      mode: 'degraded'
    });
  }
  
  const schema = z.object({
    campaign_name: z.string().min(1),
    candidate_name: z.string().min(1),
    office_seeking: z.string().min(1),
    contact_email: z.string().email(),
    election_id: z.number().optional()
  });
  
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "bad_request", details: parse.error.issues });
  
  const userId = (req as any).userId;
  const { campaign_name, candidate_name, office_seeking, contact_email, election_id } = parse.data;
  
  // Generate API key
  const apiKey = makeApiKey();
  const apiKeyHash = await argon2.hash(apiKey.raw);
  
  const campaign = await pool.query(
    `INSERT INTO campaigns(user_id, campaign_name, candidate_name, office_seeking, contact_email, election_id, api_key_prefix, api_key_hash)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, campaign_name, candidate_name, api_key_prefix`,
    [userId, campaign_name, candidate_name, office_seeking, contact_email, election_id, apiKey.prefix, apiKeyHash]
  );
  
  res.status(201).json({
    campaign: campaign.rows[0],
    api_key: apiKey.raw // Only shown once
  });
});

// List user's campaigns
router.get("/my-campaigns", authRequired(), async (req, res) => {
  const userId = (req as any).userId;
  const campaigns = await pool.query(
    `SELECT id, campaign_name, candidate_name, office_seeking, contact_email, election_id, created_at 
     FROM campaigns WHERE user_id=$1 ORDER BY created_at DESC`,
    [userId]
  );
  res.json({ campaigns: campaigns.rows });
});

// Get campaign details
router.get("/:id", authRequired(), async (req, res) => {
  const userId = (req as any).userId;
  const campaignId = parseInt(req.params.id);
  
  const campaign = await pool.query(
    `SELECT * FROM campaigns WHERE id=$1 AND user_id=$2`,
    [campaignId, userId]
  );
  
  if (!campaign.rowCount) return res.status(404).json({ error: "not_found" });
  res.json({ campaign: campaign.rows[0] });
});

// Update campaign
router.patch("/:id", authRequired(), async (req, res) => {
  // Check database health first
  if (!storageFactory.isDatabaseAvailable()) {
    console.log('Campaign update blocked: Database unhealthy');
    return res.status(503).json({
      error: 'Campaign update temporarily unavailable',
      message: 'Database is unhealthy - campaign updates are temporarily disabled',
      mode: 'degraded'
    });
  }
  
  const userId = (req as any).userId;
  const campaignId = parseInt(req.params.id);
  
  const schema = z.object({
    campaign_name: z.string().min(1).optional(),
    office_seeking: z.string().min(1).optional(),
    contact_email: z.string().email().optional()
  });
  
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "bad_request", details: parse.error.issues });
  
  const updates = parse.data;
  const setClauses = Object.keys(updates).map((key, i) => `${key}=$${i+3}`);
  if (setClauses.length === 0) return res.json({ ok: true });
  
  const values = Object.values(updates);
  const result = await pool.query(
    `UPDATE campaigns SET ${setClauses.join(", ")}, updated_at=now() 
     WHERE id=$1 AND user_id=$2 RETURNING *`,
    [campaignId, userId, ...values]
  );
  
  if (!result.rowCount) return res.status(404).json({ error: "not_found" });
  res.json({ campaign: result.rows[0] });
});

// Delete campaign
router.delete("/:id", authRequired(), async (req, res) => {
  // Check database health first
  if (!storageFactory.isDatabaseAvailable()) {
    console.log('Campaign deletion blocked: Database unhealthy');
    return res.status(503).json({
      error: 'Campaign deletion temporarily unavailable',
      message: 'Database is unhealthy - campaign deletions are temporarily disabled',
      mode: 'degraded'
    });
  }
  
  const userId = (req as any).userId;
  const campaignId = parseInt(req.params.id);
  
  const result = await pool.query(
    `DELETE FROM campaigns WHERE id=$1 AND user_id=$2`,
    [campaignId, userId]
  );
  
  if (!result.rowCount) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

export default router;