"""Observe only advertised public assets/form fields; no guessed API calls."""
import urllib.request,re,json,pathlib,hashlib,datetime,concurrent.futures
from html.parser import HTMLParser
from urllib.parse import urljoin
OUT=pathlib.Path(__file__).resolve().parent
class Inspect(HTMLParser):
    def __init__(self):super().__init__();self.scripts=[];self.options=[];self.inputs=[];self.select=None;self.opt=None;self.text=[];self.forms=[]
    def handle_starttag(self,t,a):
        d=dict(a)
        if t=='script' and d.get('src'):self.scripts.append(d['src'])
        if t=='form':self.forms.append({k:d.get(k) for k in ['action','method']})
        if t=='select':self.select=d.get('name')
        if t=='option':self.opt=d.get('value');self.text=[]
        if t=='input' and d.get('type') in ['submit','button']:self.inputs.append({k:d.get(k) for k in ['name','type','value']})
    def handle_data(self,t):
        if self.opt is not None:self.text.append(t)
    def handle_endtag(self,t):
        if t=='option' and self.opt is not None:self.options.append({'select':self.select,'value':self.opt,'label':' '.join(''.join(self.text).split())});self.opt=None
TASKS=[('AL','https://www.sos.alabama.gov/newsroom/secretary-state-wes-allen-announces-unofficial-primary-election-results-are-available'),('AR','https://arkansas.tally-enr.com/'),('FL','https://floridaelectionwatch.gov/'),('FL-archive','https://results.elections.myflorida.com/'),('GA','https://results.sos.ga.gov/results/public/Georgia/elections/GeneralPrimary51926'),('ID','https://results.voteidaho.gov/results/public/id/elections/may2026'),('CT','https://portal.ct.gov/sots/election-services/election-results/election-results'),('IN','https://enr.indianavoters.in.gov/site/index.html'),('IA','https://electionresults.iowa.gov/IA/126082/web.345435/')]
def run(task):
    state,url=task
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ElectionTracker-official-ENR-source-review/1.0'}),timeout=30) as r:body=r.read();final=r.url
        text=body.decode('utf-8','replace');p=Inspect();p.feed(text)
        result={'state':state,'url':url,'finalUrl':final,'httpStatus':200,'sha256':hashlib.sha256(body).hexdigest(),'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'observedScripts':[urljoin(final,s) for s in p.scripts],'forms':p.forms,'options':p.options[:30],'publicApiPathFragments':sorted(set(re.findall(r'(?:[\"\x27])([^\"\x27<>]{0,100}(?:\.json|\.xml|results|GetElection)[^\"\x27<>]{0,100})(?:[\"\x27])',text,re.I)))[:15]}
        if state=='CT':result['emsAnchorFragment']=[re.sub('<[^>]+>',' ',m.group(0)) for m in re.finditer('href=[\"\x27][^\"\x27]+[\"\x27][^>]*>[^<]*(?:Elections Management System|Electronic Election)',text,re.I)]
    except Exception as e:result={'state':state,'url':url,'httpStatus':getattr(e,'code',None),'error':str(e)}
    (OUT/(state+'-client-observation.json')).write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');return result
if __name__=='__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for r in pool.map(run,TASKS):print(json.dumps(r))
