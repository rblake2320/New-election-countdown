import pathlib,subprocess,json,datetime,hashlib,urllib.parse,sys
key,url=sys.argv[1:3];root=pathlib.Path(__file__).resolve().parents[1]/'artifacts/ga-mn-general';p=root/'raw'/(key+('.pdf' if urllib.parse.urlparse(url).path.endswith('.pdf') else '.json'))
d=dict(url=url,capturedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),normalTls=True,client='curl default; no spoofed headers or TLS/access bypass')
r=subprocess.run(['curl.exe','--silent','--show-error','--location','--max-time','25','--max-filesize','16777216','--output',str(p),'--write-out','%{http_code}|%{url_effective}',url],capture_output=True,text=True)
status,final=r.stdout.split('|',1) if '|' in r.stdout else ('0','');host=urllib.parse.urlparse(final).hostname
b=p.read_bytes() if p.exists() else b'';d.update(httpStatus=int(status),bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),finalHost=host,curlExit=r.returncode)
if r.returncode!=0 or status!='200':d.update(outcome='Blocked',reason=r.stderr or 'HTTP '+status)
elif not host or not host.endswith('.gov'):d.update(outcome='Blocked',reason='Redirected outside official Gov destination; no challenge bypass')
else:
 try:
  if p.suffix=='.pdf':
   if not b.startswith(b'%PDF-'):raise ValueError('Not PDF')
   formatName='PDF'
  else:j=json.loads(b);formatName='JSON'
  d.update(outcome='Worked',finalUrl=final,file=str(p.relative_to(root)).replace('\\','/'),format=formatName)
 except Exception:d.update(outcome='Blocked',reason='HTTP200 body not JSON; candidate data unavailable')
(root/'receipts'/(key+'.json')).write_bytes((json.dumps(d,indent=2)+'\n').encode());print(json.dumps(d))
