/**
 * Populate elections.polls_open / polls_close / timezone and the provenance
 * columns poll_close_kind / poll_hours_basis / poll_hours_source for every
 * 2026-11-03 row.
 *
 * Data table + conventions: server/poll-hours-2026.ts (tested in tests/unit/poll-hours-2026.test.ts).
 * Sources of record (retrieved 2026-10-11)
 *   - NCSL, "Polling Places" (statute cited per state), primary:
 *     https://www.ncsl.org/elections-and-campaigns/polling-places
 *   - Official state pages where NCSL is superseded: North Dakota actual 2026
 *     polling-place schedule (vip.sos.nd.gov, eid=348), Oregon SOS return
 *     deadline, Rhode Island SOS 2026 election calendar.
 *   - Cross-check only: 270toWin Eastern-time close table; Ballotpedia 2026 table.
 *
 * Conventions
 *   - Times are LOCAL 24h "HH:MM" strings in the row's `timezone` (IANA).
 *   - `timezone` is the LATEST (westernmost) zone with voters in the state, so
 *     the close instant is a statewide upper bound: nowhere in the state is
 *     still open after it. No per-district overrides (DISTRICT_TZ_OVERRIDES is
 *     empty); basis is statewide_latest for every row.
 *   - polls_open is null in multi-zone states and wherever statute leaves the
 *     opening to the municipality; it is never a guess.
 *   - polls_close is the actual statewide latest close. ND uses the actual
 *     2026 county schedule (19:00 Mountain), not a statutory minimum. KS and NH
 *     are null with basis local_variable because the real close varies by
 *     county/municipality and was not collected.
 *   - poll_close_kind: "polls" = in-person close; "ballot_return" = in-person /
 *     drop-box return deadline in vote-by-mail states (CA CO HI NV OR UT WA).
 *   - DST ends 2026-11-01, so every zone is on standard time on election day.
 *
 * Transaction shape (--apply)
 *   One SERIALIZABLE transaction holding SHARE ROW EXCLUSIVE on elections:
 *   ADD COLUMN IF NOT EXISTS x3, read, update, post-check, COMMIT. Any error
 *   (including an unknown state or zero election-day rows) rolls back schema
 *   and data together. Dry-run is a READ ONLY transaction that is rolled back.
 *   Proof: scripts/verify_poll_hours_txn.sh + docs/evidence/et10/.
 *
 * Usage
 *   npx tsx scripts/seed_poll_hours_2026.ts            # dry-run: prints the plan, writes nothing
 *   npx tsx scripts/seed_poll_hours_2026.ts --apply    # writes; idempotent (re-running changes 0 rows)
 *   DATABASE_URL=... to target a specific database.
 */
import { pool } from "../server/db";

import { pollHoursFor, ELECTION_DAY_2026 as ELECTION_DAY } from "../server/poll-hours-2026";


async function main() {
  const apply = process.argv.includes("--apply");
  // Test hook (never set in production): abort after N updates to prove the whole
  // transaction - schema change included - rolls back.
  const injectFailureAfter = Number(process.env.POLL_HOURS_INJECT_FAILURE_AFTER || 0);
  const client = await pool.connect();
  try {
    // One transaction for everything. DDL is transactional in PostgreSQL, so the
    // additive columns, the read, and the updates commit or roll back together.
    await client.query(apply ? "BEGIN ISOLATION LEVEL SERIALIZABLE" : "BEGIN READ ONLY");
    if (apply) {
      await client.query(`LOCK TABLE elections IN SHARE ROW EXCLUSIVE MODE`);
      await client.query(`ALTER TABLE elections ADD COLUMN IF NOT EXISTS poll_close_kind text`);
      await client.query(`ALTER TABLE elections ADD COLUMN IF NOT EXISTS poll_hours_basis text`);
      await client.query(`ALTER TABLE elections ADD COLUMN IF NOT EXISTS poll_hours_source text`);
    }
    const colq = await client.query<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_name = 'elections' AND column_name IN ('poll_close_kind','poll_hours_basis','poll_hours_source')`);
    const haveMeta = colq.rowCount === 3;
    if (!haveMeta) console.log("note: provenance columns absent on this DB (dry-run leaves schema untouched; --apply adds them inside the same transaction)");
    const metaCols = haveMeta ? ", poll_close_kind, poll_hours_basis, poll_hours_source" : ", NULL::text AS poll_close_kind, NULL::text AS poll_hours_basis, NULL::text AS poll_hours_source";
    const { rows } = await client.query<{ id: number; state: string; title: string; polls_open: string | null; polls_close: string | null; timezone: string | null; poll_close_kind: string | null; poll_hours_basis: string | null; poll_hours_source: string | null }>(
      `SELECT id, state, title, polls_open, polls_close, timezone${metaCols} FROM elections WHERE date = $1::date ORDER BY state, title`,
      [ELECTION_DAY],
    );
    const plan: Array<{ id: number; state: string; title: string; open: string | null; close: string | null; tz: string; kind: string; basis: string; source: string }> = [];
    const missingStates = new Set<string>();
    for (const r of rows) {
      const h = pollHoursFor(r.state, r.title);
      if (!h) { missingStates.add(r.state); continue; }
      if (r.polls_open !== h.open || r.polls_close !== h.close || r.timezone !== h.tz || r.poll_close_kind !== h.kind || r.poll_hours_basis !== h.basis || r.poll_hours_source !== h.source) {
        plan.push({ id: r.id, state: r.state, title: r.title, open: h.open, close: h.close, tz: h.tz, kind: h.kind, basis: h.basis, source: h.source });
      }
    }
    const byState: Record<string, number> = {};
    for (const p of plan) byState[p.state] = (byState[p.state] || 0) + 1;
    console.log(`${ELECTION_DAY}: ${rows.length} rows; ${plan.length} need changes; states missing from table: ${[...missingStates].join(",") || "none"}`);
    console.log("changes by state:", JSON.stringify(byState));
    if (rows.length === 0) throw new Error(`refusing: no elections found for ${ELECTION_DAY}`);
    if (missingStates.size > 0) throw new Error(`refusing: no poll-hours entry for state(s) ${[...missingStates].join(",")} - partial coverage is not applied`);
    if (!apply) { await client.query("ROLLBACK"); console.log("dry-run only - re-run with --apply to write"); return; }

    let updated = 0;
    for (const p of plan) {
      const res = await client.query(`UPDATE elections SET polls_open = $1, polls_close = $2, timezone = $3, poll_close_kind = $4, poll_hours_basis = $5, poll_hours_source = $6 WHERE id = $7`, [p.open, p.close, p.tz, p.kind, p.basis, p.source, p.id]);
      updated += res.rowCount ?? 0;
      if (injectFailureAfter > 0 && updated >= injectFailureAfter) throw new Error(`injected failure after ${updated} updates (test hook)`);
    }
    const after = await client.query(`SELECT count(*) FILTER (WHERE timezone IS NULL OR poll_hours_basis IS NULL) AS missing, count(*) AS total FROM elections WHERE date = $1::date`, [ELECTION_DAY]);
    if (Number(after.rows[0].missing) !== 0) throw new Error(`refusing to commit: ${after.rows[0].missing} election-day rows would still lack timezone/basis`);
    await client.query("COMMIT");
    console.log(`applied: ${updated} rows updated; after: ${after.rows[0].missing} of ${after.rows[0].total} election-day rows lack timezone/basis (close may be null where basis=local_variable)`);
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(String(e)); process.exitCode = 1; });
