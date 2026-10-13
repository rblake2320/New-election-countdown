import { createHash } from 'node:crypto';
import { readXlsxWorkbook } from './xlsx';
import { OfficialResultParseError, officialContestContextSchema, parsedOfficialContestSchema,
  requireContext, type OfficialContestContext, type ParsedOfficialContest } from './types';

export const WA_LANDS_CONTEXT: OfficialContestContext = { state: 'WA', electionDate: '2024-08-06', phase: 'primary', level: 'state', office: 'Commissioner of Public Lands', district: null, party: null };
export const WA_LANDS_WORKBOOK_SHA256 = '1d11cc471c4e6bfb62f690cbfd8a248cd649989acc3d479273809316d8f3d466';
const certificate = {
  initial: { sha256: 'f75e558434a6633786614cc3b2696916bf81d651c79d4a0868104ca8546849ac', dateRaw: '22nd day of August, 2024', url: 'https://www.sos.wa.gov/sites/default/files/2024-08/Certification%20of%20Results%20-%202024%20Primary.pdf' },
  recount: { sha256: 'f9b03babc54a1f108c13bab5a02a565d5bac7fa6a7a11a4f43cd7f0ec02d7949', dateRaw: '4th day of September, 2024', url: 'https://www.sos.wa.gov/sites/default/files/2024-09/Certification%20of%20recount%20results%20-%202024%20Primary_signed.pdf' },
};
const headings = ['Allen Lebovitz', 'Jaime Herrera Beutler', 'Dave Upthegrove', 'Sue Kuehl Pederson', 'Patrick DePoe', 'Jeralee Anderson', 'Kevin Van De Wege', 'Write-In', 'Overvote', 'Undervote', 'Totals'];
function refuse(message: string): never { throw new OfficialResultParseError('WA_SOURCE_REFUSED', message); }
function integer(value: unknown, signed = false): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || (!signed && value < 0)) refuse('Required official count is not a cached integer'); return value;
}
// This narrow version admits only the frozen, independently reviewed full
// contest workbook and certificate. Other publications need a new reviewed
// adapter revision, never a loose filename/year guess.
export async function parseWashingtonLandsRecount(bytes: Buffer, input: {
  context: OfficialContestContext; snapshot: 'initial' | 'recount'; certificationBytes: Buffer;
}): Promise<ParsedOfficialContest> {
  const context = officialContestContextSchema.parse(input.context); requireContext(context, WA_LANDS_CONTEXT);
  if (input.snapshot !== 'initial' && input.snapshot !== 'recount') refuse('Unknown snapshot');
  const proof = certificate[input.snapshot];
  if (createHash('sha256').update(bytes).digest('hex') !== WA_LANDS_WORKBOOK_SHA256) refuse('Workbook bytes are not the reviewed official publication');
  if (createHash('sha256').update(input.certificationBytes).digest('hex') !== proof.sha256) refuse('Certification bytes do not match the reviewed exact contest');
  const book = await readXlsxWorkbook(bytes), sheet = book.sheets.find(value => value.name === 'Sheet1');
  if (!sheet || book.sheets.length !== 1 || sheet.rows.length !== 42 || sheet.rows.some(row => row.length !== 34)) refuse('Reviewed workbook dimensions changed');
  const header = sheet.rows[0], subheader = sheet.rows[1], totals = sheet.rows[41];
  if (!header || !subheader || !totals || subheader[0] !== 'County' || totals[0] !== 'Total') refuse('Workbook totals layout changed');
  const counties = sheet.rows.slice(2, 41), names = new Set<string>();
  for (const row of counties) {
    const name = row[0]; if (typeof name !== 'string' || !/^.+ \([A-Z]{2}\)$/.test(name) || names.has(name)) refuse('Incomplete or duplicate county scope'); names.add(name);
  }
  for (let group = 0; group < headings.length; group++) {
    const col = 1 + group * 3;
    if (header[col] !== headings[group] || subheader[col] !== 'Initial' || subheader[col + 1] !== 'Recount' || subheader[col + 2] !== (group === 10 ? 'Difference' : 'Variance')) refuse('Official option/column labels changed');
    for (const row of [...counties, totals]) {
      if (integer(row[col + 1]) - integer(row[col]) !== integer(row[col + 2], true)) refuse('Official variance fails conservation');
    }
    for (let phase = 0; phase < 3; phase++) {
      const sum = counties.reduce((value, row) => value + integer(row[col + phase], phase === 2), 0);
      if (!Number.isSafeInteger(sum) || sum !== integer(totals[col + phase], phase === 2)) refuse('County counts do not conserve statewide totals');
    }
  }
  const offset = input.snapshot === 'initial' ? 0 : 1;
  const options = headings.slice(0, 8).map((name, index) => ({
    sourceCandidateId: null, identifierBasis: 'printed_label' as const, name,
    // These are publisher preference labels, not inferred party affiliation.
    party: index === 7 ? null : (index === 1 || index === 3) ? '(Prefers Republican Party)' : '(Prefers Democratic Party)',
    votes: integer(totals[1 + index * 3 + offset]), percent: null, isWinner: false as const,
    optionKind: index === 7 ? 'write_in' as const : 'named' as const,
  }));
  const totalVotes = options.reduce((sum, option) => sum + option.votes, 0);
  const overvote = integer(totals[25 + offset]), undervote = integer(totals[28 + offset]), ballotTotal = integer(totals[31 + offset]);
  if (totalVotes + overvote + undervote !== ballotTotal) refuse('Ballot counts do not conserve option counts');
  return parsedOfficialContestSchema.parse({ context, sourceContestId: `Sheet1:Commissioner of Public Lands:${input.snapshot === 'initial' ? 'Initial' : 'Recount'}`,
    sourcePayloadSha256: book.sha256, asOf: null, asOfBasis: 'not_provided',
    asOfRaw: input.snapshot === 'recount' ? 'Sept 4 @ 1PM' : null, reporting: null,
    totalVotes, options, publisherMetrics: { overvote, undervote, ballotTotal },
    certificationEvidence: [{ ...proof, certifiedAt: null, context }],
  });
}
