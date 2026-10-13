import pathlib,json,hashlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1];artifact=root/'artifacts/parent-route-private'
sha='8a357ae79f4574056135c9ba749eddaeb7598366'
modules=['server/voting-intentions.ts','server/election-integrity-routes.ts','server/verified-policy-routes.ts','server/auth.ts','server/db.ts','server/verified-policy-comparison.ts','server/candidate-position-api.ts']
rows=[]
for name in modules:
 physical=(root/name).read_bytes();blob=subprocess.check_output(['git','show',sha+':'+name],cwd=root)
 assert physical.replace(b'\r\n',b'\n')==blob.replace(b'\r\n',b'\n'),name
 snapshot=artifact/'executed-source'/name;snapshot.parent.mkdir(parents=True,exist_ok=True);snapshot.write_bytes(physical)
 rows.append(dict(path=name,executedSnapshot=snapshot.relative_to(root).as_posix(),executedPhysicalSha256=hashlib.sha256(physical).hexdigest(),owningGitBlobSha256=hashlib.sha256(blob).hexdigest(),exactByteEquality=physical==blob,checkoutLineEndingsOnly=True))
files=[p for p in sorted(artifact.rglob('*')) if p.is_file() and p.name!='delivery-index.json']
files += [root/'scripts'/n for n in ['parent-route-private-env.mjs','inspect_parent_private.mjs','verify_parent_route_private.mjs','run_parent_route_private.ps1','seal_parent_route_receipts.py']]
index=dict(version=1,runtimeSourceHead=sha,runtimeCodeMatchesOwningHeadExceptCheckoutLineEndings=True,runtimeModules=rows,
 sourceBytesNote='Executed CRLF source bytes are retained unchanged and separately hashed; owning Git LF blob SHA is also retained. Only CRLF/LF checkout conversion differs. No semantic or raw-source hash equivalence is fabricated.',
 files=[dict(path=p.relative_to(root).as_posix(),bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in files])
(artifact/'delivery-index.json').write_bytes((json.dumps(index,indent=2)+'\n').encode())
print(json.dumps(dict(outcome='Worked',files=len(files),runtimeModules=len(rows),checkoutLineEndingsOnly=True)))
