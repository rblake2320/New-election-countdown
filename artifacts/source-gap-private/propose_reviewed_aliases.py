from pathlib import Path
import hashlib,json
p=Path(__file__).parent
m=json.loads((p/'reviewed-supplement.json').read_bytes())
reviews=[]
for name,alias,profile,fec_id,stem in [('Joe Wilson','Joe The Hon. Wilson',10330,'H2SC02059','Joe'),('William Timmons','William R Iv Timmons',12225,'H8SC04250','William')]:
 proof=json.loads((p/('SC-Form-'+stem+'-identity-proof.json')).read_bytes())
 form2=json.loads((p/('Form2-'+stem+'-identity-proof.json')).read_bytes())
 assert proof['status']==200 and form2['status']==200
 row=next(r for r in m['candidates'] if r['name']==name)
 row['aliases']=[alias]
 row['identityEvidence']={'url':proof['url'],'sha256':proof['sha256'],'sourcePage':1,'title':'SC linked candidate filing identity form: full name and requested ballot name (primary filing; identity only, general eligibility comes from Active election22596 list)'}
 reviews.append({'ballotName':row['ballotName'],'partyRaw':row['partyRaw'],'district':row['district'],'reviewedAlias':alias,'existingProfileId':profile,'currentFecCandidateId':fec_id,'SCForm':{'url':proof['url'],'sha256':proof['sha256'],'page':1},'FECForm2':{'url':form2['url'],'sha256':form2['sha256'],'page':1},'disposition':'EXPLICIT_AUTHORITY_BOUND_ALIAS','genericNormalizationApplied':False})
data=(json.dumps(m,indent=2)+'\n').encode()
(p/'reviewed-supplement-aliases.json').write_bytes(data)
remaining=[{'name':'Zyon Khalifa','disposition':'AMBIGUOUS_FEC_IDS','candidateIds':['H6SC02159','H6SC02167'],'action':'Retain independent official general profile; refuse choosing either FEC ID'},
 {'name':'Jessica Ethridge','disposition':'NO_EXISTING_PROFILE_FEC_STATUS_N','candidateIds':['H6SC04197'],'action':'Official Active general profile justified; do not silently broaden C/F registration importer or assign N as current registration'},
 {'name':'Dayna Alane Smith','disposition':'NO_FEC_SC02_2026_RECORD','candidateIds':[],'action':'Retain Workers-labelled official general profile, no FEC ID inferred'},
 {'name':'Brian Corriea','disposition':'NO_FEC_SC03_2026_RECORD','candidateIds':[],'action':'Retain Libertarian-labelled official general profile, no FEC ID inferred'}]
(p/'identity-disposition.json').write_bytes((json.dumps({'outcome':'Reviewed proposal, dry-run only','manifestSha256':hashlib.sha256(data).hexdigest(),'aliases':reviews,'remaining':remaining,'noSharedWrites':True,'noFuzzyNameMerge':True,'rawBallotNamesPreserved':True},indent=2)+'\n').encode())
print(hashlib.sha256(data).hexdigest())
