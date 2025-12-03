import { pool } from "../server/db";

const refreshSQL = `
REFRESH MATERIALIZED VIEW analytics.mv_event_daily;
REFRESH MATERIALIZED VIEW analytics.mv_compare_daily;

DO $$
DECLARE
  start_month DATE := date_trunc('month', now())::date;
  next_month  DATE := (date_trunc('month', now()) + interval '1 month')::date;
BEGIN
  EXECUTE format('CREATE TABLE IF NOT EXISTS analytics.events_%s PARTITION OF analytics.events FOR VALUES FROM (%L) TO (%L);',
    to_char(start_month, 'YYYYMM'), start_month, next_month);
  EXECUTE format('CREATE TABLE IF NOT EXISTS analytics.events_%s PARTITION OF analytics.events FOR VALUES FROM (%L) TO (%L);',
    to_char(next_month, 'YYYYMM'), next_month, (next_month + interval '1 month')::date);
END$$;
`;

async function main() {
  await pool.query(refreshSQL);
  console.log("✅ Analytics aggregates refreshed & partitions ensured.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });