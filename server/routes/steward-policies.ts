import { Router } from 'express';
import { rawSql as sql } from '../db';

const router = Router();

/** The steward tables ship in no migration; a missing table is a provisioning fact, not a 500. */
async function provisioned(table: string): Promise<boolean> {
  const rows = await sql<{ t: string | null }>`select to_regclass(${table})::text as t`;
  return Boolean(rows[0]?.t);
}
function notProvisioned(res: import('express').Response, table: string) {
  return res.status(503).json({ error: 'steward_not_provisioned', message: `${table} is not present in this database` });
}

// Get all policies with their auto-fix settings
router.get('/policies', async (_req, res) => {
  try {
    if (!(await provisioned('steward_policies'))) return notProvisioned(res, 'steward_policies');
    const policies = await sql`
      SELECT 
        id,
        name,
        detector_sql,
        auto_fix_enabled,
        auto_fix_max_severity,
        auto_fixes_applied,
        (autofix_sql IS NOT NULL) as has_fix_sql,
        (verification_sql IS NOT NULL) as has_verification
      FROM steward_mcp_packs
      WHERE active = true
      ORDER BY name
    `;

    res.json({ ok: true, policies });
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

// Toggle auto-fix for a specific policy
router.patch('/policies/:name/auto-fix', async (req, res) => {
  const { name } = req.params;
  const { enabled, maxSeverity } = req.body;

  try {
    if (!(await provisioned('steward_policies'))) return notProvisioned(res, 'steward_policies');
    const updated = await sql`
      UPDATE steward_mcp_packs
      SET 
        auto_fix_enabled = ${enabled},
        auto_fix_max_severity = ${maxSeverity || null}
      WHERE name = ${name}
      RETURNING *
    `;

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json({ ok: true, policy: updated[0] });
  } catch (error) {
    console.error('Error updating policy:', error);
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

export default router;