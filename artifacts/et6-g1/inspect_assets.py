import urllib.request,re,json,pathlib,hashlib,datetime,concurrent.futures
from urllib.parse import urljoin
OUT=pathlib.Path(__file__).resolve().parent
TASKS=[('AR','https://arkansas.tally-enr.com/','assets/index-1.10.0-CS3O_MOE.js'),('GA','https://results.sos.ga.gov/results/public/Georgia/elections/GeneralPrimary51926','main-E6MCELDW.js'),('ID','https://results.voteidaho.gov/results/public/id/elections/may2026','main-E6MCELDW.js'),('IA','https://electionresults.iowa.gov/IA/126082/web.345435/','main.dcd83cf4c43f4a85.js')]
def run(task):
    state,page,relative=task
    try:
        html=urllib.request.urlopen(page,timeout=30).read().decode('utf-8','replace');m=re.search(r'<base[^>]+href=[\"\x27]([^\"\x27]+)',html,re.I);base=urljoin(page,m.group(1)) if m else page;url=urljoin(base,relative)
        with urllib.request.urlopen(url,timeout=40) as r:body=r.read()
        text=body.decode('utf-8','replace')
        literals=re.findall(r'[\"\x27]([^\"\x27\r\n]{1,180})[\"\x27]',text)
        paths=sorted(set(s for s in literals if re.search(r'(?:\.json|\.xml|data_summary|GetElection|api/.*(?:election|result)|/.*(?:Election|Result|Contest|Summary)|https?://[^\s]+(?:api|tally))',s,re.I)))[:65]
        result={'state':state,'governmentLinkedPage':page,'observedBaseHref':m.group(1) if m else None,'publicAssetUrl':url,'httpStatus':200,'sha256':hashlib.sha256(body).hexdigest(),'byteLength':len(body),'publicDataPathLiterals':paths,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'note':'No requests to guessed paths, private/admin endpoints, localhost or auth APIs. Observed client literals only; no rawJS/token retained.'}
    except Exception as e:result={'state':state,'page':page,'httpStatus':getattr(e,'code',None),'error':str(e)}
    (OUT/(state+'-public-assets.json')).write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');return result
if __name__=='__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for r in pool.map(run,TASKS):print(json.dumps(r))
