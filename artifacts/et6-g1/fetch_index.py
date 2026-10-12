"""Read-only public official-link research; discard contact-bearing HTML bytes."""
import urllib.request,urllib.error,hashlib,json,pathlib,datetime,re,concurrent.futures
from html.parser import HTMLParser
from urllib.parse import urljoin
OUT=pathlib.Path(__file__).resolve().parent
ROOT=OUT.parent.parent
STATES='AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY'.split()
class Links(HTMLParser):
    def __init__(self):super().__init__();self.in_a=False;self.href='';self.parts=[];self.links=[];self.title=False;self.t=[]
    def handle_starttag(self,t,a):
        if t=='title':self.title=True
        if t=='a':self.in_a=True;self.href=dict(a).get('href','');self.parts=[]
    def handle_data(self,t):
        if self.in_a:self.parts.append(t)
        if self.title:self.t.append(t)
    def handle_endtag(self,t):
        if t=='title':self.title=False
        if t=='a' and self.in_a:
            self.links.append({'href':self.href,'text':' '.join(''.join(self.parts).split())});self.in_a=False
def fetch(state,url,label='initial'):
    checked=datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ElectionTracker-official-ENR-source-review/1.0'}),timeout=35) as r:
            body=r.read();result={'state':state,'url':url,'finalUrl':r.url,'httpStatus':r.status,'contentType':r.headers.get('Content-Type'),'lastModified':r.headers.get('Last-Modified'),'byteLength':len(body),'sha256':hashlib.sha256(body).hexdigest(),'checkedAt':checked}
        parser=Links();parser.feed(body.decode('utf-8','replace'));result['title']=' '.join(parser.t).strip()
        relevant=[]
        for link in parser.links:
            if not link['href'] or link['href'].lower().startswith(('mailto:','tel:','javascript:')):continue
            if re.search(r'202[46]|result|enr|clarity|download|\.csv|\.xml|statement.of.vote|election.night',link['href']+' '+link['text'],re.I):relevant.append({'url':urljoin(result['finalUrl'],link['href']),'text':link['text']})
        result['resultRelatedLinks']=relevant;result['rawDocumentRetained']=False
    except Exception as e:result={'state':state,'url':url,'checkedAt':checked,'outcome':'transport_blocked','errorType':type(e).__name__,'httpStatus':getattr(e,'code',None),'error':str(e)}
    (OUT/(state+'-'+label+'-receipt.json')).write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    return {k:v for k,v in result.items() if k!='resultRelatedLinks'}
if __name__=='__main__':
    source=json.loads((ROOT/'data/official-results/2026-11-03.json').read_text(encoding='utf-8'))
    tasks=[(r['state'],r['officialResultsUrl']) for r in source['states'] if r['state'] in STATES]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for result in pool.map(lambda x:fetch(*x),tasks):print(json.dumps(result))
