"""Bounded source-backed re-derivation and byte-preserving snapshot update."""
import pathlib,json,hashlib,sys,subprocess,urllib.request,xml.etree.ElementTree as ET,datetime
from html.parser import HTMLParser
ROOT=pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'data/congress/119'))
from member_names import senate_display_name
OUT=ROOT/'artifacts/congress-name'
OUT.mkdir(parents=True,exist_ok=True)
path=ROOT/'data/congress/119/official-current-members.json'
oldbytes=subprocess.check_output(['git','show','c343237594bde7a2e3bd837fceaaae6abad9a072:data/congress/119/official-current-members.json'],cwd=ROOT)
assert hashlib.sha256(oldbytes).hexdigest()=='b09efc0e8a2b98ffc1e5e4740c8c0ba03a381e745cdf8d53a501e053bfa8ad56'
(OUT/'old-b09-members.json').write_bytes(oldbytes)
old=json.loads(oldbytes)
class Names(HTMLParser):
    def __init__(self):super().__init__();self.inside=False;self.parts=[];self.names=[]
    def handle_starttag(self,t,a):
        if t=='a':self.inside=True;self.parts=[]
    def handle_data(self,t):
        if self.inside:self.parts.append(t)
    def handle_endtag(self,t):
        if t=='a' and self.inside:self.names.append(''.join(self.parts).strip());self.inside=False
def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ElectionTracker-official-name-review/1.0'}),timeout=30) as r:
        body=r.read()
        return body,{'url':url,'finalUrl':r.url,'status':r.status,'sha256':hashlib.sha256(body).hexdigest(),'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'rawBytesRetained':False}
xml,xmlproof=fetch('https://www.senate.gov/general/contact_information/senators_cfm.xml')
landing,landingproof=fetch('https://www.senate.gov/senators/index.htm')
assert xmlproof['sha256']==old['sources'][1]['sha256'],'Fresh Senate XML changed; source review required before using retained-field correction'
assert landingproof['sha256']==old['sources'][1]['congressContextSource']['sha256'],'Fresh official Senate listing changed; source review required'
r=ET.fromstring(xml);parser=Names();parser.feed(landing.decode('utf-8'))
fields=[]
for m in r.findall('member'):
    first=(m.findtext('first_name') or '').strip();last=(m.findtext('last_name') or '').strip()
    if ',' in first:
        fields.append({'bioguideId':(m.findtext('bioguide_id') or '').strip(),'firstName':first,'lastName':last,'memberFull':(m.findtext('member_full') or '').strip(),'partyRaw':(m.findtext('party') or '').strip(),'state':(m.findtext('state') or '').strip(),'publisherListingName':last+', '+first,'listingNameObserved':last+', '+first in parser.names})
assert fields and all(f['listingNameObserved'] for f in fields)
newbytes=oldbytes;changes=[]
for row in old['members']:
    if row['chamber']!='Senate':continue
    evidence=row['nameEvidence']; name,derivation=senate_display_name(evidence['firstName'],evidence['lastName'])
    if name==row['name'] and derivation==row['nameDerivation']:continue
    proof=next(f for f in fields if f['bioguideId']==row['bioguideId'])
    assert proof['firstName']==evidence['firstName'] and proof['lastName']==evidence['lastName'] and proof['memberFull']==evidence['memberFull'] and proof['partyRaw']==row['partyRaw'] and proof['state']==row['state']
    marker=('"bioguideId": '+json.dumps(row['bioguideId'])).encode(); start=newbytes.index(marker);end=newbytes.index(b'"nameEvidence":',start)
    segment=newbytes[start:end]
    oldname=('"name": '+json.dumps(row['name'],ensure_ascii=False)).encode('utf-8');newname=('"name": '+json.dumps(name,ensure_ascii=False)).encode('utf-8')
    oldbasis=('"nameDerivation": '+json.dumps(row['nameDerivation'])).encode();newbasis=('"nameDerivation": '+json.dumps(derivation)).encode()
    assert segment.count(oldname)==1 and segment.count(oldbasis)==1
    replacement=segment.replace(oldname,newname).replace(oldbasis,newbasis)
    newbytes=newbytes[:start]+replacement+newbytes[end:]
    changes.append({'bioguideId':row['bioguideId'],'oldName':row['name'],'newName':name,'oldDerivation':row['nameDerivation'],'newDerivation':derivation,'sourceFields':proof})
assert len(changes)==1
new=json.loads(newbytes); oldmap={m['bioguideId']:m for m in old['members']};newmap={m['bioguideId']:m for m in new['members']}
assert len(oldmap)==len(newmap)==539 and oldmap.keys()==newmap.keys()
for bid,a in oldmap.items():
    b=newmap[bid]
    if a==b:continue
    assert [k for k in a if a[k]!=b[k]]==['name','nameDerivation']
    assert a['chamber']=='Senate'
house=[m for m in old['members'] if m['chamber']=='House'];assert all(newmap[m['bioguideId']]==m for m in house)
assert {k:v for k,v in old.items() if k!='members'}=={k:v for k,v in new.items() if k!='members'}
# Every byte outside the two explicit string replacements remains unchanged.
reconstructed=newbytes
for change in changes:
    reconstructed=reconstructed.replace(json.dumps(change['newName']).encode(),json.dumps(change['oldName']).encode(),1).replace(json.dumps(change['newDerivation']).encode(),json.dumps(change['oldDerivation']).encode(),1)
assert reconstructed==oldbytes
path.write_bytes(newbytes)
report={'base':'c343237594bde7a2e3bd837fceaaae6abad9a072','outcome':'Worked','oldProjectionSha256':hashlib.sha256(oldbytes).hexdigest(),'newProjectionSha256':hashlib.sha256(newbytes).hexdigest(),'changes':changes,'memberIdentitiesConserved':539,'unchangedWholeMemberRecords':538,'unchangedHouseRecords':len(house),'unchangedHouseCommaSuffixNames':sum(m['name'].endswith((', Jr.',', Sr.')) for m in house),'unchangedHouseAllJrSrNames':sum('Jr.' in m['name'] or 'Sr.' in m['name'] for m in house),'allOtherSnapshotValuesAndBytesConserved':True,'originalRawSourceBindingsUnchanged':True,'freshResearch':[xmlproof,landingproof],'freshRawXmlMatchesOriginal':xmlproof['sha256']==old['sources'][1]['sha256'],'freshLandingMatchesOriginal':landingproof['sha256']==old['sources'][1]['congressContextSource']['sha256'],'sourceHashEqualityGated':True,'contactsRetained':False,'sharedWrites':0,'oldNameRegression':{'outcome':'Failed','actual':changes[0]['oldName'],'expected':changes[0]['newName']},'newNameRegression':{'outcome':'Worked','actual':changes[0]['newName']}}
(OUT/'source-name-receipt.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ['freshResearch']},ensure_ascii=False))
