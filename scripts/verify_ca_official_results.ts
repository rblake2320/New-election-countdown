import { strict as assert } from 'node:assert';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import {
  parseCaliforniaGovernorSov, refuseCaliforniaGeneralStaging,
  CA_GOVERNOR_PRIMARY_CONTEXT, CA_GOVERNOR_GENERAL_CONTEXT,
  CA_GOVERNOR_SOV_SHA256, CA_PRIMARY_CERTIFICATE_SHA256,
} from '../server/official-result-adapters/ca';
import { readXlsxWorkbook } from '../server/official-result-adapters/xlsx';

const root = resolve('tests/fixtures/official-result-adapters/ca');
const file = (name: string) => readFileSync(resolve(root, name));
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const checks: { scenario: string; outcome: 'Worked' }[] = [];
const checked = (scenario: string) => checks.push({ scenario, outcome: 'Worked' });
const sourceHead = 'd3f00a8c93e97e53afd2178a6ec2c56319cd4060';

async function run() {
  const raw = file('CA-primary-gov.xlsx'), certificate = file('CA-primary-certificate.pdf');
  const proof = JSON.parse(file('reviewed-proof.json').toString('utf8'));
  assert.equal(sha(raw), CA_GOVERNOR_SOV_SHA256);
  assert.equal(sha(certificate), CA_PRIMARY_CERTIFICATE_SHA256);
  checked('actual official workbook and signed certificate byte digests');
  const actual = await parseCaliforniaGovernorSov(raw, CA_GOVERNOR_PRIMARY_CONTEXT, certificate);
  assert.equal(actual.options.length, 68); assert.equal(actual.totalVotes, 9262468);
  const expected = JSON.parse(file('CA-certified-primary-acceptance.json').toString('utf8'));
  assert.equal(sha(file('CA-primary-gov-pdf.pdf')), expected.rawPdfSha256);
  for (const [name, votes] of Object.entries(expected.expectedCountsIndependentPDF)) assert.equal(actual.options.find(option => option.name === name)?.votes, votes);
  checked('68 actual primary options and three independently published PDF totals');
  const rows = (await readXlsxWorkbook(raw)).sheets.find(sheet => sheet.name === 'SOV Statewide Contest Details')!.rows;
  const counties = rows.filter(row => typeof row[0] === 'string' && row[0] !== 'State Totals' && row[0].trim() !== 'Percent' && typeof row[1] === 'number');
  assert.equal(counties.length, 58);
  actual.options.forEach((option, index) => assert.equal(counties.reduce((sum, row) => sum + (row[index + 1] as number), 0), option.votes));
  checked('all 68 county-to-state reconciliations across 58 counties');
  assert.deepEqual(actual.options.map(option => option.name), proof.rawHeaderTexts.map((name: string) => name.replace(/\r\n|\r|\n/g, ' ').trim()));
  assert.deepEqual(actual.options.map(option => option.party), proof.rawPartyPreferenceLabels);
  assert.equal(actual.options.find(option => option.name.startsWith('Gretha'))?.name, 'Gretha Solórzano');
  assert.equal(actual.options.filter(option => option.optionKind === 'write_in').length, 7);
  checked('actual Unicode, preference labels, seven write-ins and lossless raw header proof');
  assert(actual.options.every(option => option.sourceCandidateId === null && option.identifierBasis === 'printed_label' && !option.isWinner && option.percent === null));
  assert.equal(actual.asOf, null); assert.equal(actual.reporting, null);
  assert.equal(actual.certificationEvidence[0].certifiedAt, null);
  assert.deepEqual(actual.certificationEvidence[0].context, CA_GOVERNOR_PRIMARY_CONTEXT);
  checked('no invented IDs, timestamps, percentages or winners; exact primary certificate scope');
  assert.deepEqual((await parseCaliforniaGovernorSov(raw, CA_GOVERNOR_PRIMARY_CONTEXT)).certificationEvidence, []);
  checked('absent certificate bytes leave certification evidence empty');
  for (const changed of [{ state: 'WA' }, { electionDate: '2026-11-03' }, { phase: 'general' }, { office: 'U.S. Senate' }, { level: 'federal' }, { district: '01' }, { party: 'DEM' }]) {
    await assert.rejects(parseCaliforniaGovernorSov(raw, { ...CA_GOVERNOR_PRIMARY_CONTEXT, ...changed } as typeof CA_GOVERNOR_PRIMARY_CONTEXT, certificate), { code: 'CONTEXT_MISMATCH' });
  }
  checked('seven exact source context mismatches refuse before report creation');
  await assert.rejects(parseCaliforniaGovernorSov(raw.subarray(0, 100), CA_GOVERNOR_PRIMARY_CONTEXT), { code: 'SOURCE_CHANGED' });
  await assert.rejects(parseCaliforniaGovernorSov(raw, CA_GOVERNOR_PRIMARY_CONTEXT, certificate.subarray(0, 50)), { code: 'CERTIFICATE_CHANGED' });
  checked('truncated workbook and unrelated certificate refuse');
  const staging = file('V26GG-retained-header-fragment.txt');
  const stagingReceipt = JSON.parse(file('CA-vote-pre-election-fetch.json').toString('utf8'));
  assert.equal(stagingReceipt.httpStatus, 200);
  assert(staging.toString('utf8').startsWith(stagingReceipt.firstRecords[0] + '\n'));
  assert.throws(() => refuseCaliforniaGeneralStaging(staging, CA_GOVERNOR_GENERAL_CONTEXT), { code: 'SOURCE_NOT_PUBLISHED' });
  const rawJson = JSON.parse(file('CA-pre-election-statewide-raw.json').toString('utf8'));
  assert.equal(rawJson.ReportingTime, 'October 9, 2026, 2:53 p.m.');
  assert.deepEqual(rawJson.candidates.map((candidate: { Votes: string }) => candidate.Votes), ['21,865', '22,103']);
  checked('actual HTTP200/nonzero Oct9 V26GG staging input REFUSED for Nov3 general');
  for (const input of [Buffer.alloc(0), Buffer.from('no header'), Buffer.from('[B|CAS|1|20260230|1]\n'), Buffer.from([0xff])]) assert.throws(() => refuseCaliforniaGeneralStaging(input, CA_GOVERNOR_GENERAL_CONTEXT), { code: 'INVALID_FORMAT' });
  checked('four malformed or empty format controls refuse without parser crash');
  const receipt = {
    outcome: 'Worked', execution: 'compiled standalone Node ESM, real physical dependencies, zero network and DB calls',
    at: new Date().toISOString(), node: process.version, sourceHead, checks,
    parsedContest: actual, context: actual.context, optionCount: actual.options.length, countyCount: counties.length,
    independentPublishedPdfTotals: expected.expectedCountsIndependentPDF,
    totalOptionVotes: actual.totalVotes, certificate: actual.certificationEvidence[0],
    rawWorkbookSHA256: sha(raw), rawCertificateSHA256: sha(certificate), rawPdfSHA256: expected.rawPdfSha256,
    rawHeaderTextsSHA256: proof.rawHeaderTextsSHA256,
    staging: { outcome: 'Refused', code: 'SOURCE_NOT_PUBLISHED', originalWholeSourceSHA256: stagingReceipt.sha256, retainedFragmentSHA256: sha(staging), sourceDate: '2026-10-09', declaredElectionDate: '2026-11-03', fragmentNotWholeFile: true },
    fixtureFiles: ['CA-primary-gov.xlsx', 'CA-primary-certificate.pdf', 'CA-primary-gov-pdf.pdf', 'reviewed-proof.json', 'V26GG-retained-header-fragment.txt'].map(name => ({ name, sha256: sha(file(name)) })),
  };
  const output = process.argv[2];
  if (output) writeFileSync(resolve(output), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(receipt));
}
run().catch(error => { console.error(error instanceof Error ? error.stack : error); process.exitCode = 1; });
