import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseNcOfficialResults, type NcOfficialScope } from '../../server/official-result-adapters/nc';
import { parseLaOfficialResults, type LaOfficialScope } from '../../server/official-result-adapters/la';
import { OfficialResultParseError } from '../../server/official-result-adapters/types';

const fixture = (name: string) => readFileSync(resolve('tests/fixtures/official-result-adapters', name));
const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const ncVotes = fixture('NC-primary-results.txt');
const ncCounty = fixture('NC-primary-counties.txt');
const laVotes = fixture('LA-Jun27-votes.raw.json');
const laRoster = fixture('LA-Jun27-races.raw.json');
const ncScope: NcOfficialScope = {
  context: { state: 'NC', electionDate: '2026-03-03', phase: 'primary', office: 'U.S. Senate', level: 'federal', district: null, party: 'DEM' },
  sourceContestId: '2147', localContestId: '2147',
  resultsUrl: 'https://er.ncsbe.gov/enr/20260303/data/results_0.txt', countyUrl: 'https://er.ncsbe.gov/enr/20260303/data/county.txt',
  resultsSha256: hash(ncVotes), countySha256: hash(ncCounty),
};
const laScope: LaOfficialScope = {
  context: { state: 'LA', electionDate: '2026-06-27', phase: 'primary_runoff', office: 'U.S. Senate', level: 'federal', district: null, party: 'DEM' },
  sourceContestId: '70156', votesUrl: 'https://voterportal.sos.la.gov/ElectionResults/ElectionResults/Data?blob=20260627/Votes_Multiparish.htm',
  rosterUrl: 'https://voterportal.sos.la.gov/ElectionResults/ElectionResults/Data?blob=20260627/RacesCandidates_Multiparish.htm',
  votesSha256: hash(laVotes), rosterSha256: hash(laRoster),
};
function refuses(run: () => unknown, code: string) {
  try { run(); throw new Error('Parser silently admitted refused input'); }
  catch (error) { expect(error).toBeInstanceOf(OfficialResultParseError); expect((error as OfficialResultParseError).code).toBe(code); }
}
function mutate(raw: Buffer, change: (value: any) => void): string {
  const value = JSON.parse(raw.toString('utf8')); change(value); return JSON.stringify(value);
}
describe('NC real official raw JSON', () => {
  it('matches independent original ZIP total and six actual DEM choices, preserving raw labels', () => {
    const result = parseNcOfficialResults(ncVotes, ncCounty, ncScope);
    expect(result.totalVotes).toBe(827755);
    expect(result.options.map(row => [row.name, row.votes])).toEqual([['Roy Cooper',761345],['Justin E. Dues',22295],['Marcus W. Williams',20336],['Daryl Farrow',9727],['Orrick Quick',7275],['Robert Colon',6777]]);
    expect(result.options.every(row => row.sourceCandidateId === null && row.identifierBasis === 'printed_label' && !row.isWinner)).toBe(true);
    expect(result.options[0].percent).toBe(91.98);
    expect(result.reporting).toEqual({ basis: 'precincts', percent: 100, precinctsReporting: 2633, precinctsTotal: 2633 });
    expect(result.asOf).toBeNull(); expect(result.asOfBasis).toBe('not_provided'); expect(result.asOfRaw).toBe('April 8, 2026 4:11 pm');
    expect(result.certificationEvidence).toEqual([]); expect(result.sourcePayloadSha256).toBe(hash(ncVotes));
  });
  it('same group2147 with REP local2149 returns only REP, never DEM', () => {
    const result = parseNcOfficialResults(ncVotes, ncCounty, { ...ncScope, localContestId: '2149', context: { ...ncScope.context, party: 'REP' } });
    expect(result.options.every(r => r.party === 'REP')).toBe(true); expect(result.options.some(r => r.name === 'Roy Cooper')).toBe(false); expect(result.options[0].name).toBe('Michael Whatley');
  });
  it.each([{ party: 'REP' }, { party: null }, { office: 'U.S. House' }, { district: '01' }, { phase: 'general' }, { state: 'LA' }, { level: 'state' }])('refuses wrong scope %j', patch => refuses(() => parseNcOfficialResults(ncVotes, ncCounty, { ...ncScope, context: { ...ncScope.context, ...patch } } as NcOfficialScope), 'CONTEXT_MISMATCH'));
  it('old primary cannot be relabelled as Nov3 by changing both URLs/context', () => refuses(() => parseNcOfficialResults(ncVotes,ncCounty,{...ncScope,context:{...ncScope.context,electionDate:'2026-11-03'},resultsUrl:ncScope.resultsUrl.replace('20260303','20261103'),countyUrl:ncScope.countyUrl.replace('20260303','20261103')}),'CONTEXT_MISMATCH'));
  it('refuses actual future all-zero general recording', () => {
    const votes=fixture('NC-20261103-results_0.txt'),county=fixture('NC-20261103-county.txt');
    refuses(()=>parseNcOfficialResults(votes,county,{...ncScope,context:{...ncScope.context,electionDate:'2026-11-03',phase:'general',party:null},sourceContestId:'1383',localContestId:'1383',resultsUrl:ncScope.resultsUrl.replace('20260303','20261103'),countyUrl:ncScope.countyUrl.replace('20260303','20261103'),resultsSha256:hash(votes),countySha256:hash(county)}),'STAGING_DATA');
  });
  it('refuses noisy precinct-sort source regardless of legitimate totals',()=>refuses(()=>parseNcOfficialResults(ncVotes,ncCounty,{...ncScope,resultsUrl:'https://s3.amazonaws.com/dl.ncsbe.gov/ENRS/2026_03_03/precinct_sort.txt'}),'UNSUPPORTED_DATASET'));
  it('refuses reformat/hash changes before reading counts',()=>refuses(()=>parseNcOfficialResults(ncVotes.toString('utf8')+'\n',ncCounty,ncScope),'SOURCE_HASH_MISMATCH'));
  it('refuses truncated JSON as typed failure even when caller hashes the truncation',()=>{const raw=ncVotes.subarray(0,300);refuses(()=>parseNcOfficialResults(raw,ncCounty,{...ncScope,resultsSha256:hash(raw)}),'INVALID_JSON');});
  it('refuses duplicate same-name ballot option',()=>{const raw=mutate(ncVotes,v=>v.push(v.find((r:any)=>r.gid==='2147'&&r.lid==='2147')));refuses(()=>parseNcOfficialResults(raw,ncCounty,{...ncScope,resultsSha256:hash(raw)}),'INVALID_RESULT');});
  it.each(['-1','NaN','1.2','9007199254740992'])('refuses hostile vote count %s',value=>{const raw=mutate(ncVotes,v=>v.find((r:any)=>r.gid==='2147'&&r.lid==='2147').vct=value);refuses(()=>parseNcOfficialResults(raw,ncCounty,{...ncScope,resultsSha256:hash(raw)}),'INVALID_COUNT');});
  it('refuses inconsistent vote-method totals',()=>{const raw=mutate(ncVotes,v=>v.find((r:any)=>r.gid==='2147'&&r.lid==='2147').evc='1');refuses(()=>parseNcOfficialResults(raw,ncCounty,{...ncScope,resultsSha256:hash(raw)}),'VOTE_TOTAL_MISMATCH');});
  it('does not reuse statewide reporting percent for actual House district',()=>{const result=parseNcOfficialResults(ncVotes,ncCounty,{...ncScope,sourceContestId:'2107',localContestId:'2107',context:{...ncScope.context,office:'U.S. House',district:'01',party:'REP'}});expect(result.reporting?.precinctsTotal).toBe(292);expect(result.reporting?.percent).toBeNull();});
});
describe('LA real official anonymous graphical blobs',()=>{
  it('matches independently summed64parish DEM total, retains publisher voter denominator separately',()=>{
    const result=parseLaOfficialResults(laVotes,laRoster,laScope);expect(result.totalVotes).toBe(196212);expect(result.options.map(r=>[r.sourceCandidateId,r.name,r.party,r.votes])).toEqual([['124648','Gary Crockett','DEM',39423],['124649','"Jamie" Davis','DEM',156789]]);
    expect(result.options.every(r=>!r.isWinner&&r.percent===null)).toBe(true);expect(result.publisherMetrics.VoterCountVoted).toBe(202767);expect(result.reporting).toEqual({basis:'precincts',percent:null,precinctsReporting:3722,precinctsTotal:3722});expect(result.asOf).toBeNull();expect(result.asOfBasis).toBe('not_provided');expect(result.asOfRaw).toBe('1900-01-01T00:00:00');expect(result.certificationEvidence).toEqual([]);expect(result.sourcePayloadSha256).toBe(hash(laVotes));
  });
  it('matches independently counted REP runoff, ignores Advances as a general winner',()=>{const r=parseLaOfficialResults(laVotes,laRoster,{...laScope,sourceContestId:'70157',context:{...laScope.context,party:'REP'}});expect(r.totalVotes).toBe(316593);expect(r.options.map(o=>o.votes)).toEqual([136591,180002]);expect(r.options.every(o=>!o.isWinner)).toBe(true);});
  it.each([{party:'REP'},{party:null},{phase:'general'},{phase:'primary'},{office:'U.S. House'},{district:'01'},{state:'NC'},{level:'state'}])('refuses wrong scope %j',patch=>refuses(()=>parseLaOfficialResults(laVotes,laRoster,{...laScope,context:{...laScope.context,...patch}} as LaOfficialScope),'CONTEXT_MISMATCH'));
  it('refuses relabelling old runoff as general election even when URL date changed',()=>refuses(()=>parseLaOfficialResults(laVotes,laRoster,{...laScope,context:{...laScope.context,electionDate:'2026-11-03',phase:'general'},votesUrl:laScope.votesUrl.replace('20260627','20261103'),rosterUrl:laScope.rosterUrl.replace('20260627','20261103')}),'CONTEXT_MISMATCH'));
  it('refuses actual Nov3 zero placeholder Senate',()=>{const v=fixture('LA-Nov3-votes.raw.json'),r=fixture('LA-Nov3-races.raw.json');refuses(()=>parseLaOfficialResults(v,r,{...laScope,sourceContestId:'67997',context:{...laScope.context,electionDate:'2026-11-03',phase:'general',party:null},votesUrl:laScope.votesUrl.replace('20260627','20261103'),rosterUrl:laScope.rosterUrl.replace('20260627','20261103'),votesSha256:hash(v),rosterSha256:hash(r)}),'STAGING_DATA');});
  it('Nov3 House cannot become general or closed REP primary',()=>{const v=fixture('LA-Nov3-votes.raw.json'),r=fixture('LA-Nov3-races.raw.json');const s={...laScope,sourceContestId:'70195',context:{...laScope.context,electionDate:'2026-11-03',phase:'general' as const,office:'U.S. House',district:'01',party:null},votesUrl:laScope.votesUrl.replace('20260627','20261103'),rosterUrl:laScope.rosterUrl.replace('20260627','20261103'),votesSha256:hash(v),rosterSha256:hash(r)};refuses(()=>parseLaOfficialResults(v,r,s),'CONTEXT_MISMATCH');refuses(()=>parseLaOfficialResults(v,r,{...s,context:{...s.context,phase:'primary',party:'REP'}}),'CONTEXT_MISMATCH');refuses(()=>parseLaOfficialResults(v,r,{...s,context:{...s.context,phase:'primary'}}),'STAGING_DATA');});
  it('refuses companion raw hash mismatch',()=>refuses(()=>parseLaOfficialResults(laVotes,laRoster,{...laScope,rosterSha256:'0'.repeat(64)}),'SOURCE_HASH_MISMATCH'));
  it('refuses duplicate or missing source option',()=>{const v=mutate(laVotes,j=>j.Races.Race[0].Choice[1].ID=j.Races.Race[0].Choice[0].ID);refuses(()=>parseLaOfficialResults(v,laRoster,{...laScope,votesSha256:hash(v)}),'OPTION_MISMATCH');});
  it('refuses unsupported local race rather than recasting as Senate',()=>refuses(()=>parseLaOfficialResults(laVotes,laRoster,{...laScope,sourceContestId:'70148'}),'UNSUPPORTED_OFFICE'));
  it('retains unzoned non-sentinel clock as raw only',()=>{const v=mutate(laVotes,j=>j.Races.VersionDateTime='2026-06-27T21:15:00');const r=parseLaOfficialResults(v,laRoster,{...laScope,votesSha256:hash(v)});expect(r.asOf).toBeNull();expect(r.asOfBasis).toBe('not_provided');});
  it.each(['2026-06-27T21:15:00+99:99','1900-01-01broken','not-a-clock'])('refuses malformed declared clock %s as typed failure',clock=>{const v=mutate(laVotes,j=>j.Races.VersionDateTime=clock);refuses(()=>parseLaOfficialResults(v,laRoster,{...laScope,votesSha256:hash(v)}),'INVALID_TIMESTAMP');});
});
describe('recording integrity',()=>{it('all8bytes match committed source research hashes',()=>{const manifest=JSON.parse(fixture('manifest.json').toString());for(const f of manifest.files){const raw=fixture(f.name);expect(raw.length).toBe(f.bytes);expect(hash(raw)).toBe(f.sha256);}});});
