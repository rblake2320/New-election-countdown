import { Router } from 'express';
import { neon } from '@neondatabase/serverless';

const router = Router();
const sql = neon(process.env.DATABASE_URL!);

// Helper to parse boolean query params
function toBool(v: any): boolean | undefined {
  if (v === undefined) return undefined;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(s)) return true;
  if (['false', '0', 'no', 'n'].includes(s)) return false;
  return undefined;
}

// GET /api/steward/audit-runs
router.get('/audit-runs', async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '25'), 10) || 25, 200);
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);
    const runType = req.query.run_type ? String(req.query.run_type) : undefined;
    const passFlag = toBool(req.query.pass);
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    // Build dynamic WHERE clause
    const conditions = [];
    const params = [];
    
    if (runType) {
      conditions.push(`run_type = $${params.length + 1}`);
      params.push(runType);
    }
    
    if (passFlag !== undefined) {
      conditions.push(`pass = $${params.length + 1}`);
      params.push(passFlag);
    }
    
    if (from && !isNaN(from.getTime())) {
      conditions.push(`started_at >= $${params.length + 1}`);
      params.push(from.toISOString());
    }
    
    if (to && !isNaN(to.getTime())) {
      conditions.push(`started_at <= $${params.length + 1}`);
      params.push(to.toISOString());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `SELECT count(*)::int as total FROM steward_audit_runs ${whereClause}`;
    const countResult = await sql(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get paginated results
    const query = `
      SELECT 
        id, 
        run_type, 
        started_at, 
        finished_at, 
        pass,
        total_findings_before, 
        fixes_applied, 
        remaining_open,
        ROUND(EXTRACT(EPOCH FROM (COALESCE(finished_at, now()) - started_at)))::int as duration_s
      FROM steward_audit_runs
      ${whereClause}
      ORDER BY started_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    const items = await sql(query, [...params, limit, offset]);

    res.json({
      total,
      limit,
      offset,
      items
    });
  } catch (error) {
    console.error('Error fetching audit runs:', error);
    res.status(500).json({ error: 'Failed to fetch audit runs' });
  }
});

// GET /api/steward/audit-runs/:id
router.get('/audit-runs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await sql`
      SELECT 
        id, 
        run_type, 
        started_at, 
        finished_at, 
        pass,
        total_findings_before, 
        fixes_applied, 
        remaining_open, 
        notes, 
        log
      FROM steward_audit_runs
      WHERE id = ${id}
    `;
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'not_found', id });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching audit run:', error);
    res.status(500).json({ error: 'Failed to fetch audit run' });
  }
});

// GET /api/steward/audit-runs.csv
router.get('/audit-runs.csv', async (req, res) => {
  try {
    const runType = req.query.run_type ? String(req.query.run_type) : undefined;
    const passFlag = toBool(req.query.pass);
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    // Build WHERE clause
    const conditions = [];
    const params = [];
    
    if (runType) {
      conditions.push(`run_type = $${params.length + 1}`);
      params.push(runType);
    }
    
    if (passFlag !== undefined) {
      conditions.push(`pass = $${params.length + 1}`);
      params.push(passFlag);
    }
    
    if (from && !isNaN(from.getTime())) {
      conditions.push(`started_at >= $${params.length + 1}`);
      params.push(from.toISOString());
    }
    
    if (to && !isNaN(to.getTime())) {
      conditions.push(`started_at <= $${params.length + 1}`);
      params.push(to.toISOString());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        id, 
        run_type, 
        started_at, 
        finished_at, 
        pass,
        total_findings_before, 
        fixes_applied, 
        remaining_open,
        ROUND(EXTRACT(EPOCH FROM (COALESCE(finished_at, now()) - started_at)))::int as duration_s
      FROM steward_audit_runs
      ${whereClause}
      ORDER BY started_at DESC
    `;
    
    const rows = await sql(query, params);

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="steward_audit_runs.csv"');

    // Build CSV content
    const header = [
      'id', 'run_type', 'started_at', 'finished_at', 'pass',
      'total_findings_before', 'fixes_applied', 'remaining_open', 'duration_s'
    ].join(',');

    const lines = rows.map(r => [
      r.id,
      r.run_type,
      new Date(r.started_at).toISOString(),
      r.finished_at ? new Date(r.finished_at).toISOString() : '',
      r.pass === true ? 'true' : r.pass === false ? 'false' : '',
      r.total_findings_before ?? '',
      r.fixes_applied ?? '',
      r.remaining_open ?? '',
      r.duration_s ?? ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    res.send([header, ...lines].join('\n'));
  } catch (error) {
    console.error('Error generating CSV:', error);
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

// POST /api/steward/audit-runs - Create a new audit run
router.post('/audit-runs', async (req, res) => {
  try {
    const { run_type = 'manual', notes } = req.body;
    
    const result = await sql`
      INSERT INTO steward_audit_runs (run_type, notes)
      VALUES (${run_type}, ${notes || null})
      RETURNING id, started_at
    `;
    
    res.json({ ok: true, audit_run: result[0] });
  } catch (error) {
    console.error('Error creating audit run:', error);
    res.status(500).json({ error: 'Failed to create audit run' });
  }
});

export default router;