import pathlib,json,urllib.parse
root=pathlib.Path(__file__).resolve().parents[1]/'artifacts/ga-mn-general'
for key in ['mn-portal','mn-ballot-info','mn-h03']:
 p=root/'receipts'/(key+'.json');d=json.loads(p.read_bytes())
 d['transportOutcome']='Worked'
 d['outcome']='Blocked'
 if key=='mn-h03':
  d['reason']='Angular application shell contains no candidate data; no nominees extracted'
 else:
  d['finalHost']=urllib.parse.urlparse(d.pop('finalUrl')).hostname
  d['reason']='Redirected to Perfdrive CAPTCHA/bot challenge; no bypass attempted and no candidate data extracted'
 d['classificationCorrection']='HTTP 200 transport alone is not an official candidate document'
 p.write_bytes((json.dumps(d,indent=2)+'\n').encode())
