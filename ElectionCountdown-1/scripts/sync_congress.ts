import fetch from "node-fetch";
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const PP = process.env.PROPUBLICA_KEY!;
const CONGRESS = process.env.CONGRESS_NUMBER || "119";

async function pull(chamber: "house" | "senate") {
  const url = `https://api.propublica.org/congress/v1/${CONGRESS}/${chamber}/members.json`;
  const r = await fetch(url, { headers: { "X-API-Key": PP } });
  if (!r.ok) throw new Error(`ProPublica ${chamber} ${r.status}`);
  const j = await r.json() as any;
  return j.results?.[0]?.members ?? [];
}

const toBool = (v: any) => String(v).toLowerCase() === "true";

(async () => {
  const up = `
    INSERT INTO congress_members (bioguide_id, full_name, last_name, first_name,
      party, chamber, state, district, in_office, is_voting_member)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (bioguide_id) DO UPDATE SET
      full_name=excluded.full_name,
      last_name=excluded.last_name,
      first_name=excluded.first_name,
      party=excluded.party,
      chamber=excluded.chamber,
      state=excluded.state,
      district=excluded.district,
      in_office=excluded.in_office,
      is_voting_member=excluded.is_voting_member
  `;

  const run = async (ch: "house" | "senate") => {
    const members = await pull(ch);
    let count = 0;
    for (const m of members) {
      const isVoting =
        ch === "senate" ? true : !["Delegate", "Resident Commissioner"].includes(m?.title ?? "");
      await pool.query(up, [
        m.id,
        `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim(),
        m.last_name ?? "",
        m.first_name ?? "",
        m.party ?? "",
        ch === "house" ? "House" : "Senate",
        (m.state ?? "").toUpperCase(),
        m.district ? Number(m.district) : null,
        toBool(m.in_office ?? true),
        isVoting,
      ]);
      count++;
    }
    console.log(`Synced ${count} ${ch} members`);
    return count;
  };

  console.log("Starting Congress sync...");
  const houseCount = await run("house");
  const senateCount = await run("senate");

  const { rows: [cnt] } = await pool.query("SELECT * FROM v_congress_counts");
  console.log("\nFinal counts from database:", cnt);
  console.log(`Total voting members: ${cnt.total}`);
  
  await pool.end();
  process.exit(0);
})().catch(e => { 
  console.error("Error syncing congress:", e); 
  process.exit(1); 
});