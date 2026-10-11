/**
 * Populate elections.polls_open / polls_close / timezone for every 2026-11-03 row.
 *
 * Data table + conventions: server/poll-hours-2026.ts (tested in tests/unit/poll-hours-2026.test.ts).
 * Source of record: Ballotpedia, "State Poll Opening and Closing Times (2026)"
 *   https://ballotpedia.org/State_Poll_Opening_and_Closing_Times_(2026)
 *   (statute-cited per state; retrieved 2026-10-11). Closing times cross-checked
 *   against 270toWin's Eastern-time table (https://www.270towin.com/poll-closing-times).
 *
 * Conventions
 *   - Times are LOCAL 24h "HH:MM" strings in the row's `timezone` (IANA).
 *   - `timezone` is the state's predominant zone. House districts that lie
 *     wholly in a state's minority zone get a per-district override (below).
 *   - polls_open = the latest statutory opening time (polls are guaranteed open
 *     from then); null where the statute leaves it to the municipality.
 *   - polls_close = the statewide statutory close. Where counties may close
 *     later (ND) the statutory minimum is used — the countdown must never say
 *     "polls are open" after a place may have closed.
 *   - DST ends 2026-11-01, so every zone is on standard time on election day.
 *
 * Usage
 *   npx tsx scripts/seed_poll_hours_2026.ts            # dry-run: prints the plan, writes nothing
 *   npx tsx scripts/seed_poll_hours_2026.ts --apply    # writes; idempotent (re-running changes 0 rows)
 *   DATABASE_URL=... to target a specific database.
 */
import { pool } from "../server/db";

import { STATE_HOURS, pollHoursFor, ELECTION_DAY_2026 as ELECTION_DAY } from "../server/poll-hours-2026";


async function main() {
  const apply = process.argv.includes("--apply");
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ id: number; state: string; title: string; polls_open: string | null; polls_close: string | null; timezone: string | null }>(
      `SELECT id, state, title, polls_open, polls_close, timezone FROM elections WHERE date = $1::date ORDER BY state, title`,
      [ELECTION_DAY],
    );
    const plan: Array<{ id: number; state: string; title: string; open: string | null; close: string; tz: string }> = [];
    const missingStates = new Set<string>();
    for (const r of rows) {
      const h = pollHoursFor(r.state, r.title);
      if (!h) { missingStates.add(r.state); continue; }
      if (r.polls_open !== h.open || r.polls_close !== h.close || r.timezone !== h.tz) {
        plan.push({ id: r.id, state: r.state, title: r.title, open: h.open, close: h.close, tz: h.tz });
      }
    }
    const byState: Record<string, number> = {};
    for (const p of plan) byState[p.state] = (byState[p.state] || 0) + 1;
    console.log(`${ELECTION_DAY}: ${rows.length} rows; ${plan.length} need changes; states missing from table: ${[...missingStates].join(",") || "none"}`);
    console.log("changes by state:", JSON.stringify(byState));
    const overrides = plan.filter(p => p.tz !== STATE_HOURS[p.state].tz);
    console.log(`district timezone overrides applied: ${overrides.length}`, overrides.map(o => `${o.title.split(" - ")[1]}→${o.tz}`).join(" "));
    if (!apply) { console.log("dry-run only — re-run with --apply to write"); return; }

    await client.query("BEGIN");
    let updated = 0;
    for (const p of plan) {
      const res = await client.query(`UPDATE elections SET polls_open = $1, polls_close = $2, timezone = $3 WHERE id = $4`, [p.open, p.close, p.tz, p.id]);
      updated += res.rowCount ?? 0;
    }
    await client.query("COMMIT");
    const after = await client.query(`SELECT count(*) FILTER (WHERE polls_close IS NULL OR timezone IS NULL) AS missing, count(*) AS total FROM elections WHERE date = $1::date`, [ELECTION_DAY]);
    console.log(`applied: ${updated} rows updated; after: ${after.rows[0].missing} of ${after.rows[0].total} election-day rows still lack close/timezone`);
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
