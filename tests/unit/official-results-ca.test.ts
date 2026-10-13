import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  CA_GOVERNOR_PRIMARY_CONTEXT, CA_GOVERNOR_GENERAL_CONTEXT,
  CA_GOVERNOR_SOV_SHA256, CA_PRIMARY_CERTIFICATE_SHA256,
  parseCaliforniaGovernorSov, refuseCaliforniaGeneralStaging,
} from '../../server/official-result-adapters/ca';
import { readXlsxWorkbook } from '../../server/official-result-adapters/xlsx';
import { OfficialResultParseError } from '../../server/official-result-adapters/types';

const fixture = (file: string) => readFileSync(new URL('../fixtures/official-result-adapters/ca/' + file, import.meta.url));
const workbook = fixture('CA-primary-gov.xlsx');
const certificate = fixture('CA-primary-certificate.pdf');
const proof = JSON.parse(fixture('reviewed-proof.json').toString('utf8'));
const independent = JSON.parse(fixture('CA-certified-primary-acceptance.json').toString('utf8'));
const pdfText = fixture('CA-primary-gov-pdf-text.txt').toString('utf8');
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

function expectRefusal(action: () => unknown, code: string) {
  try { action(); expect.fail('Expected typed refusal'); }
  catch (error) { expect(error).toBeInstanceOf(OfficialResultParseError); expect((error as OfficialResultParseError).code).toBe(code); }
}

describe('CA real reviewed primary Statement of Vote and actual pre-election staging', () => {
  it('parses all 68 actual options and matches independent published PDF totals without declaring winners', async () => {
    expect(hash(workbook)).toBe(CA_GOVERNOR_SOV_SHA256);
    expect(hash(certificate)).toBe(CA_PRIMARY_CERTIFICATE_SHA256);
    expect(hash(fixture('CA-primary-gov-pdf.pdf'))).toBe(independent.rawPdfSha256);
    const actual = await parseCaliforniaGovernorSov(workbook, CA_GOVERNOR_PRIMARY_CONTEXT, certificate);
    expect(actual.context).toEqual(CA_GOVERNOR_PRIMARY_CONTEXT);
    expect(actual.options).toHaveLength(68);
    expect(actual.totalVotes).toBe(9262468);
    for (const [name, votes] of Object.entries(independent.expectedCountsIndependentPDF)) {
      expect(actual.options.find(option => option.name === name)?.votes).toBe(votes);
      expect(pdfText).toContain((votes as number).toLocaleString('en-US'));
    }
    expect(pdfText).toContain('June 2, 2026, Primary Election');
    expect(actual.options.every(option => !option.isWinner && option.percent === null && option.sourceCandidateId === null && option.identifierBasis === 'printed_label')).toBe(true);
    expect(actual.reporting).toBeNull();
    expect(actual.asOf).toBeNull();
    expect(actual.asOfRaw).toBeNull();
    expect(actual.asOfBasis).toBe('not_provided');
    expect(actual.certificationEvidence).toEqual([{ url: 'https://elections.cdn.sos.ca.gov/sov/2026-primary/sov/18-sov-certificate.pdf', sha256: CA_PRIMARY_CERTIFICATE_SHA256, dateRaw: 'July 10, 2026', certifiedAt: null, context: { ...CA_GOVERNOR_PRIMARY_CONTEXT } }]);
  });

  it('reconciles every option over all 58 actual county rows, excluding percent rows and duplicate state aggregation', async () => {
    const book = await readXlsxWorkbook(workbook);
    const rows = book.sheets.find(sheet => sheet.name === 'SOV Statewide Contest Details')!.rows;
    expect(rows[0].slice(1)).toEqual(proof.rawHeaderTexts);
    const counties = rows.filter(row => typeof row[0] === 'string' && row[0] !== 'State Totals' && row[0].trim() !== 'Percent' && typeof row[1] === 'number');
    expect(counties).toHaveLength(58);
    const actual = await parseCaliforniaGovernorSov(workbook, CA_GOVERNOR_PRIMARY_CONTEXT);
    actual.options.forEach((option, index) => expect(counties.reduce((total, row) => total + (row[index + 1] as number), 0)).toBe(option.votes));
    expect(actual.certificationEvidence).toEqual([]);
  });

  it('preserves all actual Unicode names, preference labels and seven write-in markers with no fabricated IDs', async () => {
    const actual = await parseCaliforniaGovernorSov(workbook, CA_GOVERNOR_PRIMARY_CONTEXT);
    expect(actual.options.map(option => option.name)).toEqual(proof.rawHeaderTexts.map((name: string) => name.replace(/\r\n|\r|\n/g, ' ').trim()));
    expect(actual.options.map(option => option.party)).toEqual(proof.rawPartyPreferenceLabels);
    expect(actual.options.filter(option => option.optionKind === 'write_in')).toHaveLength(7);
    expect(actual.options.find(option => option.name.startsWith('Gretha'))?.name).toBe('Gretha Solórzano');
    expect(actual.options.some(option => option.name.includes('\ufffd'))).toBe(false);
  });

  it.each([
    { electionDate: '2026-11-03' }, { phase: 'general' }, { state: 'WA' },
    { office: 'U.S. Senate' }, { level: 'federal' }, { district: '01' }, { party: 'DEM' },
  ])('refuses exact-source scope mismatch %j before reading counts', async changed => {
    await expect(parseCaliforniaGovernorSov(workbook, { ...CA_GOVERNOR_PRIMARY_CONTEXT, ...changed } as typeof CA_GOVERNOR_PRIMARY_CONTEXT, certificate)).rejects.toMatchObject({ code: 'CONTEXT_MISMATCH' });
  });

  it('refuses altered/truncated official bytes and a different certificate before producing a report', async () => {
    await expect(parseCaliforniaGovernorSov(workbook.subarray(0, 100), CA_GOVERNOR_PRIMARY_CONTEXT)).rejects.toMatchObject({ code: 'SOURCE_CHANGED' });
    const altered = Buffer.from(workbook); altered[altered.length - 1] ^= 1;
    await expect(parseCaliforniaGovernorSov(altered, CA_GOVERNOR_PRIMARY_CONTEXT)).rejects.toMatchObject({ code: 'SOURCE_CHANGED' });
    await expect(parseCaliforniaGovernorSov(workbook, CA_GOVERNOR_PRIMARY_CONTEXT, certificate.subarray(0, 50))).rejects.toMatchObject({ code: 'CERTIFICATE_CHANGED' });
  });

  it('refuses actual Oct9 V26GG header despite the official HTTP200 and Nov3 index label', () => {
    const receipt = JSON.parse(fixture('CA-vote-pre-election-fetch.json').toString('utf8'));
    expect(receipt.httpStatus).toBe(200);
    expect(receipt.firstRecords[0]).toBe('[B|CAS|1|20261009|1701580]');
    expect(fixture('V26GG-retained-header-fragment.txt').toString('utf8').startsWith(receipt.firstRecords[0] + '\n')).toBe(true);
    expectRefusal(() => refuseCaliforniaGeneralStaging(fixture('V26GG-retained-header-fragment.txt'), CA_GOVERNOR_GENERAL_CONTEXT), 'SOURCE_NOT_PUBLISHED');
    const json = JSON.parse(fixture('CA-pre-election-statewide-raw.json').toString('utf8'));
    expect(json.ReportingTime).toBe('October 9, 2026, 2:53 p.m.');
    expect(json.candidates.map((row: { Votes: string }) => row.Votes)).toEqual(['21,865', '22,103']);
  });

  it.each([Buffer.alloc(0), Buffer.from('no header'), Buffer.from('[B|CAS|1|20260230|1]\n'), Buffer.from([0xff])])('contains malformed staging input as typed refusal', input => {
    expectRefusal(() => refuseCaliforniaGeneralStaging(input, CA_GOVERNOR_GENERAL_CONTEXT), 'INVALID_FORMAT');
  });

  it('does not treat future date-only header as a reviewed positive feed (isolated schema control, no real vote claims)', () => {
    expectRefusal(() => refuseCaliforniaGeneralStaging(Buffer.from('[B|CAS|1|20261103|1]\n'), CA_GOVERNOR_GENERAL_CONTEXT), 'UNREVIEWED_FORMAT');
  });
});
