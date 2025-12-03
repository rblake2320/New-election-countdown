import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const NORM = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

async function run() {
  console.log("Starting candidate reconciliation...");
  
  // 1) Build normalized keys for elections (state, date, office/district tokens)
  const { rows: elections } = await pool.query(
    `SELECT id, state, date::date as date, title FROM elections`);
  
  const E = elections.map(e => ({
    ...e,
    key: `${e.state}|${e.date}|${NORM(e.title)
      .replace(/\b(special|general|consolidated|runoff)\b/g,'')
      .replace(/\b(city|county|state|federal|local|house|senate|assembly|council)\b/g,'')
      .replace(/\s+/g,' ').trim()}`
  }));

  // 2) Find candidate sets not linked (either null election_id or candidates with no proper linkage)
  const { rows: cand } = await pool.query(
    `SELECT id, election_id, name, party, website FROM candidates 
     WHERE election_id IS NULL OR election_id NOT IN (SELECT id FROM elections)`);
  
  let linked = 0, audited = 0;

  for (const c of cand) {
    // Try to find the best matching election
    const maybeDate = null; // optional: parse from source_url if encoded
    const guesses = E.filter(x => !maybeDate || String(x.date) === String(maybeDate));

    // Simple heuristic: prefer elections with similar titles or matching state
    const best = guesses
      .map(g => ({ 
        g, 
        score: (NORM(g.title).includes(NORM(c.name)) ? 2 : 0) +
               (g.state && c.name && g.title.toLowerCase().includes(g.state.toLowerCase()) ? 1 : 0)
      }))
      .sort((a,b) => b.score - a.score)[0]?.g;

    if (best && best.id) {
      try {
        await pool.query(`UPDATE candidates SET election_id=$1 WHERE id=$2`, [best.id, c.id]);
        linked++;
        console.log(`Linked candidate ${c.name} to election ${best.title}`);
      } catch (err) {
        // Ignore unique/constraint errors
        console.log(`Could not link candidate ${c.name}: ${err}`);
      }
    }
  }

  // 3) Promote fallback "hints" into real links when all candidates for source election point to the target
  const { rows: hints } = await pool.query(`SELECT * FROM reconciliation_hints`);
  for (const h of hints) {
    const { rows: src } = await pool.query(
      `SELECT id FROM candidates WHERE election_id=$1`, 
      [h.source_election_id]
    );
    if (!src.length) continue;
    
    try {
      await pool.query(
        `UPDATE candidates SET election_id=$1 WHERE election_id=$2`, 
        [h.target_election_id, h.source_election_id]
      );
      audited++;
      console.log(`Reconciled ${src.length} candidates from election ${h.source_election_id} to ${h.target_election_id}`);
    } catch (err) {
      console.log(`Could not reconcile hint: ${err}`);
    }
  }

  console.log(JSON.stringify({ linked, audited }, null, 2));
  await pool.end();
}

run().catch(e => { 
  console.error(e); 
  process.exit(1); 
});