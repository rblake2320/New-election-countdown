import { createHash } from 'node:crypto';
import { resultsTimestamp } from '../../shared/official-results';
import { OfficialResultParseError, officialContestContextSchema, parsedOfficialContestSchema, requireContext, type OfficialContestContext, type ParsedOfficialContest } from './types';

export interface LaOfficialScope {
  context: OfficialContestContext;
  sourceContestId: string;
  votesUrl: string;
  rosterUrl: string;
  votesSha256: string;
  rosterSha256: string;
}
type Row = Record<string, unknown>;
export const laOfficialSupportedRoles = ['U.S. Senate', 'U.S. House'] as const;
function refuse(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new OfficialResultParseError(code, message);
}
function row(value: unknown, field: string): Row {
  refuse(value !== null && typeof value === 'object' && !Array.isArray(value), 'INVALID_PAYLOAD', `LA ${field} is not an object`);
  return value as Row;
}
function list(value: unknown, field: string): Row[] {
  refuse(Array.isArray(value) && value.length > 0 && value.length <= 100000, 'INVALID_PAYLOAD', `LA ${field} is not a bounded nonempty array`);
  return value.map(v => row(v, field));
}
function body(raw: Uint8Array | string, expectedHash: string): { value: Row; sha256: string } {
  refuse(typeof raw === 'string' || Buffer.isBuffer(raw) || raw instanceof Uint8Array, 'INVALID_PAYLOAD', 'LA source body must be bytes or a string');
  const bytes = typeof raw === 'string' ? Buffer.from(raw, 'utf8') : Buffer.from(raw);
  refuse(bytes.length > 0 && bytes.length <= 16 * 1024 * 1024, 'INVALID_PAYLOAD', 'LA body is empty or exceeds the parser limit');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  refuse(/^[a-f0-9]{64}$/.test(expectedHash) && sha256 === expectedHash, 'SOURCE_HASH_MISMATCH', 'LA response differs from admitted source bytes');
  let value: unknown;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new OfficialResultParseError('INVALID_JSON', 'LA response is not complete UTF-8 JSON'); }
  return { value: row(value, 'source'), sha256 };
}
function count(value: unknown, field: string): number {
  refuse(typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value), 'INVALID_COUNT', `LA ${field} is not a nonnegative integer`);
  const n = Number(value);
  refuse(Number.isSafeInteger(n), 'INVALID_COUNT', `LA ${field} exceeds safe integer range`);
  return n;
}
function text(value: unknown, field: string): string {
  refuse(typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 512, 'INVALID_PAYLOAD', `LA ${field} is absent or malformed`);
  return value.trim();
}
function endpoint(url: string, file: string, date: string): void {
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new OfficialResultParseError('INVALID_SOURCE_URL', 'LA source URL is malformed'); }
  refuse(parsed.protocol === 'https:' && parsed.hostname === 'voterportal.sos.la.gov' && !parsed.username && !parsed.password && (!parsed.port || parsed.port === '443') && !parsed.hash && parsed.pathname === '/ElectionResults/ElectionResults/Data' && Array.from(parsed.searchParams.keys()).length === 1 && parsed.searchParams.get('blob') === `${date.replaceAll('-', '')}/${file}`, 'INVALID_SOURCE_URL', 'LA source must be the exact dated anonymous graphical blob');
}
function oneRace(races: Row, contestId: string): Row {
  const found = list(races.Race, 'races').filter(r => r.ID === contestId);
  refuse(found.length === 1, 'CONTEST_NOT_FOUND', 'LA source must contain exactly one reviewed race ID');
  return found[0];
}
function sourceContext(race: Row, date: string): OfficialContestContext {
  const title = text(race.SpecificTitle, 'race title');
  const senate = /^U\. S\. Senator(?: -- (Democratic|Republican) Party)?$/.exec(title);
  const house = /^U\. S\. Representative -- (\d+)(?:st|nd|rd|th) Congressional District$/.exec(title);
  refuse(senate || house, 'UNSUPPORTED_OFFICE', 'LA race is not a supported exact federal role');
  refuse(race.NumberToBeElected === '1', 'UNSUPPORTED_OFFICE', 'LA federal race must elect one candidate');
  let phase: OfficialContestContext['phase'];
  let party: string | null = null;
  if (senate && senate[1]) {
    // Official2026 closed-primary calendar: May16 first round, June27 runoff.
    // Dates bind to admitted government blob paths; CanHaveRunoff alone is not phase proof.
    refuse(race.OfficeLevel === '142' && race.IsClosedParty === '1' && race.CanHaveRunoff === '1' && ['2026-05-16', '2026-06-27'].includes(date), 'CONTEXT_MISMATCH', 'LA closed Senate primary date/office flags do not match the reviewed2026 calendar');
    phase = date === '2026-06-27' ? 'primary_runoff' : 'primary';
    party = senate[1] === 'Democratic' ? 'DEM' : 'REP';
  } else if (senate) {
    refuse(date === '2026-11-03' && race.OfficeLevel === '140' && race.IsClosedParty === '0' && race.CanHaveRunoff === '0', 'CONTEXT_MISMATCH', 'LA general Senate date/office flags do not match');
    phase = 'general';
  } else {
    // SOS May14 notice: Nov3 House is OPEN PRIMARY, not a general nominee contest.
    refuse(date === '2026-11-03' && race.OfficeLevel === '145' && race.IsClosedParty === '0' && race.CanHaveRunoff === '1', 'CONTEXT_MISMATCH', 'LA House source does not match the Nov3 open primary');
    phase = 'primary';
  }
  return { state: 'LA', electionDate: date, phase, level: 'federal', office: senate ? 'U.S. Senate' : 'U.S. House', district: senate ? null : house![1].padStart(2, '0'), party };
}

/** Counts and identities come from pinned roster/votes bodies, never a guessed nominee list. */
export function parseLaOfficialResults(votesRaw: Uint8Array | string, rosterRaw: Uint8Array | string, scope: LaOfficialScope): ParsedOfficialContest {
  const contextResult = officialContestContextSchema.safeParse(scope.context);
  refuse(contextResult.success, 'INVALID_CONTEXT', 'LA reviewed contest context is malformed');
  const expected = contextResult.data;
  refuse(expected.state === 'LA', 'CONTEXT_MISMATCH', 'LA parser cannot admit another state');
  endpoint(scope.votesUrl, 'Votes_Multiparish.htm', expected.electionDate);
  endpoint(scope.rosterUrl, 'RacesCandidates_Multiparish.htm', expected.electionDate);
  const votes = body(votesRaw, scope.votesSha256);
  const voteContainer = row(votes.value.Races, 'vote container');
  const roster = body(rosterRaw, scope.rosterSha256);
  const rosterRace = oneRace(row(roster.value.Races, 'roster container'), scope.sourceContestId);
  const voteRace = oneRace(voteContainer, scope.sourceContestId);
  const actual = sourceContext(rosterRace, expected.electionDate);
  requireContext(actual, expected);
  const choices = list(rosterRace.Choice, 'roster choices');
  const returns = list(voteRace.Choice, 'vote choices');
  refuse(choices.length === returns.length && new Set(choices.map(c => c.ID)).size === choices.length && new Set(returns.map(c => c.ID)).size === returns.length, 'OPTION_MISMATCH', 'LA source choices are duplicated or incomplete');
  const options: ParsedOfficialContest['options'] = choices.map(choice => {
    const sourceCandidateId = text(choice.ID, 'publisher candidate ID');
    refuse(/^\d+$/.test(sourceCandidateId), 'INVALID_PAYLOAD', 'LA publisher candidate ID is malformed');
    const returned = returns.filter(r => r.ID === sourceCandidateId);
    refuse(returned.length === 1, 'OPTION_MISMATCH', 'LA vote option does not match a unique roster option');
    const label = text(choice.Desc, 'candidate label');
    const candidate = /^(.+?) \(([A-Z]+)\)$/.exec(label);
    refuse(candidate, 'INVALID_PAYLOAD', 'LA named candidate does not have the publisher party suffix');
    refuse(actual.party === null || candidate[2] === actual.party, 'CONTEXT_MISMATCH', 'LA candidate party does not match the closed primary party');
    return { sourceCandidateId, identifierBasis: 'publisher_id', name: candidate[1], party: candidate[2], votes: count(returned[0].VoteTotal, 'candidate votes'), percent: null, isWinner: false, optionKind: /^(?:WRITE[- ]?IN|ALL OTHERS)$/i.test(candidate[1]) ? 'write_in' : 'named' };
  });
  const totalVotes = options.reduce((sum, option) => sum + option.votes, 0);
  refuse(Number.isSafeInteger(totalVotes), 'INVALID_COUNT', 'LA option vote total exceeds safe integer range');
  refuse(totalVotes > 0, 'STAGING_DATA', 'LA all-zero pre-election or unpublished returns are refused');
  const precinctsReporting = count(voteRace.PrecinctsReporting, 'precincts reporting');
  const precinctsTotal = count(voteRace.PrecinctsExpected, 'precincts expected');
  refuse(precinctsReporting <= precinctsTotal, 'REPORTING_MISMATCH', 'LA reported precincts exceed the published total');
  const publisherMetrics: ParsedOfficialContest['publisherMetrics'] = {};
  for (const key of ['VoterCountVoted', 'VoterCountQualified', 'NumAbsenteeReporting', 'NumAbsenteeExpected']) publisherMetrics[key] = voteRace[key] == null ? null : count(voteRace[key], key);
  const rawClock = voteContainer.VersionDateTime == null ? null : text(voteContainer.VersionDateTime, 'source clock');
  // Unzoned timestamps and the1900 sentinel are not source instants. WriteTime is roster metadata.
  let asOf: string | null = null;
  if (rawClock && !/^1900-01-01T00:00:00(?:\.0+)?(?:Z|[+-]00:00)?$/.test(rawClock)) {
    const clock = resultsTimestamp.safeParse(rawClock);
    if (clock.success) asOf = clock.data;
    else refuse(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(rawClock) && resultsTimestamp.safeParse(rawClock + 'Z').success, 'INVALID_TIMESTAMP', 'LA source clock is malformed; an unzoned value is retained only when it is a valid local timestamp');
  }
  const result = parsedOfficialContestSchema.safeParse({ context: actual, sourceContestId: scope.sourceContestId, sourcePayloadSha256: votes.sha256, asOf, asOfBasis: asOf === null ? 'not_provided' : 'source_timestamp', asOfRaw: rawClock, reporting: { percent: null, basis: 'precincts', precinctsReporting, precinctsTotal }, totalVotes, options, publisherMetrics, certificationEvidence: [] });
  refuse(result.success, 'INVALID_RESULT', 'LA parsed options or metadata violate the common result contract');
  return result.data;
}
