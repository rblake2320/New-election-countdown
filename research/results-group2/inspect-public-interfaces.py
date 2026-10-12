import urllib.request,re,hashlib,datetime,json,pathlib,concurrent.futures
out=pathlib.Path('research/results-group2')
items={'NC-inline':'https://er.ncsbe.gov/','NC-download-inline':'https://er.ncsbe.gov/downloads.html?election_dt=11/05/2024','ND-client':'https://resultsnd.sos.nd.gov/assets/index-1.6.2-C70PJYyH.js','LA-config':'https://voterportal.sos.la.gov/ElectionResults/GraphicalConfig','LA-client':'https://voterportal.sos.la.gov/bundles/graphicalresults?v=cIm8yGz__OufYjw9EhdZgZBxy8qhq7TaHRR_ZKepPws1','NE-federal':'https://electionresults.nebraska.gov/resultsSW.aspx?type=CG&map=DIST','NM-federal':'https://electionresults.sos.nm.gov/resultsSW.aspx?type=FED&map=CTY&eid=2911'}
def run(item):
 k,u=item;r={'key':k,'url':u,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 try:
  with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'ElectionTracker official public results research/1.0'}),timeout=30) as x:
   b=x.read(8*1024*1024);t=b.decode('utf-8',errors='replace');r.update(status=x.status,finalUrl=x.url,sha256=hashlib.sha256(b).hexdigest(),bytes=len(b),contentType=x.headers.get('Content-Type'))
   pats=[r'[^\n<>]{0,80}(?:https?://[^\s"\'<>]+)',r'[^\n<>]{0,90}(?:\.json|\.xml|\.csv|\.zip|api/|Api/|GetElection|GetResults|lastUpdated|last_updated|ElectionDate|election_dt)[^\n<>]{0,120}']
   r['publicResultInterfaceSnippets']=list(dict.fromkeys(s[:300] for p in pats for s in re.findall(p,t) if not any(z in s.lower() for z in ['mailto:','phone','address','email','password','secret','analytics','google','token='])))[:100]
 except Exception as e:r['error']=type(e).__name__+': '+str(e)
 (out/(k+'.json')).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps({'key':k,'status':r.get('status'),'error':r.get('error'),'snippets':r.get('publicResultInterfaceSnippets',[])[:18]}))
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as p:list(p.map(run,items.items()))
