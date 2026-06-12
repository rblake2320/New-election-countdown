/**
 * FEC Candidate Master sync — real filings only.
 *
 * Downloads the official FEC candidate master for the 2025–2026 cycle
 * (https://www.fec.gov/files/bulk-downloads/2026/cn26.zip) and upserts
 * House + Senate candidates into the candidates table, linked to the
 * seeded general-election rows by state/office/district.
 *
 * Provenance rules (per data-integrity policy):
 * - Records are labeled source_status = 'fec_registered' — the FEC master
 *   contains candidates who registered with the FEC or appeared on a state
 *   ballot list. It is NOT state ballot certification; never label it so.
 * - Default status filter: CAND_STATUS in (C, F) — statutory candidate /
 *   future election. Pass --include-prior to also ingest N/P for audit.
 * - Existing editorial candidates (data_source = 'editorial_verified') are
 *   enriched with their FEC ID when name+race matches; never overwritten.
 *
 * Usage:
 *   npx tsx scripts/sync_fec_candidates.ts [--include-prior] [--dry-run]
 *   (DATABASE_URL from environment / .env)
 */

import { config } from 'dotenv';
config();

import { execSync } from 'child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import JSZip from 'jszip';

const FEC_BULK_URL = 'https://www.fec.gov/files/bulk-downloads/2026/cn26.zip';
const CYCLE = '2026';
const STATES_50 = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]);

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

// FEC party codes → app party letters (top codes; others pass through raw)
const PARTY_MAP: Record<string, string> = {
  DEM: 'D', REP: 'R', IND: 'I', GRE: 'G', LIB: 'L', CON: 'C',
  NPA: 'I', UNK: 'I', NON: 'I', OTH: 'O', DFL: 'D', W: 'W',
};

interface FecRow {
  candId: string;
  name: string;       // FEC format: "LAST, FIRST M"
  displayName: string;
  party: string;
  partyRaw: string;
  electionYr: string;
  state: string;
  office: 'H' | 'S';
  district: string;   // '00'..'53'
  ici: string;        // I=incumbent, C=challenger, O=open seat
  status: string;     // C, F, N, P
  pcc: string;        // principal campaign committee ID ('' if none)
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    includePrior: args.includes('--include-prior'),
    dryRun: args.includes('--dry-run'),
  };
}

function toDisplayName(fecName: string): string {
  // "SMITH, JOHN A" → "John A Smith"; leave single-token names alone
  const parts = fecName.split(',').map((p) => p.trim());
  if (parts.length < 2) return titleCase(fecName);
  const [last, rest] = [parts[0], parts.slice(1).join(' ')];
  return titleCase(`${rest} ${last}`.replace(/\s+/g, ' ').trim());
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    // Keep common suffixes/particles sane
    .replace(/\b(Ii|Iii|Iv|Jr|Sr)\b/g, (m) => m.toUpperCase().replace('JR', 'Jr').replace('SR', 'Sr'))
    .replace(/\bMc([a-z])/g, (_m, c) => `Mc${c.toUpperCase()}`);
}

async function fetchCandidateMaster(workDir: string): Promise<{ text: string; sha256: string }> {
  mkdirSync(workDir, { recursive: true });
  const zipPath = path.join(workDir, 'cn26.zip');

  if (!existsSync(zipPath)) {
    console.log(`⬇️  Downloading FEC candidate master: ${FEC_BULK_URL}`);
    execSync(`curl -fsSL -o "${zipPath}" "${FEC_BULK_URL}"`, { stdio: 'inherit' });
  } else {
    console.log(`📦 Using cached ${zipPath}`);
  }

  const zipBytes = readFileSync(zipPath);
  const sha256 = createHash('sha256').update(zipBytes).digest('hex');
  const zip = await JSZip.loadAsync(zipBytes);
  const entry = Object.values(zip.files).find((f) => f.name.toLowerCase().endsWith('.txt'));
  if (!entry) throw new Error('cn26.zip contains no .txt data file');
  const text = await entry.async('string');
  const txtPath = path.join(workDir, 'cn26.txt');
  writeFileSync(txtPath, text);
  console.log(`✅ Extracted ${entry.name} (${text.length.toLocaleString()} bytes, zip sha256 ${sha256.slice(0, 16)}…)`);
  return { text, sha256 };
}

function parseRows(raw: string, includePrior: boolean): FecRow[] {
  const wantedStatuses = includePrior ? new Set(['C', 'F', 'N', 'P']) : new Set(['C', 'F']);
  const rows: FecRow[] = [];

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const f = line.split('|');
    // cn header: CAND_ID|CAND_NAME|CAND_PTY_AFFILIATION|CAND_ELECTION_YR|CAND_OFFICE_ST|
    //            CAND_OFFICE|CAND_OFFICE_DISTRICT|CAND_ICI|CAND_STATUS|CAND_PCC|...
    const [candId, name, partyRaw, electionYr, state, office, district, ici, status, pcc] = f;
    if (electionYr !== CYCLE) continue;
    if (office !== 'H' && office !== 'S') continue;
    if (!STATES_50.has(state)) continue;
    if (!wantedStatuses.has(status)) continue;
    if (!name?.trim()) continue;

    rows.push({
      candId,
      name,
      displayName: toDisplayName(name),
      party: PARTY_MAP[partyRaw] ?? (partyRaw || 'I'),
      partyRaw: partyRaw || '',
      electionYr,
      state,
      office: office as 'H' | 'S',
      district: (district || '00').padStart(2, '0'),
      ici: ici || '',
      status,
      pcc: (pcc || '').trim(),
    });
  }
  return rows;
}

async function main() {
  const { includePrior, dryRun } = parseArgs();
  const { db } = await import('../server/db');
  const { elections, candidates } = await import('../shared/schema');
  const { eq, and, sql } = await import('drizzle-orm');

  const { text: raw, sha256 } = await fetchCandidateMaster(path.join(process.cwd(), 'election-data-2026'));
  const syncedAt = new Date();
  let rows = parseRows(raw, includePrior);
  console.log(`📋 ${rows.length} FEC 2026 House/Senate candidate records (statuses: ${includePrior ? 'C,F,N,P' : 'C,F'})`);

  // Merge duplicate registrations: one person, one race, multiple FEC IDs
  // (re-filed Form 2s). Canonical row = has principal campaign committee,
  // tie-break newest candidate ID; alternates preserved in alt_fec_ids.
  const grouped = new Map<string, FecRow[]>();
  for (const r of rows) {
    const key = `${r.office}|${r.state}|${r.district}|${normalizeName(r.displayName)}|${r.party}`;
    const g = grouped.get(key) ?? [];
    g.push(r);
    grouped.set(key, g);
  }
  const altIdsByCanonical = new Map<string, string[]>();
  rows = Array.from(grouped.values()).map((g) => {
    if (g.length === 1) return g[0];
    g.sort((a, b) => (b.pcc ? 1 : 0) - (a.pcc ? 1 : 0) || b.candId.localeCompare(a.candId));
    altIdsByCanonical.set(g[0].candId, g.slice(1).map((r) => r.candId));
    return g[0];
  });
  const mergedDupes = Array.from(altIdsByCanonical.values()).reduce((a, b) => a + b.length, 0);
  if (mergedDupes > 0) console.log(`🔀 Merged ${mergedDupes} duplicate FEC registrations into canonical rows`);

  // Build race → electionId lookup from the seeded general elections
  const allElections = await db.select().from(elections);
  const generals = allElections.filter(
    (e) => e.level === 'federal' && e.type === 'general' && new Date(e.date).getUTCFullYear() === 2026,
  );
  const specials = allElections.filter(
    (e) => e.level === 'federal' && e.type === 'special' && new Date(e.date).getUTCFullYear() === 2026,
  );

  const houseByKey = new Map<string, number>();
  const senateByState = new Map<string, number>();
  for (const e of generals) {
    const offices = e.offices ?? [];
    if (offices.includes('U.S. House of Representatives')) {
      // Titles: "U.S. House Election - TX-21" / "U.S. House Election - WY-AL"
      const m = e.title.match(/- ([A-Z]{2})-(\d{2}|AL)$/);
      if (m) {
        const dist = m[2] === 'AL' ? '00' : m[2];
        houseByKey.set(`${m[1]}-${dist}`, e.id);
      }
    } else if (offices.includes('U.S. Senate')) {
      senateByState.set(e.state, e.id);
    }
  }
  // Senate specials (FL, OH) — also Senate races in the FEC file
  for (const e of specials) {
    if ((e.offices ?? []).includes('U.S. Senate') && !senateByState.has(e.state)) {
      senateByState.set(e.state, e.id);
    }
  }
  console.log(`🗺️  Race index: ${houseByKey.size} House districts, ${senateByState.size} Senate races`);

  // Existing rows for dedupe/enrichment
  const existing = await db.select().from(candidates);
  const byFecId = new Map(existing.filter((c) => c.fecCandidateId).map((c) => [c.fecCandidateId!, c]));
  const editorialByKey = new Map(
    existing
      .filter((c) => !c.fecCandidateId)
      .map((c) => [`${c.electionId}|${normalizeName(c.name)}`, c]),
  );

  let inserted = 0, enriched = 0, skippedExisting = 0, unmatchedRace = 0;
  const unmatchedSamples: string[] = [];

  for (const row of rows) {
    const electionId =
      row.office === 'H' ? houseByKey.get(`${row.state}-${row.district}`) : senateByState.get(row.state);

    if (!electionId) {
      unmatchedRace++;
      if (unmatchedSamples.length < 5) unmatchedSamples.push(`${row.office} ${row.state}-${row.district} ${row.displayName}`);
      continue;
    }

    const known = byFecId.get(row.candId);
    if (known) {
      // Refresh sync metadata + status on already-imported rows
      if (!dryRun) {
        await db
          .update(candidates)
          .set({ fecStatus: row.status, sourceFileSha256: sha256, sourceSyncedAt: syncedAt, updatedAt: new Date() })
          .where(eq(candidates.id, known.id));
      }
      skippedExisting++;
      continue;
    }

    // Enrich an editorial candidate with its FEC ID instead of duplicating
    const editorialMatch = editorialByKey.get(`${electionId}|${normalizeName(row.displayName)}`);
    if (editorialMatch) {
      if (!dryRun) {
        await db
          .update(candidates)
          .set({
            fecCandidateId: row.candId,
            fecStatus: row.status,
            sourceFileSha256: sha256,
            sourceSyncedAt: syncedAt,
            updatedAt: new Date(),
          })
          .where(eq(candidates.id, editorialMatch.id));
      }
      enriched++;
      continue;
    }

    if (!dryRun) {
      await db.insert(candidates).values({
        name: row.displayName,
        party: row.party,
        electionId,
        isIncumbent: row.ici === 'I',
        description: `FEC-registered candidate (${row.partyRaw || 'no party listed'})`,
        fecCandidateId: row.candId,
        dataSource: 'fec_bulk',
        sourceStatus: 'fec_registered',
        fecStatus: row.status,
        normalizedName: normalizeName(row.displayName),
        ballotStatus: 'not_certified',
        altFecIds: altIdsByCanonical.get(row.candId)?.join(',') ?? null,
        sourceFileSha256: sha256,
        sourceSyncedAt: syncedAt,
        pollingSupport: null,
        pollingTrend: null,
      });
    }
    inserted++;
  }

  // Stamp provenance on the editorial seed rows that still lack it,
  // and backfill normalized_name everywhere for collision checks
  if (!dryRun) {
    await db.execute(sql`
      UPDATE candidates
      SET data_source = 'editorial_verified', source_status = 'editorial_verified'
      WHERE data_source IS NULL
    `);
    await db.execute(sql`
      UPDATE candidates
      SET normalized_name = lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g'))
      WHERE normalized_name IS NULL
    `);
  }

  // Self-heal: collapse same-person duplicate rows already in the DB
  // (same election + normalized name + party, all fec_bulk). Keep the row
  // whose FEC ID survived dedupe above (or the newest), merge alternates.
  if (!dryRun) {
    const dupGroups = await db.execute(sql`
      SELECT election_id, normalized_name, party,
             array_agg(id ORDER BY fec_candidate_id DESC) AS ids,
             array_agg(fec_candidate_id ORDER BY fec_candidate_id DESC) AS fec_ids
      FROM candidates
      WHERE data_source = 'fec_bulk'
      GROUP BY election_id, normalized_name, party
      HAVING COUNT(*) > 1
    `);
    const dupRows: any[] = (dupGroups as any).rows ?? dupGroups;
    let collapsed = 0;
    for (const g of dupRows) {
      const ids: number[] = g.ids;
      const fecIds: string[] = g.fec_ids;
      // Prefer the canonical id chosen by this run's dedupe if present
      let keepIdx = fecIds.findIndex((fid) => altIdsByCanonical.has(fid));
      if (keepIdx === -1) keepIdx = 0; // newest FEC ID
      const keepId = ids[keepIdx];
      const dropIds = ids.filter((id) => id !== keepId);
      const altIds = fecIds.filter((_, i) => ids[i] !== keepId);
      const dropList = dropIds.map((id) => parseInt(String(id), 10)).filter(Number.isFinite);
      await db.execute(sql`
        UPDATE candidates SET alt_fec_ids = ${altIds.join(',')}
        WHERE id = ${keepId}
      `);
      if (dropList.length > 0) {
        await db.execute(sql.raw(`DELETE FROM candidates WHERE id IN (${dropList.join(',')})`));
      }
      collapsed += dropIds.length;
    }
    if (collapsed > 0) console.log(`🧹 Collapsed ${collapsed} pre-existing duplicate rows (alt IDs preserved)`);
  }

  console.log('— Sync complete —');
  console.log(`   inserted:          ${inserted}`);
  console.log(`   enriched editorial: ${enriched}`);
  console.log(`   already imported:  ${skippedExisting}`);
  console.log(`   unmatched races:   ${unmatchedRace}${unmatchedSamples.length ? ` (e.g. ${unmatchedSamples.join('; ')})` : ''}`);
  if (dryRun) console.log('   (dry run — no writes)');

  // Write a manifest for auditability
  const manifest = {
    source_name: 'FEC bulk candidate master (cn26)',
    source_url: FEC_BULK_URL,
    source_file_sha256: sha256,
    cycle: CYCLE,
    statuses: includePrior ? ['C', 'F', 'N', 'P'] : ['C', 'F'],
    label: 'fec_registered (NOT state ballot certification)',
    fetched_at: syncedAt.toISOString(),
    records_parsed: rows.length,
    inserted, enriched, skippedExisting, unmatchedRace,
  };
  writeFileSync(
    path.join(process.cwd(), 'election-data-2026', 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );
  console.log('📄 election-data-2026/manifest.json written');
  process.exit(0);
}

function normalizeName(n: string): string {
  return n.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
}

main().catch((err) => {
  console.error('❌ FEC sync failed:', err);
  process.exit(1);
});
