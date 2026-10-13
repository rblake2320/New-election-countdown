import pathlib,json,re,hashlib,csv,fitz
from bs4 import BeautifulSoup
from pypdf import PdfReader
root=pathlib.Path(__file__).resolve().parents[1]/'artifacts/ga-mn-general'
draft=json.loads((root/'drafts/ga-2026-general-incremental.json').read_bytes());proof={}
for key,district in [('ga-camden-ballot','01'),('ga-fayette-ballot','03'),('ga-columbia-ballot','12')]:
 receipt=json.loads((root/'receipts'/(key+'.json')).read_bytes());raw=root/receipt['file'];sid=key+'-2026-printed'
 if key=='ga-fayette-ballot':
  text=(root/'ocr/ga-fayette-ballot-page-1.txt').read_text(encoding='utf-8');assert 'Election Day: November 3, 2026' in text
  pairs=[('Brian Jack','Republican'),('Maura Keller','Democrat')]
  assert 'District 3 (Vote for' in text and 'Brian Jack (I) Republican' in text and 'Maura Keller Democrat' in text
  words=list(csv.DictReader((root/'ocr/ga-fayette-ballot-page-1.tsv').open(encoding='utf-8'),delimiter='\t'))
  selected=[w for w in words if w['text'] in ['Brian','Jack','Maura','Keller']]
  assert {w['text'] for w in selected}=={'Brian','Jack','Maura','Keller'}
  extra={'extraction':'CPU Tesseract eng psm3 from raw PDF page 1 at 200dpi','candidateWords':[{k:w[k] for k in ['text','conf','left','top','width','height']} for w in selected],
   'visualReview':{'outcome':'Worked','image':'ocr/ga-fayette-ballot-page-1.png','header':'November 2026 General Election / Election Day November 3 2026','office':'For United States House of Representatives - District 3','namedRows':[{'name':n,'party':p} for n,p in pairs],'genericWriteInCount':1,'reviewer':'Sol independent page-image inspection, not OCR-only admission'},
   'independentCountyAgreement':{'source':'ga-carroll-ballot','sha256':hashlib.sha256((root/'raw/ga-carroll-ballot.pdf').read_bytes()).hexdigest(),'page':1,'image':'ocr/ga-carroll-ballot-page-1.png','visualOutcome':'Worked','exactNamesPartyAndDistrictAgree':True,'ocrSpellingError':'Carroll OCR Democat; actual image prints Democrat, never admitted OCR typo'}}
 else:
  doc=fitz.open(raw);text=doc[0].get_text();other=re.sub(r'\s+','',PdfReader(raw).pages[0].extract_text())
  if key=='ga-camden-ballot':
   landing=BeautifulSoup((root/'raw/ga-camden.html').read_bytes(),'html.parser');header=landing.find(lambda t:t.name in ['h2','h3'] and 'November 3, 2026 General/Special Election' in t.get_text());assert header
   assert any('/DocumentCenter/View/19546/Sample-Ballot-11-03-2026'==a.get('href') for a in header.find_next('ul').find_all('a'))
   block=re.search(r'UNITED STATES HOUSE OF REPRESENTATIVES- DISTRICT 1:\s+(.+?)STATE RACES',text,re.S).group(1)
   pairs=[]
   for line in block.splitlines():
    m=re.fullmatch(r'(.+?)\s+\u2013\s+(Republican|Democrat)',line.strip())
    if m:pairs.append((m[1],m[2]))
   extra={'extraction':'PyMuPDF role-delimited page 1, independent pypdf ordered characters','dateInRawPdf':False,'dateContextEvidence':'Official retained Camden Gov landing explicitly labels link November 3 2026 General/Special Election','landingSha256':hashlib.sha256((root/'raw/ga-camden.html').read_bytes()).hexdigest()}
  else:
   assert 'NOVEMBER 3, 2026' in text and 'GENERAL & SPECIAL ELECTION' in text
   block=re.search(r'For United States House of\s+Representatives - District 12\s+\(Vote for One\)\s+(.+?)Write-In',text,re.S).group(1)
   lines=[x.strip() for x in block.splitlines() if x.strip()];assert len(lines)==4;pairs=[(re.sub(r' \(I\)$','',lines[i]),lines[i+1]) for i in [0,2]]
   extra={'extraction':'PyMuPDF role-delimited page 1, independent pypdf ordered characters','dateInRawPdf':True}
  assert len(pairs)==2
  for n,p in pairs:assert re.sub(r'\s+','',n) in other and re.sub(r'\s+','',p) in other
 rows=[dict(sourceId=sid,state='GA',office='H',district=district,date='2026-11-03',name=n,partyRaw=p,incumbent=None,ballotAccessType='printed',sourcePage=1) for n,p in pairs]
 scope=dict(office='H',district=district,ballotAccessType='printed',expectedCount=len(rows))
 draft['sources'].append(dict(id=sid,state='GA',kind='official_general_candidate_list',name=key+' official November 3 2026 General Election sample ballot, named printed federal district '+district,url=receipt['url'],sha256=receipt['sha256'],publishedAt=None,retrievedAt=receipt['capturedAt'],electionDate='2026-11-03',completeScopes=[scope],expectedRowCount=len(rows)))
 draft['candidates'].extend(rows);proof[key]=dict(outcome='Worked',sha256=receipt['sha256'],selectedScope=scope,rows=rows,contactsDropped=True,incumbencyNotInferred=True,**extra)
for p,v in [(root/'drafts/ga-2026-general-incremental.json',draft),(root/'receipts/third-extraction-proof.json',proof)]:p.write_bytes((json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode())
print(json.dumps({k:len(v['rows']) for k,v in proof.items()}))
