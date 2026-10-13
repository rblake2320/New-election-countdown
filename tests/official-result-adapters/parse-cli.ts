/** Offline compiled verifier for actual frozen source bodies; never posts/writes results. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { parseNcOfficialResults, type NcOfficialScope } from '../../server/official-result-adapters/nc';
import { parseLaOfficialResults, type LaOfficialScope } from '../../server/official-result-adapters/la';
import { OfficialResultParseError } from '../../server/official-result-adapters/types';

const dir=resolve('tests/fixtures/official-result-adapters');
const file=(name:string)=>readFileSync(resolve(dir,name));
const hash=(body:Uint8Array)=>createHash('sha256').update(body).digest('hex');
const manifest=JSON.parse(file('manifest.json').toString('utf8'));
for(const row of manifest.files){const b=file(row.name);if(hash(b)!==row.sha256||b.length!==row.bytes)throw new Error('Frozen fixture hash mismatch: '+row.name);}
const nc=file('NC-primary-results.txt'),county=file('NC-primary-counties.txt');
const ncScope:NcOfficialScope={context:{state:'NC',electionDate:'2026-03-03',phase:'primary',level:'federal',office:'U.S. Senate',district:null,party:'DEM'},sourceContestId:'2147',localContestId:'2147',resultsUrl:'https://er.ncsbe.gov/enr/20260303/data/results_0.txt',countyUrl:'https://er.ncsbe.gov/enr/20260303/data/county.txt',resultsSha256:hash(nc),countySha256:hash(county)};
const la=file('LA-Jun27-votes.raw.json'),roster=file('LA-Jun27-races.raw.json');
const laScope:LaOfficialScope={context:{state:'LA',electionDate:'2026-06-27',phase:'primary_runoff',level:'federal',office:'U.S. Senate',district:null,party:'DEM'},sourceContestId:'70156',votesUrl:'https://voterportal.sos.la.gov/ElectionResults/ElectionResults/Data?blob=20260627/Votes_Multiparish.htm',rosterUrl:'https://voterportal.sos.la.gov/ElectionResults/ElectionResults/Data?blob=20260627/RacesCandidates_Multiparish.htm',votesSha256:hash(la),rosterSha256:hash(roster)};
const positives=[parseNcOfficialResults(nc,county,ncScope),parseLaOfficialResults(la,roster,laScope),parseLaOfficialResults(la,roster,{...laScope,sourceContestId:'70157',context:{...laScope.context,party:'REP'}}),parseNcOfficialResults(nc,county,{...ncScope,sourceContestId:'2107',localContestId:'2107',context:{...ncScope.context,office:'U.S. House',district:'01',party:'REP'}})];
if(positives.map(r=>r.totalVotes).join(',')!=='827755,196212,316593,67376')throw new Error('Real source totals differ from independently counted source expectations');
const houseSums=new Map<string,number>(),houseCounties=new Set<string>();
for(const line of file('NC-20260303-House01-REP-county-totals.csv').toString('utf8').trim().split(/\r?\n/).slice(1)){const fields=line.split(',');if(fields.length!==3)throw new Error('Retained countyCSV is malformed');houseCounties.add(fields[0]);houseSums.set(fields[1],(houseSums.get(fields[1])??0)+Number(fields[2]));}
if(houseCounties.size!==25||positives[3].options.some(r=>houseSums.get(r.name)!==r.votes))throw new Error('House source county sums disagree with parsed actual returns');
const negatives:{scenario:string,code:string}[]=[];
function refuse(scenario:string,expectedCode:string,run:()=>unknown){try{run();throw new Error('Unsafe input admitted: '+scenario);}catch(e){if(!(e instanceof OfficialResultParseError)||e.code!==expectedCode)throw e;negatives.push({scenario,code:e.code});}}
refuse('NCgid2147DEMcannotbeREP','CONTEXT_MISMATCH',()=>parseNcOfficialResults(nc,county,{...ncScope,context:{...ncScope.context,party:'REP'}}));
refuse('LAprimary_runoffcannotbeGeneral','CONTEXT_MISMATCH',()=>parseLaOfficialResults(la,roster,{...laScope,context:{...laScope.context,phase:'general'}}));
refuse('NCnoisyPrecinctSort','UNSUPPORTED_DATASET',()=>parseNcOfficialResults(nc,county,{...ncScope,resultsUrl:'https://s3.amazonaws.com/dl.ncsbe.gov/ENRS/2026_03_03/precinct_sort.txt'}));
const futureNc=file('NC-20261103-results_0.txt'),futureCounty=file('NC-20261103-county.txt');
refuse('NCactualNov3ZeroPlaceholder','STAGING_DATA',()=>parseNcOfficialResults(futureNc,futureCounty,{...ncScope,context:{...ncScope.context,electionDate:'2026-11-03',phase:'general',party:null},sourceContestId:'1383',localContestId:'1383',resultsUrl:ncScope.resultsUrl.replace('20260303','20261103'),countyUrl:ncScope.countyUrl.replace('20260303','20261103'),resultsSha256:hash(futureNc),countySha256:hash(futureCounty)}));
const futureLa=file('LA-Nov3-votes.raw.json'),futureRoster=file('LA-Nov3-races.raw.json');
refuse('LAactualNov3ZeroPlaceholder','STAGING_DATA',()=>parseLaOfficialResults(futureLa,futureRoster,{...laScope,context:{...laScope.context,electionDate:'2026-11-03',phase:'general',party:null},sourceContestId:'67997',votesUrl:laScope.votesUrl.replace('20260627','20261103'),rosterUrl:laScope.rosterUrl.replace('20260627','20261103'),votesSha256:hash(futureLa),rosterSha256:hash(futureRoster)}));
console.log(JSON.stringify({status:'Worked',frozenSourceCommit:manifest.sourceCommit,realParsedContests:positives,refused:negatives,networkCalls:0,DBCalls:0,sourceFilesVerified:manifest.files.length},null,2));
