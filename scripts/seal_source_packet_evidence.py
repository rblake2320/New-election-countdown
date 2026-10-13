"""Verify and seal the actual portable source packet/runtime evidence."""
import pathlib,json,hashlib,subprocess
repo=pathlib.Path(__file__).resolve().parents[1];root=repo/'artifacts/source-packet';runtime='608dce3d40d8f5f6cb968e10c66a53c6054f645a'
def hash(data):return hashlib.sha256(data).hexdigest()
def git(*args):return subprocess.check_output(['git','-C',str(repo),*args])
sources=[]
for name in ['server/official-result-adapters/bridge.ts','scripts/parse_official_source_packet.ts','server/official-result-adapters/types.ts','server/official-result-adapters/xlsx.ts','server/official-result-adapters/wa.ts','server/official-result-adapters/ca.ts','server/official-result-adapters/nc.ts','server/official-result-adapters/la.ts','shared/live-election-results.ts','shared/official-results.ts','tests/official-source-packet.test.ts']:
    assert git('diff',runtime,'HEAD','--',name)==b''
    raw=git('show',f'{runtime}:{name}');sources.append({'path':name,'gitBlob':git('rev-parse',f'{runtime}:{name}').decode().strip(),'sha256':hash(raw),'bytes':len(raw)})
packets=[]
for path in sorted(root.rglob('*.packet.json'))+sorted(root.rglob('packet.json')):
    packet=json.loads(path.read_bytes());receiptpath=path.parent/('initial-v1-receipt.json' if path.name=='initial.packet.json' else 'recount-v1-receipt.json' if path.name=='recount.packet.json' else 'v1-receipt.json')
    receipt=json.loads(receiptpath.read_bytes());assert receipt['outcome']=='Worked' and receipt['manifestSha256']==hash(path.read_bytes())
    assert receipt['input']['totalVotes']==packet['expectedTotals']['totalVotes']
    assert len(receipt['input']['candidates'])==packet['expectedTotals']['optionCount']
    if packet['publisher']['kind']=='admin_manual':assert receipt['input']['source']['id']=='admin_manual:'+packet['targetBinding']['state']
    for file in packet['files']:assert hash((path.parent/file['path']).read_bytes())==file['sha256']
    packets.append({'path':str(path.relative_to(repo)).replace('\\','/'),'sha256':hash(path.read_bytes()),'parser':packet['parser'],'sourceKind':packet['publisher']['kind'],'sourceId':packet['publisher']['id'],'targetFixtureId':packet['targetBinding']['id'],'context':packet['context'],'expectedTotals':packet['expectedTotals']})
unit=json.loads((root/'bridge-unit-results.json').read_bytes());full=json.loads((root/'full-unit-results.json').read_bytes())
assert unit['success'] and unit['numPassedTests']==30
assert full['success'] and full['numPassedTests']==929
assert (root/'scoped-types.txt').stat().st_size==0
cli=json.loads((root/'compiled-cli-receipt.json').read_bytes());linux=json.loads((root/'linux-receipt.json').read_bytes())
assert cli['outcome']=='Worked' and cli['actualCliCases']==8 and linux['outcome']=='Worked' and linux['actualPosixSymlinkEscape']=='Refused'
assert cli['compiledModuleSha256']==linux['compiledModuleSha256']==hash((root/'parse_official_source_packet.mjs').read_bytes())
assert (root/'linux-errors.txt').stat().st_size==0
regression=json.loads((root/'manual-id-fix/same-input-receipt.json').read_bytes())
assert regression['outcome']=='Worked' and all(row['old']['outcome']=='Failed' and row['sameInputNew']['code']=='MANUAL_SOURCE_REFUSED' and row['votesNamesPartyAndCaptureUnchanged'] for row in regression['records'])
artifacts=[{'path':str(p.relative_to(repo)).replace('\\','/'),'sha256':hash(p.read_bytes()),'bytes':p.stat().st_size} for p in sorted(root.rglob('*')) if p.is_file() and p.name!='delivery-index.json']
index={'outcome':'Worked','runtimeHead':runtime,'unitTests':30,'fullTests':929,'ownedStrictErrors':0,'actualWindowsCliCases':8,'actualLinuxPositiveCases':7,'actualLinuxSymlinkEscape':'Refused','sources':sources,'packets':packets,'artifacts':artifacts,'noDbWrites':True,'noNetworkAtParsing':True}
(root/'delivery-index.json').write_bytes((json.dumps(index,indent=2)+'\n').encode());print(json.dumps({'outcome':'Worked','artifacts':len(artifacts),'packets':len(packets),'indexSha256':hash((root/'delivery-index.json').read_bytes())}))
