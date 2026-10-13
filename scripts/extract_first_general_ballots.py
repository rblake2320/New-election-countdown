"""Actual general-ballot text extraction; no primary winners inferred, no OCR."""
import pathlib,json,re,hashlib,fitz
from pypdf import PdfReader
repo=pathlib.Path(__file__).resolve().parents[1];root=repo/'artifacts/ga-mn-general';(root/'drafts').mkdir(exist_ok=True)
def save(path,value):path.write_bytes((json.dumps(value,indent=2,ensure_ascii=False)+'\n').encode())
proof={}
ga_file=root/'raw/ga-dekalb-ballot.pdf';ga=fitz.open(ga_file);alt=' '.join(PdfReader(ga_file).pages[0].extract_text().split())
assert 'General / Special Election - November 3, 2026' in ga[0].get_text()
assert 'contains all contests' in ga[0].get_text()
receipt=json.loads((root/'receipts/ga-dekalb-ballot.json').read_bytes())
sourceid='ga-dekalb-general-2026-printed';scopes=[];candidates=[];regions={}
for office,district,box in [('S','00',(55,175,215,260)),('G','00',(55,260,215,340)),('H','04',(220,520,390,610)),('H','05',(220,610,390,715)),('H','13',(390,175,550,270))]:
    text=ga[0].get_text(clip=fitz.Rect(*box));rows=[]
    for line in text.splitlines():
        match=re.fullmatch(r'(.+?) (Republican|Democrat)',line.strip())
        if not match:continue
        assert line.strip() in alt, 'Independent PDF text does not match actual name/party line'
        name=re.sub(r' \(I\)$','',match[1])
        row={'sourceId':sourceid,'state':'GA','office':office,'district':district,'date':'2026-11-03','name':name,'partyRaw':match[2],'incumbent':None,'ballotAccessType':'printed','sourcePage':1}
        rows.append(row);candidates.append(row)
    assert len(rows)==2 and len({r['name'] for r in rows})==2
    scopes.append({'office':office,'district':district,'ballotAccessType':'printed','expectedCount':len(rows)})
    regions[office+district]={'box':box,'text':text,'independentWholePageNamesPartyMatch':True}
source={'id':sourceid,'state':'GA','kind':'official_general_candidate_list','name':'DeKalb County Georgia official composite sample ballot, November 3 2026 General/Special Election, named printed H/S/G candidates','url':receipt['url'],'sha256':receipt['sha256'],'publishedAt':None,'retrievedAt':receipt['capturedAt'],'electionDate':'2026-11-03','completeScopes':scopes,'expectedRowCount':len(candidates)}
save(root/'drafts/ga-2026-general-incremental.json',{'version':1,'sources':[source],'candidates':candidates})
proof['GA']={'outcome':'Worked','rawSha256':source['sha256'],'publishedGeneralDate':'2026-11-03','pageZeroBased':0,'selectedRows':len(candidates),'selectedScopes':scopes,'regions':regions,'primaryExtractor':'PyMuPDF bounding boxes','independentExtractor':'pypdf whole page exact raw name/party line conservation','notOCR':True,'contactsDropped':True,'genericWriteInSlotsExcluded':True,'incumbencyNotInferred':True}
mn_file=root/'raw/mn-northfield-ballot.pdf';mn=fitz.open(mn_file);text=mn[0].get_text();alt=PdfReader(mn_file).pages[0].extract_text()
assert 'State General Election Ballot' in text and 'November 3, 2026' in text
block=re.search(r'U\.S\. Representative\s+District 2\s+Vote for One\s+(.+?)write-in, if any',text,re.S).group(1)
lines=[x.strip() for x in block.splitlines() if x.strip()];assert len(lines)==4
receipt=json.loads((root/'receipts/mn-northfield-ballot.json').read_bytes());sourceid='mn-northfield-general-2026-H02-printed'
candidates=[]
for name,party in zip(lines[::2],lines[1::2]):
    assert name in alt and party in alt
    candidates.append({'sourceId':sourceid,'state':'MN','office':'H','district':'02','date':'2026-11-03','name':name,'partyRaw':party,'incumbent':None,'ballotAccessType':'printed','sourcePage':1})
assert len(candidates)==2
source={'id':sourceid,'state':'MN','kind':'official_general_candidate_list','name':'City of Northfield official Rice County State General Election sample ballot, November 3 2026, U.S. Representative District 2 printed candidates','url':receipt['url'],'sha256':receipt['sha256'],'publishedAt':None,'retrievedAt':receipt['capturedAt'],'electionDate':'2026-11-03','completeScopes':[{'office':'H','district':'02','ballotAccessType':'printed','expectedCount':2}],'expectedRowCount':2}
save(root/'drafts/mn-2026-general-incremental.json',{'version':1,'sources':[source],'candidates':candidates})
wsp=PdfReader(root/'raw/mn-wsp-ballot.pdf').pages[0].extract_text();assert all(x in wsp for x in lines)
proof['MN']={'outcome':'Worked','rawSha256':source['sha256'],'publishedGeneralDate':'2026-11-03','pageZeroBased':0,'selectedRows':2,'district':'02','primaryExtractor':'PyMuPDF role-delimited text','independentExtractor':'pypdf same actual PDF plus independent West St Paul official general ballot','rawRows':lines,'independentWspSha256':hashlib.sha256((root/'raw/mn-wsp-ballot.pdf').read_bytes()).hexdigest(),'notOCR':True,'contactsDropped':True,'genericWriteInSlotsExcluded':True,'incumbencyNotInferred':True}
save(root/'receipts/first-extraction-proof.json',proof)
print(json.dumps({state:{'outcome':value['outcome'],'rows':value['selectedRows']} for state,value in proof.items()}))
