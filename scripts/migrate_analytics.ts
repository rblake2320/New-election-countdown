import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';
import { pool } from "../server/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const sqlPath = path.resolve(__dirname, "../server/sql/2025-analytics.sql");
  const sql = await readFile(sqlPath, "utf8");
  await pool.query(sql);
  console.log("✅ Analytics schema migrated.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });