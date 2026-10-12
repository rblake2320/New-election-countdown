import datetime,gzip,hashlib,json,pathlib,urllib.request
P=pathlib.Path(__file__).resolve().parent;R=P/'recordings'
urls={
'vt-2026-primary.json':'https://static.electionresults.vermont.gov/elections/a18f77e0-89f8-4a01-8d97-61a7c75ba200.json',
'wv-public-config.json':'https://results.enr.clarityelections.com/WV/126209/web.345435/config.json',
'oh-data-portal':'https://data.ohiosos.gov/portal/past-election-results',
'wi-official-guidance':'https://myvote.wi.gov/en-us/Election-Results'}
receipts=[]
for name,url in urls.items():
    d={'name':name,'url':url,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ElectionTracker-public-source-research/1.0'}),timeout=25) as r:
            raw=r.read();body=gzip.decompress(raw) if raw[:2]==b'\x1f\x8b' else raw;d.update({'outcome':'Worked','status':r.status,'finalUrl':r.url,'contentType':r.headers.get('Content-Type'),'sha256':hashlib.sha256(body).hexdigest(),'bytes':len(body)})
            if name.endswith('.json'):
                value=json.loads(body);d['shape']=type(value).__name__;d['topLevelKeys']=list(value) if isinstance(value,dict) else None;(R/name).write_bytes(body)
    except Exception as e:d.update({'outcome':'Blocked','error':str(e)})
    receipts.append(d);print(json.dumps(d),flush=True)
(P/'receipts/public-data-fetches.json').write_text(json.dumps(receipts,indent=2)+'\n',encoding='utf-8')
