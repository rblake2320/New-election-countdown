/**
 * State ballot certification ingestion — the authority layer.
 *
 * Upgrades candidate records from FEC-registered to ballot-certified using
 * OFFICIAL state candidate lists only (Secretary of State / Board of
 * Elections). This is the only code path allowed to set
 * ballot_status = 'certified'.
 *
 * This script intentionally has NO scraping heuristics and NO bundled data:
 * each state publishes certified lists in a different format on a different
 * schedule, and guessing corrupts the database. You feed it a normalized CSV
 * you prepared from an official source, plus the citation for that source.
 *
 * Input CSV columns (header required):
 *   state,office,district,candidate_name,party
 *     state    : 2-letter code (must match the --state flag)
 *     office   : H | S
 *     district : 01..52 for H ('00' or blank for at-large), blank for S
 *     candidate_name : as printed on the certified list
 *     party    : D | R | I | L | G | O (best mapping from the official list)
 *
 * Usage:
 *   npx tsx scripts/ingest_state_ballot_certification.ts \
 *     --state TX \
 *     --csv ./certified/tx_general_2026.csv \
 *     --source-name "Texas Secretary of State" \
 *     --source-url "https://www.sos.state.tx.us/elections/..." \
 *     [--dry-run]
 *
 * Matching: (election by state/office/district) + normalized candidate name.
 * - Exact match  → ballot_status='certified', source_status='ballot_certified',
 *                  ballot_source_name/url + ballot_verified_at stamped.
 * - On the certified list but NOT in DB → inserted as data_source='state_ballot'
 *   (a certified candidate who never filed federally is still real).
 * - In DB (FEC-registered) but NOT on the certified list → left untouched and
 *   reported; absence from one list is not proof of withdrawal.
 */

import { config } from 'dotenv';
config();

import { readFileSync } from 'fs';

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  return {
    state: get('--state')?.toUpperCase(),
    csv: get('--csv'),
    sourceName: get('--source-name'),
    sourceUrl: get('--source-url'),
    dryRun: args.includes('--dry-run'),
  };
}

function normalizeName(n: string): string {
  return n.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const required = ['state', 'office', 'district', 'candidate_name', 'party'];
  for (const r of required) {
    if (!headers.includes(r)) throw new Error(`CSV missing required column: ${r}`);
  }
  return lines.slice(1).map((line) => {
    // naive CSV split is fine for this controlled format; quote if names need commas
    const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ''));
    return row;
  });
}

async function main() {
  const { state, csv, sourceName, sourceUrl, dryRun } = parseArgs();

  if (!state || !csv || !sourceName || !sourceUrl) {
    console.error(
      'Required: --state <ST> --csv <file> --source-name "<official authority>" --source-url "<official url>"',
    );
    console.error('Refusing to certify anything without an official source citation.');
    process.exit(1);
  }
  if (!/^https?:\/\/.+\.(gov|us)\b/i.test(sourceUrl) && !/secretary|sos|elections/i.test(sourceUrl)) {
    console.warn(
      `⚠️  --source-url does not look like an official government source: ${sourceUrl}\n` +
        '   Double-check this is the SOS / Board of Elections list, not a third-party aggregator.',
    );
  }

  const { db } = await import('../server/db');
  const { elections, candidates } = await import('../shared/schema');
  const { eq, and } = await import('drizzle-orm');

  const rows = parseCsv(readFileSync(csv, 'utf-8'));
  const badState = rows.filter((r) => r.state.toUpperCase() !== state);
  if (badState.length > 0) {
    throw new Error(`${badState.length} CSV rows have state != ${state} — one state per ingestion run.`);
  }
  console.log(`📋 ${rows.length} certified-list rows for ${state} from: ${sourceName}`);

  // Race index for this state
  const stateElections = await db.select().from(elections).where(eq(elections.state, state));
  const houseByDistrict = new Map<string, number>();
  let senateId: number | undefined;
  for (const e of stateElections) {
    if (e.level !== 'federal') continue;
    const offices = e.offices ?? [];
    if (offices.includes('U.S. House of Representatives') && e.type === 'general') {
      const m = e.title.match(/- [A-Z]{2}-(\d{2}|AL)$/);
      if (m) houseByDistrict.set(m[1] === 'AL' ? '00' : m[1], e.id);
    } else if (offices.includes('U.S. Senate') && (e.type === 'general' || e.type === 'special')) {
      senateId = e.id;
    }
  }

  const existing = await db.select().from(candidates);
  const byKey = new Map(existing.map((c) => [`${c.electionId}|${c.normalizedName ?? normalizeName(c.name)}`, c]));

  const verifiedAt = new Date();
  let certified = 0, insertedCertified = 0, unmatchedRace = 0;

  for (const row of rows) {
    const office = row.office.toUpperCase();
    const district = (row.district || '00').padStart(2, '0');
    const electionId = office === 'H' ? houseByDistrict.get(district) : senateId;
    if (!electionId) {
      unmatchedRace++;
      console.warn(`   ⚠️ no race for ${office} ${state}-${district}: ${row.candidate_name}`);
      continue;
    }

    const key = `${electionId}|${normalizeName(row.candidate_name)}`;
    const match = byKey.get(key);

    if (match) {
      if (!dryRun) {
        await db
          .update(candidates)
          .set({
            ballotStatus: 'certified',
            sourceStatus: 'ballot_certified',
            ballotSourceName: sourceName,
            ballotSourceUrl: sourceUrl,
            ballotVerifiedAt: verifiedAt,
            updatedAt: new Date(),
          })
          .where(eq(candidates.id, match.id));
      }
      certified++;
    } else {
      if (!dryRun) {
        await db.insert(candidates).values({
          name: row.candidate_name,
          party: row.party || 'I',
          electionId,
          isIncumbent: false,
          description: `Ballot-certified candidate (${sourceName})`,
          dataSource: 'state_ballot',
          sourceStatus: 'ballot_certified',
          ballotStatus: 'certified',
          ballotSourceName: sourceName,
          ballotSourceUrl: sourceUrl,
          ballotVerifiedAt: verifiedAt,
          normalizedName: normalizeName(row.candidate_name),
          pollingSupport: null,
          pollingTrend: null,
        });
      }
      insertedCertified++;
    }
  }

  console.log('— Certification ingestion complete —');
  console.log(`   upgraded to certified: ${certified}`);
  console.log(`   inserted (certified, not in FEC layer): ${insertedCertified}`);
  console.log(`   unmatched races: ${unmatchedRace}`);
  if (dryRun) console.log('   (dry run — no writes)');
  console.log('   Note: DB candidates absent from this list were NOT modified — absence is not withdrawal.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Certification ingestion failed:', err);
  process.exit(1);
});
