"""Read public official URLs with normal TLS; retain hashes and contact-free links only."""
import concurrent.futures,datetime,gzip,hashlib,html.parser,json,pathlib,re,urllib.error,urllib.parse,urllib.request
OUT=pathlib.Path(__file__).resolve().parent
class Page(html.parser.HTMLParser):
    def __init__(self):super().__init__();self.title=False;self.titlebits=[];self.active=None;self.links=[];self.scripts=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='title':self.title=True
        if tag=='a' and a.get('href'):self.active={'href':a['href'],'text':''}
        if tag=='script' and a.get('src'):self.scripts.append(a['src'])
    def handle_endtag(self,tag):
        if tag=='title':self.title=False
        if tag=='a' and self.active:self.links.append(self.active);self.active=None
    def handle_data(self,data):
        if self.title:self.titlebits.append(data)
        if self.active:self.active['text']+=data
def fetch(item):
    state,url=item;out={'state':state,'requestedUrl':url,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'tls':'normal system verification','rawBodyPersisted':False}
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ElectionTracker-public-source-research/1.0'}),timeout=25) as r:
            body=r.read();out.update({'outcome':'Worked','status':r.status,'finalUrl':r.url,'contentType':r.headers.get('Content-Type'),'contentEncoding':r.headers.get('Content-Encoding'),'lastModified':r.headers.get('Last-Modified'),'etag':r.headers.get('ETag'),'byteLength':len(body),'sha256':hashlib.sha256(body).hexdigest()})
            decoded=gzip.decompress(body) if body[:2]==b'\x1f\x8b' else body
            out['decodedDocumentSha256']=hashlib.sha256(decoded).hexdigest()
            if 'html' in (r.headers.get('Content-Type') or ''):
                p=Page();p.feed(decoded.decode('utf-8','replace'));out['title']=' '.join(' '.join(p.titlebits).split());links=[]
                for link in p.links:
                    href=urllib.parse.urljoin(r.url,link['href']);text=' '.join(link['text'].split())
                    if not href.startswith(('http://','https://')) or '@' in text or '@' in urllib.parse.unquote(href):continue
                    if re.search(r'result|canvass|enr|election.?night|\.csv|\.xlsx|\.xml|\.json|download|2026|2024',href+' '+text,re.I):links.append({'href':href,'text':text[:220]})
                out['links']=links;out['scripts']=[urllib.parse.urljoin(r.url,s) for s in p.scripts]
    except Exception as e:out.update({'outcome':'Blocked','errorClass':type(e).__name__,'error':str(e),'status':getattr(e,'code',None)})
    (OUT/'receipts').mkdir(exist_ok=True);(OUT/'receipts'/(state+'-landing.json')).write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');return {'state':state,'outcome':out['outcome'],'status':out.get('status'),'title':out.get('title'),'links':len(out.get('links',[])),'error':out.get('error')}
urls={
'OH':'https://www.ohiosos.gov/elections/election-results-and-data/',
'OK':'https://oklahoma.gov/elections/elections-results/election-results/2026-election-results.html',
'OR':'https://sos.oregon.gov/elections/Pages/historical-data.aspx',
'PA':'https://www.pa.gov/agencies/vote/elections/election-results',
'RI':'https://elections.ri.gov/elections/previous-election-results',
'SC':'https://scvotes.gov/elections-statistics/election-results/',
'SD':'https://sdsos.gov/elections-voting/election-resources/election-history/past-election-results.aspx',
'TN':'https://sos.tn.gov/elections/results',
'TX':'https://www.sos.texas.gov/elections/historical/elections-results-archive.shtml',
'UT':'https://vote.utah.gov/election-results-data-historical-information/',
'VT':'https://sos.vermont.gov/elections/election-info-resources/elections-results-data/',
'VA':'https://www.elections.virginia.gov/resultsreports/election-results/',
'WA':'https://www.sos.wa.gov/elections/data-research/election-data-and-maps/election-results-and-voters-pamphlets',
'WV':'https://sos.wv.gov/elections/election-data/historical-election-results-and-turnout',
'WI':'https://elections.wi.gov/elections/election-results',
'WY':'https://sos.wyo.gov/Elections/ElectionResults.aspx'}
if __name__=='__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for result in pool.map(fetch,urls.items()):print(json.dumps(result),flush=True)
