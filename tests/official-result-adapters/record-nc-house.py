"""Bounded official-source acquisition: House01 county totals from original results ZIP."""
import urllib.request,pathlib,json,hashlib,zipfile,io,csv,collections,datetime
p=pathlib.Path('tests/fixtures/official-result-adapters');u='https://s3.amazonaws.com/dl.ncsbe.gov/ENRS/2026_03_03/results_pct_20260303.zip'
with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'ElectionTracker official public results research/1.0'}),timeout=40) as r:
 b=r.read(32*1024*1024+1);status=r.status;ct=r.headers.get('Content-Type');assert len(b)<=32*1024*1024
z=zipfile.ZipFile(io.BytesIO(b));entry='results_pct_20260303.txt';assert z.getinfo(entry).file_size<=64*1024*1024;raw=z.read(entry)
allrows=list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig')),delimiter='\t'))
names=sorted({r['Contest Name'] for r in allrows if 'US HOUSE' in r['Contest Name'] and 'DISTRICT 01' in r['Contest Name']});print('Source exact contests',names)
selected=[r for r in allrows if r['Contest Name']=='US HOUSE OF REPRESENTATIVES DISTRICT 01 (REP)'];assert selected
totals=collections.Counter();counties=collections.Counter()
for r in selected:
 v=int(r['Total Votes']);assert v==sum(int(r[k]) for k in ['Election Day','Early Voting','Absentee by Mail','Provisional']);totals[r['Choice']]+=v;counties[(r['County'],r['Choice'])]+=v
api=json.loads((p/'NC-primary-results.txt').read_bytes());opts=[r for r in api if r['cid']=='0' and r['gid']=='2107' and r['lid']=='2107'];assert len(opts)==len(totals)==5;assert dict(totals)=={r['bnm']:int(r['vct']) for r in opts}
csvpath=p/'NC-20260303-House01-REP-county-totals.csv'
with csvpath.open('w',encoding='utf-8',newline='') as f:
 w=csv.writer(f);w.writerow(['County','Choice','Total Votes']);w.writerows((county,name,votes) for (county,name),votes in sorted(counties.items()))
receipt={'url':u,'status':status,'contentType':ct,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'rawZIPsha256':hashlib.sha256(b).hexdigest(),'rawZIPbytes':len(b),'entry':entry,'entrySHA256':hashlib.sha256(raw).hexdigest(),'entryBytes':len(raw),'trueElectionDate':'2026-03-03','phase':'primary','state':'NC','office':'U.S. House','district':'01','party':'REP','sourceContestId':'2107','localContestId':'2107','literalContestTitle':'US HOUSE OF REPRESENTATIVES DISTRICT 01 (REP)','sourceRowsAggregated':len(selected),'countyCount':len({r['County'] for r in selected}),'countyChoiceRows':len(counties),'candidateTotals':dict(totals),'totalContestVotes':sum(totals.values()),'separateENRJSONTotalsMatch':True,'voteMethodsSumForEverySelectedSourceRow':True,'recordingTransform':'Original tab-delimited result rows independently aggregated by county/choice; no votes invented or date relabelled','countyCSVsha256':hashlib.sha256(csvpath.read_bytes()).hexdigest(),'selectedLiteralOriginalRows':selected[:6],'noNoisyPrecinctSort':True}
(p/'NC-House01-independent-proof.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print(json.dumps({k:receipt[k] for k in ['sourceRowsAggregated','countyCount','candidateTotals','totalContestVotes','rawZIPsha256']}))
