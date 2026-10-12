"""Retain original public HTTP response bytes; distinguish formatted research copies."""
import pathlib,json,urllib.request,hashlib,datetime,concurrent.futures,gzip
p=pathlib.Path(__file__).parent
names=['LA-Jun27-races','LA-Jun27-votes','LA-Nov3-races','LA-Nov3-votes','ND-results346','ND-results348','ND-contests346','ND-election346','ND-election348']
def run(name):
 proofpath=p/(name+'-proof.json');proof=json.loads(proofpath.read_text(encoding='utf-8'));existing=p/(name+'.json');before=hashlib.sha256(existing.read_bytes()).hexdigest();proof['sourceRawSha256']=proof['sha256'];proof['recordingSha256']=before;proof['recordingTransform']='JSON decoded and reformatted by research metadata sanitizer; original source hash retained separately'
 try:
  with urllib.request.urlopen(urllib.request.Request(proof['url'],headers={'User-Agent':'ElectionTracker official public results research/1.0'}),timeout=40) as r:b=r.read(8*1024*1024);status=r.status;ct=r.headers.get('Content-Type');enc=r.headers.get('Content-Encoding')
  rawpath=p/(name+'.raw.json');rawpath.write_bytes(b);sha=hashlib.sha256(b).hexdigest();decoded=gzip.decompress(b) if enc=='gzip' else b;fresh=json.loads(decoded);previous=json.loads(existing.read_bytes());same=fresh==previous
  freshproof={'url':proof['url'],'status':status,'contentType':ct,'contentEncoding':enc,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sha256':sha,'bytes':len(b),'recordingFile':rawpath.name,'recordingTransform':'none: exact response body bytes','sameParsedObjectAsEarlierRecording':same,'sameRawHashAsEarlierSource':sha==proof['sha256']}
  if sha==proof['sha256']:existing.write_bytes(b);proof['recordingSha256']=sha;proof['recordingTransform']='none: identical original response bytes independently re-fetched; hash matches earlier source'
  (p/(name+'-raw-proof.json')).write_text(json.dumps(freshproof,indent=2)+'\n',encoding='utf-8');print(name,'raw',sha,'sameobject',same,'originalSHA',freshproof['sameRawHashAsEarlierSource'])
 except Exception as e:proof['freshRawFetchError']=type(e).__name__+': '+str(e);print(name,'blocked',proof['freshRawFetchError'])
 proofpath.write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8')
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(run,names))
