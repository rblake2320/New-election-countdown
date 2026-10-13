import urllib.request,urllib.error,urllib.parse,json,datetime,hashlib,pathlib,sys
key,url=sys.argv[1:3];root=pathlib.Path(__file__).resolve().parents[1]/'artifacts/ga-mn-general'
receipt={'url':url,'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'normalTls':True}
try:
 r=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ElectionTracker official source verification'}),timeout=25);b=r.read(16*1024*1024+1)
 if len(b)>16*1024*1024:raise ValueError('Body bound')
 host=urllib.parse.urlparse(r.url).hostname
 receipt.update(httpStatus=r.status,finalHost=host,sha256=hashlib.sha256(b).hexdigest(),bytes=len(b),contentType=r.headers.get('Content-Type'))
 if not host or not host.endswith('.gov'):
  receipt.update(outcome='Blocked',reason='Redirected to access/bot challenge; no bypass attempted')
 else:
  extension='js' if '.js' in urllib.parse.urlparse(url).path else 'pdf' if '.pdf' in urllib.parse.urlparse(url).path or b.startswith(b'%PDF-') else 'html'
  path=root/'raw'/(key+'.'+extension);path.write_bytes(b);receipt.update(outcome='Worked',file=str(path.relative_to(root)).replace('\\','/'),finalUrl=r.url)
except Exception as e:receipt.update(outcome='Blocked',reason=str(e))
(root/'receipts'/(key+'.json')).write_bytes((json.dumps(receipt,indent=2)+'\n').encode());print(json.dumps(receipt))
