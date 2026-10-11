import pathlib,json,hashlib
d=pathlib.Path(__file__).resolve().parent
p=d.parent
old=json.loads((p/'delivery-index.json').read_text(encoding='utf-8'))
res=json.loads((p/'resource-path-delivery-index.json').read_text(encoding='utf-8'))
assert all(hashlib.sha256((p/n).read_bytes()).hexdigest()==m['sha256'] for i in [old,res] for n,m in i['files'].items())
q=json.loads((d/'private-run.txt').read_text(encoding='utf-8'))
private=pathlib.Path(q['evidence']).resolve()
assert private.parent==p,'Private receipt path outside owned evidence tree'
files={str(f.relative_to(p)).replace('\\','/'):{'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size} for folder in [d,private] for f in sorted(folder.rglob('*')) if f.is_file() and f.name!='delivery-index.json'}
peer=d/'independent-0616'
report={'kind':'Congress-loader-errno-refusal-final-packet','runtimeCoreCommit':'0616a699b00be0bde009550ab2eac048ebdd7539','previousPacket':'95ceff263691cc6c7da8753c32087725f1f0b207','manifestSha256':'b09efc0e8a2b98ffc1e5e4740c8c0ba03a381e745cdf8d53a501e053bfa8ad56','packagedManifestPath':'dist/congress-data/official-current-members.json','migration':'migrations/20261011_congress_official_import.sql','migrationOrder':'Before official apply; no webboot execution','sharedSchemaBlob':'23d0cc9fc707c9dc2c0a8487229cc63da3012e60','loaderContract':'Native stat of compiled-relative packaged asset; source fallback ONLY ENOENT. EACCES/ENOTDIR/wrongSHA refuse. Explicit manifest unchanged.','ownLinuxCases':json.loads((d/'linux-refusals-green.json').read_text(encoding='utf-8')),'independentClearance':{'head':'0616a699b00be0bde009550ab2eac048ebdd7539','outcome':'Worked no loader mustfix','sixNormalCases':json.loads((peer/'path-review-receipt.json').read_text(encoding='utf-8')),'twoLinuxUID1001Cases':json.loads((peer/'linux-refusals-receipt.json').read_text(encoding='utf-8'))},'privateRetake':q,'prior90ArtifactHashesPreserved':True,'sourceCodeChangesAfterCore':0,'productionReceiving':'D owns separate actual production packaging/HTTP gate','files':files}
(d/'delivery-index.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('Preserved90; final errno packet indexed',len(files))
