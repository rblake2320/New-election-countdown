import hashlib,json,pathlib,re,urllib.parse
P=pathlib.Path(__file__).resolve().parent;inventory=json.loads((P/'source-inventory.json').read_text())
expected=set('OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split());assert len(inventory['records'])==16 and {r['state'] for r in inventory['records']}==expected
assert inventory['liveGeneralResultRecordsAdmitted']==0 and inventory['databaseWrites']==0 and inventory['appParserOrDTOChanged'] is False
for r in inventory['records']:assert r['sourceAsOf'] is None and r['targetElectionDate']=='2026-11-03'
contactKeys=[]
def walk(x,path):
    if isinstance(x,dict):
        for k,v in x.items():
            if re.search(r'^(?:email|phone|address|contactDetails|contactEmail|contactPhone)$',k,re.I):contactKeys.append(path+'.'+k)
            walk(v,path+'.'+k)
    elif isinstance(x,list):
        for i,v in enumerate(x):walk(v,path+'[]')
    elif isinstance(x,str):
        assert not re.search(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}',urllib.parse.unquote(x)),path+' contact value'
for file in P.rglob('*.json'):walk(json.loads(file.read_text(encoding='utf-8')),str(file.relative_to(P)))
assert not contactKeys
download=json.loads((P/'receipts/example-downloads.json').read_text());verified=[]
for proof in download:
    if proof['outcome']!='Worked':continue
    payload=(P/'recordings'/proof['file']).read_bytes();assert hashlib.sha256(payload).hexdigest()==proof['sha256'];verified.append(proof['file'])
wa=json.loads((P/'receipts/wa-correction-conservation.json').read_text());assert wa['completeCandidateOptionCount']==8 and wa['countyRowsIndependentlySummed']==39 and wa['beforeCandidateVoteSumIncludingWriteIn']==1903073 and wa['afterCandidateVoteSumIncludingWriteIn']==1903115
vt=json.loads((P/'receipts/vt-identifier-conservation.json').read_text());assert len(vt['officeComparisons'])==3
for office in vt['officeComparisons']:assert office['candidateVotesDerivedIncludingAllSourceOptions']==office['publisherStateWideOptionSum'] and office['sourceSummaryRowsExcluded']==1
files=[]
for file in sorted(P.rglob('*')):
    if not file.is_file() or '__pycache__' in file.parts or file.name=='packet-verification.json':continue
    payload=file.read_bytes();files.append({'file':str(file.relative_to(P)).replace('\\','/'),'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest()})
out={'outcome':'Worked','states':16,'coverageCounts':{s:sum(r['coverageStatus']==s for r in inventory['records']) for s in ['usable_feed/download','official_page_manual','blocked']},'general2026ResultRecordsAdmitted':0,'sourceAsOfInvented':0,'contactsRetained':0,'actualDownloadHashesVerified':verified,'correctionCandidateVoteTotals':[1903073,1903115],'certifiedSenateCandidateVoteTotal':1948716,'vtSummaryExclusionConservation':True,'files':files}
(P/'packet-verification.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print(json.dumps({k:out[k] for k in out if k!='files'}))
