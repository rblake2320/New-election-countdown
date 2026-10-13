import datetime, hashlib, io, json, zipfile
from pathlib import Path
import requests
p = Path(__file__).parent
url = 'https://www.fec.gov/files/bulk-downloads/2026/cn26.zip'
with requests.get(url,stream=True,timeout=30) as r:
 r.raise_for_status()
 chunks=[]
 size=0
 for chunk in r.iter_content(128*1024):
  size+=len(chunk)
  if size>64*1024*1024: raise RuntimeError('FEC public download exceeds bound')
  chunks.append(chunk)
 body=b''.join(chunks)
 proof={'url':url,'status':r.status_code,'bytes':size,'sha256':hashlib.sha256(body).hexdigest(),'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'lastModified':r.headers.get('last-modified')}
(p/'identity-raw'/'fresh-cn26.zip').write_bytes(body)
z=zipfile.ZipFile(io.BytesIO(body))
info=z.getinfo('cn.txt')
if info.file_size>64*1024*1024: raise RuntimeError('FEC master exceeds bound')
rows=[]
for line in z.read(info).decode('utf-8').splitlines():
 f=line.split('|')
 if len(f)!=15: raise RuntimeError('Unexpected official master layout')
 if f[3]=='2026' and f[4]=='SC' and f[5]=='H' and f[6] in ['02','03','04']:
  rows.append(dict(zip(['id','name','party','year','state','office','district','incumbentCode','status'],f[:9])))
result={'proof':proof,'allStatusesIncluded':True,'contactColumnsDiscarded':True,'rows':rows}
(p/'fresh-fec-sc-identity-snapshot.json').write_bytes((json.dumps(result,indent=2)+'\n').encode())
print(json.dumps({'sha256':proof['sha256'],'bytes':size,'rows':len(rows),'lastModified':proof['lastModified']}))
