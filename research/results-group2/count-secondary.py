import json,pathlib,urllib.request,hashlib,csv,io,zipfile,datetime,collections
out=pathlib.Path(__file__).parent
def save(name,value): (out/name).write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8')
for rid in ['70156','70157']:
 u='https://voterportal.sos.la.gov/ElectionResults/ElectionResults/Data?blob=20260627/csv/ByParish_'+rid+'.csv'
 try:
  with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'ElectionTracker official public results research/1.0'}),timeout=35) as r: b=r.read(4*1024*1024);status=r.status;ct=r.headers.get('Content-Type')
  (out/('LA-Jun27-'+rid+'.csv')).write_bytes(b)
  save('LA-Jun27-'+rid+'-csv-proof.json',{'url':u,'status':status,'contentType':ct,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'trueElectionDate':'2026-06-27','phase':'primary_runoff','sourceAsOf':None,'certificationDeclaration':None})
  print('LA',rid,b[:1500].decode('utf-8-sig',errors='replace'))
 except Exception as e:save('LA-Jun27-'+rid+'-csv-proof.json',{'url':u,'error':str(e)});print('LA',rid,str(e))
z=zipfile.ZipFile(out/'NJ-version-csv.zip');print('NJ ZIP',z.namelist());raw=z.read('summary.csv');(out/'NJ-primary-summary.csv').write_bytes(raw);print('NJ CSV',raw[:2200].decode('utf-8-sig',errors='replace'))
nd=json.loads((out/'ND-results346.json').read_text(encoding='utf-8'));print('ND keys',list(nd));print('ND H',json.dumps(nd.get('contests',{}).get('20042REP'),indent=2)[:3500])
la=json.loads((out/'LA-Jun27-votes.json').read_text(encoding='utf-8'))['Races']['Race']; la_receipts=[]
for rid in ['70156','70157']:
 rows=[r for r in csv.reader(io.StringIO((out/('LA-Jun27-'+rid+'.csv')).read_text(encoding='utf-8-sig'))) if r]; assert len(rows)==65; assert len({r[1] for r in rows[1:]})==64
 sums=[sum(int(r[c]) for r in rows[1:]) for c in [2,3]]; race=next(r for r in la if str(r['ID'])==rid); assert sums==[int(c['VoteTotal']) for c in race['Choice']]
 la_receipts.append({'externalContestId':rid,'trueElectionDate':'2026-06-27','phase':'primary_runoff','parishRows':64,'candidateColumns':rows[0][2:],'candidateIds':[str(c['ID']) for c in race['Choice']],'independentParishSums':sums,'publishedJSONMatches':True,'totalContestVotes':sum(sums),'sourceAsOf':None,'sourceAsOfReason':'1900-01-01 sentinel in vote JSON','reportingPercentage':None,'certificationDeclaration':None})
save('LA-primary-runoff-independent-expectations.json',la_receipts);print('LA counted',la_receipts)
ndrace=nd['response']['contests']['20042REP']; agg=collections.Counter()
for r in ndrace['locations'].values():
 for c in r['choices']:agg[c['choiceID']]+=c['totalVotes']
assert len(ndrace['locations'])==53;assert dict(agg)=={c['choiceID']:c['totalVotes'] for c in ndrace['choices']};assert sum(agg.values())==ndrace['totalVotes']==82075
save('ND-primary-independent-expectations.json',{'trueElectionDate':'2026-06-09','phase':'primary','state':'ND','office':'H','district':'00','party':'REP','externalContestId':'20042REP','countyRows':53,'independentCountyTotals':dict(agg),'sourceStateTotalsMatch':True,'totalContestVotes':82075,'sourceAsOf':nd['lastUpdated'],'sourceIsOfficial':nd['isOfficial'],'reportingPercentage':nd['turnout'].get('reportingPercent'),'certificationDeclaration':None,'genericWriteInChoiceId':'9901','sourceWinnerIsPrimaryWinnerNotGeneralElectionWinner':True});print('ND counted',dict(agg))
mn=[r.split(';') for r in (out/'MN-USHouse.txt').read_text(encoding='utf-8').splitlines() if r]; mn_scopes=[]
for district in sorted({r[5] for r in mn}):
 rows=[r for r in mn if r[5]==district]; total=sum(int(r[13]) for r in rows); assert all(total==int(r[15]) for r in rows);mn_scopes.append({'district':district.zfill(2),'externalContestId':rows[0][3],'literalNames':[r[7] for r in rows],'scopedChoiceIds':[r[6] for r in rows],'candidateVotes':[int(r[13]) for r in rows],'sumMatchesSourceTotal':True,'totalContestVotes':total,'reportingUnits':{'reported':int(rows[0][11]),'total':int(rows[0][12])}})
assert len(mn_scopes)==8;save('MN-House-independent-expectations.json',{'trueElectionDate':'2024-11-05','phase':'general','state':'MN','sourceElectionId':'170','sourceAsOf':None,'reportingPercentage':None,'certificationDeclaration':None,'publisherLabel':'Unofficial Results','scopes':mn_scopes});print('MN counted',len(mn_scopes),mn_scopes[0]['totalContestVotes'])
njrows=list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig')))); nj=json.loads((out/'NJ-version-summary.json').read_text());print('NJ summaryshape',type(nj),list(nj)[:3] if isinstance(nj,dict) else 'array')
summary=nj if isinstance(nj,list) else nj.get('Contests',nj.get('contests',[]));nj_scopes=[]
for prefix in ['REP U.S. Senator','DEM U.S. Senator']:
 rows=[r for r in njrows if r['contest name'].startswith(prefix)];target=next(c for c in summary if str(c.get('N',c.get('C',''))).startswith(prefix));print('NJtarget',prefix,list(target));votes=[int(r['total votes']) for r in rows]; assert votes==target['V']; nj_scopes.append({'contest':prefix,'externalContestId':target['K'],'candidateNames':[r['choice name'] for r in rows],'candidateVotes':votes,'totalContestVotes':sum(votes),'candidateTotalsMatchJSON':True,'CSVReporting':{'reported':int(rows[0]['num Area rptg']),'total':int(rows[0]['num Area total'])},'JSONReporting':{'reported':target['PR'],'total':target['TP']},'reportingSnapshotsAgree':int(rows[0]['num Area rptg'])==target['PR']})
save('NJ-primary-independent-expectations.json',{'state':'NJ','scope':'Atlantic County only','trueElectionDate':'2026-06-02','phase':'primary','externalElectionId':'126380','version':'377336','sourceAsOf':'2026-07-20T13:39:26Z','sourceAsOfRaw':'7/20/2026 9:39:26 AM EDT','candidateExternalIds':None,'reportingPercentage':None,'certificationDeclaration':None,'scopes':nj_scopes});print('NJ counted',nj_scopes)
