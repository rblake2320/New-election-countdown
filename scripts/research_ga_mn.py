"""Read-only normal-TLS official source capture; no candidate inference."""
import pathlib,urllib.request,urllib.error,urllib.parse,hashlib,json,datetime,sys
root=pathlib.Path(__file__).resolve().parents[1]/'artifacts/ga-mn-general'
(root/'raw').mkdir(parents=True,exist_ok=True);(root/'receipts').mkdir(exist_ok=True)
for key,url in [
 ('ga-elections','https://sos.ga.gov/elections-division-georgia-secretary-states-office'),
 ('ga-qualified','https://sos.ga.gov/page/qualified-candidates'),
 ('mn-h03','https://caucusfinder.sos.mn.gov/results?houseNumber=13211&id=239178'),
 ('mn-portal','https://caucusfinder.sos.mn.gov/'),
 ('mn-ballot-info','https://www.sos.mn.gov/elections-voting/whats-on-my-ballot/'),
]:
    at=datetime.datetime.now(datetime.timezone.utc).isoformat();receipt={'url':url,'capturedAt':at,'normalTls':True}
    try:
        r=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ElectionTracker official source verification'}),timeout=25)
        b=r.read(8*1024*1024+1)
        if len(b)>8*1024*1024:raise ValueError('body exceeds bound')
        path=root/'raw'/(key+'.html');path.write_bytes(b)
        receipt.update(outcome='Worked',httpStatus=r.status,finalUrl=r.url,sha256=hashlib.sha256(b).hexdigest(),bytes=len(b),contentType=r.headers.get('Content-Type'),file=str(path.relative_to(root)))
        host=urllib.parse.urlparse(r.url).hostname
        if not host or not host.endswith('.gov'):
            receipt.pop('finalUrl',None)
            receipt.update(outcome='Blocked',transportOutcome='Worked',finalHost=host,reason='Redirected to access/bot challenge; no bypass attempted')
        elif b'<app-root' in b and b'U.S. Representative' not in b:
            receipt.update(outcome='Blocked',transportOutcome='Worked',reason='Angular application shell contains no candidate data')
    except Exception as e:receipt.update(outcome='Blocked',reason=str(e))
    (root/'receipts'/(key+'.json')).write_bytes((json.dumps(receipt,indent=2)+'\n').encode());print(key,json.dumps(receipt))
