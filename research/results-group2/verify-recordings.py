"""Offline independent retained-source acceptance; no network, DB, providers or browser."""
import pathlib,json,hashlib,csv,io,collections,re
p=pathlib.Path(__file__).parent
def j(n):return json.loads((p/n).read_text(encoding='utf-8'))
manifest=j('SHA256SUMS.json')
for row in manifest['files']:
 b=(p/row['path']).read_bytes();assert len(b)==row['bytes'],row['path'];assert hashlib.sha256(b).hexdigest()==row['sha256'],row['path']
inventory=j('INVENTORY-17-states.json');assert len(inventory['items'])==len({s['state'] for s in inventory['items']})==17
for s in inventory['items']:
 for f in s['evidenceFiles']:assert (p/f).is_file(),f
 assert s['certificationDeclaration'] is None or isinstance(s['certificationDeclaration'],str)
la=j('LA-Jun27-votes.json')['Races']['Race']
for rid in ['70156','70157']:
 rows=[r for r in csv.reader(io.StringIO((p/('LA-Jun27-'+rid+'.csv')).read_text(encoding='utf-8-sig'))) if r];assert len(rows)==65;assert len({r[1] for r in rows[1:]})==64
 assert [sum(int(r[c]) for r in rows[1:]) for c in [2,3]]==[int(c['VoteTotal']) for c in next(r for r in la if str(r['ID'])==rid)['Choice']]
nd=j('ND-results346.json')['response']['contests']['20042REP'];counter=collections.Counter()
for loc in nd['locations'].values():
 for c in loc['choices']:counter[c['choiceID']]+=c['totalVotes']
assert len(nd['locations'])==53 and dict(counter)=={r['choiceID']:r['totalVotes'] for r in nd['choices']} and sum(counter.values())==82075
mn=[r.split(';') for r in (p/'MN-USHouse.txt').read_text(encoding='utf-8').splitlines() if r]
assert len({r[5] for r in mn})==8
for d in {r[5] for r in mn}:
 rows=[r for r in mn if r[5]==d];assert sum(int(r[13]) for r in rows)==int(rows[0][15]);assert all(r[15]==rows[0][15] for r in rows)
ma=list(csv.reader(io.StringIO((p/'MA-20241105-USSenate.csv').read_text(encoding='utf-8-sig'))));assert len(ma[2:-1])==351
assert [sum(int(r[i].replace(',','')) for r in ma[2:-1]) for i in range(3,8)]==[int(v.replace(',','')) for v in ma[-1][3:8]]
njrows=list(csv.DictReader(io.StringIO((p/'NJ-primary-summary.csv').read_text(encoding='utf-8-sig'))));summary=j('NJ-version-summary.json')
for prefix in ['DEM U.S. Senator','REP U.S. Senator']:
 rows=[r for r in njrows if r['contest name'].startswith(prefix)];s=next(r for r in summary if r['C'].startswith(prefix));assert [int(r['total votes']) for r in rows]==s['V'];assert sum(s['V'])==s['T'];assert int(rows[0]['num Area rptg'])==145 and s['PR']==143
cert=j('NC-certified-independent-expectations.json');assert len(cert['candidates'])==5;assert sum(c['votes'] for c in cert['candidates'])==5591551
for c in cert['candidates']:assert sum(c['literalPDFNumericColumns'])==c['votes']
enr={r['bnm']:int(r['vct']) for r in j('NC-20241105-Governor-ENR-recording.json')};assert enr['Josh Stein']==3069496 and enr['Mark Robinson']==2241309;assert cert['separateENRMatchesPDF'] is False
cor=j('NC-correction-independent-expectations.json');assert len(cor['literalCountyRows'])==100
for key,value in cor['printedStatewide'].items():assert sum(r[key] for r in cor['literalCountyRows'])==value
for r in cor['literalCountyRows']:assert r['recountRiggs']-r['canvassRiggs']==r['deltaRiggs'] and r['recountGriffin']-r['canvassGriffin']==r['deltaGriffin']
primary=j('NC-primary-independent-expectations.json');nc=[r for r in j('NC-primary-results.txt') if r['gid']=='2147' and r['pty']=='DEM'];assert len(nc)==6 and sum(int(r['vct']) for r in nc)==primary['totalContestVotes']==827755
assert {r['bnm']:int(r['vct']) for r in nc}==primary['candidateTotalsFromTabDelimitedOriginalResults']
for state,file in [('LA','LA-Nov3-votes.json'),('NC','NC-20261103-results_0.txt'),('ND','ND-results348.json')]:
 o=j(file)
 if state=='LA':assert all(int(c['VoteTotal'])==0 for r in o['Races']['Race'] for c in r['Choice'])
 elif state=='NC':assert all(int(r['vct'])==0 for r in o)
 else:assert all(int(c['totalVotes'])==0 for r in o['response']['contests'].values() for c in r['choices'])
print(json.dumps({'status':'Worked','filesHashVerified':len(manifest['files']),'states':17,'independentChecks':['LA64parish2contests','ND53countyHouse','MN8House','MA351municipality','NJCSVvsJSONvotes/reportingdiscrepancy','NCcertified5methodtotals/ENRdiscrepancy','NC100countyrealcorrection','NCprimary6choicesoriginalZIPreceipt','LA/NC/NDNov3zeroPlaceholders'],'networkCalls':0,'DBCalls':0,'browserCalls':0}))
