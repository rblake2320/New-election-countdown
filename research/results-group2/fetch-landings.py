import concurrent.futures,datetime,hashlib,html.parser,json,pathlib,urllib.request,urllib.error,urllib.parse
root=pathlib.Path.cwd(); out=root/'research/results-group2'; m=json.loads((root/'data/official-results/2026-11-03.json').read_text(encoding='utf-8')); states='LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND'.split(); urls={r['state']:r['officialResultsUrl'] for r in m['states'] if r['state'] in states}; urls.update({'NH':'https://www.sos.nh.gov/elections/election-results','MO':'https://www.sos.mo.gov/elections/goVoteMissouri/electionResults','NV':'https://www.nvsos.gov/sos/elections/election-information/election-results'})
class Links(html.parser.HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.href=None;self.parts=[];self.titleparts=[];self.intitle=False
 def handle_starttag(self,t,a):
  if t=='title':self.intitle=True
  if t=='a':self.href=dict(a).get('href');self.parts=[]
 def handle_data(self,d):
  if self.href:self.parts.append(d)
  if self.intitle:self.titleparts.append(d)
 def handle_endtag(self,t):
  if t=='title':self.intitle=False
  if t=='a' and self.href:self.links.append((self.href,' '.join(''.join(self.parts).split())));self.href=None

def fetch(item):
 state,url=item; r={'state':state,'url':url,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ElectionTracker official public results research/1.0'}),timeout=25) as response:
   body=response.read(8*1024*1024+1);r.update({'status':response.status,'finalUrl':response.url,'contentType':response.headers.get('Content-Type'),'lastModified':response.headers.get('Last-Modified'),'sha256':hashlib.sha256(body).hexdigest(),'bytes':len(body)})
   if len(body)>8*1024*1024:raise ValueError('Research page exceeded8MiB cap')
   text=body.decode('utf-8',errors='replace');p=Links();p.feed(text);r['title']=' '.join(p.titleparts).strip();r['links']=[{'url':urllib.parse.urljoin(response.url,h),'text':t} for h,t in p.links if any(x in (h+' '+t).lower() for x in ['result','2026','2024','2025','canvass','certif','media','download','enr']) and not any(x in h.lower() for x in ['mailto:','tel:','candidate','voter-registration'])][:120];r['blockedChallenge']=any(x in text.lower() for x in ['captcha','verify you are human','request blocked','access denied'])
 except Exception as e:r['error']=type(e).__name__+': '+str(e)
 (out/(state+'-landing.json')).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');return {'state':state,'status':r.get('status'),'error':r.get('error'),'title':r.get('title'),'links':len(r.get('links',[])),'challenge':r.get('blockedChallenge')}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
 for r in pool.map(fetch,urls.items()):print(json.dumps(r))
