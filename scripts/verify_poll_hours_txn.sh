#!/usr/bin/env bash
# Proof for PR #5 v5 transaction shape, on a fresh private copy elections_fable2.
set -u
cd /d/projects/et-wt/lane-a
PG2(){ docker exec postgres psql -U redteam -d elections_fable2 -Atc "$1"; }
DB2="postgresql://redteam:redteam@localhost:5432/elections_fable2"
COLS="select count(*) from information_schema.columns where table_name='elections' and column_name like 'poll_hours%'"
WRITTEN="select count(*) from elections where date='2026-11-03' and timezone is not null"

echo "=== fresh copy from shared (expect cols 0, written 0)"
docker exec postgres sh -c "psql -q -U redteam -d postgres -c 'DROP DATABASE IF EXISTS elections_fable2' && psql -q -U redteam -d postgres -c 'CREATE DATABASE elections_fable2' && pg_dump -U redteam elections | psql -q -U redteam -d elections_fable2 >/dev/null 2>&1" 2>&1 | tail -1
echo "cols=$(PG2 "$COLS") written=$(PG2 "$WRITTEN")"

echo "=== (a) injected failure after 100 updates -> exit 1, columns absent, 0 rows written"
DATABASE_URL=$DB2 POLL_HOURS_INJECT_FAILURE_AFTER=100 npx tsx scripts/seed_poll_hours_2026.ts --apply > /tmp/v5a.log 2>&1; echo "exit=$?"; grep -E "injected|applied" /tmp/v5a.log | head -2
echo "cols=$(PG2 "$COLS") written=$(PG2 "$WRITTEN")"

echo "=== (b) unknown state on election day -> refuse, nothing written"
PG2 "insert into elections (title, subtitle, location, state, date, type, level, offices, description, is_active) values ('Probe Election - ZZ','probe','ZZ','ZZ','2026-11-03','general','state','{Governor}','probe', true)" >/dev/null
DATABASE_URL=$DB2 npx tsx scripts/seed_poll_hours_2026.ts --apply > /tmp/v5b.log 2>&1; echo "exit=$?"; grep -E "refusing|applied" /tmp/v5b.log | head -2
echo "cols=$(PG2 "$COLS") written=$(PG2 "$WRITTEN")"
PG2 "delete from elections where state='ZZ'" >/dev/null

echo "=== (c) dry-run is a read-only txn (no schema change), then real apply, then repeat"
DATABASE_URL=$DB2 npx tsx scripts/seed_poll_hours_2026.ts > /tmp/v5c.log 2>&1; echo "exit=$?"; grep -E "need changes|dry-run" /tmp/v5c.log
echo "after dry-run cols=$(PG2 "$COLS") written=$(PG2 "$WRITTEN")"
DATABASE_URL=$DB2 npx tsx scripts/seed_poll_hours_2026.ts --apply > /tmp/v5d.log 2>&1; echo "exit=$?"; grep -E "applied|refusing" /tmp/v5d.log
DATABASE_URL=$DB2 npx tsx scripts/seed_poll_hours_2026.ts --apply > /tmp/v5e.log 2>&1; echo "exit=$?"; grep -E "need changes|applied" /tmp/v5e.log
echo "final cols=$(PG2 "$COLS") written=$(PG2 "$WRITTEN") basis=$(PG2 "select string_agg(poll_hours_basis||'='||c, ', ') from (select poll_hours_basis, count(*) c from elections where date='2026-11-03' group by 1) x")"
echo "OR source: $(PG2 "select distinct poll_hours_source from elections where state='OR' and date='2026-11-03'")"
