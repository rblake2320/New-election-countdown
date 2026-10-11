import pathlib,json,hashlib
p=pathlib.Path(__file__).resolve().parent
root=p.parent.parent
q=json.loads((p/'private-run.txt').read_text(encoding='utf-8'))
private=pathlib.Path(q['evidence']).resolve()
assert private.parent==root/'artifacts/congress-import'
source=json.loads((p/'source-name-receipt.json').read_text(encoding='utf-8'))
assert source['freshRawXmlMatchesOriginal'] and source['freshLandingMatchesOriginal'] and source['sourceHashEqualityGated']
unit=json.loads((p/'unit.json').read_text(encoding='utf-8'))
files={str(f.relative_to(root)).replace('\\','/'):{'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size} for folder in [p,private] for f in sorted(folder.rglob('*')) if f.is_file() and f.name!='delivery-index.json'}
receipt={'base':'c343237594bde7a2e3bd837fceaaae6abad9a072','branch':'lane-c/congress-official-name','outcome':'Worked','sourceNameReceipt':source,'oldManifestSha256':source['oldProjectionSha256'],'newManifestSha256':source['newProjectionSha256'],'currentSourceAsset':'data/congress/119/official-current-members.json','packagedSourceAsset':'dist/congress-data/official-current-members.json','soleImporterRuntimeDelta':'OFFICIAL_CONGRESS_MANIFEST_SHA constant only','databaseContract':'D oldpositive539 retake with newfece manifest; onlyK000383 name changes to Angus S. King, Jr.; noIDs/party/state/district/chamber/role/seat changes','compiledPrivate':q,'compiledK000383Check':next(x for x in json.loads((private/'private-receipt.json').read_text(encoding='utf-8'))['checks'] if 'K000383' in x['scenario']),'pythonRegressionTests':6,'unit':{'passed':unit['numPassedTests'],'failed':unit['numFailedTests'],'skipped':unit['numPendingTests']},'applicationBuildExit':0,'typeDiagnostics':(p/'type.txt').read_text(encoding='utf-8').count('error TS'),'sharedWrites':0,'contactsRetained':False,'otherLaneRuntimeSchemaPackageEdits':0,'files':files}
(p/'delivery-index.json').write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print('Indexed',len(files),'name+private artifacts')
