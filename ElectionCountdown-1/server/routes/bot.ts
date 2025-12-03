import { Router } from 'express';
import { runBot, applySuggestion } from '../bot/engine.js';
import { neon } from '@neondatabase/serverless';
import { storageFactory } from '../storage-factory';

const sql = neon(process.env.DATABASE_URL!);
export const botRouter = Router();

// Run bot tasks
botRouter.post('/run', async (req, res) => {
  // Check database health first - bot operations should be blocked when unhealthy
  if (!storageFactory.isDatabaseAvailable()) {
    console.log('Bot run blocked: Database unhealthy');
    return res.status(503).json({
      ok: false,
      error: 'Bot operations temporarily unavailable',
      message: 'Database is unhealthy - bot operations are temporarily disabled for safety',
      mode: 'degraded'
    });
  }
  
  try {
    const tasks = (req.body?.tasks ?? []) as any[];
    const result = await runBot('manual', tasks.length ? tasks : undefined);
    res.json(result);
  } catch (error: any) {
    console.log('Bot run error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get suggestions
botRouter.get('/suggestions', async (req, res) => {
  try {
    const status = req.query.status as string || 'OPEN';
    const rows = await sql(
      `SELECT id, kind, severity, status, election_id, state, message, payload, created_at
       FROM bot_suggestions
       WHERE status = $1::bot_suggestion_status
       ORDER BY 
         CASE severity 
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END,
         created_at DESC
       LIMIT 200`,
      [status]
    );
    res.json(rows);
  } catch (error: any) {
    console.log('Get suggestions error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: error.message });
  }
});

// Apply a suggestion
botRouter.post('/suggestions/:id/apply', async (req, res) => {
  // Block suggestion application when database is unhealthy
  if (!storageFactory.isDatabaseAvailable()) {
    console.log('Bot suggestion apply blocked: Database unhealthy');
    return res.status(503).json({
      ok: false,
      error: 'Suggestion application blocked',
      message: 'Database is unhealthy - suggestion applications are temporarily disabled for safety',
      suggestion_id: req.params.id,
      mode: 'degraded'
    });
  }
  
  try {
    const id = Number(req.params.id);
    const result = await applySuggestion(id);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (error: any) {
    console.log('Apply suggestion error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Dismiss a suggestion
botRouter.post('/suggestions/:id/dismiss', async (req, res) => {
  // Block suggestion dismissal when database is unhealthy
  if (!storageFactory.isDatabaseAvailable()) {
    console.log('Bot suggestion dismiss blocked: Database unhealthy');
    return res.status(503).json({
      ok: false,
      error: 'Suggestion dismissal blocked',
      message: 'Database is unhealthy - suggestion dismissals are temporarily disabled',
      suggestion_id: req.params.id,
      mode: 'degraded'
    });
  }
  
  try {
    const id = Number(req.params.id);
    await sql(
      `UPDATE bot_suggestions SET status='DISMISSED', acted_at=now() 
       WHERE id=$1 AND status='OPEN'`, 
      [id]
    );
    res.json({ ok: true });
  } catch (error: any) {
    console.log('Dismiss suggestion error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get bot stats
botRouter.get('/stats', async (req, res) => {
  try {
    const stats = await sql(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'OPEN') as open,
        COUNT(*) FILTER (WHERE status = 'APPLIED') as applied,
        COUNT(*) FILTER (WHERE status = 'DISMISSED') as dismissed,
        COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
        COUNT(*) as total
      FROM bot_suggestions
    `);
    
    const recent = await sql(`
      SELECT run_id, started_at, finished_at, trigger, tasks
      FROM bot_task_runs
      ORDER BY started_at DESC
      LIMIT 5
    `);
    
    res.json({
      suggestions: stats[0],
      recentRuns: recent
    });
  } catch (error: any) {
    console.log('Get stats error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: error.message });
  }
});