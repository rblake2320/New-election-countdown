"""Prepare immutable dry-run fixtures from actual retained source bytes."""
import pathlib,json,hashlib
root=pathlib.Path(__file__).resolve().parents[1]/'artifacts/source-packet/wa'
def write(path,value): path.write_bytes((json.dumps(value,indent=2)+'\n').encode())
context={'state':'WA','electionDate':'2024-08-06','phase':'primary','level':'state','office':'Commissioner of Public Lands','district':None,'party':None}
target={'id':4242401,'state':'WA','date':'2024-08-06','type':'Primary','level':'state','title':'Washington Commissioner of Public Lands Primary'}
def file(role,name,url): return {'role':role,'path':'raw/'+name,'sha256':hashlib.sha256((root/'raw'/name).read_bytes()).hexdigest(),'url':url}
for snapshot in ['initial','recount']:
    pdf='wa-2024-original-certification.pdf' if snapshot=='initial' else 'wa-2024-recount-certification.pdf'
    pdfurl='https://www.sos.wa.gov/sites/default/files/2024-08/Certification%20of%20Results%20-%202024%20Primary.pdf' if snapshot=='initial' else 'https://www.sos.wa.gov/sites/default/files/2024-09/Certification%20of%20recount%20results%20-%202024%20Primary_signed.pdf'
    url='https://www.sos.wa.gov/sites/default/files/2024-09/TotalsforWeb_AllCandidates.xlsx'
    packet={'version':1,'purpose':'dry_run_only','parser':'wa_lands_'+snapshot,'context':context,'targetBinding':target,'publisher':{'id':'wa-sos-2024-primary-lands','kind':'official_state_page','name':'Washington Secretary of State','url':url},'files':[file('payload','wa-2024-recount-all-candidates.xlsx',url),file('certificate',pdf,pdfurl),file('capture_receipt','capture-receipt.json',None)],'reviewedCertification':True,'sourceContestId':None,'localContestId':None,'expectedTotals':{'totalVotes':1903073 if snapshot=='initial' else 1903115,'optionCount':8}}
    path=root/(snapshot+'.packet.json');write(path,packet);print(snapshot,hashlib.sha256(path.read_bytes()).hexdigest())
write(root/'target-binding.json',target)
