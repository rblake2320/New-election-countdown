# Focused remaining public official pages, no challenge bypass.
import urllib.request,hashlib,json,pathlib,datetime,html.parser,concurrent.futures,urllib.parse
out=pathlib.Path('research/results-group2');h={'User-Agent':'ElectionTracker official public results research/1.0'}
items={'MO-results':'https://www.sos.mo.gov/elections/results','MT-enr':'https://electionresults.mt.gov/','NY-primary-certified':'https://elections.ny.gov/certified-june-23-2026-primary-election-results','MD-G-primary':'https://elections.maryland.gov/elections/2026/primary_results/gen_results_2026_1.html','MA-race':'https://electionstats.state.ma.us/elections/view/165300/','ME-history':'https://www.maine.gov/sos/elections-voting/election-results-data/previous-election-results','MN-media':'https://electionresults.sos.mn.gov/Select/MediaFiles/Index?ersElectionId=170','NH-general':'https://www.sos.nh.gov/2026-general-election-results','MS-results-alt':'https://www.sos.ms.gov/elections-voting/election-results'}
class P(html.parser.HTMLParser):
 def __init__(self):super().__init__();self.a=None;self.parts=[];self.links=[];self.text=[];self.scripts=[]
 def handle_starttag(self,t,a):
  d=dict(a)
  if t=='a':self.a=d.get('href');self.parts=[]
  if t=='script' and d.get('src'):self.scripts.append(d['src'])
 def handle_data(self,d):
  self.text.append(d)
  if self.a:self.parts.append(d)
 def handle_endtag(self,t):
  if t=='a' and self.a:self.links.append((self.a,' '.join(''.join(self.parts).split())));self.a=None

def run(x):
 key,u=x;r={'key':key,'url':u,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 try:
  with urllib.request.urlopen(urllib.request.Request(u,headers=h),timeout=30) as z:b=z.read(8*1024*1024);t=b.decode('utf-8',errors='replace');p=P();p.feed(t);r.update(status=z.status,finalUrl=z.url,sha256=hashlib.sha256(b).hexdigest(),bytes=len(b),contentType=z.headers.get('Content-Type'));r['links']=[{'url':urllib.parse.urljoin(z.url,a),'text':s} for a,s in p.links if not a.lower().startswith(('mailto:','tel:')) and any(k in (a+' '+s).lower() for k in ['2026','2024','result','download','csv','xls','zip','media','certif','enr','view/'])][:250];r['context']=[' '.join(s.split())[:600] for s in p.text if len(s)<700 and any(k in s.lower() for k in ['official','certif','last updated','last update','precinct','2026 general','2024 general','election date','votes']) and not any(k in s.lower() for k in ['phone','email','contact'])][:25];r['scripts']=[urllib.parse.urljoin(z.url,s) for s in p.scripts];r['interstitial']=any(k in t.lower() for k in ['incapsula','verify you are human','access denied'])
 except Exception as e:r['error']=type(e).__name__+': '+str(e)
 (out/(key+'.json')).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps({'key':key,'status':r.get('status'),'error':r.get('error'),'finalUrl':r.get('finalUrl'),'links':r.get('links',[])[:8],'context':r.get('context',[])[:5],'interstitial':r.get('interstitial')}))
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as p:list(p.map(run,items.items()))
