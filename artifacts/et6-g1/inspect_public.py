import pathlib,json,urllib.request,hashlib,datetime,re,csv,io,concurrent.futures
from fetch_index import fetch,Links
OUT=pathlib.Path(__file__).resolve().parent
TASKS=[('CA-json-index','https://media.sos.ca.gov/media/json-endpoints.csv'),('CA-api-index','https://media.sos.ca.gov/media/api-endpoints.csv'),('CA-vote-pre-election','https://media.sos.ca.gov/media/V26GG.txt'),('DE-primary-csv','https://data.delaware.gov/resource/4hbv-7brf.csv'),('DE-primary-metadata','https://data.delaware.gov/api/views/4hbv-7brf.json'),('AZ-primary-summary','https://apps.azsos.gov/ElectionResults/2026/State/2026%20Primary%20Election/Results.Summary.xml'),('GA-public-page','https://results.sos.ga.gov/results/public/Georgia/elections/GeneralPrimary51926')]
def run(task):
    name,url=task; checked=datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ElectionTracker-official-ENR-source-review/1.0'}),timeout=35) as r:
            body=r.read();receipt={'name':name,'url':url,'finalUrl':r.url,'httpStatus':r.status,'contentType':r.headers.get('Content-Type'),'sha256':hashlib.sha256(body).hexdigest(),'byteLength':len(body),'checkedAt':checked}
        text=body.decode('utf-8-sig','replace')
        if name.startswith('CA-'):
            if name=='CA-vote-pre-election':receipt['firstRecords']=text.splitlines()[:3];receipt['admission']='REFUSED: pre-election Oct9 header in Nov3-labelled file; no current general votes accepted'
            else:receipt['csvRows']=list(csv.reader(io.StringIO(text)))[:12]
        elif name=='DE-primary-csv':
            rows=list(csv.DictReader(io.StringIO(text)));receipt['columns']=list(rows[0]) if rows else [];receipt['recordCountThisResponse']=len(rows);receipt['firstRecords']=rows[:2]
            # The CSV contains public election vote facts only; inspect header first.
            assert not any(re.search(r'email|phone|address|contact',k,re.I) for k in receipt['columns'])
            (OUT/(name+'.csv')).write_bytes(body);receipt['recording']=name+'.csv'
        elif name=='DE-primary-metadata':
            data=json.loads(text);receipt['dataset']={k:data.get(k) for k in ['id','name','description','rowsUpdatedAt','viewLastModified','publicationDate']};receipt['columns']=[{'name':c.get('name'),'fieldName':c.get('fieldName'),'dataTypeName':c.get('dataTypeName')} for c in data.get('columns',[]) if not c.get('fieldName','').startswith(':')]
        elif name=='GA-public-page':receipt['observedPublicScripts']=re.findall(r'<script[^>]+src=[\"\x27]([^\"\x27]+)',text);receipt['observedPublicUrls']=re.findall(r'https?://[^\"\x27\s<>]+',text)[:12]
        else:receipt['formatPrefix']=text[:80]
    except Exception as e:receipt={'name':name,'url':url,'checkedAt':checked,'httpStatus':getattr(e,'code',None),'outcome':'transport_blocked','error':str(e)}
    (OUT/(name+'-fetch.json')).write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    return receipt
if __name__=='__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as p:
        for r in p.map(run,TASKS):print(json.dumps(r,ensure_ascii=False))
