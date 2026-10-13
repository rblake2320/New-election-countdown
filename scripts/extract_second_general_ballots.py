import pathlib,json,re,hashlib,fitz
from pypdf import PdfReader
root=pathlib.Path(__file__).resolve().parents[1]/'artifacts/ga-mn-general'
def save(p,v):p.write_bytes((json.dumps(v,indent=2,ensure_ascii=False)+'\n').encode())
proof={}
for state,key,districts in [('GA','ga-fulton-ballot',['06','07']),('GA','ga-houston-ballot',['02','08']),('MN','mn-maplewood-ballot',['04'])]:
 raw=root/'raw'/(key+'.pdf');doc=fitz.open(raw);text='\n'.join(p.get_text() for p in doc);other=' '.join(' '.join(p.extract_text() or '' for p in PdfReader(raw).pages).split())
 assert 'November 3, 2026' in text and ('General' in text)
 assert '\ufffd' not in text
 receipt=json.loads((root/'receipts'/(key+'.json')).read_bytes());sourceId=key+'-2026-printed';rows=[];scopes=[];blocks={}
 for district in districts:
  if state=='GA':
   pat=r'For United States House of\s+Representatives\s*[-\u2013]\s*District '+str(int(district))+r'\s*(?:\(Vote for One\)\s*)?(.+?)(?=For |Write-in:)'
   block=re.search(pat,text,re.S).group(1);pairs=[]
   for line in block.splitlines():
    m=re.fullmatch(r'(.+?)\s*[-\u2013]\s*(Republican|Democrat)(?: \(Incumbent\))?',line.strip())
    if m:pairs.append((re.sub(r' \(I\)$','',m[1]).strip(),m[2],line.strip()))
  else:
   block=re.search(r'United States Representative\s+District '+str(int(district))+r'\s+Vote for One\s+(.+?)write-in, if any',text,re.S).group(1)
   lines=[x.strip() for x in block.splitlines() if x.strip()];assert len(lines)%2==0;pairs=[(lines[i],lines[i+1],lines[i]+' '+lines[i+1]) for i in range(0,len(lines),2)]
  assert len(pairs)==2,(key,district,pairs)
  for name,party,rawLine in pairs:
   assert re.sub(r'\s+','',rawLine) in re.sub(r'\s+','',other),(key,rawLine)
   rows.append(dict(sourceId=sourceId,state=state,office='H',district=district,date='2026-11-03',name=name,partyRaw=party,incumbent=None,sourcePage=1,ballotAccessType='printed'))
  scopes.append(dict(office='H',district=district,ballotAccessType='printed',expectedCount=len(pairs)));blocks[district]=block
 source=dict(id=sourceId,state=state,kind='official_general_candidate_list',name=key+' official November 3 2026 General Election sample ballot, complete named printed federal scopes',url=receipt['url'],sha256=receipt['sha256'],publishedAt=None,retrievedAt=receipt['capturedAt'],electionDate='2026-11-03',completeScopes=scopes,expectedRowCount=len(rows))
 p=root/'drafts'/((state.lower())+'-2026-general-incremental.json');draft=json.loads(p.read_bytes());draft['sources'].append(source);draft['candidates'].extend(rows);save(p,draft)
 proof[key]=dict(outcome='Worked',sha256=source['sha256'],rawBlocks=blocks,scopes=scopes,rows=rows,independentExtractor='pypdf same raw PDF ordered name and party conservation after whitespace-only normalization (font spans split words)',notOCR=True,incumbencyNotInferred=True,genericWriteInSlotsExcluded=True,contactsDropped=True)
save(root/'receipts/second-extraction-proof.json',proof)
print(json.dumps({k:len(v['rows']) for k,v in proof.items()}))
