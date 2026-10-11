"""Freeze local Git source heads without network or peer worktree mutations."""
from pathlib import Path
import subprocess,tarfile,io,json,hashlib,sys,re
root=Path('artifacts/candidate-receiving');root.mkdir(exist_ok=True)
after=sys.argv[1] if len(sys.argv)>1 else '2c152ef'
if not re.fullmatch('[a-f0-9]{7,40}',after):raise SystemExit('Immutable hex commit required')
records=[]
for label,head in [('before','426c709'),('after',after),('c','6ddda4b')]:
 dest=root/'snapshots'/label;dest.mkdir(parents=True,exist_ok=True)
 paths=['server','shared'] if label!='c' else ['server/candidate-nominee-sync.ts','server/fec-candidate-sync.ts','server/fec-source-artifacts.ts','server/general-candidate-list.ts','migrations/20261011_candidate_source_records.sql','migrations/20261011_general_candidate_list_snapshots.sql','data/nominees/combined-2026-reviewed.json']
 raw=subprocess.run(['git','archive',head,*paths],capture_output=True,check=True).stdout
 with tarfile.open(fileobj=io.BytesIO(raw),mode='r:') as tar:tar.extractall(dest,filter='data')
 commit=subprocess.run(['git','rev-parse',head],capture_output=True,text=True,check=True).stdout.strip()
 files=['server/routes/elections.ts','server/storage.ts','server/storage-factory.ts'] if label!='c' else ['server/candidate-nominee-sync.ts','server/fec-candidate-sync.ts','data/nominees/combined-2026-reviewed.json']
 records.append({'label':label,'immutableHead':commit,'files':[{'path':f,'sha256':hashlib.sha256((dest/f).read_bytes()).hexdigest()} for f in files]})
(root/'frozen-source-provenance.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
