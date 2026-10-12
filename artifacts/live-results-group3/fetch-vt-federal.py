import datetime,hashlib,json,pathlib,urllib.parse,urllib.request
P=pathlib.Path(__file__).resolve().parent;R=P/'recordings';meta=json.loads((R/'vt-2026-primary.json').read_text())
relative=meta['federal']['path'].replace('\\','/');url=urllib.parse.urljoin('https://static.electionresults.vermont.gov/',relative)
with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ElectionTracker-public-source-research/1.0'}),timeout=25) as response:
    body=response.read();value=json.loads(body);(R/'vt-2026-primary-federal.json').write_bytes(body)
    receipt={'outcome':'Worked','url':url,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':response.status,'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest(),'electionDate':'2026-08-11','phase':'primary','sourcePublishedClockRaw':meta['lastUpdatedDate'],'sourceAsOf':None,'timezoneDeclared':False,'sourceElectionId':meta['electionDetails']['electionId'],'sourceElectionGuid':meta['electionDetails']['electionGuid'],'sourceOfficial':meta['electionDetails']['isOfficial'],'shape':type(value).__name__,'topKeys':list(value) if isinstance(value,dict) else None}
(P/'receipts/vt-federal-fetch.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print(json.dumps(receipt));print(json.dumps(value,indent=2)[:4300])
