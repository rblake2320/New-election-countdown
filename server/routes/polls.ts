import { Router } from "express";
import { pool } from "../db";

const router = Router();

/** GET /api/elections/:id/polls/summary */
router.get("/elections/:id/polls/summary", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const sql = `
      WITH r AS (
        SELECT pr.candidate_id,
               COALESCE(c.name, pr.option) AS label,
               p.end_date::date AS d,
               pr.pct::float AS pct
        FROM polls p
        JOIN poll_results pr ON pr.poll_id = p.id
        LEFT JOIN candidates c ON c.id = pr.candidate_id
        WHERE p.election_id = $1
      )
      SELECT label,
             AVG(pct) FILTER (WHERE d >= (current_date - INTERVAL '21 days')) AS avg21,
             MAX(d) AS last_date
      FROM r
      GROUP BY label
      ORDER BY avg21 DESC NULLS LAST;
    `;
    const { rows } = await pool.query(sql, [id]);
    res.json({ items: rows });
  } catch (e) { 
    next(e); 
  }
});

export default router;