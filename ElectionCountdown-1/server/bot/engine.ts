import { neon } from '@neondatabase/serverless';
import type { Request, Response } from 'express';

const sql = neon(process.env.DATABASE_URL!);

type TaskName =
  | 'congressCounts'
  | 'priorityCoverage'
  | 'dateDrift'
  | 'udelHeuristic';

async function startRun(trigger: string, tasks: TaskName[]) {
  const result = await sql(
    `INSERT INTO bot_task_runs(trigger, tasks) VALUES ($1, $2) RETURNING run_id`,
    [trigger, JSON.stringify(tasks)]
  );
  return result[0].run_id as string;
}

async function finishRun(runId: string) {
  await sql(`UPDATE bot_task_runs SET finished_at=now() WHERE run_id=$1`, [runId]);
}

/** Helper to insert a suggestion */
async function suggest(
  runId: string, 
  kind: string, 
  severity: 'low'|'medium'|'high'|'critical',
  electionId: number|null, 
  state: string|null, 
  message: string, 
  payload: any
) {
  await sql(
    `INSERT INTO bot_suggestions(run_id, kind, severity, election_id, state, message, payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [runId, kind, severity, electionId, state, message, payload]
  );
}

/** Task: congress counts vs expected house+2 */
async function taskCongressCounts(runId: string) {
  const rows = await sql(`
    SELECT state, expected_total, actual_total, (actual_total-expected_total) AS delta
    FROM v_congress_mismatch
  `);
  for (const r of rows) {
    const sev = Math.abs(r.delta) >= 2 ? 'high' : 'medium';
    await suggest(
      runId, 'CONGRESS_MISMATCH', sev as any, null, r.state,
      `Congress mismatch ${r.state}: actual=${r.actual_total} expected=${r.expected_total} (Δ=${r.delta})`,
      { state: r.state, actual: r.actual_total, expected: r.expected_total, delta: r.delta }
    );
  }
}

/** Task: priority elections missing candidates */
async function taskPriorityCoverage(runId: string) {
  const rows = await sql(`SELECT * FROM v_priority_missing_candidates`);
  for (const r of rows) {
    await suggest(
      runId, 'MISSING_CANDIDATES', 'critical',
      r.election_id, r.state,
      `Priority race lacks candidates: have=${r.candidate_count} need>=${r.min_candidates}`,
      {
        election_id: r.election_id,
        title: r.title,
        state: r.state,
        date: r.election_date,
        need: r.min_candidates
      }
    );
  }
}

/** Task: date drift (lowest-priority authority says the date moved) */
async function taskDateDrift(runId: string) {
  const rows = await sql(`
    SELECT eda.election_id, eda.authority, eda.reported_date, eda.priority, eda.confidence,
           e.title, e.state, e.date AS current_date
    FROM election_date_authorities eda
    JOIN elections e ON e.id = eda.election_id
    WHERE eda.priority = (
      SELECT min(priority) FROM election_date_authorities x WHERE x.election_id=eda.election_id
    )
      AND eda.reported_date IS DISTINCT FROM e.date
  `);
  for (const r of rows) {
    await suggest(
      runId, 'DATE_DRIFT', 'high',
      r.election_id, r.state,
      `Authoritative date differs (${r.authority} ${r.reported_date} vs current ${r.current_date})`,
      {
        election_id: r.election_id,
        authority: r.authority,
        new_date: r.reported_date,
        priority: r.priority,
        confidence: r.confidence
      }
    );
  }
}

/** Task: CA UDEL heuristic */
async function taskUdelHeuristic(runId: string) {
  const rows = await sql(`
    SELECT id AS election_id, title, state, date as election_date
    FROM elections
    WHERE state='CA' AND level='Local' AND EXTRACT(YEAR FROM date)::int % 2 = 1
      AND EXTRACT(MONTH FROM date) <> 11
  `);
  for (const r of rows) {
    await suggest(
      runId, 'UDEL_HEURISTIC', 'medium',
      r.election_id, 'CA',
      `CA local odd-year election not in November: ${r.title} on ${r.election_date}`,
      { election_id: r.election_id, title: r.title, date: r.election_date }
    );
  }
}

/** Apply fixes */
export async function applySuggestion(id: number) {
  const rows = await sql(
    `SELECT * FROM bot_suggestions WHERE id=$1 AND status='OPEN'`, 
    [id]
  );
  if (!rows.length) return { ok: false, error: 'not_open' };
  const s = rows[0];

  try {
    if (s.kind === 'DATE_DRIFT') {
      // Run reconcile function
      await sql(`SELECT reconcile_election_dates_from_authorities(1000)`);
    } else if (s.kind === 'MISSING_CANDIDATES' && s.payload?.title && s.payload?.state) {
      if (Array.isArray(s.payload.seed)) {
        await sql(
          `SELECT upsert_candidates_for_title($1,$2,$3::date,$4::jsonb)`,
          [s.payload.title, s.payload.state, s.payload.date?.slice(0,10), JSON.stringify(s.payload.seed)]
        );
      } else {
        return { ok: false, error: 'no_seed' };
      }
    } else {
      return { ok: false, error: 'not_autofixable' };
    }

    await sql(`UPDATE bot_suggestions SET status='APPLIED', acted_at=now() WHERE id=$1`, [id]);
    return { ok: true };
  } catch (e: any) {
    await sql(`UPDATE bot_suggestions SET status='FAILED', acted_at=now() WHERE id=$1`, [id]);
    return { ok: false, error: e.message };
  }
}

/** Run a set of tasks now */
export async function runBot(
  trigger = 'manual', 
  tasks: TaskName[] = ['congressCounts','priorityCoverage','dateDrift','udelHeuristic']
) {
  const runId = await startRun(trigger, tasks);
  try {
    for (const t of tasks) {
      if (t === 'congressCounts') await taskCongressCounts(runId);
      if (t === 'priorityCoverage') await taskPriorityCoverage(runId);
      if (t === 'dateDrift') await taskDateDrift(runId);
      if (t === 'udelHeuristic') await taskUdelHeuristic(runId);
    }
  } finally {
    await finishRun(runId);
  }
  
  // Get count of suggestions created
  const countResult = await sql(
    `SELECT COUNT(*) as count FROM bot_suggestions WHERE run_id = $1`,
    [runId]
  );
  
  return { ok: true, runId, suggestionsCreated: countResult[0].count };
}