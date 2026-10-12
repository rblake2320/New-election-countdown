import datetime,hashlib,json,pathlib,urllib.request
P=pathlib.Path(__file__).resolve().parent;out=P/'recordings';out.mkdir(exist_ok=True)
urls={
'wa-2024-recount-all-candidates.xlsx':'https://www.sos.wa.gov/sites/default/files/2024-09/TotalsforWeb_AllCandidates.xlsx',
'wa-2024-recount-certification.pdf':'https://www.sos.wa.gov/sites/default/files/2024-09/Certification%20of%20recount%20results%20-%202024%20Primary_signed.pdf',
'wa-2024-original-certification.pdf':'https://www.sos.wa.gov/sites/default/files/2024-08/Certification%20of%20Results%20-%202024%20Primary.pdf',
'wa-2024-congressional-results.xlsx':'https://www.sos.wa.gov/sites/default/files/2024-09/2024Pri%20Results%20by%20Congressional%20District.xlsx',
'vt-election-directory.json':'https://static.electionresults.vermont.gov/elections/elections.json'}
receipts=[]
for filename,url in urls.items():
    d={'file':filename,'url':url,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'voteAsOf':None}
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ElectionTracker-public-source-research/1.0'}),timeout=25) as r:
            body=r.read();d.update({'outcome':'Worked','status':r.status,'finalUrl':r.url,'contentType':r.headers.get('Content-Type'),'httpLastModified':r.headers.get('Last-Modified'),'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()});(out/filename).write_bytes(body)
    except Exception as e:d.update({'outcome':'Blocked','error':str(e)})
    receipts.append(d);print(json.dumps(d),flush=True)
(P/'receipts/example-downloads.json').write_text(json.dumps(receipts,indent=2)+'\n',encoding='utf-8')
