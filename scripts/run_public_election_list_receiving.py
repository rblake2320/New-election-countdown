from pathlib import Path
import subprocess,json,time,uuid,hashlib
root=Path(__file__).resolve().parents[1];e=root/'artifacts/public-election-list';nonce=uuid.uuid4().hex[:8]
net='sol-c-list-'+nonce;db=net+'-db';image='sha256:dd9ede966d3704bd79353785cae270a919a293b993c78fd19b438ff3e01d8cc5'
def run(args,check=True):
 r=subprocess.run(args,capture_output=True,text=True,encoding='utf8');
 if check and r.returncode:raise RuntimeError(r.stderr or r.stdout)
 return r
created=False
try:
 run(['docker','network','create','--internal','--label','org.electiontracker.owner=sol-c-public-list-fault-20261013',net]);created=True
 run(['docker','run','-d','--name',db,'--network',net,'--label','org.electiontracker.owner=sol-c-public-list-fault-20261013','-e','POSTGRES_USER=sol_fixture','-e','POSTGRES_DB=sol_public_list_fixture','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine'])
 for _ in range(30):
  if run(['docker','exec',db,'pg_isready','-U','sol_fixture','-d','sol_public_list_fixture'],False).returncode==0:break
  time.sleep(.4)
 else:raise RuntimeError('dedicated owned PostgreSQL did not become ready')
 inspect=json.loads(run(['docker','inspect',db]).stdout)[0]
 assert inspect['HostConfig']['PortBindings']=={} or inspect['HostConfig']['PortBindings'] is None
 assert inspect['Config']['Labels']['org.electiontracker.owner']=='sol-c-public-list-fault-20261013'
 results=[]
 for mode,port in [('fault-recovery','5432'),('refusal','1')]:
  args=['docker','run','--rm','--network',net,'--entrypoint','node','-e',f'DATABASE_URL=postgresql://sol_fixture@{db}:{port}/sol_public_list_fixture','-e',f'OWNED_LIST_FIXTURE_HOST={db}','-e','OWNED_LIST_FIXTURE_LABEL=sol-c-public-list-fault-20261013','--mount',f'type=bind,source={e / "compiled/refined-receiving.js"},target=/app/list-receiving.js,readonly','--mount',f'type=bind,source={e},target=/evidence',image,'/app/list-receiving.js']
  r=run(args,False);(e/('refined-'+mode+'-runtime.log')).write_text(r.stdout+'\n'+r.stderr,encoding='utf8');results.append({'mode':mode,'exitCode':r.returncode})
  if r.returncode:raise RuntimeError('compiled receiving '+mode+' failed; retained runtime log')
 (e/'refined-owned-postgres-run.json').write_text(json.dumps({'outcome':'Worked','imageId':image,'nativePostgresImage':inspect['Image'],'databaseName':'sol_public_list_fixture','ownerLabel':'sol-c-public-list-fault-20261013','hostPortsExposed':False,'sharedDatabaseTouched':False,'compiledSha256':hashlib.sha256((e/'compiled/refined-receiving.js').read_bytes()).hexdigest(),'runs':results},indent=2)+'\n',encoding='utf8')
 print(json.dumps({'outcome':'Worked','runs':results,'hostPortsExposed':False}))
finally:
 if created:
  run(['docker','rm','-f',db],False);run(['docker','network','rm',net],False)
