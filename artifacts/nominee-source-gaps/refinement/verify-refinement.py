from pathlib import Path
import json,hashlib,zipfile,re,sys,copy
from bs4 import BeautifulSoup
from pypdf import PdfReader
BASE=Path(__file__).resolve().parent
ORIGINAL=BASE.parent
RAW=Path(sys.argv[1])
FEC=Path(sys.argv[2])
checks=[]
def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(p.read_text(encoding='utf8'))
def save(name,obj):
 (BASE/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
def capture(stem):
 b=(RAW/(stem+'.raw')).read_bytes();r=load(RAW/(stem+'-proof.json'))
 assert r['status']==200 and sha(b)==r['sha256'],stem
 return b,r

def texts(b):return ' '.join(BeautifulSoup(b,'html.parser').stripped_strings)
zipbytes=FEC.read_bytes();zsha=sha(zipbytes)
assert zsha=='6062f203fd5dd90a7e33e487088a4d496bd9634cc1e560f94b0f5e7ff8ea0126'
rows={}
with zipfile.ZipFile(FEC) as z:
 for line in z.read('cn.txt').decode('utf8').splitlines():
  f=line.split('|')
  if f[0] in ['H0AR01083','H4AR02141','H4AR04048','H6AZ06164','H6AZ06214']:
   rows[f[0]]=dict(zip(['id','nameRaw','partyRaw','year','state','office','district','incumbentCode','status'],f[:9]))
assert len(rows)==5
save('fec-contact-free-projection.json',{'sourceUrl':'https://www.fec.gov/files/bulk-downloads/2026/cn26.zip','sourceSha256':zsha,'sourceCapture':'retained reviewed source bytes; no new ZIP retrieval claim','purpose':'identity and party only; no general-election ballot or nomination inference','rows':list(rows.values())})
checks.append({'scenario':'five exact retained FEC tuples and whole ZIP SHA','count':5,'outcome':'Worked'})
ar=load(ORIGINAL/'ar-general-three-gaps-draft.json');newar=copy.deepcopy(ar);arproof=[]
known=[('Congressman Rick Crawford','Eric A. "Rick" Crawford',['Rick Crawford','Eric Alan Rick Crawford'],'H0AR01083','C001087','AR-Crawford'),('Congressman French Hill','J. French Hill',['French Hill','James French Hill'],'H4AR02141','H001072','AR-Hill'),('Congressman Bruce Westerman','Bruce Westerman',[],'H4AR04048','W000821','AR-Westerman')]
for ballot,display,aliases,fid,bio,stem in known:
 row=next(r for r in newar['candidates'] if r['ballotName']==ballot);f=rows[fid]
 assert f['state']=='AR' and f['office']=='H' and f['district']==row['district'] and f['partyRaw']=='REP' and f['year']=='2026'
 cb,cr=capture(stem+'-clerk');s=BeautifulSoup(cb,'html.parser');heading=next(e for e in s.find_all(['h1','h2','h3']) if e.get_text(' ',strip=True)==display)
 section=heading.parent.get_text(' ',strip=True)
 ordinal={'01':'1st','02':'2nd','04':'4th'}[row['district']]
 assert 'Arkansas (AR)' in section and ordinal in section and 'Republican' in section
 fb,fr=capture(stem+'-fec');ft=texts(fb)
 assert f['nameRaw'] in ft and ('Candidate for House Arkansas - '+row['district']+' ID: '+fid+' REPUBLICAN PARTY') in ft
 row['name']=display
 if aliases:row['aliases']=aliases
 row['identityEvidence']={'url':cr['url'],'sha256':cr['sha256'],'title':'U.S. House Clerk official member profile '+display+'; Arkansas district '+row['district']+' Republican identity only'}
 arproof.append({'ballotName':ballot,'derivedProfileName':display,'aliases':aliases,'state':'AR','office':'H','district':row['district'],'requiredExistingParty':'R','fecCandidateId':fid,'bioguideId':bio,'clerkProof':{'fetch':cr,'name':display,'state':'AR','district':row['district'],'party':'Republican','section':'Member profile heading and immediately following state/district/party'},'fecProof':{'fetch':fr,'tuple':f},'derivation':'Explicit reviewed per-person mapping. Alias matching requires same election, office, district and party; no generic prefix removal or fuzzy match.'})
 for k,v in next(r for r in ar['candidates'] if r['ballotName']==ballot).items():
  if k!='name':assert row[k]==v
save('ar-general-three-gaps-refined-draft.json',newar)
save('ar-name-identity-receipt.json',{'outcome':'Worked','primaryGeneralSourceUnchanged':ar['sources']==newar['sources'],'rawBallotNamesAndPartiesPreserved':True,'sourceBackedCuratedMappings':arproof,'existingDatabaseActorsRead':False,'noGenericTitleStripping':True,'noFecNominationInference':True,'rawContactSourcesCommitted':False})
checks.append({'scenario':'three actual Clerk and FEC name/state/district/party identity bindings; seven raw ballot rows conserved','count':3,'outcome':'Worked'})
az=load(ORIGINAL/'az-general-gov-h06-h07-draft.json');newaz=copy.deepcopy(az)
gb,gr=capture('AZ-role-guide');guide=PdfReader(RAW/'AZ-role-guide.raw')
db,dr=capture('AZ-Guide-delegation');s=BeautifulSoup(db,'html.parser')
link=s.find('a',href=gr['url']);assert link is not None and link.get_text(' ',strip=True)=='English'
# Find preceding guide heading, rather than applying the adjacent primary link.
prior=link.find_previous(['h2','h3','h4']);assert prior is not None and 'November 3, 2026' in prior.get_text()
assert gr['sha256']=='67bc4e66b68a5883f6f68a4fa165d807eb4bbf5a78a3640bd3eac9b08273b5fb'
pb,pr=capture('AZ-Pima-authority');ps=BeautifulSoup(pb,'html.parser');primary=az['sources'][0]
pl=ps.find('a',href=primary['url']);assert pl is not None and '2026 General Election Official Candidate List' in pl.get_text()
partyproof=[]
for name,raw,label,page,value in [('Katie Hobbs','DEM','Democratic',20,None),('Andy Biggs','REP','Republican',20,None),('Risa Lombardo','GRN','Green',21,'G'),('Teri Ann Hourihan','NOL','No Labels',21,None)]:
 row=next(r for r in newaz['candidates'] if r['name']==name)
 assert row['partyRaw']==raw
 text=guide.pages[page-1].extract_text();assert 'CANDIDATES FOR GOVERNOR' in text and name+'\nParty:\n'+label in text
 row['partyEvidence']={'url':gr['url'],'sha256':gr['sha256'],'sourcePage':page,'title':'Arizona CCEC November 3 2026 guide: '+name+' / Governor / Party: '+label+' (identity/party only)'}
 if value:row['partyValue']=value
 partyproof.append({'ballotName':row['ballotName'],'name':name,'office':'G','district':'00','partyRaw':raw,'publishedPartyLabel':label,'proposedPartyValue':value,'sourcePage':page,'url':gr['url'],'sha256':gr['sha256'],'eligibilitySource':primary['url'],'use':'identity/party only; eligibility remains Pima general list'})
for ballot,fid,stem,raw,label,value in [('PETERS, JEREME LANCE','H6AZ06214','AZ-Peters-fec','LBT','LIBERTARIAN PARTY','L'),('SWING, GARY','H6AZ06164','AZ-Swing-fec','GRN','GREEN PARTY','G')]:
 row=next(r for r in newaz['candidates'] if r['ballotName']==ballot);f=rows[fid]
 assert row['partyRaw']==raw and f['nameRaw']==ballot and f['state']=='AZ' and f['office']=='H' and f['district']=='06' and f['year']=='2026'
 b,r=capture(stem);txt=texts(b)
 assert f['nameRaw'] in txt and ('Candidate for House Arizona - 06 ID: '+fid+' '+label) in txt
 row['partyValue']=value;row['partyEvidence']={'url':r['url'],'sha256':r['sha256'],'title':'FEC candidate overview '+ballot+'; Arizona House 06; '+label+' (party/identity only)'}
 partyproof.append({'ballotName':ballot,'name':row['name'],'office':'H','district':'06','partyRaw':raw,'publishedPartyLabel':label,'proposedPartyValue':value,'fecCandidateId':fid,'sourceSection':'Candidate overview name and Candidate for House Arizona - 06 header','sourcePage':None,'fetch':r,'fecTuple':f,'eligibilitySource':primary['url'],'use':'identity/party only; FEC status N/C is not general eligibility'})
for before,after in zip(az['candidates'],newaz['candidates']):
 for k,v in before.items():assert after[k]==v,(before['name'],k)
assert [r['partyValue'] for r in newaz['candidates'] if 'partyValue' in r]==['G','L','G']
assert 'partyValue' not in next(r for r in newaz['candidates'] if r['partyRaw']=='NOL')
save('az-general-gov-h06-h07-refined-draft.json',newaz)
save('az-party-and-delegation-receipt.json',{'outcome':'Worked','partyRows':partyproof,'primarySourceAndEveryRawNamePartyIncumbentPreserved':True,'govDelegations':[{'fetch':pr,'exactLinkText':pl.get_text(' ',strip=True),'exactDestination':primary['url'],'admissionScope':'literal Pima General asset URL only'},{'fetch':dr,'sectionHeading':prior.get_text(' ',strip=True),'exactLinkText':link.get_text(' ',strip=True),'exactDestination':gr['url'],'admissionScope':'literal CCEC guide URL; identity/party evidence only, never general-eligibility source'}],'rawContactSourcesCommitted':False})
checks.append({'scenario':'four Governor party labels and two independent named federal party labels; only three G/L overrides, No Labels remains raw NOL','count':6,'outcome':'Worked'})
checks.append({'scenario':'two actual .gov delegation exact hyperlinks and election context','count':2,'outcome':'Worked'})
save('remaining-source-blockers.json',{'outcome':'Blocked','items':[{'scope':'AZ-H08','attempt':load(RAW/'AZ-Maricopa-general-index-proof.json'),'reason':'General index native403; existing SOS portal403/authenticated sample restriction remains; no primary or staged zero report promoted.'},{'scope':'KY-H03','attempt':load(RAW/'KY-SBE-candidate-index-proof.json'),'reason':'Independent statewide SBE candidate index403. Existing accessible SOS General filings lack qualified/certified/printed field. Jefferson held resource not accessed.'},{'scope':'AZ-H02 alternative Graham General HTML','attempt':load(RAW/'AZ-Graham-general-proof.json'),'webRead':{'url':'https://www.graham.az.gov/498/Candidates-Propositions','actualHeading':'2026 GENERAL - NOVEMBER 3RD / GENERAL BALLOT SECTION ONE','actualH02Rows':['REP CRANE, ELI','DEM NEZ, JONATHAN','LBT GOODWIN, CURTIS'],'documentSha256':None},'reason':'Web tool actual read works; native403. No byte-captured document or import admission claimed.'}]})
save('refinement-verification.json',{'outcome':'Worked','checks':checks,'databaseAccess':False,'runtimeEdits':False,'rawContactsEmitted':False,'existingActorMatchClaim':False})
print(json.dumps({'outcome':'Worked','checks':checks,'filesGenerated':7}))
