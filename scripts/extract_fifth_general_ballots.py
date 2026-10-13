import pathlib,json,re,hashlib,fitz
from pypdf import PdfReader
root=pathlib.Path(__file__).resolve().parents[1]/'artifacts/ga-mn-general';draft=json.loads((root/'drafts/ga-2026-general-incremental.json').read_bytes());proof={}
for key,district,page in [('ga-morgan-ballot','10',2),('ga-gordon-ballot','11',1),('ga-walker-ballot-correct','14',1)]:
 receipt=json.loads((root/'receipts'/(key+'.json')).read_bytes());raw=root/receipt['file'];doc=fitz.open(raw);text=doc[page-1].get_text().replace('\u00a0',' ');alltext='\n'.join(p.get_text().replace('\u00a0',' ') for p in doc);other=re.sub(r'\s+','',PdfReader(raw).pages[page-1].extract_text())
 assert 'General' in alltext and re.search(r'November\s+0?3,\s+2026',alltext)
 pattern=r'For United States House of\s+Representatives\s*[-\u2013]\s*District\s*'+district+r'\s*(?:\(Vote\s+for\s+One\)|Vote for:\s+One)\s+(.+?)(?:Write-in|For State Senate)'
 block=re.search(pattern,text,re.S).group(1);pairs=[]
 for line in block.splitlines():
  m=re.fullmatch(r'(.+?)(?: \(I\))?\s+(Republican|Democrat)',line.strip()) if district!='14' else re.fullmatch(r'(.+?)(?: \(I\))?-(Rep|Dem)',line.strip())
  if m:pairs.append((' '.join(m[1].split()),m[2],line.strip()))
 assert len(pairs)==2,(district,pairs)
 for n,p,line in pairs:assert re.sub(r'\s+','',line) in other
 sid=key+'-2026-H'+district+'-printed';rows=[dict(sourceId=sid,state='GA',office='H',district=district,date='2026-11-03',name=n,partyRaw=p,incumbent=None,ballotAccessType='printed',sourcePage=page) for n,p,_ in pairs];scope=dict(office='H',district=district,ballotAccessType='printed',expectedCount=2)
 source=dict(id=sid,state='GA',kind='official_general_candidate_list',name=key+' official November 3 2026 general ballot named printed U.S. House District '+district,url=receipt['url'],sha256=receipt['sha256'],publishedAt=None,retrievedAt=receipt['capturedAt'],electionDate='2026-11-03',completeScopes=[scope],expectedRowCount=2)
 draft['sources'].append(source);draft['candidates'].extend(rows);proof[key]=dict(outcome='Worked',sourceSha256=source['sha256'],pageOneBased=page,scope=scope,rows=rows,rawBlock=block,independentExtractor='pypdf same original page exact non-whitespace character conservation',nbspBetweenWordsNormalizedOnly=True,incumbencyNotInferred=True,noGenericWriteInPeople=True,scopeClass='printed only; qualified write-in source remains separate')
(root/'drafts/ga-2026-general-incremental.json').write_bytes((json.dumps(draft,ensure_ascii=False,indent=2)+'\n').encode())
(root/'receipts/fifth-extraction-proof.json').write_bytes((json.dumps(proof,ensure_ascii=False,indent=2)+'\n').encode())
print(json.dumps({k:len(v['rows']) for k,v in proof.items()}))
