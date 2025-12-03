import { Router } from 'express';
import { pool } from '../db.js';

export const mcpRouter = Router();

// List all MCPs
mcpRouter.get('/mcps', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, version, active, severity, detector_kind, 
              confidence_threshold, priority_threshold, notes,
              (detector_sql IS NOT NULL) AS has_sql, 
              (autofix_sql IS NOT NULL) AS has_autofix,
              created_at
       FROM steward_mcp_packs 
       ORDER BY severity, name`
    );
    res.json({ ok: true, items: rows });
  } catch (error) {
    console.error('MCP list error:', error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Run all active SQL MCPs to generate suggestions
mcpRouter.post('/mcps/scan', async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create a new run record
    const runResult = await client.query(
      `INSERT INTO steward_runs(started_at) VALUES (now()) RETURNING id`
    );
    const runId = runResult.rows[0].id;
    
    // Get all active MCPs with SQL detectors
    const { rows: mcps } = await client.query(
      `SELECT * FROM steward_mcp_packs 
       WHERE active = true AND detector_kind = 'SQL' AND detector_sql IS NOT NULL`
    );

    let totalInserted = 0;
    const results = [];

    for (const mcp of mcps) {
      try {
        // Run the detector SQL with error handling
        let detectorResult;
        try {
          detectorResult = await client.query(mcp.detector_sql);
        } catch (sqlError) {
          console.error(`SQL error in MCP ${mcp.name}:`, sqlError);
          // Skip this MCP if SQL fails
          results.push({
            mcp: mcp.name,
            error: `SQL error: ${sqlError instanceof Error ? sqlError.message : 'Unknown'}`
          });
          continue;
        }
        let inserted = 0;
        
        for (const row of detectorResult.rows) {
          // Build payload from row data
          const payload = {
            ...row,
            mcp_name: mcp.name,
            mcp_version: mcp.version
          };
          
          // Use confidence and priority from detector or defaults
          const confidence = Number(row.confidence ?? mcp.confidence_threshold);
          const priority = Number(row.priority ?? mcp.priority_threshold);
          
          // Check if similar suggestion already exists
          const existing = await client.query(
            `SELECT id FROM bot_suggestions 
             WHERE kind = $1 AND status = 'OPEN' 
             AND payload->>'election_id' = $2::text`,
            [mcp.name, row.election_id]
          );
          
          if (existing.rows.length === 0) {
            await client.query(
              `INSERT INTO bot_suggestions(kind, payload, confidence, priority)
               VALUES ($1, $2::jsonb, $3, $4)`,
              [
                mcp.name, 
                JSON.stringify(payload), 
                confidence, 
                priority
              ]
            );
            inserted++;
          }
        }
        
        totalInserted += inserted;
        results.push({
          mcp: mcp.name,
          detected: detectorResult.rows.length,
          inserted,
          skipped: detectorResult.rows.length - inserted
        });
        
      } catch (mcpError) {
        console.error(`Error running MCP ${mcp.name}:`, mcpError);
        results.push({
          mcp: mcp.name,
          error: mcpError instanceof Error ? mcpError.message : 'Unknown error'
        });
      }
    }
    
    // Update run record
    await client.query(
      `UPDATE steward_runs 
       SET finished_at = now(), inserted_suggestions = $1 
       WHERE id = $2`,
      [totalInserted, runId]
    );
    
    await client.query('COMMIT');
    
    res.json({ 
      ok: true, 
      runId,
      totalInserted,
      mcpsRun: mcps.length,
      results 
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('MCP scan error:', error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  } finally {
    client.release();
  }
});

// Get MCP metrics
mcpRouter.get('/mcps/metrics', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM v_steward_mcp_metrics ORDER BY kind`
    );
    res.json({ ok: true, metrics: rows });
  } catch (error) {
    console.error('MCP metrics error:', error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Label a suggestion (for learning)
mcpRouter.post('/suggestions/:id/label', async (req, res) => {
  const { id } = req.params;
  const { label, notes } = req.body;
  
  if (!['RIGHT', 'WRONG', 'SKIPPED', 'FIXED_EXTERNALLY'].includes(label)) {
    return res.status(400).json({ ok: false, error: 'Invalid label' });
  }
  
  try {
    await pool.query(
      `INSERT INTO steward_labels(suggestion_id, label, notes)
       VALUES ($1, $2, $3)`,
      [id, label, notes]
    );
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Label error:', error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default mcpRouter;