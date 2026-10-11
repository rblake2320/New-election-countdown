import type { Pool, PoolClient } from 'pg';

export const FEC_MASTER_URL = 'https://www.fec.gov/files/bulk-downloads/2026/cn26.zip';
export const FEC_CYCLE = 2026;
const STATES = new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
const PARTY: Record<string, string> = { DEM: 'D', DFL: 'D', REP: 'R', IND: 'I', NPA: 'I', GRE: 'G', LIB: 'L', CON: 'C' };
export interface FecRow {
  candId: string; displayName: string; party: string; partyRaw: string;
  state: string; office: 'H' | 'S'; district: string; status: string; incumbent: boolean;
}
export interface RaceRow { id: number; state: string; title: string; level: string; type: string; date: Date | string; offices: string[] | null }
export interface ExistingCandidate {
  id: number; election_id: number | null; name: string; party: string | null;
  fec_candidate_id: string | null; fec_status: string | null; source_file_sha256: string | null;
  data_source: string | null; source_status: string | null;
}
export interface FecAction { kind: 'insert' | 'enrich' | 'update'; candidateId?: number; electionId: number; record: FecRow }
export interface FecPlan { actions: FecAction[]; unchanged: number; unmatched: Array<{ fecId: string; reason: 'missing-race' | 'ambiguous-race' | 'ambiguous-identity' | 'conflicting-party' }> }

export function normalizedCandidateName(name: string): string {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function displayName(name: string): string {
  const pieces = name.split(',').map(p => p.trim());
  const reordered = pieces.length > 1 ? `${pieces.slice(1).join(' ')} ${pieces[0]}` : name;
  return reordered.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()).replace(/\s+/g, ' ').trim();
}
function canonicalParty(party: string | null): string {
  const p = (party ?? '').trim().toUpperCase();
  return ({ DEMOCRATIC: 'D', DEMOCRAT: 'D', REPUBLICAN: 'R', INDEPENDENT: 'I', GREEN: 'G', LIBERTARIAN: 'L', CONSERVATIVE: 'C', OTHER: 'O', ...PARTY } as Record<string, string>)[p] ?? (p || 'O');
}

/** Only the official 15-column master layout; mailing-address fields are discarded. */
export function parseFecMaster(text: string, includePrior = false): { rows: FecRow[]; total: number; filtered: number; incomplete: number; duplicateIds: number } {
  const rows = new Map<string, FecRow>();
  let total = 0, filtered = 0, incomplete = 0, duplicateIds = 0;
  const statuses = new Set(includePrior ? ['C', 'F', 'N', 'P'] : ['C', 'F']);
  for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!raw.trim()) continue;
    total++;
    const f = raw.split('|').map(s => s.trim());
    if (f.length !== 15) throw new Error(`FEC line ${total}: expected 15 fields, received ${f.length}`);
    const [id, name, partyRaw, year, state, office, district, ici, status] = f;
    if (year !== String(FEC_CYCLE) || !STATES.has(state) || !['H', 'S'].includes(office) || !statuses.has(status)) { filtered++; continue; }
    // FEC documents these fields as nullable. Do not invent a name or interpret
    // a missing House district as at-large. Retain the count for data QA.
    if (!name || (office === 'H' && !district)) { incomplete++; continue; }
    if (!/^[HS][A-Z0-9]{8}$/.test(id) || id[0] !== office || !/^\d{1,2}$/.test(district || '00') || !['', 'I', 'C', 'O'].includes(ici)) {
      throw new Error(`FEC line ${total}: invalid candidate identity/race fields`);
    }
    const row: FecRow = { candId: id, displayName: displayName(name), party: PARTY[partyRaw] ?? (partyRaw || 'O'), partyRaw, state, office: office as 'H' | 'S', district: (district || '00').padStart(2, '0'), status, incumbent: ici === 'I' };
    const previous = rows.get(id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(row)) throw new Error(`FEC identity collision: conflicting records for ${id}`);
    if (previous) duplicateIds++;
    rows.set(id, row);
  }
  if (!total || !rows.size) throw new Error('FEC source contains no eligible 2026 House/Senate records');
  return { rows: Array.from(rows.values()), total, filtered, incomplete, duplicateIds };
}

/** Pure planning. No ballot certification, editorial verification, deletion or arbitrary race selection. */
export function buildFecSyncPlan(rows: FecRow[], elections: RaceRow[], candidates: ExistingCandidate[], sha256: string): FecPlan {
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error('A valid source SHA256 is required');
  const raceIndex = new Map<string, number[]>();
  for (const e of elections) {
    const date = typeof e.date === 'string' ? e.date.slice(0, 10) : e.date.toISOString().slice(0, 10);
    if (date !== '2026-11-03' || e.level.toLowerCase() !== 'federal' || !['general', 'special'].includes(e.type.toLowerCase())) continue;
    let key: string | undefined;
    if (e.offices?.includes('U.S. Senate')) key = `S|${e.state}|00`;
    if (e.offices?.includes('U.S. House of Representatives')) {
      const m = e.title.match(/\b([A-Z]{2})-(\d{2}|AL)\b/);
      if (m && m[1] === e.state) key = `H|${e.state}|${m[2] === 'AL' ? '00' : m[2]}`;
    }
    if (key) raceIndex.set(key, [...(raceIndex.get(key) ?? []), e.id]);
  }
  const plan: FecPlan = { actions: [], unchanged: 0, unmatched: [] };
  const identities = new Map<string, string[]>();
  const candidatesByRace = new Map<number, ExistingCandidate[]>();
  for (const c of candidates) if (c.election_id != null) candidatesByRace.set(c.election_id, [...(candidatesByRace.get(c.election_id) ?? []), c]);
  for (const row of rows) {
    const key = `${row.office}|${row.state}|${row.district}|${normalizedCandidateName(row.displayName)}|${canonicalParty(row.party)}`;
    identities.set(key, [...(identities.get(key) ?? []), row.candId]);
  }
  for (const row of rows) {
    const races = raceIndex.get(`${row.office}|${row.state}|${row.district}`) ?? [];
    if (races.length !== 1) { plan.unmatched.push({ fecId: row.candId, reason: races.length ? 'ambiguous-race' : 'missing-race' }); continue; }
    const electionId = races[0];
    const name = normalizedCandidateName(row.displayName);
    const key = `${row.office}|${row.state}|${row.district}|${name}|${canonicalParty(row.party)}`;
    if ((identities.get(key)?.length ?? 0) > 1) {
      plan.unmatched.push({ fecId: row.candId, reason: 'ambiguous-identity' });
      continue;
    }
    const sameRace = candidatesByRace.get(electionId) ?? [];
    const known = sameRace.filter(c => c.fec_candidate_id === row.candId);
    if (known.length > 1) throw new Error(`ambiguous existing FEC identity ${row.candId} in election ${electionId}`);
    if (known[0]) {
      if (normalizedCandidateName(known[0].name) !== name) throw new Error(`FEC identity collision: name changed for ${row.candId}; manual review required`);
      if (known[0].data_source !== 'fec_bulk' && canonicalParty(known[0].party) !== canonicalParty(row.party)) {
        plan.unmatched.push({ fecId: row.candId, reason: 'conflicting-party' });
        continue;
      }
      if (known[0].source_file_sha256 === sha256 && known[0].fec_status === row.status) plan.unchanged++;
      else plan.actions.push({ kind: 'update', candidateId: known[0].id, electionId, record: row });
      continue;
    }
    const matches = sameRace.filter(c => !c.fec_candidate_id && normalizedCandidateName(c.name) === name && canonicalParty(c.party) === canonicalParty(row.party));
    if (matches.length > 1) throw new Error(`ambiguous existing name/party in election ${electionId}`);
    plan.actions.push({ kind: matches.length ? 'enrich' : 'insert', candidateId: matches[0]?.id, electionId, record: row });
  }
  return plan;
}

async function applyAction(client: PoolClient, action: FecAction, hash: string, syncedAt: Date): Promise<void> {
  const r = action.record;
  if (action.kind === 'insert') {
    await client.query(`INSERT INTO candidates (name, party, election_id, is_incumbent, description, fec_candidate_id, data_source, source_status, fec_status, normalized_name, ballot_status, source_file_sha256, source_synced_at, polling_support, polling_trend)
      VALUES ($1,$2,$3,$4,$5,$6,'fec_bulk','fec_registered',$7,$8,'not_certified',$9,$10,NULL,NULL)`,
    [r.displayName, r.party, action.electionId, r.incumbent, 'FEC registration; general-election nomination and ballot access unconfirmed.', r.candId, r.status, normalizedCandidateName(r.displayName), hash, syncedAt]);
  } else {
    // Preserve editorial/ballot provenance, profile content, party and all ballot fields.
    const result = await client.query(`UPDATE candidates SET fec_candidate_id=$1, fec_status=$2, source_file_sha256=$3, source_synced_at=$4, updated_at=$4,
      party=CASE WHEN data_source='fec_bulk' THEN $7 ELSE party END,
      is_incumbent=CASE WHEN data_source='fec_bulk' THEN $8 ELSE is_incumbent END
      WHERE id=$5 AND election_id=$6`,
      [r.candId, r.status, hash, syncedAt, action.candidateId, action.electionId, r.party, r.incumbent]);
    if (result.rowCount !== 1) throw new Error('Candidate changed during sync');
  }
}

/** One database transaction; advisory lock serializes this importer, serializable isolation detects other writers. */
async function runFecSyncOnce(pool: Pool, rows: FecRow[], sha256: string, apply: boolean, syncedAt: Date): Promise<FecPlan> {
  const client = await pool.connect();
  try {
    await client.query(apply ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL statement_timeout = '30s'");
    await client.query("SET LOCAL lock_timeout = '5s'");
    if (apply) await client.query('SELECT pg_advisory_xact_lock($1)', [2026110301]);
    const elections = await client.query<RaceRow>('SELECT id,state,title,level,type,date,offices FROM elections ORDER BY id');
    const candidates = await client.query<ExistingCandidate>('SELECT id,election_id,name,party,fec_candidate_id,fec_status,source_file_sha256,data_source,source_status FROM candidates ORDER BY id');
    const plan = buildFecSyncPlan(rows, elections.rows, candidates.rows, sha256);
    if (apply) for (const action of plan.actions) await applyAction(client, action, sha256, syncedAt);
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    return plan;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}

export async function runFecSync(pool: Pool, rows: FecRow[], sha256: string, apply: boolean, syncedAt = new Date()): Promise<FecPlan> {
  for (let attempt = 0; ; attempt++) {
    try { return await runFecSyncOnce(pool, rows, sha256, apply, syncedAt); }
    catch (error) {
      const code = (error as { code?: string }).code;
      if (attempt >= 2 || !['40001', '40P01'].includes(code ?? '')) throw error;
      // Rebuild the plan from a new snapshot after serialization/deadlock abort.
      await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
}
