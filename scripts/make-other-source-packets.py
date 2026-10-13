"""Package retained CA and WA Senate bytes/actual fetch receipts for dry-run."""
import pathlib,json,hashlib,shutil
repo=pathlib.Path(__file__).resolve().parents[1]; packets=repo/'artifacts/source-packet'
def write(path,value):path.write_bytes((json.dumps(value,indent=2)+'\n').encode())
def make(folder,kind,context,target,publisher,sources,total,options,sourceid,certified):
    root=packets/folder;(root/'raw').mkdir(parents=True,exist_ok=True);files=[]
    for role,source,url in sources:
        dest=root/'raw'/source.name;shutil.copyfile(source,dest)
        files.append({'role':role,'path':'raw/'+source.name,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'url':url})
    packet={'version':1,'purpose':'dry_run_only','parser':kind,'context':context,'targetBinding':target,'publisher':publisher,'files':files,'reviewedCertification':certified,'sourceContestId':sourceid,'localContestId':None,'expectedTotals':{'totalVotes':total,'optionCount':options}}
    write(root/'packet.json',packet);write(root/'target-binding.json',target);print(folder,hashlib.sha256((root/'packet.json').read_bytes()).hexdigest())
wa=repo/'artifacts/wa-adapter/raw';capture=packets/'wa/raw/capture-receipt.json'
url='https://www.sos.wa.gov/sites/default/files/2024-09/2024Pri%20Results%20by%20Congressional%20District.xlsx'
make('wa-senate','wa_senate_primary',{'state':'WA','electionDate':'2024-08-06','phase':'primary','level':'federal','office':'U.S. Senate','district':None,'party':None},{'id':4242402,'state':'WA','date':'2024-08-06','type':'Primary','level':'federal','title':'Washington U.S. Senate Primary'},{'id':'wa-sos-2024-primary-senate','kind':'official_state_page','name':'Washington Secretary of State','url':url},[('payload',wa/'wa-2024-congressional-results.xlsx',url),('certificate',wa/'wa-2024-original-certification.pdf','https://www.sos.wa.gov/sites/default/files/2024-08/Certification%20of%20Results%20-%202024%20Primary.pdf'),('capture_receipt',capture,None)],1948716,12,'2005',True)
ca=repo/'tests/fixtures/official-result-adapters/ca';url='https://elections.cdn.sos.ca.gov/sov/2026-primary/sov/19-gov.xlsx'
accept=json.loads((ca/'CA-certified-primary-acceptance.json').read_bytes())
# The independent source proof records the actual certified whole Governor total.
total=accept['validCandidateVotesTotal']
make('ca','ca_governor_primary',{'state':'CA','electionDate':'2026-06-02','phase':'primary','level':'state','office':'Governor','district':None,'party':None},{'id':4242403,'state':'CA','date':'2026-06-02','type':'Primary','level':'state','title':'California Governor Primary'},{'id':'ca-sos-2026-primary-governor','kind':'official_state_page','name':'California Secretary of State','url':url},[('payload',ca/'CA-primary-gov.xlsx',url),('certificate',ca/'CA-primary-certificate.pdf','https://elections.cdn.sos.ca.gov/sov/2026-primary/sov/18-sov-certificate.pdf'),('capture_receipt',ca/'CA-primary-gov-receipt.json',None)],total,68,'2026-primary:sov:19-gov',True)
