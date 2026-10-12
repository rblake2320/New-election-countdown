import concurrent.futures,datetime,hashlib,json,pathlib,re,urllib.parse,urllib.request
P=pathlib.Path(__file__).resolve().parent
urls={'VA':'https://enr.elections.virginia.gov/results/public/virginia/elections/2026-August-Democratic-Primary','WA':'https://results.votewa.gov/results/public/washington/elections/20260804','RI':'https://electionresults.ri.gov/results/public/RhodeIsland/elections/RI2026StatewidePrimary','VT':'https://electionresults.vermont.gov/Index.html','SC':'https://www.enr-scvotes.org/SC/126294/','TX':'https://electionresults.sos.state.tx.us/results.html','UT':'https://electionresults.utah.gov/','WV':'https://results.enr.clarityelections.com/WV/126209/web.345435/#/summary'}
def fetch(item):
    state,url=item;d={'state':state,'url':url,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ElectionTracker-public-source-research/1.0'}),timeout=20) as r:
            body=r.read();b=body.decode('utf8','replace');d.update({'status':r.status,'finalUrl':r.url,'sha256':hashlib.sha256(body).hexdigest()})
            base=re.search(r'<base[^>]+href=["\x27]([^"\x27]+)',b,re.I);base=urllib.parse.urljoin(r.url,base.group(1)) if base else r.url
            d['baseUrl']=base;d['mainScripts']=[urllib.parse.urljoin(base,s) for s in re.findall(r'src=["\x27]([^"\x27]*main[^"\x27]*)',b,re.I)]
            if state=='SC':d['publicRedirectContext']=b[:950]
            if state=='TX':
                i=b.upper().find('U. S. SENATOR');d['senateVoteContext']=b[max(i-500,0):i+3000]
    except Exception as e:d['error']=str(e)
    (P/'receipts'/(state+'-asset-discovery.json')).write_text(json.dumps(d,indent=2)+'\n',encoding='utf-8');return d
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    for d in pool.map(fetch,urls.items()):print(json.dumps(d),flush=True)
