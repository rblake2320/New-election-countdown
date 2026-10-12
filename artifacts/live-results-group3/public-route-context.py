import gzip,hashlib,json,pathlib,re,urllib.request
P=pathlib.Path(__file__).resolve().parent
u='https://enr.elections.virginia.gov/results/public/main-E6MCELDW.js'
with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'ElectionTracker-public-source-research/1.0'}),timeout=20) as r:raw=r.read()
b=gzip.decompress(raw) if raw[:2]==b'\x1f\x8b' else raw;t=b.decode()
contexts=[]
for keyword in ['/cdn/results','/results/public/api']:
    for m in list(re.finditer(re.escape(keyword),t))[:5]:contexts.append({'keyword':keyword,'context':t[max(m.start()-200,0):m.end()+400]})
out={'url':u,'sha256':hashlib.sha256(b).hexdigest(),'publicElectionRouteContexts':contexts}
(P/'receipts/civix-election-route-context.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print(json.dumps(out))
