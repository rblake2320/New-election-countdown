"""Seal existing bounded acceptance receipts; never mutate raw source bytes."""
import hashlib, json, pathlib, subprocess
root = pathlib.Path(__file__).resolve().parents[1]
packet = root/'artifacts/wa-adapter'
runtime = 'c390ed65a02d8bf3fc5bffcd28d085515cfbf76e'
def digest(b): return hashlib.sha256(b).hexdigest()
def git(*args): return subprocess.check_output(['git','-C',str(root),*args])
receipt = json.loads((packet/'source-receipt.json').read_text())
for item in receipt['sources']:
    data = (packet/item['file']).read_bytes()
    assert digest(data) == item['sha256']
    assert digest(git('show',f"{runtime}:artifacts/wa-adapter/{item['file']}")) == item['sha256']
unit = json.loads((packet/'unit-results.json').read_text()); full = json.loads((packet/'full-units.json').read_text())
assert unit['success'] and unit['numPassedTests'] == 32
assert full['success'] and full['numPassedTests'] == 839
assert (packet/'scoped-types.txt').stat().st_size == 0
assert 'built in' in (packet/'build.txt').read_text(errors='replace')
for name in ['compiled-receipt.json','alternate-cwd-receipt.json']:
    parsed = json.loads((packet/name).read_text())
    assert parsed['outcome'] == 'Worked' and parsed['senate']['totalVotes'] == 1948716
    assert [row['parsed']['totalVotes'] for row in parsed['records']] == [1903073,1903115]
sources = []
for path in ['server/official-result-adapters/xlsx.ts','server/official-result-adapters/wa.ts','server/official-result-adapters/types.ts','shared/official-results.ts','shared/live-election-results.ts','tests/official-result-wa.test.ts','scripts/verify-wa-adapter.ts']:
    assert git('diff',runtime,'HEAD','--',path) == b''
    data = git('show',f'{runtime}:{path}')
    sources.append({'path':path,'gitBlob':git('rev-parse',f'{runtime}:{path}').decode().strip(),'sha256':digest(data),'bytes':len(data)})
artifacts = [{'path':str(p.relative_to(root)).replace('\\','/'),'sha256':digest(p.read_bytes()),'bytes':p.stat().st_size} for p in sorted(packet.rglob('*')) if p.is_file() and p.name != 'delivery-index.json']
index = {'outcome':'Worked','runtimeHead':runtime,'oracleHead':git('rev-parse','HEAD').decode().strip(),'unitTests':32,'wholeSuitePassed':839,'strictOwnedErrors':0,'compiledScenarios':['Lands initial','Lands recount','federal Senate primary'],'sources':sources,'artifacts':artifacts,'houseRawSource':'BlockedHTTP403; no House contests in actual XLSX','noDbWrites':True,'noBrowserCapture':True}
(packet/'delivery-index.json').write_bytes((json.dumps(index,indent=2)+'\n').encode())
print(json.dumps({'outcome':'Worked','files':len(artifacts),'indexSha256':digest((packet/'delivery-index.json').read_bytes())}))
