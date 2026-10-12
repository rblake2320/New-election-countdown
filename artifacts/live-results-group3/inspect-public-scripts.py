import concurrent.futures,datetime,gzip,hashlib,json,pathlib,re,urllib.request
P=pathlib.Path(__file__).resolve().parent
urls={'Civix':'https://enr.elections.virginia.gov/results/public/main-E6MCELDW.js','VT':'https://electionresults.vermont.gov/main-MHKP6QNS.js','WV':'https://results.enr.clarityelections.com/WV/126209/web.345435/main.dcd83cf4c43f4a85.js'}
def fetch(item):
    name,url=item;d={'name':name,'url':url,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'rawScriptPersisted':False}
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ElectionTracker-public-source-research/1.0'}),timeout=25) as r:
            raw=r.read();b=gzip.decompress(raw) if raw[:2]==b'\x1f\x8b' else raw;t=b.decode('utf8','replace');d.update({'status':r.status,'finalUrl':r.url,'documentSha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)})
            literals=re.findall(r'["\x27]([^"\x27\n]{1,180})["\x27]',t)
            d['publicDataPathLiterals']=sorted(set(x for x in literals if re.search('api|\.json|\.xml|\.csv|\.zip|\.xlsx|download|result|contest',x,re.I) and ('/' in x or '.json' in x) and not re.search('auth|token|login|password|@',x,re.I)))[:100]
            d['identifierFieldLiterals']=sorted(set(x for x in literals if re.fullmatch(r'(?:election|contest|candidate|race|precinct|county|jurisdiction|ballot|total|report|last|update)[A-Za-z_]{0,45}',x,re.I)))[:80]
            d['routeContext']=[t[max(m.start()-100,0):m.end()+120] for m in list(re.finditer(r'apiBaseUrl|apiUrl|\.json|detailxml\.zip|dataRoot',t))[:6]]
    except Exception as e:d['error']=str(e)
    (P/'receipts'/(name+'-public-script.json')).write_text(json.dumps(d,indent=2)+'\n',encoding='utf-8');return d
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    for d in pool.map(fetch,urls.items()):print(json.dumps(d),flush=True)
