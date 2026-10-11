/** Retain only parsed public registration identity facts from the pinned real ZIP for offline CI. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extractFecMaster } from '../server/fec-source-artifacts';
import { parseFecMaster, FEC_MASTER_URL, FEC_CYCLE } from '../server/fec-candidate-sync';

async function main() {
  const bytes = readFileSync(process.env.FEC_ZIP_PATH || 'artifacts/fec-first/cn26.zip');
  const zipSha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(zipSha256, '6062f203fd5dd90a7e33e487088a4d496bd9634cc1e560f94b0f5e7ff8ea0126');
  const parsed = parseFecMaster(await extractFecMaster(bytes));
  assert.equal(parsed.rows.length, 2523);
  const keys = ['candId', 'displayName', 'party', 'partyRaw', 'state', 'office', 'district', 'status', 'incumbent'].sort();
  assert(parsed.rows.every(row => JSON.stringify(Object.keys(row).sort()) === JSON.stringify(keys)));
  const { rows, ...counts } = parsed;
  const projection = { version: 1, cycle: FEC_CYCLE, kind: 'parsed_actual_public_FEC_registration_identity',
    sourceUrl: FEC_MASTER_URL, sourceZipSha256: zipSha256,
    parser: 'server/fec-candidate-sync.ts parseFecMaster', counts,
    omitted: ['mailing address', 'committee ID', 'mailing city', 'mailing state', 'ZIP code'], rows };
  mkdirSync('tests/fixtures/fec', { recursive: true });
  const output = Buffer.from(JSON.stringify(projection, null, 2) + '\n');
  writeFileSync('tests/fixtures/fec/2026-reviewed-identity-projection.json', output);
  console.log(JSON.stringify({ outcome: 'Worked', rows: rows.length, sourceZipSha256: zipSha256,
    projectionSha256: createHash('sha256').update(output).digest('hex'), contactsRetained: false,
    databaseWrites: false, bytes: output.length }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
