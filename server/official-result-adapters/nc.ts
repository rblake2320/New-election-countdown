import { createHash } from 'node:crypto';
import { OfficialResultParseError, officialContestContextSchema, parsedOfficialContestSchema, requireContext, type OfficialContestContext, type ParsedOfficialContest } from './types';

export interface NcOfficialScope {
  context: OfficialContestContext;
  sourceContestId: string;
  localContestId: string;
  resultsUrl: string;
  countyUrl: string;
  resultsSha256: string;
  countySha256: string;
}
type Row = Record<string, unknown>;
export const ncOfficialSupportedRoles = ['U.S. Senate', 'U.S. House'] as const;
function refuse(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new OfficialResultParseError(code, message);
}
function body(raw: Uint8Array | string, expectedHash: string): { value: unknown; sha256: string } {
  refuse(typeof raw === 'string' || Buffer.isBuffer(raw) || raw instanceof Uint8Array, 'INVALID_PAYLOAD', 'NC source body must be bytes or a string');
  const bytes = typeof raw === 'string' ? Buffer.from(raw, 'utf8') : Buffer.from(raw);
  refuse(bytes.length > 0 && bytes.length <= 16 * 1024 * 1024, 'INVALID_PAYLOAD', 'NC result body is empty or exceeds the parser limit');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  refuse(/^[a-f0-9]{64}$/.test(expectedHash) && sha256 === expectedHash, 'SOURCE_HASH_MISMATCH', 'NC response differs from admitted source bytes');
  try { return { value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), sha256 }; }
  catch { throw new OfficialResultParseError('INVALID_JSON', 'NC source is not complete UTF-8 JSON'); }
}
function rows(value: unknown): Row[] {
  refuse(Array.isArray(value) && value.length > 0 && value.length <= 100000, 'INVALID_PAYLOAD', 'NC source must contain a bounded nonempty array');
  refuse(value.every(row => row !== null && typeof row === 'object' && !Array.isArray(row)), 'INVALID_PAYLOAD', 'NC source contains a malformed row');
  return value as Row[];
}
function count(value: unknown, field: string): number {
  refuse(typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value), 'INVALID_COUNT', `NC ${field} is not a nonnegative integer`);
  const n = Number(value);
  refuse(Number.isSafeInteger(n), 'INVALID_COUNT', `NC ${field} exceeds the safe integer limit`);
  return n;
}
function text(value: unknown, field: string): string {
  refuse(typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 512, 'INVALID_PAYLOAD', `NC ${field} is absent or malformed`);
  return value.trim();
}
function endpoint(url: string, file: string, date: string): void {
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new OfficialResultParseError('INVALID_SOURCE_URL', 'NC source URL is malformed'); }
  refuse(parsed.protocol === 'https:' && parsed.hostname === 'er.ncsbe.gov' && !parsed.username && !parsed.password && (!parsed.port || parsed.port === '443') && !parsed.search && !parsed.hash && parsed.pathname === `/enr/${date.replaceAll('-', '')}/data/${file}`, 'UNSUPPORTED_DATASET', 'NC source must be the exact dated original ENR endpoint; precinct-sort/noisy data is refused');
}
function candidatePercent(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  refuse(typeof value === 'string' && /^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(value), 'INVALID_PERCENT', 'NC candidate share is not a source fraction between zero and one');
  return Number((Number(value) * 100).toFixed(8));
}
function publishedPercent(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  refuse(typeof value === 'string' && /^\d+(?:\.\d+)?%$/.test(value), 'INVALID_PERCENT', 'NC reporting percentage is malformed');
  const n = Number(value.slice(0, -1));
  refuse(n >= 0 && n <= 100, 'INVALID_PERCENT', 'NC reporting percentage exceeds its range');
  return n;
}

/** Parse real statewide ENR results; source/date/party guards run before counts escape. */
export function parseNcOfficialResults(resultsRaw: Uint8Array | string, countyRaw: Uint8Array | string, scope: NcOfficialScope): ParsedOfficialContest {
  const contextResult = officialContestContextSchema.safeParse(scope.context);
  refuse(contextResult.success, 'INVALID_CONTEXT', 'NC reviewed contest context is malformed');
  const expected = contextResult.data;
  refuse(expected.state === 'NC', 'CONTEXT_MISMATCH', 'NC parser cannot admit another state');
  endpoint(scope.resultsUrl, 'results_0.txt', expected.electionDate);
  endpoint(scope.countyUrl, 'county.txt', expected.electionDate);
  const payload = body(resultsRaw, scope.resultsSha256);
  const county = rows(body(countyRaw, scope.countySha256).value).filter(row => row.cid === '0');
  refuse(county.length === 1 && county[0].cnm === 'STATE', 'INVALID_CONTEXT', 'NC companion must contain exactly one statewide header');
  const title = text(county[0].tle, 'election title');
  refuse(!/\b(TEST|STAGING|DEMO)\b/i.test(title), 'STAGING_DATA', 'NC staging or test returns are refused');
  const header = /^(\d{2})\/(\d{2})\/(\d{4}) (?:UNOFFICIAL|OFFICIAL) (PRIMARY|GENERAL) ELECTION RESULTS - STATEWIDE$/.exec(title);
  refuse(header, 'INVALID_CONTEXT', 'NC companion does not declare a supported statewide election');
  const electionDate = `${header[3]}-${header[1]}-${header[2]}`;
  const phase = header[4] === 'PRIMARY' ? 'primary' : 'general';
  refuse(electionDate === expected.electionDate && phase === expected.phase, 'CONTEXT_MISMATCH', 'NC source election date or phase differs from the reviewed contest');
  const sourceRows = rows(payload.value);
  const selected = sourceRows.filter(row => row.cid === '0' && row.gid === scope.sourceContestId && row.lid === scope.localContestId);
  refuse(selected.length > 0, 'CONTEST_NOT_FOUND', 'NC exact group/local contest is absent');
  const parsedTitles = selected.map(row => /^(US SENATE|US HOUSE OF REPRESENTATIVES DISTRICT (\d{2}))(?: - ([A-Z]+))? \(VOTE FOR (\d+)\)$/.exec(text(row.cnm, 'contest title')));
  refuse(parsedTitles.every(Boolean), 'INVALID_CONTEXT', 'NC contest title is not a supported federal office');
  const first = parsedTitles[0]!;
  const office = first[1] === 'US SENATE' ? 'S' : 'H';
  const party = first[3] ?? null;
  const actual: OfficialContestContext = { state: 'NC', electionDate, phase, level: 'federal', office: office === 'S' ? 'U.S. Senate' : 'U.S. House', district: first[2] ?? null, party };
  requireContext(actual, expected);
  refuse(phase === 'primary' ? party !== null : party === null, 'CONTEXT_MISMATCH', 'NC primary party qualification or general contest scope is missing');
  refuse(selected.every((row, i) => row.cnm === selected[0].cnm && parsedTitles[i]![4] === '1' && row.vfr === '1' && row.ogl === 'FED' && (party === null || row.pty === party)), 'CONTEXT_MISMATCH', 'NC selected rows disagree on title, office level, single-seat scope or primary party');
  const precinctsReporting = count(selected[0].prt, 'precincts reporting');
  const precinctsTotal = count(selected[0].ptl, 'precincts total');
  refuse(precinctsReporting <= precinctsTotal && selected.every(row => count(row.prt, 'precincts reporting') === precinctsReporting && count(row.ptl, 'precincts total') === precinctsTotal), 'REPORTING_MISMATCH', 'NC precinct counts disagree within the contest');
  const options: ParsedOfficialContest['options'] = selected.map(row => {
    const votes = count(row.vct, 'candidate votes');
    refuse(['evc', 'ovc', 'avc', 'pvc'].reduce((sum, field) => sum + count(row[field], field), 0) === votes, 'VOTE_TOTAL_MISMATCH', 'NC vote-method counts differ from the published candidate total');
    const name = text(row.bnm, 'candidate name');
    refuse(row.pty == null || typeof row.pty === 'string' && row.pty.length <= 512, 'INVALID_PAYLOAD', 'NC candidate party must be a raw label or absent');
    return { sourceCandidateId: null, identifierBasis: 'printed_label', name, party: typeof row.pty === 'string' && row.pty.trim() ? row.pty.trim() : null, votes, percent: candidatePercent(row.pct), isWinner: false, optionKind: /^(?:WRITE[- ]?IN\b|ALL OTHERS$)/i.test(name) ? 'write_in' : 'named' };
  });
  const totalVotes = options.reduce((sum, option) => sum + option.votes, 0);
  refuse(Number.isSafeInteger(totalVotes), 'INVALID_COUNT', 'NC option vote sum exceeds safe integer range');
  refuse(totalVotes > 0, 'STAGING_DATA', 'NC all-zero pre-election or unpublished returns are refused');
  const countyReporting = count(county[0].prt, 'statewide precincts reporting');
  const countyTotal = count(county[0].ptl, 'statewide precincts total');
  refuse(countyReporting <= countyTotal, 'REPORTING_MISMATCH', 'NC statewide reporting exceeds total precincts');
  const percent = countyReporting === precinctsReporting && countyTotal === precinctsTotal ? publishedPercent(county[0].ppt) : null;
  const result = parsedOfficialContestSchema.safeParse({ context: actual, sourceContestId: scope.sourceContestId, sourcePayloadSha256: payload.sha256, asOf: null, asOfBasis: 'not_provided', asOfRaw: typeof county[0].imp === 'string' && county[0].imp.trim() ? county[0].imp.trim() : null, reporting: { percent, basis: 'precincts', precinctsReporting, precinctsTotal }, totalVotes, options, publisherMetrics: {}, certificationEvidence: [] });
  refuse(result.success, 'INVALID_RESULT', 'NC parsed options or source metadata violate the common result contract');
  return result.data;
}
