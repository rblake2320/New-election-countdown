import { Router } from "express";
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const electionsCountsRouter = Router();

electionsCountsRouter.get("/", async (req, res) => {
  try {
    const { rows: [counts] } = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN date >= CURRENT_DATE THEN 1 END) as upcoming,
        COUNT(CASE WHEN date < CURRENT_DATE THEN 1 END) as past,
        COUNT(CASE WHEN type = 'general' THEN 1 END) as general,
        COUNT(CASE WHEN type = 'primary' THEN 1 END) as primary,
        COUNT(CASE WHEN type = 'special' THEN 1 END) as special
      FROM elections
    `);
    
    res.json({
      total: Number(counts.total),
      upcoming: Number(counts.upcoming),
      past: Number(counts.past),
      byType: {
        general: Number(counts.general),
        primary: Number(counts.primary),
        special: Number(counts.special)
      }
    });
  } catch (error) {
    console.error("Error fetching election counts:", error);
    res.status(500).json({ error: "Failed to fetch counts" });
  }
});

export { electionsCountsRouter };