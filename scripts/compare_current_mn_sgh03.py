import pathlib,json,re,hashlib,fitz
from pypdf import PdfReader
repo=pathlib.Path(__file__).resolve().parents[1];root=repo/'artifacts/ga-mn-general'
pr=json.loads((root/'receipts/mn-h03-pdf.json').read_bytes());jr=json.loads((root/'receipts/mn-h03-retry.json').read_bytes());raw=root/pr['file'];text=fitz.open(raw)[0].get_text();other=re.sub(r'\s+','',PdfReader(raw).pages[0].extract_text());j=json.loads((root/jr['file']).read_bytes())
assert 'State General Election Ballot' in text and 'November 3, 2026' in text
assert j['PollingResult']['FullElectionDescription']=='11/03/2026 STATE GENERAL ELECTION' and j['PollingResult']['HouseDistrict']=='3'
assert any(s['ImageFileId'] in pr['url'] and s['ElectionType']=='STG' for s in j['SampleBallots'])
sid='mn-sos-current-general-2026-sgh03-printed';rows=[];scopes=[];rawblocks={}
for office,district,pdfRole,apiRole in [('S','00','United States Senator','U.S. Senator'),('H','03','United States Representative\nDistrict 3','U.S. Representative District 3'),('G','00','Governor and Lieutenant Governor','Governor & Lt Governor')]:
 block=re.search(re.escape(pdfRole)+r'\s+Vote for One(?: Team)?\s+(.+?)write-in, if any',text,re.S).group(1);rawblocks[office+district]=block
 api=[r for r in j['Ballots'] if r['OfficeTitle']==apiRole];named=[r for r in api if r['CandidateScreenName']!='WRITE-IN'];assert len(api)==len(named)+1
 pairs=[];pending=[]
 for line in block.splitlines():
  line=line.strip()
  if line in ['Independent','Libertarian','Democratic-Farmer-Labor','Republican','Green']:
   assert pending;pairs.append((' '.join(pending),line));pending=[]
  elif line:pending.append(line)
 assert not pending and len(pairs)=={'S':4,'H':2,'G':3}[office]
 assert {(n,p.casefold()) for n,p in pairs}=={(r['CandidateScreenName'],r['PartyName'].casefold()) for r in named}
 for name,party in pairs:
  assert re.sub(r'\s+','',name) in other and re.sub(r'\s+','',party) in other
  row=dict(sourceId=sid,state='MN',office=office,district=district,date='2026-11-03',name=name.split(' and ')[0] if office=='G' else name,partyRaw=party,incumbent=None,ballotAccessType='printed',sourcePage=1)
  if office=='G':row['ticketText']=name
  rows.append(row)
 scopes.append(dict(office=office,district=district,ballotAccessType='printed',expectedCount=len(pairs)))
source=dict(id=sid,state='MN',kind='official_general_candidate_list',name='Minnesota Secretary of State current official November 3 2026 general ballot, printed U.S. Senate/Governor/U.S. House District3 scopes',url=pr['url'],sha256=pr['sha256'],publishedAt=None,retrievedAt=pr['capturedAt'],electionDate='2026-11-03',completeScopes=scopes,expectedRowCount=9)
draft=dict(version=1,sources=[source],candidates=rows)
old=json.loads((repo/'data/nominees/mn-2026-general.json').read_bytes())
def facts(r):return (r['office'],r['district'],r['name'],r['partyRaw'].casefold(),r.get('ticketText'))
assert {facts(r) for r in rows}=={facts(r) for r in old['candidates']}
proof=dict(outcome='Worked',currentSourceSha256=pr['sha256'],currentApiSha256=jr['sha256'],scopeCounts=scopes,rawBlocks=rawblocks,namedFactComparisons=9,namedFactMismatches=0,literalPartyCaseChangesOnly=True,oldSourceUnmodified=True,oldNullSourceShaNotRewritten=True,receivingPlan='Separate nine-row proposal. Root must explicitly resolve overlapping scopes/source refresh; never blindly append old+new to strict combined manifest.',governorProjection='Source explicitly labels Governor and Lieutenant Governor, in that order. First printed person is name; complete publisher ticket retained in ticketText. Exact current team strings match prior manifest.',independentConservation='PyMuPDF roles and ordered PDF text; pypdf exact non-whitespace character conservation; original separately fetched SOS JSON named set and count agreement')
for p,v in [(root/'drafts/mn-2026-general-current-sgh03.json',draft),(root/'receipts/mn-current-sgh03-comparison.json',proof)]:p.write_bytes((json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode())
print(json.dumps({'outcome':'Worked','comparisons':9,'mismatches':0,'rows':len(rows),'oldSourceUnmodified':True}))
