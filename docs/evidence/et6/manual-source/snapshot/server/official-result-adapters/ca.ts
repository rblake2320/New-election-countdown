import { createHash } from 'node:crypto';
import { readXlsxWorkbook } from './xlsx';
import {
  OfficialResultParseError, parsedOfficialContestSchema, requireContext,
  type OfficialContestContext, type ParsedOfficialContest,
} from './types';

/** This reviewed source has no election date inside the workbook. Its authority
 * is the exact SOS Statement of Vote link and immutable source bytes, not a
 * caller-selected election date or a successful download. */
export const CA_GOVERNOR_PRIMARY_CONTEXT: Readonly<OfficialContestContext> = Object.freeze({
  state: 'CA', electionDate: '2026-06-02', phase: 'primary', level: 'state',
  office: 'Governor', district: null, party: null,
});
export const CA_GOVERNOR_GENERAL_CONTEXT: Readonly<OfficialContestContext> = Object.freeze({
  ...CA_GOVERNOR_PRIMARY_CONTEXT, electionDate: '2026-11-03', phase: 'general',
});
export const CA_GOVERNOR_SOV_SHA256 = '2c3f509d9b144dff74d2d68ae7be124e697cf6e6bd7e50291cbd1393532980d1';
export const CA_PRIMARY_CERTIFICATE_SHA256 = '3ffb90f022e448d84ea77cfccc2baa54ad87669a0aaa0575c7a08df66c460d77';
export const CA_GOVERNOR_SOV_URL = 'https://elections.cdn.sos.ca.gov/sov/2026-primary/sov/19-gov.xlsx';
export const CA_PRIMARY_CERTIFICATE_URL = 'https://elections.cdn.sos.ca.gov/sov/2026-primary/sov/18-sov-certificate.pdf';
const SHEET = 'SOV Statewide Contest Details';
const COUNTIES = ['Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa', 'Contra Costa', 'Del Norte', 'El Dorado', 'Fresno', 'Glenn', 'Humboldt', 'Imperial', 'Inyo', 'Kern', 'Kings', 'Lake', 'Lassen', 'Los Angeles', 'Madera', 'Marin', 'Mariposa', 'Mendocino', 'Merced', 'Modoc', 'Mono', 'Monterey', 'Napa', 'Nevada', 'Orange', 'Placer', 'Plumas', 'Riverside', 'Sacramento', 'San Benito', 'San Bernardino', 'San Diego', 'San Francisco', 'San Joaquin', 'San Luis Obispo', 'San Mateo', 'Santa Barbara', 'Santa Clara', 'Santa Cruz', 'Shasta', 'Sierra', 'Siskiyou', 'Solano', 'Sonoma', 'Stanislaus', 'Sutter', 'Tehama', 'Trinity', 'Tulare', 'Tuolumne', 'Ventura', 'Yolo', 'Yuba'];
const digest = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const fail = (code: string, message: string): never => { throw new OfficialResultParseError(code, message); };
const count = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return fail('INVALID_COUNT', 'CA source vote count is not a nonnegative safe integer');
  return value;
};
const label = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) return fail('INVALID_LABEL', 'CA printed source option is absent');
  // Workbook line breaks are layout. Unicode and spelling are left untouched.
  return value.replace(/\r\n|\r|\n/g, ' ').trim();
};

/** Parse only the reviewed June 2 primary Governor workbook. Candidate totals
 * are reconciled independently across all 58 counties; percent/blank rows are
 * not ballots and county rows are never added again to State Totals. */
export async function parseCaliforniaGovernorSov(
  bytes: Uint8Array, expected: OfficialContestContext, certificateBytes?: Uint8Array,
): Promise<ParsedOfficialContest> {
  requireContext(CA_GOVERNOR_PRIMARY_CONTEXT, expected);
  const hash = digest(bytes);
  if (hash !== CA_GOVERNOR_SOV_SHA256) return fail('SOURCE_CHANGED', 'CA workbook differs from the reviewed official Statement of Vote');
  if (certificateBytes !== undefined && digest(certificateBytes) !== CA_PRIMARY_CERTIFICATE_SHA256) return fail('CERTIFICATE_CHANGED', 'CA certificate differs from the reviewed signed primary certificate');
  const workbook = await readXlsxWorkbook(Buffer.from(bytes));
  const sheets = workbook.sheets.filter(sheet => sheet.name === SHEET);
  if (workbook.sha256 !== hash || sheets.length !== 1) return fail('INVALID_LAYOUT', 'CA reviewed worksheet is absent or ambiguous');
  const rows = sheets[0].rows;
  if (rows.length < 178 || rows[0]?.length !== 69 || rows[1]?.length !== 69) return fail('INVALID_LAYOUT', 'CA reviewed worksheet shape is incomplete');
  const names = rows[0].slice(1).map(label);
  const parties = rows[1].slice(1).map(label);
  if (new Set(names).size !== 68) return fail('AMBIGUOUS_OPTION', 'CA printed names are not 68 distinct source options');
  const totalsRows = rows.filter(row => row[0] === 'State Totals');
  if (totalsRows.length !== 1 || totalsRows[0].length !== 69) return fail('INVALID_TOTALS', 'CA source requires exactly one complete State Totals row');
  const totals = totalsRows[0].slice(1).map(count);
  const countyRows = rows.filter(row => typeof row[0] === 'string' && COUNTIES.includes(row[0]));
  if (countyRows.length !== 58 || new Set(countyRows.map(row => row[0])).size !== 58) return fail('INCOMPLETE_COUNTIES', 'CA source does not contain all 58 distinct counties');
  const sums = Array<number>(68).fill(0);
  for (const row of countyRows) {
    if (row.length !== 69) return fail('INVALID_LAYOUT', 'CA county row has missing source option cells');
    row.slice(1).forEach((value, index) => {
      sums[index] += count(value);
      if (!Number.isSafeInteger(sums[index])) fail('INVALID_COUNT', 'CA county vote sum exceeds safe integer range');
    });
  }
  if (sums.some((value, index) => value !== totals[index])) return fail('COUNTY_TOTAL_MISMATCH', 'CA county sums disagree with State Totals');
  const totalVotes = totals.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(totalVotes)) return fail('INVALID_COUNT', 'CA option vote total exceeds safe integer range');
  return parsedOfficialContestSchema.parse({
    context: { ...CA_GOVERNOR_PRIMARY_CONTEXT },
    sourceContestId: '2026-primary:sov:19-gov', sourcePayloadSha256: hash,
    asOf: null, asOfBasis: 'not_provided', asOfRaw: null, reporting: null,
    totalVotes,
    options: names.map((name, index) => ({
      sourceCandidateId: null, identifierBasis: 'printed_label', name,
      party: parties[index], votes: totals[index], percent: null, isWinner: false,
      optionKind: parties[index].includes('(W/I)') ? 'write_in' : 'named',
    })),
    publisherMetrics: {},
    certificationEvidence: certificateBytes === undefined ? [] : [{
      url: CA_PRIMARY_CERTIFICATE_URL, sha256: CA_PRIMARY_CERTIFICATE_SHA256,
      dateRaw: 'July 10, 2026', certifiedAt: null, context: { ...CA_GOVERNOR_PRIMARY_CONTEXT },
    }],
  });
}

/** A real pre-election V26GG recording has an October 9 header even though the
 * agency index labels it November 3 general. A 200 or positive count cannot
 * turn that header into an election-night report. Future V26GG parsing requires
 * a separately reviewed schema; this guard never produces result counts. */
export function refuseCaliforniaGeneralStaging(bytes: Uint8Array, expected: OfficialContestContext): never {
  requireContext(CA_GOVERNOR_GENERAL_CONTEXT, expected);
  if (bytes.byteLength === 0 || bytes.byteLength > 2_000_000) return fail('INVALID_FORMAT', 'CA V26GG source is empty or exceeds the bounded input size');
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return fail('INVALID_FORMAT', 'CA V26GG source is not valid UTF-8'); }
  const header = /^\[B\|CAS\|1\|(\d{4})(\d{2})(\d{2})\|\d+\](?:\r?\n|$)/.exec(text);
  if (!header) return fail('INVALID_FORMAT', 'CA V26GG has no reviewed source date header');
  const date = `${header[1]}-${header[2]}-${header[3]}`;
  const parsed = new Date(date + 'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return fail('INVALID_FORMAT', 'CA V26GG source date is invalid');
  if (date < expected.electionDate) return fail('SOURCE_NOT_PUBLISHED', 'CA V26GG source header predates the declared election; nonzero staging counts are refused');
  return fail('UNREVIEWED_FORMAT', 'CA V26GG result parsing requires reviewed election-night source context and schema');
}
