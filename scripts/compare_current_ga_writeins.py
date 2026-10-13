import pathlib,json,re,fitz
from pypdf import PdfReader
repo=pathlib.Path(__file__).resolve().parents[1];root=repo/'artifacts/ga-mn-general';pr=json.loads((root/'receipts/ga-morgan-writeins-current.json').read_bytes());raw=root/pr['file'];text=fitz.open(raw)[0].get_text();other=re.sub(r'\s+','',PdfReader(raw).pages[0].extract_text())
assert 'FINAL LIST OF CERTIFIED WRITE-IN CANDIDATES' in text and 'November 3, 2026, General Election' in text and 'Published this 15th day of September 2026' in text
sid='ga-sos-current-qualified-writeins-2026-morgan';rows=[];scopes=[];blocks={}
for office,district,heading in [('S','00','U.S. Senate'),('G','00','Governor'),('H','10','U.S. House of Representatives, District 10'),('H','11','U.S. House of Representatives, District 11'),('H','13','U.S. House of Representatives, District 13'),('H','14','U.S. House of Representatives, District 14')]:
 block=re.search(re.escape(heading)+r'\s+(.+?)(?=\nGovernor|\nU\.S\. House|\nState Representative)',text,re.S).group(1) if office!='H' or district!='14' else re.search(re.escape(heading)+r'\s+(.+?)\nState Representative',text,re.S).group(1)
 names=[' '.join(n.split()) for n in block.splitlines() if n.strip()];assert len(names)=={('S','00'):3,('G','00'):7,('H','10'):1,('H','11'):2,('H','13'):1,('H','14'):2}[office,district]
 for n in names:
  assert re.sub(r'\s+','',n) in other
  rows.append(dict(sourceId=sid,state='GA',office=office,district=district,date='2026-11-03',name=n,partyRaw='',incumbent=None,sourcePage=1,ballotAccessType='write_in'))
 scopes.append(dict(office=office,district=district,ballotAccessType='write_in',expectedCount=len(names)));blocks[office+district]=block
old=json.loads((repo/'data/nominees/ga-2026-general.json').read_bytes())
def fact(r):return r['office'],r['district'],r['name'],r['partyRaw'],r['ballotAccessType']
assert {fact(r) for r in rows}=={fact(r) for r in old['candidates']}
gordon=fitz.open(root/'raw/ga-qualified-writeins-current.pdf')[0].get_text();assert all(n in ' '.join(gordon.split()) for n in [r['name'] for r in rows if r['office']!='H' or r['district']=='11'])
source=dict(id=sid,state='GA',kind='official_general_candidate_list',name='Morgan County official Gov-published Georgia Secretary of State FINAL LIST OF CERTIFIED WRITE-IN CANDIDATES, November3 2026 General Election, H/S/G scopes',url=pr['url'],sha256=pr['sha256'],publishedAt='2026-09-15',retrievedAt=pr['capturedAt'],electionDate='2026-11-03',completeScopes=scopes,expectedRowCount=16)
draft=dict(version=1,sources=[source],candidates=rows)
proof=dict(outcome='Worked',sourceSha256=pr['sha256'],publicationDateEvidence='Published this 15th day of September 2026 pursuant to O.C.G.A.21-2-133(e)(1)',qualificationEvidence='FINAL LIST OF CERTIFIED WRITE-IN CANDIDATES; only named candidates have write-in votes counted',rawBlocks=blocks,scopeCounts=scopes,namedFactComparisons=16,namedFactMismatches=0,excludedStateLegislativeNamedRows=5,rawPartyUnknownEmptyNotInferred=True,oldSourceUnmodified=True,receivingPlan='Separate sixteen-row qualified write-in source refresh proposal; root explicitly resolves overlapping historical source, no automatic old-source replacement',gordonCountyFilteredCopy='Retained Gordon copy only lists S3/G7/H11two; all12 overlaps match. Its missing other-district names do not disqualify anyone.')
for p,v in [(root/'drafts/ga-2026-general-current-writeins.json',draft),(root/'receipts/ga-current-writeins-comparison.json',proof)]:p.write_bytes((json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode())
print(json.dumps({'outcome':'Worked','comparisons':16,'mismatches':0,'rows':len(rows),'oldSourceUnmodified':True}))
