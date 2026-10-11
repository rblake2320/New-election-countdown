import hashlib,json,pathlib,subprocess
own=pathlib.Path(__file__).resolve().parent;repo=pathlib.Path('D:/projects/et-wt/astra-b35-receiving')
dhead='2252e667f6cd36c6c0a73445b8a2ae7047bcd191';bhead='96201290851fe8e0e39dcece19a6891abc77fb6c';old='dea5bf21967d742f6b8853653082dd370c8871d2'
proof=[]
for file in ['nonmember-responses.json','members-response.json']:
    relative='docs/evidence/et5/b35-receiving/'+file;body=subprocess.check_output(['git','show',dhead+':'+relative],cwd=repo);(own/file).write_bytes(body);proof.append({'file':relative,'head':dhead,'sha256':hashlib.sha256(body).hexdigest()})
for name in ['bills-119','bills','committees','committee-members-house-hsju00']:
    for ext in ['body.json','headers.txt']:
        relative='tests/fixtures/congress-members/nonmember/'+name+'.'+ext;body=subprocess.check_output(['git','show',bhead+':'+relative],cwd=repo);path=own/'raw-captures'/(name+'.'+ext);path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(body);proof.append({'file':relative,'head':bhead,'sha256':hashlib.sha256(body).hexdigest()})
(own/'source-input-receipt.json').write_text(json.dumps({'oldHead':old,'newHead':bhead,'dEvidenceHead':dhead,'files':proof},indent=2)+'\n',encoding='utf-8');print(json.dumps({'capturedFiles':len(proof),'oldHead':old,'newHead':bhead}))
