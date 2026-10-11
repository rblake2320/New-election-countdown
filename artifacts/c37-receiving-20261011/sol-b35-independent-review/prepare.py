import hashlib,json,pathlib,subprocess
own=pathlib.Path(__file__).resolve().parent;repo=pathlib.Path('D:/projects/et-wt/lane-b-et36');head='dea5bf21967d742f6b8853653082dd370c8871d2';base='c343237594bde7a2e3bd837fceaaae6abad9a072'
source=pathlib.Path('D:/projects/et-wt/astra-congress-production/docs/evidence/et5/congress-members/4e2b8e72');expected='4e2b8e72e1e56dc114f055e9e704bde76dd9fcda4ee0ee764e5c1ae9d8d1ebb0'
payload=(source/'members-response.json').read_bytes();assert hashlib.sha256(payload).hexdigest()==expected
(own/'members-response.json').write_bytes(payload)
for name in ['receipt.json','members-receiving.json']:(own/name).write_bytes((source/name).read_bytes())
out={'head':head,'base':base,'inputPath':str(source/'members-response.json'),'inputSha256':expected,'rows':len(json.loads(payload)),'fixtureFiles':{name:hashlib.sha256((source/name).read_bytes()).hexdigest() for name in ['members-response.json','receipt.json','members-receiving.json']}}
(own/'source-input-receipt.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print(json.dumps({'head':head,'inputRows':out['rows'],'inputSha256':expected}))
