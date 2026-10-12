"""Public vote recordings only; original documents unchanged, contacts rejected."""
import urllib.request,io,json,pathlib,hashlib,datetime,re,csv,concurrent.futures
from openpyxl import load_workbook
from pypdf import PdfReader
OUT=pathlib.Path(__file__).resolve().parent
TASKS=[('CA-primary-gov','https://elections.cdn.sos.ca.gov/sov/2026-primary/sov/19-gov.xlsx'),('CA-primary-certificate','https://elections.cdn.sos.ca.gov/sov/2026-primary/sov/18-sov-certificate.pdf'),('CA-primary-gov-pdf','https://elections.cdn.sos.ca.gov/sov/2026-primary/sov/19-gov.pdf'),('KS-primary-senate','https://sos.ks.gov/elections/26elec/2026-Primary-Election-United-States-Senate-Precinct-Level-Results.xlsx'),('CA-pre-election-governor','https://media.sos.ca.gov/media/governor.json'),('DE-independent-count','https://data.delaware.gov/resource/4hbv-7brf.json?$select=count(*)')]
def record(task):
    name,url=task
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ElectionTracker-official-ENR-source-review/1.0'}),timeout=40) as r:
            body=r.read(); receipt={'name':name,'url':url,'finalUrl':r.url,'httpStatus':r.status,'contentType':r.headers.get('Content-Type'),'sha256':hashlib.sha256(body).hexdigest(),'byteLength':len(body),'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
        if url.endswith('.xlsx'):
            workbook=load_workbook(io.BytesIO(body),read_only=True,data_only=True); sheets={s.title:[list(row) for row in s.iter_rows(values_only=True)] for s in workbook}; receipt['sheets']={k:{'rows':len(v),'cols':max(map(len,v),default=0),'firstRows':v[:7]} for k,v in sheets.items()}
            assert not re.search(r'\b(?:email|phone|street.address)\b',json.dumps(sheets,default=str),re.I)
            (OUT/(name+'.xlsx')).write_bytes(body); (OUT/(name+'-values.json')).write_text(json.dumps(sheets,default=str,ensure_ascii=False)+'\n',encoding='utf-8');receipt['recording']=name+'.xlsx'
        elif url.endswith('.pdf'):
            reader=PdfReader(io.BytesIO(body));text='\n'.join(p.extract_text() or '' for p in reader.pages);receipt['pages']=len(reader.pages);receipt['textExcerpt']=text[:1000]
            assert not re.search(r'\b(?:phone|email)\b|[\w.-]+@[\w.-]+',text,re.I)
            (OUT/(name+'.pdf')).write_bytes(body);(OUT/(name+'-text.txt')).write_text(text,encoding='utf-8');receipt['recording']=name+'.pdf'
        else:
            data=json.loads(body)
            if name=='CA-pre-election-governor':receipt['jsonType']=type(data).__name__;receipt['topLevelKeys']=list(data) if isinstance(data,dict) else None;receipt['excerpt']=str(data)[:1000];receipt['admission']='Refused for current Nov3 votes: pre-election context, staging not publication evidence';(OUT/(name+'.json')).write_bytes(body)
            else:receipt['countResponse']=data
        receipt['contactsRetained']=False
    except Exception as e:receipt={'name':name,'url':url,'httpStatus':getattr(e,'code',None),'outcome':'transport_blocked','error':str(e)}
    (OUT/(name+'-receipt.json')).write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    return {k:v for k,v in receipt.items() if k not in ['sheets','textExcerpt','excerpt']}
if __name__=='__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for result in pool.map(record,TASKS):print(json.dumps(result))
