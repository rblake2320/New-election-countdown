import { readFileSync } from "fs";
import { Pool } from "pg";

(async () => {
  const sql = readFileSync("server/sql/quick_performance_fix.sql", "utf8");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  try {
    console.log("Running quick_performance_fix.sql …");
    await pool.query("BEGIN");
    await pool.query(sql);
    await pool.query("COMMIT");
    console.log("✅ DB perf indexes created");
  } catch (e) {
    await pool.query("ROLLBACK");
    console.error("❌ migrate:perf failed:", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();