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

import { pollHoursFor, ELECTION_DAY_2026 as ELECTION_DAY } from "../server/poll-hours-2026";


async function main() {
  const apply = process.argv.includes("--apply");
  const client = await pool.connect();
  try {
    // Provenance columns are additive (migrations/20261011_poll_hours_metadata.sql). A dry-run must not
    // touch the schema, so detect them and only create them under --apply.
    const colq = await client.query<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_name = 'elections' AND column_name IN ('poll_close_kind','poll_hours_basis','poll_hours_source')`);
    const haveMeta = colq.rowCount === 3;
    if (!haveMeta && apply) {
      await client.query(`ALTER TABLE elections ADD COLUMN IF NOT EXISTS poll_close_kind text`);
      await client.query(`ALTER TABLE elections ADD COLUMN IF NOT EXISTS poll_hours_basis text`);
      await client.query(`ALTER TABLE elections ADD COLUMN IF NOT EXISTS poll_hours_source text`);
      console.log("added provenance columns poll_close_kind / poll_hours_basis / poll_hours_source");
    } else if (!haveMeta) {
      console.log("note: provenance columns absent on this DB (dry-run leaves schema untouched; --apply adds them)");
    }
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
    const overrides = plan.filter(p => p.basis === "district_latest");
    console.log(`district timezone overrides applied: ${overrides.length}`, overrides.map(o => `${o.title.split(" - ")[1]}→${o.tz}`).join(" "));
    if (!apply) { console.log("dry-run only — re-run with --apply to write"); return; }

    await client.query("BEGIN");
    let updated = 0;
    for (const p of plan) {
      const res = await client.query(`UPDATE elections SET polls_open = $1, polls_close = $2, timezone = $3, poll_close_kind = $4, poll_hours_basis = $5, poll_hours_source = $6 WHERE id = $7`, [p.open, p.close, p.tz, p.kind, p.basis, p.source, p.id]);
      updated += res.rowCount ?? 0;
    }
    await client.query("COMMIT");
    const after = await client.query(`SELECT count(*) FILTER (WHERE timezone IS NULL OR poll_hours_basis IS NULL) AS missing, count(*) AS total FROM elections WHERE date = $1::date`, [ELECTION_DAY]);
    console.log(`applied: ${updated} rows updated; after: ${after.rows[0].missing} of ${after.rows[0].total} election-day rows still lack timezone/basis (close may be null where basis=local_variable)`);
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
