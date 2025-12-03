import { Router } from "express";
import { pool } from "../db";

// This router provides an API endpoint for fetching candidates by IDs
export const electionsGuardRouter = Router();

// GET /api/elections/candidates-by-ids
electionsGuardRouter.get("/candidates-by-ids", async (req, res) => {
  const ids = (req.query.ids as string || "")
    .split(",")
    .map(id => Number(id))
    .filter(id => Number.isFinite(id));

  if (!ids.length) {
    return res.json([]);
  }

  try {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
    const sql = `
      SELECT 
        c.id,
        c.name,
        c.party,
        c.is_incumbent as incumbent,
        c.profile_image_url,
        c.total_receipts,
        c.contact_email,
        e.title as election_title
      FROM candidates c
      JOIN elections e ON c.election_id = e.id
      WHERE c.id IN (${placeholders})
      ORDER BY c.name
    `;
    
    const { rows } = await pool.query(sql, ids);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching candidates by IDs:", error);
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
});