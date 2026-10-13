import pathlib,json,re,hashlib,fitz
from pypdf import PdfReader
root=pathlib.Path(__file__).resolve().parents[1]/'artifacts/ga-mn-general';draft=json.loads((root/'drafts/mn-2026-general-incremental.json').read_bytes());proof={}
for district in ['05','06','07','08']:
 key='mn-h'+district;pr=json.loads((root/'receipts'/(key+'-pdf.json')).read_bytes());jr=json.loads((root/'receipts'/(key+'-live.json')).read_bytes());j=json.loads((root/jr['file']).read_bytes())
 assert j['PollingResult']['FullElectionDescription']=='11/03/2026 STATE GENERAL ELECTION' and j['PollingResult']['HouseDistrict']==str(int(district))
 raw=root/pr['file'];doc=fitz.open(raw);text=doc[0].get_text();alt=re.sub(r'\s+','',PdfReader(raw).pages[0].extract_text());assert 'State General Election Ballot' in text and 'November 3, 2026' in text
 block=re.search(r'(?:United States|U\.S\.) Representative\s+District '+str(int(district))+r'\s+Vote for One\s+(.+?)write-in, if any',text,re.S).group(1)
 lines=[x.strip() for x in block.splitlines() if x.strip()];assert len(lines)%2==0;pairs=list(zip(lines[::2],lines[1::2]))
 apirows=[b for b in j['Ballots'] if b['OfficeTitle']=='U.S. Representative District '+str(int(district))];named=[b for b in apirows if b['CandidateScreenName']!='WRITE-IN']
 assert len(named)==len(pairs)==(3 if district=='05' else 2)
 assert {(n,p.casefold()) for n,p in pairs}=={(b['CandidateScreenName'],b['PartyName'].casefold()) for b in named}
 assert len(apirows)==len(named)+1 and apirows[-1]['CandidateScreenName']=='WRITE-IN'
 assert any(s['ImageFileId'] in pr['url'] and s['ElectionType']=='STG' for s in j['SampleBallots'])
 sid=key+'-sos-general-2026-printed';rows=[]
 for name,party in pairs:
  assert re.sub(r'\s+','',name) in alt and re.sub(r'\s+','',party) in alt
  rows.append(dict(sourceId=sid,state='MN',office='H',district=district,date='2026-11-03',name=name,partyRaw=party,incumbent=None,sourcePage=1,ballotAccessType='printed'))
 scope=dict(office='H',district=district,ballotAccessType='printed',expectedCount=len(rows))
 draft['sources'].append(dict(id=sid,state='MN',kind='official_general_candidate_list',name='Minnesota Secretary of State official November 3 2026 State General sample ballot, U.S. House District '+district+' named printed candidates',url=pr['url'],sha256=pr['sha256'],publishedAt=None,retrievedAt=pr['capturedAt'],electionDate='2026-11-03',completeScopes=[scope],expectedRowCount=len(rows)))
 draft['candidates'].extend(rows);proof[key]=dict(outcome='Worked',pdfSha256=pr['sha256'],pdfSourceUrl=pr['url'],apiSha256=jr['sha256'],apiSourceUrl=jr['url'],electionDescription=j['PollingResult']['FullElectionDescription'],houseDistrict=j['PollingResult']['HouseDistrict'],rows=rows,scope=scope,rawBlock=block,independentConservation='PyMuPDF exact PDF role/name/party; pypdf whitespace-only character conservation; separately fetched original SOS JSON Ballots named set+generic write-in count matches PDF',notOCR=True,contactsDropped=True,incumbencyNotInferred=True,pdfLiteralPartyPreserved=True,certificationNotClaimed=True)
for p,v in [(root/'drafts/mn-2026-general-incremental.json',draft),(root/'receipts/fourth-extraction-proof.json',proof)]:p.write_bytes((json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode())
print(json.dumps({k:len(v['rows']) for k,v in proof.items()}))
