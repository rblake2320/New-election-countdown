import { Router } from "express";
import { pool } from "../db";
import { z } from "zod";
import { authRequired } from "../auth";

const router = Router();

// Get user's profile
router.get("/me", authRequired(), async (req, res) => {
  const userId = (req as any).userId;
  
  const profile = await pool.query(
    `SELECT * FROM candidate_profiles WHERE user_id=$1`,
    [userId]
  );
  
  if (!profile.rowCount) {
    return res.json({ profile: null });
  }
  
  res.json({ profile: profile.rows[0] });
});

// Create or update profile
router.put("/me", authRequired(), async (req, res) => {
  const userId = (req as any).userId;
  
  const schema = z.object({
    full_name: z.string().optional(),
    preferred_name: z.string().optional(),
    occupation: z.string().optional(),
    experience: z.string().optional(),
    bio: z.string().optional(),
    avatar_url: z.string().url().optional(),
    is_public: z.boolean().optional()
  });
  
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "bad_request", details: parse.error.issues });
  
  const { full_name, preferred_name, occupation, experience, bio, avatar_url, is_public } = parse.data;
  
  const profile = await pool.query(
    `INSERT INTO candidate_profiles(user_id, full_name, preferred_name, occupation, experience, bio, avatar_url, is_public)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT(user_id) DO UPDATE SET
       full_name=EXCLUDED.full_name,
       preferred_name=EXCLUDED.preferred_name,
       occupation=EXCLUDED.occupation,
       experience=EXCLUDED.experience,
       bio=EXCLUDED.bio,
       avatar_url=EXCLUDED.avatar_url,
       is_public=EXCLUDED.is_public,
       updated_at=now()
     RETURNING *`,
    [userId, full_name, preferred_name, occupation, experience, bio, avatar_url, is_public]
  );
  
  res.json({ profile: profile.rows[0] });
});

// Get public profile by user ID
router.get("/public/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  
  const profile = await pool.query(
    `SELECT full_name, preferred_name, occupation, bio, avatar_url 
     FROM candidate_profiles 
     WHERE user_id=$1 AND is_public=TRUE`,
    [userId]
  );
  
  if (!profile.rowCount) {
    return res.status(404).json({ error: "not_found" });
  }
  
  res.json({ profile: profile.rows[0] });
});

// Search public profiles
router.get("/search", async (req, res) => {
  const { q, limit = 20, offset = 0 } = req.query;
  
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: "query_required" });
  }
  
  const profiles = await pool.query(
    `SELECT user_id, full_name, preferred_name, occupation, bio, avatar_url
     FROM candidate_profiles
     WHERE is_public=TRUE 
       AND (full_name ILIKE $1 OR preferred_name ILIKE $1 OR bio ILIKE $1)
     ORDER BY updated_at DESC
     LIMIT $2 OFFSET $3`,
    [`%${q}%`, limit, offset]
  );
  
  res.json({ 
    profiles: profiles.rows,
    total: profiles.rowCount
  });
});

export default router;