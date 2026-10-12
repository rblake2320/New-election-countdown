# Second-hop endpoints are taken from government links or government ENR hosts.
import concurrent.futures,datetime,hashlib,html.parser,json,pathlib,urllib.request,urllib.parse
out=pathlib.Path('research/results-group2')
items={'NC-dashboard':'https://er.ncsbe.gov/','NC-downloads':'https://er.ncsbe.gov/downloads.html?election_dt=11/05/2024','NC-history':'https://www.ncsbe.gov/results-data/election-results/historical-election-results-data','MN-2024':'https://www.sos.mn.gov/elections-voting/election-results/2024/2024-general-election-results/','MD-primary':'https://elections.maryland.gov/elections/2026/primary_results/index.html','MI-general':'https://mvic.sos.state.mi.us/votehistory/Index?type=C&electionDate=11-3-2026','MI-2024':'https://mvic.sos.state.mi.us/votehistory/Index?type=C&electionDate=11-5-2024','ND-primary':'https://resultsnd.sos.nd.gov/#election=346','NE-enr':'https://electionresults.nebraska.gov/','NM-primary':'https://electionresults.sos.nm.gov/default.aspx?eid=2911','NY-archive':'https://results.elections.ny.gov/','NJ-periodic':'https://www.nj.gov/state/elections/election-results-information.shtml','LA-graphical':'https://voterportal.sos.la.gov/graphical','NV-silverstate':'https://silverstateelection.nv.gov/','MA-general':'https://electionstats.state.ma.us/elections/search/year_from:2024/year_to:2024/stage:General'}
class P(html.parser.HTMLParser):
 def __init__(self):super().__init__();self.a=None;self.parts=[];self.links=[];self.scripts=[];self.text=[]
 def handle_starttag(self,t,a):
  d=dict(a)
  if t=='a':self.a=d.get('href');self.parts=[]
  if t=='script' and d.get('src'):self.scripts.append(d['src'])
 def handle_data(self,d):
  self.text.append(d)
  if self.a:self.parts.append(d)
 def handle_endtag(self,t):
  if t=='a' and self.a:self.links.append((self.a,' '.join(''.join(self.parts).split())));self.a=None

def run(item):
 key,url=item;r={'key':key,'url':url,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ElectionTracker official public results research/1.0'}),timeout=30) as x:
   b=x.read(8*1024*1024);r.update(status=x.status,finalUrl=x.url,contentType=x.headers.get('Content-Type'),lastModified=x.headers.get('Last-Modified'),sha256=hashlib.sha256(b).hexdigest(),bytes=len(b));p=P();p.feed(b.decode('utf-8',errors='replace'));r['links']=[{'url':urllib.parse.urljoin(x.url,h),'text':t} for h,t in p.links if not h.lower().startswith(('mailto:','tel:')) and (any(z in (h+' '+t).lower() for z in ['result','2026','2024','download','media','xml','csv','xlsx','zip','contest','detail','official','unofficial']) or ('er.ncsbe.gov' in x.url))][:250];r['scripts']=[urllib.parse.urljoin(x.url,s) for s in p.scripts];r['context']=[' '.join(s.split())[:600] for s in p.text if any(z in s.lower() for z in ['unofficial','official results','last updated','precincts','2026 general','2024 general','election date','election:']) and len(s)<800 and not any(z in s.lower() for z in ['phone','email','contact'])][:24]
 except Exception as e:r['error']=type(e).__name__+': '+str(e)
 (out/(key+'.json')).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');return {'key':key,'status':r.get('status'),'error':r.get('error'),'links':len(r.get('links',[])),'scripts':len(r.get('scripts',[])),'context':r.get('context')}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as p:
 for r in p.map(run,items.items()):print(json.dumps(r))
